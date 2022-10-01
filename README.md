# `dev`

**If you are using this repo you should expect code to be in a half-working crude state.**

`dev` is my development environment for any new personal projects I am working on.
Once a project reaches a certain level of quality it will be graduated from this repository to one of its own.

`dev` exists because I got sick of managing containers/tooling/formatting/linting/service runners across repositories.

**Linux x86-64 only!**

## Intro

### Repo control with `devenv`

`devenv` - Start/enter the development environment

`devenv code` - Open Visual Studio Code (also installs recommended extensions)

`devenv vendor` - Revendor all dependencies.

`devenv node_modules` - Rebuild `node_modules`.

### Project control with `devctl` (dev daemon)

`devctl` monitors projects running inside the environment and ensures they stay running.

Configure it in `devctl-config.yml`.

`devctl` - Start devd monitor (automatically started when entering the development environment)

`devctl start <proj1> <proj2>` - Start projects

`devctl stop <proj1> <proj2>` - Stop projects

`devctl start-groups <group1> <group2>` - Start a group of projects

`devctl stop-groups <group1> <group2>` - Stop a group of projects

## TODO List

This is a rolling TODO list for this repository.

