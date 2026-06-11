FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM composer:2 AS composer-build
ARG COMPOSER_REPO_PACKAGIST=https://mirrors.aliyun.com/composer/
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MAX_PARALLEL_HTTP=4 \
    COMPOSER_PROCESS_TIMEOUT=600
WORKDIR /app/php
COPY php/composer.json php/composer.lock ./
RUN composer config -g repo.packagist composer "$COMPOSER_REPO_PACKAGIST" \
    && for attempt in 1 2 3 4 5; do \
        composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader && break; \
        if [ "$attempt" = "5" ]; then exit 1; fi; \
        composer clear-cache; \
        sleep $((attempt * 5)); \
    done
COPY php ./
RUN composer dump-autoload --no-dev --optimize

FROM php:8.2-apache AS php-api

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client libzip-dev unzip \
    && docker-php-ext-install pdo_mysql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=composer-build /app/php ./
COPY php/docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY php/docker/entrypoint.sh /usr/local/bin/molizhishu-entrypoint

RUN mkdir -p /var/www/html/config-data /var/www/html/runtime \
    && chmod +x /usr/local/bin/molizhishu-entrypoint \
    && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public /var/www/html/config-data

ENTRYPOINT ["molizhishu-entrypoint"]
EXPOSE 18080
CMD ["apache2-foreground"]

FROM php:8.2-cli AS php-worker

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client libzip-dev unzip \
    && docker-php-ext-install pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=composer-build /app/php ./
COPY php/docker/entrypoint.sh /usr/local/bin/molizhishu-entrypoint

RUN mkdir -p /var/www/html/config-data /var/www/html/runtime \
    && chmod +x /usr/local/bin/molizhishu-entrypoint \
    && chown -R www-data:www-data /var/www/html/runtime /var/www/html/config-data

ENTRYPOINT ["molizhishu-entrypoint"]
CMD ["sh", "scripts/sync-pending-loop.sh"]

FROM nginx:1.27-alpine AS web
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY php/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 18000
