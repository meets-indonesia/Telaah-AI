# Panduan Deploy Telaah 360 di VPS Ubuntu/Debian

Dokumentasi lengkap langkah demi langkah untuk melakukan deploy aplikasi **Telaah 360** di VPS (Virtual Private Server) menggunakan **Node.js + PM2**, **Docker (Qdrant & Redis)**, dan **Nginx Reverse Proxy dengan SSL Let's Encrypt**.

---

## 1. Spesifikasi Minimum VPS

- **OS**: Ubuntu 22.04 LTS / 24.04 LTS atau Debian 12
- **RAM**: Minimal 2 GB (Disarankan 4 GB)
- **CPU**: 2 vCPU
- **Disk**: Minimal 25 GB SSD/NVMe
- **Domain**: Domain atau subdomain aktif yang sudah diarahkan (A Record) ke IP VPS Anda (contoh: `telaah.domainanda.com`).

---

## 2. Persiapan Server & Instalasi Dependency

Login ke VPS via SSH:
```bash
ssh root@IP_VPS_ANDA
```

Update repositori dan pasang paket dasar:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx
```

### Pasang Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v # Pastikan v20.x.x
```

### Pasang Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
docker compose version
```

---

## 3. Clone Repository & Setup Environment

Pindah ke folder web dan clone kode:
```bash
mkdir -p /var/www
cd /var/www
git clone <URL_REPOSITORY_ANDA> telaah-ai
cd telaah-ai
```

Pasang package dependency:
```bash
npm install
```

Salin dan edit file konfigurasi `.env`:
```bash
cp .env.example .env
nano .env
```

Pastikan variabel terisi dengan benar:
```env
SECTORS_API_KEY=api_key_sectors_resmi_anda
OPENROUTER_API_KEY=sk-or-v1-api_key_openrouter_anda
OPENROUTER_MODEL=qwen/qwen3.5-397b-a17b

# URL Database Internal Docker
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379
```
*Simpan file dengan menekan `Ctrl + O`, lalu `Enter`, lalu keluar dengan `Ctrl + X`.*

---

## 4. Jalankan Database (Qdrant & Redis) via Docker

Di dalam folder `/var/www/telaah-ai`, jalankan `docker-compose.yml`:
```bash
docker compose up -d
```

Verifikasi status kontainer:
```bash
docker ps
```
Anda akan melihat dua kontainer berjalan:
- `telaah-qdrant` di port `6333`
- `telaah-redis` di port `6379`

Tes koneksi:
```bash
curl http://127.0.0.1:6333/healthz
# Respon: {"title":"qdrant - vector search engine","version":"..."}

docker exec -it telaah-redis redis-cli ping
# Respon: PONG
```

---

## 5. Build & Jalankan Aplikasi Next.js dengan PM2

Lakukan compile production build Next.js:
```bash
npm run build
```

Jalankan aplikasi via PM2 di background:
```bash
pm2 start npm --name "telaah-ai" -- start -- -p 3000
```

Simpan konfigurasi PM2 agar otomatis hidup saat VPS reboot:
```bash
pm2 save
pm2 startup
```
*(Salin dan jalankan perintah `sudo env PATH=...` yang dimunculkan oleh `pm2 startup` jika ada).*

---

## 6. Konfigurasi Nginx & Domain

Buat file konfigurasi Nginx untuk domain Anda:
```bash
sudo nano /etc/nginx/sites-available/telaah
```

Isi dengan konfigurasi berikut (ganti `telaah.domainanda.com` dengan domain Anda):
```nginx
server {
    listen 80;
    server_name telaah.domainanda.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi dan uji Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/telaah /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Pasang SSL Gratis (HTTPS) dengan Certbot

Pasang Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Generate sertifikat SSL:
```bash
sudo certbot --nginx -d telaah.domainanda.com
```
*Masukkan email Anda dan setujui Terms of Service. Certbot akan otomatis mengonfigurasi HTTPS.*

---

## 8. Konfigurasi Firewall Server (UFW)

Amankan server dengan membuka hanya port yang diperlukan:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## 9. Setup Auto-Deploy Otomatis via GitHub Actions (CI/CD)

Setiap kali Anda push perubahan ke branch `main`, GitHub Actions akan otomatis login via SSH ke VPS, menjalankan `git pull`, `npm install`, `npm run build`, dan me-reload PM2 tanpa downtime.

### Langkah Setup GitHub Secrets:
1. Buka repositori Anda di GitHub.
2. Masuk ke **Settings** > **Secrets and variables** > **Actions** > klik **New repository secret**.
3. Tambahkan 3 variabel rahasia berikut:
   - **`VPS_HOST`**: Alamat IP publik VPS Anda (contoh: `103.123.45.67`).
   - **`VPS_USERNAME`**: User SSH VPS (contoh: `root` atau `ubuntu`).
   - **`VPS_SSH_KEY`**: Isi Private Key SSH Anda (isi file `~/.ssh/id_rsa` atau `~/.ssh/id_ed25519`).
   - *(Opsional)* **`VPS_PORT`**: Port SSH (default `22`).
   - *(Opsional)* **`VPS_PASSPHRASE`**: Jika Private Key Anda memiliki passphrase.

Workflow file sudah otomatis terpasang di `.github/workflows/deploy.yml`.

---

## 10. Pemeliharaan & Update Rutin

### Cara Update Manual (Jika tidak lewat GitHub Actions):
```bash
cd /var/www/telaah-ai
git pull origin main
npm install
npm run build
pm2 restart telaah-ai
```

### Monitoring & Log:
- Cek log aplikasi: `pm2 logs telaah-ai`
- Cek pemakaian RAM/CPU: `pm2 monit`
- Cek log Redis: `docker logs telaah-redis --tail 50`
- Cek log Qdrant: `docker logs telaah-qdrant --tail 50`
