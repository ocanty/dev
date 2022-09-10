#!/bin/bash

export NVM_DIR="$DEV_ROOT/vendor/nvm"
export PATH="$DEV_ROOT/vendor/bin:$PATH"
export PATH="$DEV_ROOT/vendor/go/bin:$PATH"
export PATH="$DEV_ROOT/vendor/tmux:$PATH"
export GOPATH="$DEV_ROOT/vendor/go"

. "$NVM_DIR/nvm.sh"
. "$NVM_DIR/bash_completion"

nvm use > /dev/null
export PATH="$DEV_ROOT/vendor/node_modules/.bin:$PATH"

. "$DEV_ROOT/vendor/python3/bin/activate"

export DEV_ENV_DONE=1