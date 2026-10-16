#!/bin/bash

# Some hosting panels inject a CA bundle path that is not present in the
# container. Node reads NODE_EXTRA_CA_CERTS before index.js can run, so handle
# that stale override here and keep Node's normal certificate validation on.
if [[ -n "${NODE_EXTRA_CA_CERTS:-}" && ! -r "$NODE_EXTRA_CA_CERTS" ]]; then
    echo "Warning: NODE_EXTRA_CA_CERTS points to an unreadable file; using Node.js default CA certificates."
    unset NODE_EXTRA_CA_CERTS
fi

while true
do
    echo "Starting Kelin-MD2..."
    node index.js
    echo "Bot exited with code $?. Restarting in 5 seconds..."
    sleep 5
done
