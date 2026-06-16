#!/usr/bin/env sh
set -eu

cd /var/www/html

export DEBIAN_FRONTEND=noninteractive
CONFIG_DIR=/var/www/html/config-data

if ! php -m | grep -qi '^pdo_mysql$' || ! php -m | grep -qi '^zip$' || ! command -v mysql >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends default-mysql-client libzip-dev unzip git ca-certificates
  docker-php-ext-install pdo_mysql zip
  rm -rf /var/lib/apt/lists/*
fi

if command -v a2enmod >/dev/null 2>&1; then
  a2enmod rewrite headers >/dev/null
  cp /var/www/html/docker/apache.conf /etc/apache2/sites-available/000-default.conf
fi

if ! command -v composer >/dev/null 2>&1; then
  php -r "copy('https://getcomposer.org/installer', '/tmp/composer-setup.php');"
  php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
  rm -f /tmp/composer-setup.php
fi

export COMPOSER_ALLOW_SUPERUSER=1
export COMPOSER_MAX_PARALLEL_HTTP="${COMPOSER_MAX_PARALLEL_HTTP:-4}"
export COMPOSER_PROCESS_TIMEOUT="${COMPOSER_PROCESS_TIMEOUT:-600}"

mkdir -p runtime "$CONFIG_DIR" vendor

COMPOSER_LOCK_DIR=/var/www/html/vendor/.composer-install.lock
while ! mkdir "$COMPOSER_LOCK_DIR" 2>/dev/null; do
  sleep 1
done
trap 'rmdir "$COMPOSER_LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

if [ ! -f vendor/autoload.php ]; then
  composer config -g repo.packagist composer "${COMPOSER_REPO_PACKAGIST:-https://mirrors.aliyun.com/composer/}"
  composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader
fi

rmdir "$COMPOSER_LOCK_DIR" 2>/dev/null || true
trap - EXIT INT TERM

SCHEMA_LOCK_DIR="$CONFIG_DIR/.schema-install.lock"
while ! mkdir "$SCHEMA_LOCK_DIR" 2>/dev/null; do
  sleep 1
done
trap 'rmdir "$SCHEMA_LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

if [ -f database/schema.sql ]; then
  mysql \
    --ssl=0 \
    -h "${DATABASE_HOST:-db}" \
    -P "${DATABASE_PORT:-3306}" \
    -u "${DATABASE_USER:-molizhishu}" \
    -p"${DATABASE_PASSWORD:-molizhishu_password}" \
    "${DATABASE_NAME:-molizhishu}" < database/schema.sql
fi

rmdir "$SCHEMA_LOCK_DIR" 2>/dev/null || true
trap - EXIT INT TERM

exec sh /var/www/html/docker/entrypoint.sh "$@"
