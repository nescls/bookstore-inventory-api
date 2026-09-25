FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/scripts/migrate.js && { if [ \"$SEED_ON_START\" = \"true\" ]; then node dist/scripts/seed.js || echo 'Seed failed; starting the API anyway.'; fi; exec node dist/src/main.js; }"]
