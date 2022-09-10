#!/bin/bash

tailor() {
    kill_jobs
    cd ${DEV_ROOT}/logs
    parallel --tagstring "{}:" --line-buffer tail -f -n 0 {} ::: * &
    cd - > /dev/null
}

kill_jobs() {
    [[ -z "$(jobs -p)" ]] || kill $(jobs -p)
}

trap kill_jobs EXIT

inotifywait ${DEV_ROOT}/logs --recursive --monitor -e create -e moved_to --format "%f" \
| while read changed; do
    printf "$changed:\t"
    sleep 1
    cat "$DEV_ROOT/logs/$changed" 
    tailor
done