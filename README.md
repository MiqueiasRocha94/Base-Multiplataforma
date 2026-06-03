# Base Multiplataforma

![Next.js](https://img.shields.io/badge/framework-next.js_16.2.6-000000)
![React](https://img.shields.io/badge/ui-react_19.2.4-61DAFB)
![Capacitor](https://img.shields.io/badge/mobile-capacitor_8.3.4-119EFF)
![TypeScript](https://img.shields.io/badge/language-typescript_5-blue)
![Zod](https://img.shields.io/badge/validation-zod_4.4.3-3E67B1)
![Tailwind](https://img.shields.io/badge/style-tailwindcss_4-38BDF8)
![i18next](https://img.shields.io/badge/i18n-i18next_26.3.0-26A69A)

Projeto base em `Next.js` com `Capacitor`, seguindo a estrutura e as convencoes do App Router do Next.js 16 e usando exportacao estatica para integracao mobile com `webDir: "out"`.

## Diretriz

Este projeto segue a estrutura do Next.js sem recriar navegacao de outros frameworks dentro de `src/app`.

Regras adotadas:

- `src/app/layout.tsx` e o root layout minimo, como a documentacao do Next.js recomenda
- grupos de rota organizam a aplicacao sem alterar URL:
  - `src/app/(Public)`
  - `src/app/(Portal)`
- pastas privadas dentro de `app` guardam implementacao nao roteavel:
  - `_components`
  - `_lib`
- cada area define sua propria composicao com `layout.tsx`, `page.tsx` e arquivos colocados perto da rota
- `next.config.ts` muda de comportamento por alvo de build
- `capacitor.config.ts` usa `webDir: "out"` para consumir a saida do Next.js

## Stack

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript `^5`
- Tailwind CSS `^4`
- Zod `^4.4.3`
- Capacitor Core / CLI / Android / iOS `^8.3.4`
- i18next `^26.3.0`

Plugins nativos principais:

- `@capacitor/camera` `^8.2.0`
- `@capacitor/filesystem` `^8.1.2`
- `@capacitor/local-notifications` `^8.2.0`
- `@capacitor/push-notifications` `^8.1.1`
- `@capawesome/capacitor-file-picker` `^8.0.2`
- `@aparajita/capacitor-biometric-auth` `^10.0.0`

## Estrutura

```text
src/
  app/
    page.tsx
    (Public)/
      layout.tsx
      start/page.tsx
      home/page.tsx
      login/
        page.tsx
        _components/
        _lib/
    (Portal)/
      portal/
        layout.tsx
        page.tsx
        home/page.tsx
        _components/
  contexts/
  lib/
    auth/
    i18n/
    platform/
  services/
    api/
  styles/
```

## Rotas

- `/`: bootstrap/start da aplicacao
- `/start`: alias que redireciona para `/`
- `/home`: home publica
- `/login`: gateway de autenticacao
- `/portal`: entrada da area protegida
- `/portal/home`: home da area protegida

## Next.js + Capacitor

Padroes aplicados para o projeto funcionar como base Next.js com Capacitor:

- `npm run build` gera o build web normal do Next.js
- `npm run build:mobile` gera a saida estatica para o alvo mobile
- `next.config.ts` usa `NEXT_BUILD_TARGET` para decidir quando ativar `output: "export"`
- `next/image` so usa `images.unoptimized` no build mobile
- logicas de browser e storage ficam em Client Components ou em wrappers client-side
- recursos nativos ficam encapsulados em `src/lib/platform`
- a camada mobile consome o build web, sem duplicar estrutura de navegacao

## Requisitos

- Node.js 20+
- npm 10+

Para fluxo nativo:

- Android Studio / Android SDK para Android
- macOS + Xcode para build real de iOS

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run build
npm run build:mobile
```

Fluxos Capacitor:

```bash
npm run cap:sync
npm run cap:copy
npm run mobile:build
npm run mobile:android
npm run mobile:ios
```

## Validacao

Antes de concluir alteracoes:

- validar `npm run lint`
- validar `npm run build`
- confirmar que novas rotas usam convencoes do App Router
- confirmar que codigo especifico de rota fica colocado em `app/**/_components` ou `app/**/_lib` quando fizer sentido

## Referencias do repositorio

- [guia.md](C:/Users/Dev00/Desenvolvimento/HTML/multplataforma-base/guia.md)
- `node_modules/next/dist/docs/`
- `references/base-next/`
- `references/base-expo/`
