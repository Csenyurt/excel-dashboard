FROM node:22-alpine
RUN apk add --no-cache curl tar
WORKDIR /app
ENV PORT=3000 DATA_DIR=/app/data
# Başlatıcı (start.sh) her açılışta GitHub'dan indirilir; kodun tamamını da o çeker.
CMD ["sh", "-c", "mkdir -p /app/data; if curl -fsSL --max-time 30 -o /tmp/start.sh https://raw.githubusercontent.com/Csenyurt/excel-dashboard/main/start.sh; then exec sh /tmp/start.sh; else cd /app/data/code && exec node server.js; fi"]
