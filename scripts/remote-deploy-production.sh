#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$HOME/house.pjparisien.ca"
BACKUP_DIR="$HOME/houseapp-backups"
ARCHIVE="$APP_DIR/.houseapp-release.zip"
PHP_PATH="/opt/cpanel/ea-php83/root/usr/bin"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MYSQL_CNF="$BACKUP_DIR/.mysql-$STAMP.cnf"

cd "$APP_DIR"
test -f "$ARCHIVE"
test -f .env
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

restore_site() {
    rm -f "$ARCHIVE" "$APP_DIR/.deploy-production.sh" "$MYSQL_CNF"
    PATH="$PHP_PATH:$PATH" php artisan up >/dev/null 2>&1 || true
}
trap restore_site EXIT

DB_NAME=$(PATH="$PHP_PATH:$PATH" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo config("database.connections.mysql.database");
')

PATH="$PHP_PATH:$PATH" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = config("database.connections.mysql");
$contents = "[client]\n"
    ."host=".$db["host"]."\n"
    ."port=".$db["port"]."\n"
    ."user=".$db["username"]."\n"
    ."password=".$db["password"]."\n";
file_put_contents($argv[1], $contents);
chmod($argv[1], 0600);
' "$MYSQL_CNF"

mysqldump --defaults-extra-file="$MYSQL_CNF" --single-transaction --skip-lock-tables "$DB_NAME" | gzip > "$BACKUP_DIR/$STAMP-database.sql.gz"
rm -f "$MYSQL_CNF"

tar -czf "$BACKUP_DIR/$STAMP-code.tar.gz" \
    --exclude='./vendor' \
    --exclude='./storage/framework' \
    --exclude='./storage/logs' \
    --exclude='./.houseapp-release.zip' \
    --exclude='./.deploy-production.sh' \
    .
chmod 600 "$BACKUP_DIR/$STAMP-database.sql.gz" "$BACKUP_DIR/$STAMP-code.tar.gz"

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

curl -fsS https://house.pjparisien.ca/up >/dev/null

trap - EXIT
rm -f "$ARCHIVE" "$APP_DIR/.deploy-production.sh"
echo "Production deployment completed successfully. Backups: $STAMP"
