# PWA e instalação

Como um **produto construído sobre a base** torna o app web instalável pelo navegador (Android, desktop e Tela de
Início do iOS): manifest, ícones, service worker, cache e a variável que liga e desliga o recurso. **Na base o PWA não
está habilitado**: não há manifest, service worker nem botão de instalação ([visão geral](./visao-geral.md) → "Base e
produto"). Variáveis e build ficam em [ambiente e build](./ambiente-e-build.md) → "Ambientes"; o app mobile e o
desktop, em [plataforma nativa](./plataforma-nativa.md).

## Visão

| Item | Valor |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Caminho recomendado | `src/app/manifest.ts` (rota de metadados do Next) + Serwist (`@serwist/next`) para o service worker; `next-pwa` não tem manutenção |
| Onde está instalável | em nenhum ambiente da base; o produto registra aqui onde liga |
| Caminho base | `/` (sem `basePath` no [next.config.ts](../next.config.ts)) |
| Alvo nativo | APK (Capacitor) e desktop (Tauri) usam o mesmo export web: o PWA fica desligado nesses builds |

## Configuração

O produto cria estas peças e preenche a coluna "Onde":

| Peça | Onde | Observação |
| --- | --- | --- |
| Manifest | `src/app/manifest.ts` | `name`, `short_name`, `id`, `start_url`, `scope`, `display: "standalone"`, `background_color`, `theme_color`, `icons` |
| Ícones | `public/brands/<marca>/` | PNG 192, 512 e 512 `maskable` (desenho na zona segura) |
| `apple-touch-icon` | layout raiz | PNG 180×180, sem transparência |
| Registro do SW | componente cliente único | só com a variável ligada |
| Botão de instalação | componente único em `src/components/` | `beforeinstallprompt` no Android/desktop; instrução no iOS; some em `display-mode: standalone` |

- **Marcas:** a base é white-label; nome, cores e ícones do manifest vêm da marca do build (`NEXT_PUBLIC_BRAND`,
  [tema, marca e idioma](./tema-marca-e-idioma.md) → "Marca (white-label)").
- Instalar Serwist é dependência nova: entra no plano com aprovação ([conduta](./conduta-agentes.md) →
  "Autorizações").

## Habilitar e desabilitar

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `NEXT_PUBLIC_PWA_ENABLED` (nome recomendado; não existe na base) | desligado em todos os ambientes; o produto liga na web | liga manifest, registro do SW e botão |

- **Desligado:** sem `<link rel="manifest">`, sem registro do SW e sem botão. Se um SW já foi publicado, o build
  publica um SW que limpa os caches e se desregistra.
- **Desenvolvimento:** SW desligado por padrão (o cache atrapalha o hot reload); liga só para testar.
- **APK e desktop:** sempre desligado; o app nativo não usa o SW do navegador.
- A variável entra na tabela de [ambiente e build](./ambiente-e-build.md) → "Variáveis públicas" quando o produto a
  criar.

## Service worker e cache

| Recurso | Estratégia | Observação |
| --- | --- | --- |
| Arquivos do build (JS, CSS, fontes com hash) | pré-cache | gerado pelo Serwist |
| Imagens públicas (`public/`) | cache primeiro | com limite de quantidade e idade |
| Navegação (HTML) | rede primeiro | página offline como reserva |
| API do produto (autenticada, dado pessoal) | só rede | nunca em cache ([comunicação com a API](./comunicacao-api.md)) |
| Login, logout, renovação de token | só rede | ([autenticação e permissões](./autenticacao-e-permissoes.md)) |

- Logout limpa os caches que tenham qualquer dado do usuário.
- O SW é servido com `Cache-Control: no-cache`; o manifest, com `Content-Type: application/manifest+json`.
- Offline real (fila de envio, sincronização) é decisão do produto.

## Instalação

| Plataforma | Como o usuário instala |
| --- | --- |
| Android (Chrome) | botão do app ou menu do navegador |
| Desktop (Chrome, Edge) | botão do app ou ícone na barra de endereço |
| iOS (Safari) | Compartilhar → Adicionar à Tela de Início |

## Validação

```bash
npm run pwa:validar
```

Roda [validar-pwa.mjs](../scripts/pwa/validar-pwa.mjs) sobre `public/manifest.webmanifest` e os ícones de `public/`:
campos, `display`, ícones 192 e 512 com a medida declarada, `maskable` e `apple-touch-icon` (aviso). Manifest gerado
por `src/app/manifest.ts`: validar o do build (`--manifest` e `--public` apontando para a saída). Na base, sem
manifest, o comando falha: é o esperado. O teste real de instalação (Chrome Android, Chrome/Edge desktop, Safari iOS)
é feito por uma pessoa antes de ligar em produção.

## Requisitos

Critérios de instalação dos navegadores, com a data da verificação e a fonte de cada regra, em
[requisitos-pwa.mjs](../scripts/pwa/requisitos-pwa.mjs). Antes de cada entrega, conferir as fontes listadas e
atualizar o arquivo se mudaram.

## Onde está no código

| Peça | Caminho |
| --- | --- |
| Validador | [scripts/pwa/validar-pwa.mjs](../scripts/pwa/validar-pwa.mjs) |
| Requisitos dos navegadores | [scripts/pwa/requisitos-pwa.mjs](../scripts/pwa/requisitos-pwa.mjs) |
| Manifest, SW e botão | não existem na base (ver [Configuração](#configuração)) |
