#!/bin/bash

if [ -z ${DEV_ROOT+x} ]; then
    echo "DEV_ROOT environ variable is unset."
    echo "Do not run this script directly, run dev from the repository root."
    exit 1
fi

SESSION="dev"
TMUX="${DEV_ROOT}/vendor/tmux/tmux -L dev-srv -f ${DEV_ROOT}/scripts/dev/tmux.conf"

start() {
    echo "Starting dev, please wait..."
    [ -d "./vendor" ] || vendor

    $TMUX has-session -t $SESSION 2>/dev/null
    if [ $? == 0 ]; then
        echo "dev already running, attaching..."
        $TMUX attach-session -t $SESSION
        exit 
    fi

    $TMUX new-session -A -d -s $SESSION "${DEV_ROOT}/scripts/dev/shell.sh"
    $TMUX set-option -t $SESSION default-shell "${DEV_ROOT}/scripts/dev/shell.sh"

    start_devd

    $TMUX attach-session -t $SESSION
}

start_devd() {
    window=100
    $TMUX new-window -t $SESSION:$window 
    $TMUX rename-window -t $SESSION:$window 'devd'
    $TMUX send-keys -t $SESSION:$window "while true; do ${DEV_ROOT}/scripts/dev/devd.py monitor; sleep 1; done" C-m 
    # $TMUX send-keys -t $SESSION:$window "${DEV_ROOT}/dev stop" C-m
}

start_code() {
    if [[ ! -v VSCODE_GIT_IPC_HANDLE ]]; then
        echo "[dev] starting vscode"
        echo "[dev] checking if vscode extensions are installed"
        jq -r '.recommendations[]' "${DEV_ROOT}/.vscode/extensions.json" \
            | xargs -i -- sh -c "code --install-extension {} || true"    \
            | awk '!/is already installed/ && !/Installing extensions/'  \

        code $DEV_ROOT
    else
        echo "[dev] vscode is already open"
        exit 0
    fi 
}


window() {
    $TMUX choose-tree -s $SESSION
}

stop() {
    echo "Stopping dev, please wait..."

    $TMUX has-session -t $SESSION 2>/dev/null
    if [ $? == 0 ]; then
        $TMUX kill-session -t $SESSION
        echo "dev stopped."
        exit 
    else
        echo "dev is not running."
        exit 1
    fi
}

vendor() {
    cd $DEV_ROOT && run-parts ./scripts/vendor
    commit_vendored
}

commit_vendored() {
    echo
    read -p "[dev] Commit vendored dependencies (y/n)? " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        git stage ${DEV_ROOT}/vendor/
        git commit -m "[vendor] vendored dependencies"
    fi
}

node_modules() {
    cd $DEV_ROOT && ./scripts/vendor/02-node_modules
    commit_vendored
}

if [ $# -eq 0 ]; then
    start
    return
fi

while test $# -gt 0
do
    case "$1" in
        start)
            start
            ;;

        devd)
            start_devd
            ;;

        code)
            start_code
            ;;

        stop)
            stop
            ;;

        vendor)
            vendor
            ;;

        window)
            window
            ;;

        node_modules)
            node_modules
            ;;

        *)
            start
            ;;
    esac
    shift
done
