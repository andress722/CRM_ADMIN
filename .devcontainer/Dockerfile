FROM mcr.microsoft.com/devcontainers/python:2-3.14-trixie

# The base image includes Yarn APT source but not its key on Debian Trixie.
# Add the missing key so feature installs that run apt-get update do not fail.
RUN set -eux; \
    mkdir -p /usr/share/keyrings; \
    curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg \
    | gpg --dearmor --batch --yes -o /usr/share/keyrings/yarn-archive-keyring.gpg

