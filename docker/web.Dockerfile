# Build WEB em container (Next.js 16). Complementa o build de APK
# (android.Dockerfile). Ao contrario da imagem de APK — um toolchain generico com
# o projeto montado em runtime — esta e uma imagem AUTO-CONTIDA e deployavel: faz
# o `next build` (output standalone) e serve um server Node minimo.
#
#   docker compose build web           (npm run web:image)
#   docker compose up web              (npm run web:up   -> http://localhost:3000)
#
# APP_ENV: production (default) | homolog. Define quais .env sao carregados e
# quais valores NEXT_PUBLIC_* sao embutidos no bundle (inlined em build time).

# --- deps: instala dependencias (inclui dev, necessarias para o build) --------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- build: gera o build web standalone ---------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG APP_ENV=production
# Ativa `output: "standalone"` no next.config.ts (opt-in).
ENV NEXT_OUTPUT_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Pipeline do projeto: carrega .env(+.env.<APP_ENV>) -> valida flags de dev em
# homolog/prod -> next build. NEXT_PUBLIC_* sao embutidos aqui.
RUN node ./scripts/build-target.mjs web --env=${APP_ENV}

# --- runner: imagem final, so o necessario para servir ------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Usuario nao-root.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# O standalone NAO copia `public` nem `.next/static` — precisam vir a mao.
# `public` carrega os locales (i18next-http-backend faz fetch de /locales/*).
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
