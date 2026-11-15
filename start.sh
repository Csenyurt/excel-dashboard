#!/bin/sh
# Excel Dashboard başlatıcı: her açılışta en yeni kodu GitHub'dan çeker.
REPO="Csenyurt/excel-dashboard"
CODE=/app/data/code
mkdir -p /app/data
if curl -fsSL --max-time 60 -o /tmp/src.tgz "https://codeload.github.com/$REPO/tar.gz/refs/heads/main"; then
  rm -rf /tmp/src && mkdir -p /tmp/src && tar xzf /tmp/src.tgz -C /tmp/src --strip-components=1 \
    && [ -f /tmp/src/server.js ] && rm -rf "$CODE" && mv /tmp/src "$CODE" && echo "Kod güncellendi"
  SHA=$(curl -fsSL --max-time 20 "https://api.github.com/repos/$REPO/commits/main" | grep -m1 '"sha"' | cut -d'"' -f4)
  [ -n "$SHA" ] && echo "$SHA" > "$CODE/VERSION"
else
  echo "GitHub'a ulaşılamadı, son kopya kullanılıyor"
fi
cd "$CODE" && exec node server.js
