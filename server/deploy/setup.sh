#!/usr/bin/env bash
# Archemistry Lab API — yangi Ubuntu 24.04 VPS ni bir martalik sozlash.
# Ishlatish (serverda):  curl -fsSL https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi/main/server/deploy/setup.sh | sudo bash
# Qayta ishga tushirish xavfsiz: bor narsalar oʻzgartirilmaydi.
set -euo pipefail
REPO=https://github.com/IskandarArchemistryUz/kocha-profili-studiyasi.git
APP=/srv/archemistry
DOMAIN=api.archemistry.uz

echo "== 1/8 Tizim yangilanishi va kerakli dasturlar"
export DEBIAN_FRONTEND=noninteractive
# oʻrnatishdan qolgan CD-disk manbasi (file:/cdrom) apt ni toʻxtatadi — oʻchiriladi
sed -i '/cdrom/s/^/# /' /etc/apt/sources.list 2>/dev/null || true
apt-get update -y
apt-get install -y ca-certificates curl git nginx postgresql ufw fail2ban unattended-upgrades certbot python3-certbot-nginx
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== 2/8 Xavfsizlik devori (faqat SSH, HTTP, HTTPS)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now fail2ban

echo "== 3/8 Foydalanuvchi va kod"
id archemistry >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/archemistry --shell /bin/bash archemistry
mkdir -p "$APP"
[ -d "$APP/.git" ] || git clone --depth 50 "$REPO" "$APP"
chown -R archemistry:archemistry "$APP"

echo "== 4/8 PostgreSQL bazasi"
# baʼzi tayyor obrazlarda klaster yaratilmaydi yoki ishga tushmaydi
PGV=$(ls /usr/lib/postgresql | sort -V | tail -1)
pg_lsclusters -h | grep -q . || pg_createcluster "$PGV" main
pg_ctlcluster "$PGV" main start 2>/dev/null || true
systemctl enable --now postgresql
for i in $(seq 1 20); do sudo -u postgres psql -tAc 'SELECT 1' >/dev/null 2>&1 && break; sleep 1; done
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='archemistry'" | grep -q 1; then
  DBPASS=$(openssl rand -hex 24)
  sudo -u postgres psql -c "CREATE ROLE archemistry LOGIN PASSWORD '$DBPASS'"
  sudo -u postgres psql -c "CREATE DATABASE archemistry OWNER archemistry"
else DBPASS=""; fi

echo "== 5/8 .env (maxfiy qiymatlar faqat shu serverda)"
ENV="$APP/server/.env"
if [ ! -f "$ENV" ]; then
  [ -n "$DBPASS" ] || { echo "Baza bor, lekin .env yoʻq — DATABASE_URL ni qoʻlda yozing"; exit 1; }
  sed -e "s#postgres://archemistry:PAROL@#postgres://archemistry:$DBPASS@#" \
      -e "s#^OTP_PEPPER=.*#OTP_PEPPER=$(openssl rand -base64 32)#" \
      -e "s#^TICKET_SECRET=.*#TICKET_SECRET=$(openssl rand -base64 32)#" \
      "$APP/server/.env.example" > "$ENV"
  chown archemistry:archemistry "$ENV"; chmod 600 "$ENV"
fi
sudo -u archemistry bash -c "cd $APP/server && npm ci --omit=dev"

echo "== 6/8 Xizmat (systemd)"
cp "$APP/server/deploy/archemistry-api.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now archemistry-api
# avtomatik deploy uchun: archemistry foydalanuvchisi faqat shu xizmatni qayta ishga tushira oladi
echo "archemistry ALL=(root) NOPASSWD: /usr/bin/systemctl restart archemistry-api" > /etc/sudoers.d/archemistry
chmod 440 /etc/sudoers.d/archemistry

echo "== 7/8 Nginx va HTTPS"
cp "$APP/server/deploy/nginx-api.conf" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
if [ ! -d /etc/letsencrypt/live/$DOMAIN ]; then
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || echo "!! HTTPS sertifikati olinmadi: api.archemistry.uz DNS yozuvi shu serverga koʻrsatayotganini tekshiring va qayta ishga tushiring"
fi

echo "== 8/8 Kunlik zaxira nusxa"
chmod +x "$APP/server/deploy/backup.sh"
echo "30 3 * * * root $APP/server/deploy/backup.sh" > /etc/cron.d/archemistry-backup

sleep 2
curl -fsS http://127.0.0.1:8080/health && echo && echo "Tayyor: https://$DOMAIN/health"
