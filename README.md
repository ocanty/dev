# `dev`

`dev` is my development environment for any new personal projects I am working on.
Once a project reaches a certain level of quality it will be graduated from this repository to one of its own.

If you are using this repo you should expect code to be in a half-working crude state.

`dev` exists because I got sick of managing containers/tooling/formatting/linting/service runners across repositories.

**Linux x86-64 only!**

## Intro

How to use `dev` successfully

### Repo control with `dev`

`dev` - Start/enter the development environment

`dev code` - Open Visual Studio Code (also installs recommended extensions)

`dev vendor` - Revendor all dependencies.

`dev node_modules` - Rebuild `node_modules`.

### Project control with `devd` (dev daemon)

`devd` monitors projects running inside the environment and ensures they stay running.

Configure it in `devd-config.yml`.

`devd` - Start devd monitor (automatically started when entering the development environment)

`devd start-projects <proj1> <proj2>` - Start projects

`devd stop-projects <proj1> <proj2>` - Stop projects