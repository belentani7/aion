# Stage 1: Install dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Build
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:22-bookworm-slim AS production
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist
COPY package.json pnpm-workspace.yaml ./
COPY drizzle/ drizzle/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)throw 1})" || exit 1
CMD ["node", "dist/index.js"]
