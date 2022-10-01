#!/usr/bin/env python3
"""devctl(aemon)"""

import os
import random
import shlex
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import libtmux
import yaml
from pydantic import BaseModel


def main():
    """main"""

    if os.getenv("DEV_ROOT") is None:
        raise Exception("needs to run inside dev")

    if len(sys.argv) <= 1:
        raise Exception("needs command")

    args = sys.argv[1:]
    args.reverse()
    DevCtl(Path(os.getenv("DEV_ROOT"))).command(args)


class Command(BaseModel):
    """command"""
    workdir: str
    cmd: str


class Container(BaseModel):
    """container"""


class Service(BaseModel):
    """service definition"""
    command: Optional[Command]
    container: Optional[Container]


class Scope(BaseModel):
    """Project with services"""
    services: List[str]


class Startup(BaseModel):
    groups: List[str]


class DevCtlConfig(BaseModel):
    """devctl config"""
    services: Dict[str, Service]
    groups: Dict[str, Scope]
    startup: Startup


def hash_str_deterministic(string: str, low_range: int, high_range: int) -> int:
    """Hashes a string deterministically"""
    return random.Random(string).randrange(low_range, high_range)


def ceil_pow2(in_n: int):
    """Rounds in_n to the next highest power of 2"""
    in_n -= 1
    in_n |= in_n >> 1
    in_n |= in_n >> 2
    in_n |= in_n >> 4
    in_n |= in_n >> 8
    in_n |= in_n >> 16
    in_n += 1
    return in_n


def rmdir(directory: Path):
    """delete directory"""

    if not directory.exists():
        return

    for item in directory.iterdir():
        if item.is_dir():
            rmdir(item)
        else:
            item.unlink()

    directory.rmdir()


class DevCtl:
    """DevCtl"""

    server: libtmux.Server
    session: libtmux.Session
    config: DevCtlConfig
    root: Path
    logs: Path

    def __init__(self, root: Path):
        self.server = libtmux.Server("devenv")
        self.root = root
        self.logs = self.root.joinpath("logs")

        session = self.server.find_where({"session_name": "dev"})
        if session is None:
            raise Exception("cannot find dev session")

        self.session = session
        self.config = DevCtlConfig.parse_obj(
            yaml.safe_load(self.root.joinpath("devctl-config.yml").read_bytes()))

    def command(self, args: List[str]):
        """root command handler"""

        cmds = {
            "start-groups": self.command_start_groups,
            "stop-groups": self.command_stop_groups,
            "start": self.command_start_services,
            "stop": self.command_stop_services,
            "monitor": self.command_monitor,
            "tailor": self._restart_tailor,
            "cmd": self.command_cmd,

            # internal
            "notify-service-status": self.command_notify_service_status
        }

        cmd = args.pop()

        if cmd not in cmds:
            raise Exception(f"no such command {cmd}")

        cmds[cmd](args)

    def command_start_groups(self, args: List[str]):
        """start groups"""
        while len(args) > 0:
            scope = args.pop()

            if scope in self.config.groups:
                self._log(f"starting scope: {scope}")
                services = self.config.groups[scope].services
                self._start_services(services)
            else:
                self._log(f"no such scope: {scope}")

    def command_stop_groups(self, args: List[str]):
        """stop groups"""
        while len(args) > 0:
            scope = args.pop()

            if scope in self.config.groups:
                self._log(f"stopping scope: {scope}")
                services = self.config.groups[scope].services
                self._stop_services(services)
            else:
                self._log(f"no such scope: {scope}")

    def command_start_services(self, args: List[str]):
        """starts services"""

        self._log(f"starting services: {' '.join(args)}")

        self._start_services(args)

    def command_stop_services(self, args: List[str]):
        """stops services"""
        self._log(f"stopping services: {' '.join(args)}")
        self._stop_services(args)

    def command_monitor(self, args: List[str]):
        """runs daemon"""
        self._log("monitor started")

        self._setup_logfiles()
        self._restart_tailor()

        self._startup_tasks()

        while True:
            time.sleep(5)

    def command_cmd(self, args: List[str]):
        """run command"""

        if len(args) == 0:
            raise Exception("needs a command")

        name = args.pop()
        args.reverse()
        self._cmd_window(name, " ".join(args))

    def command_notify_service_status(self, args: List[str]):
        """notify service status"""
        if len(args) != 2:
            raise Exception("wrong status")

        service = args.pop()
        status = args.pop()

        if service not in self.config.services:
            raise Exception(
                f"tried to notify service status for unknown service {service}, is it in the log file?")

        win = self._window_exists(self._service_window_name(service))
        win.rename_window(self._service_window_name(service, status))

        if status == "failed":
            self._log(f"{service} failed, restarting in 10 seconds...")
            time.sleep(10)
            self._start_services([service], True)
        elif status == "success":
            input(f"[devctl] {service} exited successfully.")
        # ignore "running" for now.
        else:
            raise Exception(
                f"tried to notify unknown service status {status} for service {service}")

    #############################################

    def _setup_logfiles(self):
        for svc_id in self.config.services:
            self._service_logfile(svc_id).touch()

        self._service_logfile("devctl").touch()

    def _log(self, msg):
        print(f"[devctl] {msg}")
        with open(self.logs.joinpath("devctl"), "a", encoding='utf-8') as log:
            log.write(msg+"\n")

    def _service_logfile(self, svc_id: str) -> Path:
        return self.logs.joinpath(svc_id)

    def _window_exists(self, name: str) -> Optional[libtmux.Window]:
        for win in self.session.list_windows():
            if win.name == name:
                return win

        return None

    def _cmd_window(self, name: str, cmd: str, rerun_if_exists: bool = True):
        if self._window_exists(name):
            if rerun_if_exists:
                self._log("Command already running, killing")
                self.session.kill_window(name)
            else:
                return

        command = f"{self.root}/scripts/devenv/shell.sh -c {shlex.quote(cmd + ';')}"
        # self._log("new cmd window: " + command)

        self.session.new_window(
            name,
            str(self.root),
            False,
            "",  # str(self._free_window_index(name)),
            command
        )

    # def _free_window_index(self, name: str, index_base: int = 100):
    #     """Finds a loose"""
    #     window_set = set(map(lambda w: w.index,
    #                      self.session.list_windows()))

        # # int_max = 2147483647
        # order_letters = 6
        # base = 26
        # prefixes_required = index_base + base**order_letters  # 26 letters in alphabet
        # ceil_pow2_prefixes = ceil_pow2(prefixes_required)

        # prefix_bits = int(math.log(ceil_pow2_prefixes, 2))
        # print(prefix_bits, ceil_pow2_prefixes)

        # prefix_num = 0
        # prefix = name[:order_letters][::-1]
        # print("prefix:", prefix)
        # for cha in prefix:
        #     prefix_num *= base
        #     prefix_num += ord(cha.lower()) - (ord('a')-1)

        #     print(cha, prefix_num)

        # prefix_num <<= (32-prefix_bits)

        # print("prefix num", prefix_num)
        # new_id = index_base + prefix_num + \
        #     (hash_str_deterministic(
        #         name[:order_letters], 0, (2**(31-prefix_bits))) if len(name) >= order_letters else 0)

        # print(window_set, new_id)
        # i =
        # while str(new_id) in window_set:
        #     new_id += 1

        # print(new_id)
        # return new_id

    def _start_services(self, services: Optional[List[str]] = None, restart: bool = False):
        if len(services) == 0:
            for sid in self.config.services:
                self._start_service(sid, restart)
        elif services is not None:
            for sid in services:
                self._start_service(sid, restart)

    def _start_service(self, service: str, restart: bool = False):
        self._log(f"starting service: {service}")
        if service not in self.config.services:
            raise Exception(f"no such service {service}")

        config = self.config.services[service]

        if config.command is not None:
            command = config.command

            self._cmd_window(
                self._service_window_name(service),
                f"cd {command.workdir} && ((({command.cmd}) && $DEV_ROOT/devctl notify-service-status {service} success) || $DEV_ROOT/devctl notify-service-status {service} failed;)",
                restart
            )

        elif config.container is not None:
            # TODO handle containers
            pass

    def _stop_services(self, services: Optional[List[str]]):
        if len(services) == 0:
            for sid in self.config.services:
                self._stop_service(sid)
        elif services is not None:
            for sid in services:
                self._stop_service(sid)

    def _stop_service(self, service: str):
        self._log(f"stopping service: {service}")
        # if service not in self.config.services:
        #     raise Exception(f"no such service {service}")
        killed = False
        for window_name in map(lambda status: self._service_window_name(service, status), ["success", "failed", "running"]):
            win = self._window_exists(window_name)

            if win:
                win.kill_window()
                killed = True

        if not killed:
            self._log(f"service {service} is not running")

    def _service_window_name(self, service: str, status: str = "running"):
        if status == "running":
            return f"svc-{service}"
        elif status == "success":
            return f"svc-success-{service}"
        elif status == "failed":
            return f"svc-failed-{service}"

    def _restart_tailor(self):
        self._log("(re)starting logs")
        self._cmd_window(
            "devctl-logs",
            "scripts/devctl/tailor.sh"
        )

    def _startup_tasks(self):
        self.command_start_groups(self.config.startup.groups)


if __name__ == "__main__":
    main()
