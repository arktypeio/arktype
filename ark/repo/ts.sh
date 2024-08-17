#!/bin/bash


NODE_VERSION=$(node -v)

MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')
MINOR=$(echo $NODE_VERSION | cut -d. -f2)


if [ "$MAJOR" -gt 22 ] || { [ "$MAJOR" -eq 22 ] && [ "$MINOR" -ge 6 ]; }; then
    node --conditions ark-ts --experimental-strip-types --no-warnings "$@"
else
    echo "--experimental-strip-types requires Node >= 22.6.0, falling back to tsx..."
    node --conditions ark-ts --import tsx "$@"
fi
