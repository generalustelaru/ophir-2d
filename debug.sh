#!/bin/bash
# debug.sh
curl "http://localhost:3001/debug?command=$1&target=$2&option=$3" | jq -C