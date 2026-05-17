FROM node:20-alpine
RUN apk add --no-cache openssl curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260517020000_add_hora_entrada_na_fila 2>/dev/null || true && npx prisma migrate deploy && node src/server.js"]
