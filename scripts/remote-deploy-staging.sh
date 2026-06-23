#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$HOME/house-dev.pjparisien.ca"
ARCHIVE="$APP_DIR/.houseapp-release.zip"
PHP_PATH="/opt/cpanel/ea-php83/root/usr/bin"

cd "$APP_DIR"
test -f "$ARCHIVE"
test -f .env

restore_site() {
    rm -f "$ARCHIVE" "$APP_DIR/.deploy-staging.sh"
    PATH="$PHP_PATH:$PATH" php artisan up >/dev/null 2>&1 || true
}
trap restore_site EXIT

PATH="$PHP_PATH:$PATH" php artisan down --retry=30 --refresh=15 || true
unzip -oq "$ARCHIVE"

for directory in app bootstrap config database public resources routes; do
    find "$directory" -type d -exec chmod 755 {} \;
    find "$directory" -type f -exec chmod 644 {} \;
done
chmod 755 artisan
chmod -R 775 storage bootstrap/cache

PATH="$PHP_PATH:$PATH" composer install --no-dev --optimize-autoloader --no-interaction
PATH="$PHP_PATH:$PATH" php artisan migrate --force
PATH="$PHP_PATH:$PATH" php artisan optimize
PATH="$PHP_PATH:$PATH" php artisan up

curl -fsS http://house-dev.pjparisien.ca/up >/dev/null

trap - EXIT
rm -f "$ARCHIVE" "$APP_DIR/.deploy-staging.sh"
echo "Staging deployment completed successfully."
