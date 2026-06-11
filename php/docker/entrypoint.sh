#!/usr/bin/env sh
set -eu

cd /var/www/html

CONFIG_DIR=/var/www/html/config-data
mkdir -p "$CONFIG_DIR" runtime

if [ ! -f "$CONFIG_DIR/.env" ]; then
  cat > "$CONFIG_DIR/.env" <<EOF
APP_DEBUG=${APP_DEBUG:-false}
APP_TRACE=false

MOLIZHISHU_BASE_URL=${MOLIZHISHU_BASE_URL:-https://business-api.molizhishu.com/api/business/monitor}
MOLIZHISHU_CITY_URL=${MOLIZHISHU_CITY_URL:-https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info}
MOLIZHISHU_TOKEN=${MOLIZHISHU_TOKEN:-}
MOLIZHISHU_CALLBACK_URL=${MOLIZHISHU_CALLBACK_URL:-}
MOLIZHISHU_ALLOW_API_KEY_UPDATE=${MOLIZHISHU_ALLOW_API_KEY_UPDATE:-true}
MOLIZHISHU_TIMEOUT=${MOLIZHISHU_TIMEOUT:-30}
MOLIZHISHU_CALLBACK_MAX_BYTES=${MOLIZHISHU_CALLBACK_MAX_BYTES:-5242880}

DATABASE_TYPE=mysql
DATABASE_HOST=${DATABASE_HOST:-db}
DATABASE_NAME=${DATABASE_NAME:-molizhishu}
DATABASE_USER=${DATABASE_USER:-molizhishu}
DATABASE_PASSWORD=${DATABASE_PASSWORD:-molizhishu_password}
DATABASE_PORT=${DATABASE_PORT:-3306}
DATABASE_CHARSET=utf8mb4
EOF
fi

ln -sf "$CONFIG_DIR/.env" .env
chown -R www-data:www-data runtime "$CONFIG_DIR" .env

exec "$@"
