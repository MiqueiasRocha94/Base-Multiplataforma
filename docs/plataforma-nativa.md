# Plataforma nativa (Capacitor e desktop)

Recursos do aparelho e armazenamento local. Ficam encapsulados em
[src/lib/platform](../src/lib/platform) (reexportados por
[index.ts](../src/lib/platform/index.ts)); telas e componentes não importam
Capacitor direto. Build do APK: [ambiente e build](./ambiente-e-build.md).

## Padrão

**Checar `isNativePlatform()` e importar o plugin de forma lazy** (`await
import(...)`), com *fallback* seguro na web. O lazy import mantém os plugins fora
do bundle web e evita erros em ambiente sem nativo. Recurso nativo novo segue o
mesmo padrão neste diretório; plugin vindo da Base-Expo vira o equivalente
Capacitor (ex.: `expo-local-authentication` → `@aparajita/capacitor-biometric-auth`;
`expo-document-picker` → `@capawesome/capacitor-file-picker`).

| Módulo | Arquivo | API |
| --- | --- | --- |
| Plataforma | [capacitor.ts](../src/lib/platform/capacitor.ts) | `isNativePlatform`, `getPlatform`, `isMobileViewport`, `isTabletViewport`. |
| View | [view.ts](../src/lib/platform/view.ts) | `DESKTOP_VIEW_QUERY` e o script que publica `data-view` antes da pintura ([shell adaptativo](./shell-adaptativo.md)). |
| Biometria | [biometrics.ts](../src/lib/platform/biometrics.ts) | `isBiometricAuthAvailable`, `requestBiometricAuth(reason)`. |
| Câmera | [camera.ts](../src/lib/platform/camera.ts) | `pickCameraPhoto()` (DataUrl). Na tela, use `useDevice().pickImage`, que cai para file picker na web. |
| Arquivos | [files.ts](../src/lib/platform/files.ts) | `pickFile()`, `readTextFile(path)`. |
| Notificações | [notifications.ts](../src/lib/platform/notifications.ts) | `requestLocalNotificationPermission`, `requestPushNotificationPermission`. |
| Atestado do app | [app-attestation.ts](../src/lib/platform/app-attestation.ts) | `obterAtestadoApp(jkt)` — Play Integrity/App Attest para o login; ponto de troca (`null` sem plugin nativo) ([autenticação](./autenticacao-e-permissoes.md)). |
| Voltar do sistema | [back-button.ts](../src/lib/platform/back-button.ts) | `subscribeBackButton(handler)`, `exitApp()` e a decisão pura `resolveBackAction` (`@capacitor/app`; no-op na web). Política em "Voltar do sistema". |
| Visibilidade | [app-visibility.ts](../src/lib/platform/app-visibility.ts) | `subscribeToAppVisibility(handler)`: app visível ou em segundo plano. |
| Orientação | [orientation.ts](../src/lib/platform/orientation.ts) | `applyOrientationPolicy(deviceType)`: celular trava em retrato, tablet livre (`@capacitor/screen-orientation`; no-op na web). Chamado pelo DeviceContext. |
| Teclado | [keyboard.ts](../src/lib/platform/keyboard.ts) | Fecha o teclado virtual no submit de formulário; `dismissKeyboard()` ([componentes de UI](./componentes-ui.md) → "DynamicForm"). |
| Barras do sistema | [system-bars.ts](../src/lib/platform/system-bars.ts) | `subscribeSystemBarsSync()`: no app (edge-to-edge do Capacitor 8) a cor dos ícones da barra de status e da de navegação acompanha o fundo sob cada uma — claros sobre fundo escuro, escuros sobre claro —, reavaliada a cada mudança do DOM (tema, marca, header/footer, overlays). `SystemBars` vem do `@capacitor/core`, sem plugin à parte; no-op na web. Chamado pelo DeviceContext. O fundo das barras é da página: [shell adaptativo](./shell-adaptativo.md) → "Regiões no mobile". |
| Atualização remota | [src/app-update](../src/app-update/) | Pacote web assinado aplicado na abertura seguinte (`@capawesome/capacitor-live-update`). **Desligada por padrão** e removida dos artefatos como o código de dev; fica fora de `lib/platform` por isso. Como ligar e regras das lojas: [ambiente e build](./ambiente-e-build.md) → "Atualização remota do app". |
| Aparelho | [device-info.ts](../src/lib/platform/device-info.ts) | `detectDeviceType()` (phone/tablet/desktop físico: nativo = plataforma + tela; web = UA-CH/UA + ponteiro + tela), `getDeviceInfo()` (nativo via `@capacitor/device`), `getLoginDeviceId()` — `deviceid` do login no formato do base-expo `marca\|modelo\|plataforma\|SO\|execução\|token` (token = push token no nativo; `web-<uuid da instalação>` na web). |

## Desktop (Tauri)

O app desktop (Windows e Linux) é uma casca Tauri 2 em [src-tauri/](../src-tauri) que
serve o mesmo export do Next (`out/`) no WebView do sistema (WebView2 no Windows,
WebKitGTK no Linux). Build: [ambiente e build](./ambiente-e-build.md) → "Build
desktop (Tauri)".

- **Detecção:** `isDesktopApp()` em [desktop.ts](../src/lib/platform/desktop.ts).
  O Capacitor não enxerga o Tauri: `isNativePlatform()` é `false` no desktop e
  todo wrapper acima segue o caminho web. A API do Tauri entra por import lazy
  (chunk à parte, nunca carregado na web nem no mobile).
- **Recurso nativo novo**, nesta ordem: API web do WebView (já funciona sem nada)
  → plugin oficial do Tauri (parte Rust em `src-tauri/`, API JS por import lazy em
  `desktop.ts`, permissão em `src-tauri/capabilities/`) → comando próprio em Rust
  (`#[tauri::command]`), com versão para cada sistema.
- **Casca:** instância única (abrir de novo foca a janela), estado da janela
  (posição, tamanho, maximizado) e bandeja com "Abrir" e "Sair do app", com os
  rótulos no idioma do app (`setTrayLabels`, chamado pelo `LanguageContext`).
  Fechar a janela (X) encerra o app.
- **Iniciar com o sistema:** preferência do usuário em Configurações
  ([use-autostart-setting.ts](../src/hooks/use-autostart-setting.ts)), desligada
  por padrão; o estado é lido do sistema operacional.

| Recurso | No desktop |
| --- | --- |
| Câmera, arquivos, salvar arquivo | Caminho web: o WebView pede permissão, abre o seletor ou baixa o arquivo. |
| Storage e sessão | Como na web: `sessionStorage` na sessão, então fechar o app pede login de novo. |
| Biometria, push, atestado do app | Indisponíveis (como na web). |
| Voltar do sistema, orientação, teclado, barras do sistema | No-op (como na web). |
| `getLoginDeviceId` | Como na web (`web-<uuid da instalação>`). |
| Páginas e perfis | Todas, como a web: `mobile-release.json` vale só para o app mobile. |

## Voltar do sistema

No Android, o botão voltar é tratado pelo app (`@capacitor/app`) — sem ele, o
voltar fecha o app em qualquer tela. A política fica em
[system-back-handler.tsx](../src/components/system-back-handler.tsx), montado no
`AppStructure`:

1. **Há histórico na WebView** → `history.back()`. Fecha a camada que empilhou
   estado (`DateField`, `SelectOne`, seletor do `DynamicForm`, visualizador de
   arquivo, confirmação) ou volta a rota.
2. **Sem histórico, na raiz** (home do portal ou rota fora do portal: login,
   start) → o primeiro toque mostra o aviso "toque de novo para sair"; o segundo,
   em até 2 s, fecha o app.
3. **Sem histórico em outra rota** (entrada direta) → vai para a home.

Camada que deve fechar com o voltar empilha um estado no histórico ao abrir e
fecha no `popstate`, como as citadas no item 1. Na web e no iOS o navegador cuida
do voltar.

## Storage

- [src/lib/platform/storage.ts](../src/lib/platform/storage.ts): wrapper sobre
  `window.localStorage` com guarda de SSR (`typeof window`). Chaves centralizadas
  em `storageKeys` (`locale`, `session`, `theme`, `themeColors`, `fontPreset`,
  `biometricPreferenceByLogin`, `developerModeSettings`, `deviceId`).
- `get/set/removeSessionItem`: storage da sessão autenticada — `sessionStorage`
  no web, `localStorage` no nativo (ponto de troca para armazenamento seguro).
- A chave DPoP fica no IndexedDB ([autenticação](./autenticacao-e-permissoes.md)
  → "Canais").

## Onde está no código

| Peça | Onde |
| --- | --- |
| Wrappers | [src/lib/platform/](../src/lib/platform/) |
| Ponto de entrada | [src/lib/platform/index.ts](../src/lib/platform/index.ts) |
| Storage | [src/lib/platform/storage.ts](../src/lib/platform/storage.ts) |
| Configuração do Capacitor | [capacitor.config.ts](../capacitor.config.ts) |
| Casca desktop | [src-tauri/](../src-tauri) · [desktop.ts](../src/lib/platform/desktop.ts) |

Voltar ao [índice](./README.md).
