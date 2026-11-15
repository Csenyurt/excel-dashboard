FROM node:22-alpine
RUN apk add --no-cache curl tar
WORKDIR /app
COPY . /app/baked
ENV PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["sh", "/app/baked/start.sh"]
