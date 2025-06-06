#!/bin/bash

# Pull the latest image
docker pull ghcr.io/dhbwloerrach/campus-rallye-admin:latest

# Stop and remove the existing container if it exists
docker stop campus-rallye-admin || true
docker rm campus-rallye-admin || true

# Run the new container
docker run -d \
  --name campus-rallye-admin \
  -v /srv/docker/campusrallye/db:/app/data \
  -v /srv/docker/campusrallye/env:/app/.env.local:ro \
  -p 127.0.0.1:3001:3000 \
  ghcr.io/dhbwloerrach/campus-rallye-admin:latest

