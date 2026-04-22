# Deployment Guide

## Infrastructure
- **VM:** GCP e2-micro, Debian 12, us-east1 (`34.24.229.194`)
- **Frontend:** `https://mingthing.org` → Remix (PM2, port 3000)
- **API:** `https://api.mingthing.org` → Laravel (PHP-FPM 8.4, Nginx)
- **Database:** SQLite at `apps/api/database/database.sqlite`
- **Media:** S3

## SSH into the VM
```bash
gcloud compute ssh travel-it --zone=us-east1-b
# or use the SSH button in GCP Console
```

## Releasing changes

### API changes (Laravel)

```bash
cd ~/travel-it
git pull

cd apps/api

# If composer.json changed:
composer install --no-dev --optimize-autoloader

# If migrations added:
php artisan migrate --force

# Always run after any API change:
php artisan config:cache
php artisan route:cache

# Nginx/PHP-FPM picks up changes automatically — no restart needed
```

### Frontend changes (Remix)

```bash
cd ~/travel-it
git pull

# If package.json changed:
npm install

cd apps/frontend
npx remix vite:build

pm2 restart frontend
```

### Both changed

```bash
cd ~/travel-it
git pull

# API
cd apps/api
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# Frontend
cd ~/travel-it
npm install
cd apps/frontend
npx remix vite:build
pm2 restart frontend
```

## PM2 commands

```bash
pm2 status              # check frontend is running
pm2 logs frontend       # view logs
pm2 restart frontend    # restart after changes
pm2 save                # persist process list across reboots
```

## Things to update when adding new environment variables

- **API:** edit `~/travel-it/apps/api/.env` on the VM, then run `php artisan config:cache`
- **Frontend:** update the PM2 start command in this file and restart:
  ```bash
  pm2 delete frontend
  API_BASE_URL=https://api.mingthing.org pm2 start "npx remix-serve build/server/index.js" --name frontend
  pm2 save
  ```

## CORS

Allowed origins are configured in `apps/api/config/cors.php`. If you add a new frontend domain, update `allowed_origins` and run `php artisan config:cache` on the VM.
