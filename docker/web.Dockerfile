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
# BRAND: marca do whitelabel (default base). Vira NEXT_PUBLIC_BRAND e e
# inlined no bundle (ver src/config/brand.ts). Cada produto passa a sua marca;
# sem o arg vale o default.

# --- deps: instala dependencias (inclui dev, necessarias para o build) --------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- strip: remove o codigo de desenvolvimento da entrada de build -----------
# Etapa propria, antes de compilar: apaga src/dev-tools, src/dev-backend e as
# regioes @dev-only do contexto copiado (o container e descartavel; os fontes do
# host nao mudam) e falha se sobrar vestigio (docs/ferramentas-dev.md → "Fora dos
# artefatos").
FROM node:22-bookworm-slim AS strip
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node ./scripts/prepare-dist-source.mjs --in-place

# --- build: gera o build web standalone a partir da entrada limpa ------------
FROM strip AS build
ARG APP_ENV=production
ARG BRAND=base
# Marca do whitelabel, inlined no bundle pelo next build (config/brand.ts).
ENV NEXT_PUBLIC_BRAND=${BRAND}
# Pipeline do projeto: carrega .env(+.env.<APP_ENV>) -> valida o ambiente ->
# next build (standalone) -> monta dist/web -> verifica o artefato (falha se
# houver conteudo de dev). NEXT_PUBLIC_* sao embutidos aqui.
RUN node ./scripts/build-target.mjs web --env=${APP_ENV}
# Atualizacao remota do app (opcional, docs/ambiente-e-build.md → "Atualizacao
# remota do app"): o pacote assinado e gerado NO HOST (`npm run app-update:bundle`,
# onde fica a chave) em dist/app-updates/ e so e publicado se for do canal desta
# imagem (marca × ambiente) e da mesma versao. Sem pacote, a pasta fica vazia.
RUN mkdir -p dist/app-updates \
 && if [ -f dist/app-updates/manifest.json ]; then \
      node ./scripts/app-update-bundle.mjs --check --env=${APP_ENV}; \
    fi

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

# dist/web = artefato verificado (standalone + .next/static + public).
COPY --from=build --chown=nextjs:nodejs /app/dist/web ./
# Canal da atualizacao remota: /app-updates/manifest.json + bundle-<versao>.zip.
COPY --from=build --chown=nextjs:nodejs /app/dist/app-updates ./public/app-updates

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
