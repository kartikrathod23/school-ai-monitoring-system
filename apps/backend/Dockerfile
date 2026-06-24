FROM node:20-alpine AS builder

WORKDIR /app

# openssl needed for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (needed for prisma generate + tsc)
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate && npm run build

# --- Production image ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

# Only copy what's needed to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install only production deps (skips devDependencies)
RUN npm ci --omit=dev

EXPOSE 5000

CMD ["node", "dist/src/server.js"]
