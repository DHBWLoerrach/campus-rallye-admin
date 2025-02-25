#!/bin/bash

# Authenticate with GHCR
echo $GHCR_PAT | docker login ghcr.io -u behrends --password-stdin

# Pull the latest image
docker pull ghcr.io/dhbwloerrach/campus-rallye-admin:latest

# Stop and remove the existing container if it exists
docker stop campus-rallye-admin || true
docker rm campus-rallye-admin || true

# Run the new container
docker run -d \
  --name campus-rallye-admin \
  -v /srv/docker/campusrallye/env:/app/.env.local:ro \
  -p 3001:3000 \
  ghcr.io/dhbwloerrach/campus-rallye-admin:latest

