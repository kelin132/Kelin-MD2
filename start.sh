#!/bin/bash
while true
do
    echo "Starting Kelin-MD2..."
    node index.js
    echo "Bot exited with code $?. Restarting in 5 seconds..."
    sleep 5
done
