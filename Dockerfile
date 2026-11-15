FROM node:22-alpine
WORKDIR /app
COPY server.js login.html ./
COPY public ./public
RUN mkdir -p /app/data
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
