FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM composer:2 AS composer-build
WORKDIR /app/php
COPY php/composer.json php/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader
COPY php ./
RUN composer dump-autoload --no-dev --optimize

FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client libzip-dev unzip \
    && docker-php-ext-install pdo_mysql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=composer-build /app/php ./
COPY --from=frontend-build /app/frontend/dist ./public/
COPY php/docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY php/docker/entrypoint.sh /usr/local/bin/molizhishu-entrypoint

RUN mkdir -p /var/www/html/config-data /var/www/html/runtime \
    && chmod +x /usr/local/bin/molizhishu-entrypoint \
    && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public /var/www/html/config-data

EXPOSE 80

ENTRYPOINT ["molizhishu-entrypoint"]
CMD ["apache2-foreground"]
