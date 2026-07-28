# Deployment Guide

Panduan deploy kedua service ke production.

## Prerequisites

- Node.js 20+
- Python 3.11+
- MariaDB 10.6+ (atau MySQL 8+)
- Domain + SSL (atau akses IP)
- Reverse proxy (Nginx direkomendasikan)

## Arsitektur Production

```
Internet → Nginx (port 80/443)
            ├── / → Next.js (port 3000)
            └── /api/sentiment/* → FastAPI (port 8000)
                    atau subdomain terpisah
```

---

## 1. Database (MariaDB)

### Install

```bash
sudo apt update
sudo apt install mariadb-server
sudo mysql_secure_installation
```

### Buat Database

```sql
CREATE DATABASE analisis_sentimen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sentimen_app'@'localhost' IDENTIFIED BY 'strong-password-here';
GRANT ALL PRIVILEGES ON analisis_sentimen.* TO 'sentimen_app'@'localhost';
FLUSH PRIVILEGES;
```

### Backup Otomatis

```bash
# /etc/cron.daily/backup-db
#!/bin/bash
mysqldump -u sentimen_app -p'strong-password-here' analisis_sentimen | gzip > /backups/db-$(date +%Y%m%d).sql.gz
find /backups -name "db-*.sql.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /etc/cron.daily/backup-db
```

---

## 2. Frontend (Next.js)

### Build

```bash
cd frontend
npm ci --production=false
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Environment Variables

Buat `.env` production:

```env
DATABASE_URL=mysql://sentimen_app:strong-password-here@localhost:3306/analisis_sentimen
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://yourdomain.com
SENTIMENT_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
TRAINING_DATASET_EXPORT_TOKEN=$(openssl rand -hex 32)
STUDENT_WEATHER_ADM4=32.12.16.2007
```

### Jalankan dengan PM2

```bash
npm install -g pm2

pm2 start npm --name "frontend" -- start
pm2 save
pm2 startup
```

### Seed (hanya pertama kali)

```bash
NODE_ENV=production node prisma/seed.mjs
```

---

## 3. Sentiment Service (FastAPI)

### Setup

```bash
cd sentiment-analysis-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Buat `.env` production:

```env
APP_ENV=production
APP_HOST=127.0.0.1
APP_PORT=8000
MODEL_VERSION=nb-v1
MODEL_PATH=app/ml/pipeline.joblib
TRAINING_DATASET_EXPORT_URL=https://yourdomain.com/admin/feedback/export
TRAINING_DATASET_EXPORT_TOKEN=same-token-as-frontend
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_PER_MINUTE=60
```

### Train Model

```bash
python scripts/train_model.py
```

### Jalankan dengan PM2 / Systemd

**Option A: PM2**

```bash
pm2 start .venv/bin/uvicorn --name "sentiment-api" -- app.main:app --host 127.0.0.1 --port 8000
pm2 save
```

**Option B: Systemd**

```ini
# /etc/systemd/system/sentiment-api.service
[Unit]
Description=Sentiment Analysis API
After=network.target

[Service]
User=deploy
WorkingDirectory=/home/deploy/sentiment-analysis-service
EnvironmentFile=/home/deploy/sentiment-analysis-service/.env
ExecStart=/home/deploy/sentiment-analysis-service/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable sentiment-api
sudo systemctl start sentiment-api
```

---

## 4. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/analisis-sentimen
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Sentiment API (jika pakai subpath)
    location /api/sentiment/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/analisis-sentimen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL dengan Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 5. Verifikasi Deployment

```bash
# Frontend
curl -I https://yourdomain.com
# Expected: 200 atau 302 (redirect to /login)

# Sentiment API
curl https://yourdomain.com/api/sentiment/health
# Expected: {"status":"ok","modelVersion":"nb-v1","modelReady":true}

# Predict
curl -X POST https://yourdomain.com/api/sentiment/predict \
  -H "Content-Type: application/json" \
  -d '{"comment":"materinya bagus","aspect":"MATERI","subject":"Agama"}'
```

---

## 6. Retrain Model

Setelah cukup data feedback terkumpul:

```bash
cd sentiment-analysis-service
source .venv/bin/activate

# Download dataset terbaru dari admin export + retrain
python scripts/train_model.py

# Restart service untuk load model baru
pm2 restart sentiment-api
# atau
sudo systemctl restart sentiment-api
```

---

## 7. Monitoring

```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs frontend
pm2 logs sentiment-api

# Systemd logs
sudo journalctl -u sentiment-api -f

# Database connections
mysql -u sentimen_app -p -e "SHOW PROCESSLIST;"
```

---

## 8. Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Login gagal | `NEXTAUTH_SECRET` beda atau kosong | Generate ulang, restart PM2 |
| Feedback tidak dianalisis | Sentiment service mati | `pm2 restart sentiment-api` |
| Predict 503 | Model belum di-train | Jalankan `train_model.py` |
| Database error | Connection limit | Check `max_connections` di MariaDB |
| CORS error | `CORS_ORIGINS` salah | Set ke domain production |
| Rate limit 429 | Terlalu banyak request | Naikkan `RATE_LIMIT_PER_MINUTE` |
| Import Excel timeout | File terlalu besar | Batas 2MB, kurangi rows |
