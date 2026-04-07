# Deployment with Docker

This involves building the docker image locally, pushing it to GitHub Container registry (ghcr.io) and pulling the image in the server.

## Create Personal Access Tokens (PAT) on GitHub

- Settings ➔ Developer settings ➔ Personal access tokens ➔ Tokens (classic) ➔ Generate new token (classic)
  - PAT for dev: `push` with `write:packages` scope.
  - PAT for server: `pull` with `read:packages` scope.

## Build and push image

- `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_PROD_URL> . --platform linux/amd64 -t ghcr.io/dhbwloerrach/campus-rallye-admin:latest`
- `docker login ghcr.io` with PAT `push` as password
- `docker push ghcr.io/dhbwloerrach/campus-rallye-admin:latest`
- Verify that the new package landed in https://github.com/orgs/DHBWLoerrach/packages/container/package/campus-rallye-admin
- (Occasionally remove obsolete versions.)

## Deploy on server

- `docker login ghcr.io` with PAT `pull` as password
- `docker pull ghcr.io/dhbwloerrach/campus-rallye-admin:latest`
- `cd /etc/docker-compose/campusrallye`
- `docker compose down && docker compose up -d`
