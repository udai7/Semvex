# Next.js frontend (multi-stage build)
FROM node:20-slim AS builder
WORKDIR /app
# Public site origin is inlined into the bundle at build time (NEXT_PUBLIC_*),
# so it must be provided as a build arg for correct absolute OG/Twitter URLs.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# next.config.mjs bakes its rewrites() (the API proxy target) into the build,
# so SEMVEX_API_URL must be set at build time — not just at runtime.
ARG SEMVEX_API_URL
ENV SEMVEX_API_URL=$SEMVEX_API_URL
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "start"]
