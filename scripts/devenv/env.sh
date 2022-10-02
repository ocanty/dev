#!/bin/bash

export XDG_CONFIG_HOME="$DEV_ROOT/.config"
export NVM_DIR="$DEV_ROOT/vendor/nvm"
export PATH="$DEV_ROOT:$PATH"
export PATH="$DEV_ROOT/vendor/bin:$PATH"
export PATH="$DEV_ROOT/vendor/go/bin:$PATH"
export PATH="$DEV_ROOT/vendor/tmux:$PATH"
export GOPATH="$DEV_ROOT/vendor/go"

. "$NVM_DIR/nvm.sh"
. "$NVM_DIR/bash_completion"

yarn set version berry || true

nvm use > /dev/null

export PATH="$DEV_ROOT/node_modules/.bin:$PATH"

. "$DEV_ROOT/vendor/python3/bin/activate"

export DEV_ENV_DONE=1
