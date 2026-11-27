# Go Live: Podman + Cloudflare Tunnel

Panduan singkat menjalankan Telaah 360 di PC ini sebagai container Podman yang mudah di-start/stop, lalu diekspos lewat domain `telaah.hiiamanop.my.id` memakai Cloudflare Tunnel.

## Arsitektur

```text
Internet
  └─ Cloudflare (telaah.hiiamanop.my.id)
       └─ Cloudflare Tunnel (cloudflared)
            └─ Podman pod: telaah-pod
                 ├─ telaah-app     (Next.js, localhost:3000)
                 ├─ telaah-scraper (IDX scraper, localhost:8001)
                 └─ telaah-tunnel  (cloudflared)
```

Container app dan tunnel berada dalam satu Podman pod, jadi cloudflared cukup memanggil `http://localhost:3000`. Scraper hanya listen di `127.0.0.1:8001` dan tidak diekspos ke internet. Tidak perlu membuka port 80/443 atau memasang Nginx/SSL.

## Prasyarat

- Podman terpasang (`podman --version`).
- `.env` berisi `OPENROUTER_API_KEY`.
- Domain sudah ditambahkan sebagai **Public Hostname** di tunnel Cloudflare dengan service:
  ```text
  http://localhost:3000
  ```

## 1. Isi token tunnel

Di dashboard Cloudflare: **Zero Trust / Networks → Tunnels → pilih tunnel → Install connector → copy token**.

Tambahkan ke `.env` (jangan kirim token ke chat):

```env
TUNNEL_TOKEN=eyJ...
```

`TUNNEL_TOKEN` hanya dibaca oleh container cloudflared. File `.env` sudah di-ignore git.

## 2. Build dan jalankan

```bash
cd /home/ahmad/workspace/Telaah-AI
./deploy/podman/up.sh
```

Perintah ini:
- build image `telaah-ai:local` dan `telaah-scraper:local` jika belum ada;
- membuat pod `telaah-pod`;
- menjalankan `telaah-scraper` dan menunggu health check;
- menjalankan `telaah-app` dengan `.env`;
- menjalankan `telaah-tunnel` jika `TUNNEL_TOKEN` terisi.

Kalau app sudah berjalan dan kamu baru mengisi token, cukup tambahkan connector tanpa rebuild:

```bash
./deploy/podman/tunnel.sh
```

Cek status:

```bash
./deploy/podman/status.sh
```

## 3. Start / stop sehari-hari

```bash
./deploy/podman/start.sh    # start pod yang sudah ada
./deploy/podman/stop.sh     # stop pod (container tetap ada)
./deploy/podman/status.sh   # status + cek HTTP lokal/domain
./deploy/podman/logs.sh          # log app
./deploy/podman/logs.sh tunnel   # log cloudflared
./deploy/podman/logs.sh scraper  # log IDX scraper
```

Untuk rebuild setelah kode berubah:

```bash
REBUILD=1 ./deploy/podman/up.sh
```

## 4. Tes

```bash
curl -I http://127.0.0.1:3000
curl -I https://telaah.hiiamanop.my.id
curl -s http://127.0.0.1:3000/api/market-overview | head
```

Kalau subdomain masih `525`:
- pastikan container `telaah-tunnel` berjalan (`./deploy/podman/status.sh`);
- pastikan public hostname tunnel memakai `http://localhost:3000`, bukan `https://`;
- cek DNS `telaah.hiiamanop.my.id` sudah proxied ke tunnel, bukan A record ke IP rumah.

## 5. Pakai subdomain (telaah.hiiamanop.my.id)

Aplikasi tidak menyimpan domain di kode, jadi cukup tambahkan public hostname baru di tunnel:

```text
Subdomain : telaah
Domain    : hiiamanop.my.id
Path      : (kosong)
Service   : HTTP
URL       : localhost:3000
```

Cloudflare akan membuat CNAME `telaah.hiiamanop.my.id` ke tunnel secara otomatis. Tidak perlu restart container; cloudflared mengambil konfigurasi baru sendiri.

Kalau mau **hanya** subdomain yang aktif, hapus public hostname root `hiiamanop.my.id` dari tunnel. Kalau root ingin tetap mengarah ke aplikasi, biarkan keduanya.

Opsional, buat redirect root ke subdomain lewat Cloudflare **Rules → Redirect Rules**:

```text
Jika hostname = hiiamanop.my.id
Maka redirect 301 ke https://telaah.hiiamanop.my.id/$1
```

Tes:

```bash
curl -I https://telaah.hiiamanop.my.id
curl -sS https://telaah.hiiamanop.my.id/api/market-overview | head
```

## 6. Keamanan akses

Sebelum tunnel publik dinyalakan, selesaikan [CLOUDFLARE_ACCESS.md](CLOUDFLARE_ACCESS.md):
Cloudflare Access untuk pemilik, bypass khusus webhook Telegram, dan rate
limit API. Jangan biarkan `/api/analyze` terbuka tanpa autentikasi.

## 7. Catatan

- PC harus menyala dan Podman berjalan selama aplikasi dipakai.
- Qdrant/Redis tidak wajib. Tanpa Qdrant, semantic cache dilewati; tanpa Redis, cache memori lokal dipakai.
- `data/` di-mount ke container, jadi `data/market_cache.json` dan registry broker tetap tersedia.
- Jangan commit `.env` atau token tunnel.
