bash
#!/bin/sh
#   self-signed TLS certificate     HTTPS.
#      production —      CA
# (.. Let's Encrypt  certbot).  browser   "Not Secure" warning   , 
# :        .
set -e

mkdir -p "$(dirname "$0")"
cd "$(dirname "$0")"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout wealthos.local.key \
  -out wealthos.local.crt \
  -subj "/C=GR/ST=Attica/L=Athens/O=WealthOS Dev/CN=localhost"

echo "Generated wealthos.local.crt / wealthos.local.key in $(pwd)"
16.2 Nginx TLS server block (,  conf)