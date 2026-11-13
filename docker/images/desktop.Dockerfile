# Imagem de toolchain do app desktop (Tauri 2, src-tauri/), em dois estágios:
#   windows — compilação cruzada Windows x64 (cargo-xwin + NSIS), enxuta;
#   linux   — windows + WebKitGTK/GTK para o build nativo do Linux x64 (.deb e .AppImage).
# NAO copia o projeto — ele é montado em runtime (docker/<ambiente>/desktop/docker-compose.yml).
# Genérica e reutilizável por vários projetos Tauri 2: nome toolchain-tauri:<versões>-<sistema>.
# Node 22: o export do Next (out/) também roda no container (scripts/docker-desktop.mjs).
# trixie: NSIS 3.11 (o 3.08 do bookworm não tem o Win/RestartManager.nsh exigido pelo Tauri).
FROM node:22-trixie-slim AS node

FROM rust:1.99.0-slim-trixie AS windows

ENV DEBIAN_FRONTEND=noninteractive

# dpkg sem fsync por arquivo: no disco da VM do Docker cada pacote custava ~0,5 s.
RUN echo force-unsafe-io > /etc/dpkg/dpkg.cfg.d/unsafe-io

RUN apt-get update \
 && apt-get install -y --no-install-recommends clang lld llvm nsis ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN rustup target add x86_64-pc-windows-msvc

RUN cargo install --locked cargo-xwin \
 && cargo install --locked tauri-cli --version "^2"

# O tauri-cli exige a lib de bandeja do Linux com a feature `tray-icon` ativa,
# mesmo gerando app Windows ("Can't detect any appindicator library"). Um .pc
# mínimo satisfaz a checagem do bundler (pkg-config) sem puxar o GTK -dev.
# No estágio linux o pacote -dev real sobrescreve este arquivo.
RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libayatana-appindicator3-1 \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /usr/lib/x86_64-linux-gnu/pkgconfig \
 && printf '%s\n' \
    'libdir=/usr/lib/x86_64-linux-gnu' \
    'Name: ayatana-appindicator3-0.1' \
    'Description: stub para o bundler do tauri-cli (cross-compile Windows)' \
    'Version: 0.5.94' \
    'Libs: -L${libdir} -layatana-appindicator3' \
    > /usr/lib/x86_64-linux-gnu/pkgconfig/ayatana-appindicator3-0.1.pc

# Node da imagem oficial (sem apt/NodeSource).
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Saída do build num volume (mais rápido que o bind mount do Windows).
ENV CARGO_TARGET_DIR=/target

WORKDIR /src

FROM windows AS linux

# WebKitGTK, GTK, bandeja (appindicator), SVG e o necessário ao bundler do .deb/.AppImage.
RUN apt-get update \
 && apt-get install -y --no-install-recommends file xdg-utils build-essential \
    libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev libssl-dev \
 && rm -rf /var/lib/apt/lists/*
