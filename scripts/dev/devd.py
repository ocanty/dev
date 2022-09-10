#!/usr/bin/env python3
"""devd(aemon)"""

import os
import random
import shlex
import sys
import time
from pathlib import Path
from typing import Dict, List, Union

import libtmux
import yaml
from pydantic import BaseModel


class Project(BaseModel):
    """service definition"""
    workdir: str
    command: str


class DevdConfig(BaseModel):
    """devd config"""
    services: Dict[str, Project]


print("[devd] started")

# util


def hash_str_deterministic(s: str, low_range: int, high_range: int) -> int:
    return random.Random(s).randrange(low_range, high_range)

# util


def ceil_pow2(in_n: int):
    n = in_n
    n -= 1
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16
    n += 1
    return n

# util


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


class Devd:
    """"""
    server: libtmux.Server
    session: libtmux.Session
    config: DevdConfig
    root: Path
    tmp: Path
    log: Path

    def __init__(self, root: Path):
        self.server = libtmux.Server()
        self.root = root
        self.tmp = Path("/tmp/devd")
        session = self.server.find_where({"session_name": "dev"})

        if session is None:
            raise Exception("cannot find dev session")

        self.session = session
        self.config = DevdConfig.parse_obj(
            yaml.safe_load(Path("./devd-config.yml").read_bytes()))

    def command(self, args: List[str]):
        """root command handler"""

        cmds = {
            "start-services": self.command_start_services,
            "monitor": self.command_monitor,
            "tailor": self._restart_tailor,
            "cmd": self.command_cmd,

            # internal
            "notify-service-status": self.command_
        }

        cmd = args.pop()

        if cmd not in cmds:
            raise Exception(f"no such command {cmd}")

        cmds[cmd](args)

    def command_start_services(self, args: List[str]):
        """starts services"""
        print("[devd] starting services")

        mask = set(args)
        self._start_services(mask)

    def command_monitor(self, args: List[str]):
        """runs daemon"""
        print("[devd] monitor started")

        self._setup_tmp()
        self._setup_logfiles()
        self._restart_tailor()

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
        """"""
        if len(args) != 2:
            raise Exception("wrong status")

        service = args.pop()
        status = args.pop()

        if service not in self.config.services:
            raise Exception(
                f"tried to notify service status for unknown service {service}, is it in the log file?")

        if status in ["success", "failed"]:
            # if status == "failed":

            self._start_services(set([service]))
        else:
            raise Exception(
                f"tried to notify unknown service status {status} for service {service}")

    #############################################

    def _setup_tmp(self):
        rmdir(self.tmp)
        self.tmp.mkdir()

    def _setup_logfiles(self):
        self.tmp.joinpath("logs").mkdir()

        for svc_id in self.config.services:
            self._get_logfile_for_svc(svc_id).touch()

        self._get_logfile_for_svc("devd").touch()

    def _log(self, msg):
        print(f"[devd] {msg}")

    def _get_logfile_for_svc(self, svc_id: str) -> Path:
        return self.tmp.joinpath("logs").joinpath(svc_id)

    def _cmd_window(self, name: str, cmd: str, rerun_if_exists: bool = True):
        if name in set(map(lambda w: w.name, self.session.list_windows())):
            if rerun_if_exists:
                print("Command already running, killing")
                self.session.kill_window(name)
            else:
                return

        command = f"{self.root}/scripts/dev/shell.sh -c {shlex.quote(cmd)}"
        print("[devd] new cmd window: " + command)

        self.session.new_window(
            name,
            str(self.root),
            False,
            "",  # str(self._free_window_index(name)),
            command
        )

    def _free_window_index(self, name: str, index_base: int = 100):
        """Finds a loose"""
        window_set = set(map(lambda w: w.index,
                         self.session.list_windows()))

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

    def _start_services(self, services: set):
        for svc_id, svc_config in self.config.services:
            if len(services) == 0 or svc_id in services:
                window = self.session
            else:
                print("")

    def _restart_tailor(self, services: Union[set, None] = None):
        log_root = str(self.tmp.joinpath("logs")) + "/"
        watch = ["*"]

        if services:
            pass

        self._cmd_window(
            "devd-tailor",
            f"cd {log_root} && " + "parallel --tagstring \"{}: \" --line-buffer tail -f {} ::: " +
            " ".join(watch)
        )


def main():
    """main"""

    if os.getenv("DEV_ROOT") is None:
        raise Exception("needs to run inside dev")

    if len(sys.argv) <= 1:
        raise Exception("needs command")

    args = sys.argv[1:]
    args.reverse()
    Devd(Path(os.getenv("DEV_ROOT"))).command(args)


if __name__ == "__main__":
    main()
