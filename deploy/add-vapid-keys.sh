#!/usr/bin/env bash
# Gives the study cat's push nudges their VAPID keys, once, on the VPS.
#
# Run from a workstation, with the contact address push services may use:
#   ssh root@194.233.79.158 'bash -s' -- mailto:you@example.com < deploy/add-vapid-keys.sh
#
# The key pair is made on the server with openssl and appended to
# .env.production. The private key never leaves the server and is never
# printed. It refuses to run twice: new keys would silently break every
# device that has already turned nudges on.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/studydash/.env.production}"
SUBJECT="${1:-}"

if [[ ! "$SUBJECT" =~ ^(mailto:|https://) ]]; then
  echo "Pass a contact address, like mailto:you@example.com" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No $ENV_FILE here" >&2
  exit 1
fi
if grep -q '^VAPID_' "$ENV_FILE"; then
  echo "VAPID keys are already set. Leaving them alone."
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
b64url() { base64 | tr '+/' '-_' | tr -d '=\n'; }

openssl ecparam -name prime256v1 -genkey -noout -out "$tmp/key.pem"
# The 32-byte private scalar sits 7 bytes into the DER; the public point is
# the last 65 bytes of the public key's DER.
private="$(openssl ec -in "$tmp/key.pem" -outform DER 2>/dev/null | tail -c +8 | head -c 32 | b64url)"
public="$(openssl ec -in "$tmp/key.pem" -pubout -outform DER 2>/dev/null | tail -c 65 | b64url)"

if [[ ${#private} -ne 43 || ${#public} -ne 87 ]]; then
  echo "Key generation produced an unexpected shape; nothing was written." >&2
  exit 1
fi

cp -p "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
{
  echo
  echo "# The study cat's push nudges. Never rotate these."
  echo "VAPID_PUBLIC_KEY=$public"
  echo "VAPID_PRIVATE_KEY=$private"
  echo "VAPID_SUBJECT=$SUBJECT"
} >> "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "Added VAPID keys to $ENV_FILE (backup kept next to it)."
echo "Public key: $public"
echo "Restart the app to pick them up, or push to main and let the deploy do it."
