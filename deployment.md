# Deployment with Docker

This involves building the docker image locally, pushing it to GitHub Container registry (ghcr.io) and pulling the image in the server.

## Create Personal Access Tokens (PAT) on GitHub

- Settings ➔ Developer settings ➔ Personal access tokens ➔ Tokens (classic) ➔ Generate new token (classic)
  - PAT for dev: `campus-rallye-admin-push` with `write:packages` scope.
  - PAT for server: `campus-rallye-admin-docker` with `read:packages` scope.

## Build and push image

- `docker build . --platform linux/amd64 -t ghcr.io/dhbwloerrach/campus-rallye-admin:latest`
- `docker login ghcr.io` with PAT `campus-rallye-admin-push` as password
- `docker push ghcr.io/dhbwloerrach/campus-rallye-admin:latest`
- Verify that the new package landed in https://github.com/orgs/DHBWLoerrach/packages/container/package/campus-rallye-admin
- (Occasionly remove obsolete versions.)

## Deploy on server (WIP)

- Set environment variable `GHCR_PAT` to contain server PAT
- Execute deployment script
