# HouseApp deployment

HouseApp runs as a Laravel 13 application with the compiled Ionic frontend in
`server/public/app`. The domain document root must point to the Laravel
`public` directory, never the project root.

## Server layout

```text
/home/CPANEL_USER/houseapp/
  app/
  bootstrap/
  config/
  public/              <- house.pjparisien.ca document root
    app/                <- compiled Ionic frontend
  routes/
  storage/
  vendor/
```

## Environment

Create `server/.env` on the server from `.env.example`. Set at least:

```dotenv
APP_NAME=HouseApp
APP_ENV=production
APP_DEBUG=false
APP_URL=https://house.pjparisien.ca

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=CPANEL_DATABASE_NAME
DB_USERNAME=CPANEL_DATABASE_USER
DB_PASSWORD=PRIVATE_DATABASE_PASSWORD

HOUSEAPP_ADMIN_NAME=PJ
HOUSEAPP_ADMIN_USERNAME=pj
HOUSEAPP_ADMIN_PASSWORD=PRIVATE_INITIAL_PASSWORD
```

Never commit or upload a local `.env` file.

## Build locally

```powershell
npm.cmd install
npm.cmd run build
```

This writes the frontend build to `server/public/app`.

## Install on WHC

Run all PHP and Composer commands through the PHP 8.3 path:

```bash
cd ~/houseapp
PATH=/opt/cpanel/ea-php83/root/usr/bin:$PATH composer install --no-dev --optimize-autoloader
PATH=/opt/cpanel/ea-php83/root/usr/bin:$PATH php artisan key:generate
PATH=/opt/cpanel/ea-php83/root/usr/bin:$PATH php artisan migrate --seed --force
PATH=/opt/cpanel/ea-php83/root/usr/bin:$PATH php artisan optimize
chmod -R ug+rw storage bootstrap/cache
```

After the first successful seed, remove `HOUSEAPP_ADMIN_PASSWORD` from the
server `.env`; password changes are handled inside HouseApp.
