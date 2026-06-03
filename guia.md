# Guia de Base Unificada

Este documento define como construir uma base multiplataforma **orientada por Next.js** usando:

- uma base `Next.js` como arquitetura principal
- uma base `React Native + Expo` apenas como fonte de referencia para:
  - comportamento
  - fluxos
  - regras adaptaveis
  - uso de plugins nativos

O objetivo nao e portar a estrutura do Expo para dentro do projeto novo. O objetivo e **migrar para Next.js** e reinterpretar no novo projeto apenas a logica que fizer sentido.

## Frase guia

`A estrutura pertence ao Next.js. A Base-Expo so empresta logica, comportamento e referencia de integracao mobile.`

## Principio arquitetural

`Next.js` deve ser o centro do projeto.

Isso significa:

- a organizacao principal segue o `App Router`
- `src/app` define navegacao, layouts e subareas protegidas
- `components`, `contexts`, `lib` e `services` seguem padrao web-first
- integracoes nativas ficam em wrappers proprios
- a estrutura de pastas do Expo nao deve ser reproduzida

## Estrutura recomendada

```text
src/
  app/
    layout.tsx
    page.tsx
    home/page.tsx
    login/page.tsx
    portal/
      layout.tsx
      home/page.tsx
      _components/
      _lib/
    api/
  components/
    layout/
    navigation/
    providers/
    ui/
  contexts/
    AuthContext.tsx
    LanguageContext.tsx
    ThemeProvider.tsx
    UIContext.tsx
    auth.server.ts
  lib/
    auth/
    i18n/
    platform/
    utils/
    theme/
  services/
    api/
  styles/
    tokens.css
capacitor.config.ts
next.config.ts
postcss.config.mjs
```

## Papel das rotas principais

### `src/app/page.tsx`

Deve funcionar como **start/bootstrap** da aplicacao.

Responsabilidades adequadas:

- inicializar configuracoes basicas
- verificar sessao existente
- decidir fluxo inicial
- apresentar tela de entrada/splash/onboarding inicial

Responsabilidades inadequadas:

- concentrar regras de negocio extensas
- chamar plugin nativo diretamente
- conter toda a logica de autenticacao
- servir como “lugar para tudo”

Se a logica crescer, ela deve ser movida para:

- `contexts/`
- `lib/auth/`
- `lib/platform/`
- `services/`
- componentes proprios de bootstrap

### `src/app/home/page.tsx`

Deve ser a **home publica principal**.

Ela nao substitui o start. Ela representa a pagina publica estavel da aplicacao.

### `src/app/login/page.tsx`

Deve funcionar como **gateway de autenticacao**.

O fluxo pode mudar por plataforma:

- web: formulario padrao e sessao web
- mobile: biometria quando aplicavel, ou formulario quando necessario

### `src/app/portal/**`

Deve concentrar a **area protegida**.

Tudo que estiver dentro de `portal/` e privado.

Exemplo:

```text
src/app/portal/
  layout.tsx
  home/page.tsx
  profile/page.tsx
  documents/page.tsx
```

O `layout.tsx` do portal deve aplicar a protecao comum do subtree.

## O que vem do Next.js

O projeto final deve herdar do `Next.js`:

- `App Router`
- `src/app`
- `layout.tsx`
- `page.tsx`
- `globals.css`
- `Tailwind CSS`
- `metadata`
- `Link`
- layouts aninhados
- subtree protegida por `layout.tsx`
- `app/api` para route handlers quando necessario

## O que vem da Base-Expo

Da base Expo, extrair apenas o que for reutilizavel como logica ou referencia:

- tipos TypeScript
- schemas Zod
- regras de autenticacao
- regras de sessao protegida
- comportamento de bootstrap
- comportamento de biometria
- regras de storage
- servicos
- mapeadores
- utilitarios puros
- fluxos mobile

## O que nao deve vir da Base-Expo como estrutura

Nao migrar diretamente:

- telas React Native
- componentes com `View`, `Text`, `Pressable`, `StyleSheet`
- estrutura `expo-router`
- organizacao de pastas da navegacao do Expo
- `expo-notifications`
- `expo-local-authentication`
- `expo-document-picker`
- `expo-image-picker`
- `expo-secure-store`
- `react-native-*`

Esses pontos devem ser **reinterpretados** no projeto Next.js.

## Regra de adaptacao

Para cada item vindo da Base-Expo, a pergunta correta e:

- isso define estrutura?
  - entao nao migra como esta
- isso define comportamento?
  - entao pode ser adaptado
- isso acessa hardware?
  - entao vira wrapper em `lib/platform`
- isso e tela?
  - entao reimplementa no padrao Next.js/web

## Mapa de conversao

### Navegacao

- `expo-router` -> `Next.js App Router`

### Layout visual

- `StyleSheet` -> `Tailwind CSS`
- tema visual -> tokens CSS + contexto/provider quando necessario

### Storage

- `AsyncStorage` / `SecureStore` -> camada propria
- web: `localStorage`, `sessionStorage` ou cookies
- mobile: wrappers com plugins/abordagem segura via Capacitor

### Camera e galeria

- Expo Camera/Image Picker -> `@capacitor/camera`

### Arquivos

- Expo Document Picker/File System -> `@capawesome/capacitor-file-picker` + `@capacitor/filesystem`

### Biometria

- Expo Local Authentication -> `@aparajita/capacitor-biometric-auth`

### Notificacoes

- Expo Notifications -> `@capacitor/local-notifications` e `@capacitor/push-notifications`

## Organizacao recomendada por camada

### `app/`

Responsavel por:

- rotas
- layouts
- composicao das paginas
- subareas publicas e privadas

### `contexts/`

Responsavel por:

- auth
- idioma
- tema
- estado global de interface

### `lib/`

Responsavel por:

- auth helpers
- wrappers de plataforma
- config de i18n
- utilitarios
- contratos internos

### `services/`

Responsavel por:

- integracao com backend externo
- client HTTP
- servicos de dominio remoto

### `app/api/`

Responsavel por:

- route handlers do proprio Next.js
- endpoints HTTP locais quando realmente necessarios

Nao usar `lib/api` para semantica de endpoint do Next. Se for integracao externa, preferir `services/api`.

## i18n

Se a base seguir mais de perto a `Base-Next`, o i18n deve combinar:

- configuracao em `lib/i18n`
- provider/contexto de idioma
- dicionarios em local apropriado

Nao e obrigatorio usar locale na URL.

Para esta base, o locale pode ser estado da aplicacao se isso simplificar a arquitetura web-first.

## Auth e protecao

Autenticacao e protecao devem seguir o padrao web-first:

- sessao e regras em `lib/auth`
- estado e acoes em `contexts/AuthContext.tsx`
- subtree protegida em `app/portal/layout.tsx`
- login decide comportamento por plataforma

No mobile:

- pode existir biometria
- a biometria nunca deve ser chamada direto da pagina
- a pagina deve chamar a camada de auth/platform

No web:

- fluxo padrao com formulario e sessao web

## Plugins basicos recomendados

- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`
- `@capacitor/ios`
- `@capacitor/camera`
- `@capacitor/filesystem`
- `@capacitor/local-notifications`
- `@capacitor/push-notifications`
- `@capawesome/capacitor-file-picker`
- `@aparajita/capacitor-biometric-auth`

## Processo de migracao

### Etapa 1. Fixar a arquitetura base

Escolher `Next.js` como base principal.

### Etapa 2. Inventariar a Base-Expo

Separar arquivos em:

- reutilizar como logica
- adaptar
- descartar como estrutura/tela

### Etapa 3. Montar a fundacao no padrao Next

Configurar:

- Next.js
- App Router
- Tailwind
- TypeScript
- Zod
- contexts/providers principais
- i18n
- Capacitor

### Etapa 4. Criar wrappers de plataforma

Criar:

- camera
- files
- biometrics
- notifications

### Etapa 5. Migrar a logica da Base-Expo

Trazer:

- tipos
- schemas
- servicos
- mapeadores
- regras puras
- comportamento de sessao e protecao

### Etapa 6. Recriar a interface no padrao web

Refazer:

- bootstrap/start
- home
- login
- portal

### Etapa 7. Integrar nativo

Rodar:

```bash
npm run build
npx cap sync
```

Depois:

- `npx cap open android`
- `npx cap open ios`

## Checklist

- [ ] `Next.js` criado e funcionando
- [ ] `App Router` em `src/app`
- [ ] `layout.tsx` raiz definido
- [ ] `page.tsx` raiz definido como start/bootstrap
- [ ] `home` publica criada
- [ ] `login` gateway criado
- [ ] `portal` protegido criado
- [ ] `Tailwind` configurado
- [ ] `Zod` configurado
- [ ] `contexts` principais criados
- [ ] `i18n` inicial criado
- [ ] `Capacitor` configurado
- [ ] wrappers mobile criados
- [ ] README atualizado
- [ ] scripts mobile configurados

## Observacoes tecnicas

### Sobre output do Next

Se a base for empacotada no Capacitor:

- usar saida compativel com `out/`

### Sobre API routes

Se a base for estatica para mobile:

- evitar depender de `app/api` para regras criticas do app
- preferir backend externo

### Sobre Android

Se existir pasta `android/` antiga:

- nao reutilizar automaticamente
- recriar com Capacitor

### Sobre iOS

No Windows, e possivel preparar a estrutura.

Mas build real de iOS exige:

- macOS
- Xcode
- CocoaPods

## Resultado esperado

Ao final, o projeto base deve ser:

- `Next.js` first
- web-first
- mobile-ready
- com portal protegido bem definido
- com plugins nativos encapsulados
- sem estrutura herdada do Expo
- pronto para servir de template para novos projetos
