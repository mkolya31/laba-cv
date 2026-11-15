#!/bin/sh
# One-time provisioning only. Does not start containers or modify the gateway.
set -eu
umask 022

die() { printf '%s\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die 'Run through sudo.'
[ "$(uname -s)" = Linux ] || die 'Linux required.'
[ "$(uname -m)" = x86_64 ] || die 'This pinned Node distribution requires x86_64.'
[ "$#" -eq 1 ] || die 'Usage: sudo sh bootstrap-vps.sh SOURCE_DIRECTORY'
source_dir=$(realpath "$1")
base=/srv/kolyach-dev
site=/opt/kolyach-dev
runtime=/opt/node24
deploy_user=deploy-cv
author=mkolyach
node_version=24.22.3
node_sha=4f2b175a6d53a5c617a80dba2676238a0688cef28c6da4eba35c7d844e66fcfb

for command in curl tar sha256sum install useradd getent; do
  command -v "$command" >/dev/null || die "Missing prerequisite: $command"
done
getent passwd "$author" >/dev/null || die 'Author account not found.'
for path in /srv /opt "$base" "$site" "$runtime"; do
  [ ! -L "$path" ] || die "Refusing symlink: $path"
done
for file in scripts/activate-release.mjs scripts/releases.mjs scripts/release-files.mjs scripts/generate-runtime.mjs src/lib/runtime.ts deploy/compose.yaml deploy/nginx.conf ci-deploy.pub; do
  [ -f "$source_dir/$file" ] && [ ! -L "$source_dir/$file" ] || die "Missing regular source file: $file"
done
IFS= read -r public_key < "$source_dir/ci-deploy.pub"
public_key=$(printf '%s' "$public_key" | tr -d '\r')
printf '%s\n' "$public_key" | grep -Eq '^ssh-ed25519 [A-Za-z0-9+/=]+( .*)?$' || die 'Expected an Ed25519 public key.'
if id "$deploy_user" >/dev/null 2>&1; then
  ! id -nG "$deploy_user" | tr ' ' '\n' | grep -Eq '^(sudo|docker|web)$' || die 'Existing deploy account has excessive privileges.'
  [ "$(getent passwd "$deploy_user" | cut -d: -f6)" = "/home/$deploy_user" ] || die 'Unexpected deploy home.'
fi
if [ -e "$runtime" ]; then
  [ -x "$runtime/bin/node" ] || die 'Existing runtime needs manual inspection.'
  [ "$("$runtime/bin/node" --version)" = "v$node_version" ] || die 'Existing Node version differs; review before upgrading.'
else
  temporary=$(mktemp -d /opt/kolyach-cv-node.XXXXXX)
  trap 'case "$temporary" in /opt/kolyach-cv-node.*) rm -rf -- "$temporary";; esac' EXIT HUP INT TERM
  curl --proto '=https' --proto-redir '=https' --tlsv1.2 --fail --show-error --location \
    "https://nodejs.org/dist/v$node_version/node-v$node_version-linux-x64.tar.xz" -o "$temporary/node.tar.xz"
  printf '%s  %s\n' "$node_sha" "$temporary/node.tar.xz" | sha256sum --check
  mkdir "$temporary/runtime"
  tar -xJf "$temporary/node.tar.xz" --strip-components=1 -C "$temporary/runtime"
  [ "$("$temporary/runtime/bin/node" --version)" = "v$node_version" ] || die 'Unexpected Node version.'
  chmod -R go-w "$temporary/runtime"
  mv "$temporary/runtime" "$runtime"
fi

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$deploy_user"
fi
for path in "$base/releases" "$base/assets" "$base/live" "$base/shared" "$base/tools" "$base/.state" "$site" "/home/$deploy_user/.ssh"; do
  [ ! -L "$path" ] || die "Refusing symlink: $path"
done
install -d -o root -g root -m 755 "$base" "$base/tools" "$base/tools/scripts" "$base/tools/src" "$base/tools/src/lib" "$site"
install -d -o "$deploy_user" -g "$deploy_user" -m 755 "$base/releases" "$base/assets" "$base/live"
install -d -o "$deploy_user" -g "$deploy_user" -m 700 "$base/.state" "/home/$deploy_user/.ssh"
install -d -o "$author" -g "$author" -m 755 "$base/shared"
for file in activate-release.mjs releases.mjs release-files.mjs generate-runtime.mjs; do
  install -o root -g root -m 644 "$source_dir/scripts/$file" "$base/tools/scripts/$file"
done
install -o root -g root -m 644 "$source_dir/src/lib/runtime.ts" "$base/tools/src/lib/runtime.ts"
printf '{"type":"module"}\n' > "$base/tools/package.json"
chmod 644 "$base/tools/package.json"
install -o root -g root -m 644 "$source_dir/deploy/compose.yaml" "$site/compose.yaml"
install -o root -g root -m 644 "$source_dir/deploy/nginx.conf" "$site/nginx.conf"
authorized="/home/$deploy_user/.ssh/authorized_keys"
if [ -e "$authorized" ] || [ -L "$authorized" ]; then
  [ -f "$authorized" ] && [ ! -L "$authorized" ] || die 'Unexpected authorized_keys.'
  [ "$(cat "$authorized")" = "restrict $public_key" ] || die 'Existing authorized_keys differs; review without overwriting it.'
else
  printf 'restrict %s\n' "$public_key" > "$authorized"
fi
chown "$deploy_user:$deploy_user" "$authorized"
chmod 600 "$authorized"
printf '\nPrepared Node %s, deploy-cv, site directories and tools.\n' "$node_version"
printf 'No containers started; no gateway/TLS/contact files changed.\n'
