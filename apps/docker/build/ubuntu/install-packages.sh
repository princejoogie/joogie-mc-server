#!/bin/sh

set -e

apt-get update

DEBIAN_FRONTEND=noninteractive \
apt-get install -y \
  imagemagick \
  file \
  gosu \
  sudo \
  net-tools \
  iputils-ping \
  curl \
  git \
  jq \
  dos2unix \
  mysql-client \
  tzdata \
  rsync \
  nano \
  unzip \
  zstd \
  lbzip2 \
  knockd \
  nfs-common

apt-get clean