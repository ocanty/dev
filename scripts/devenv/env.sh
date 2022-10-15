#!/bin/bash

# XDG
export XDG_CONFIG_HOME="$DEV_ROOT/.config"

# dev/root
export PATH="$DEV_ROOT:$PATH"

# generic bin
export PATH="$DEV_ROOT/vendor/bin:$PATH"

# nebula
export PATH="$DEV_ROOT/vendor/nebula:$PATH"

# tmux
export PATH="$DEV_ROOT/vendor/tmux:$PATH"

# Python3
. "$DEV_ROOT/vendor/python3/bin/activate"

# Go
export PATH="$DEV_ROOT/vendor/go/bin:$PATH"
export GOPATH="$DEV_ROOT/vendor/go"

# Node.js
export NVM_DIR="$DEV_ROOT/vendor/nvm"
. "$NVM_DIR/nvm.sh"
. "$NVM_DIR/bash_completion"

nvm use > /dev/null
yarn set version berry || true

export PATH="$DEV_ROOT/node_modules/.bin:$PATH"

# Packer
export PATH="$DEV_ROOT/vendor/packer:$PATH"


# Needs to be before ruby
export PATH="$DEV_ROOT/vendor/vagrant/exec:$PATH"

# Ruby
# . "$DEV_ROOT/vendor/rvm/scripts/rvm"
# rvm use 3.1

export DEV_ENV_DONE=1
