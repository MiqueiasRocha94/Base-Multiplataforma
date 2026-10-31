# Integrações

Serviços externos com que o front conversa, além do próprio backend. A API do produto (raízes, clientes HTTP,
erros, `dev-backend`) está em [comunicação com a API](./comunicacao-api.md); variáveis por nome, em
[ambiente e build](./ambiente-e-build.md) → "Ambientes".

## API do produto

Saída, HTTPS (Bearer/DPoP). É o backend do produto (repositório separado). Contrato de cada rota
na spec do módulo ([specs](./specs/README.md)); transporte e erros em
[comunicação com a API](./comunicacao-api.md).

## Cloudflare Turnstile (captcha)

Saída, script `https://challenges.cloudflare.com/turnstile/v0/api.js` carregado pelo
[Turnstile.tsx](../src/components/Turnstile.tsx).

| Item | Comportamento |
| --- | --- |
| Onde aparece | login e "esqueci a senha", só no build web ([use-captcha-required.ts](../src/hooks/use-captcha-required.ts)); no APK não existe |
| Chave | chave de site pública fixa no componente; em dev, a chave de teste da Cloudflare vem de `@/dev-tools/runtime` dentro de região `@dev-only` ([ferramentas de desenvolvimento](./ferramentas-dev.md) → "Captcha") |
| Validação | o token segue no login (`signIn`) e no "esqueci a senha" e é validado pelo backend ([autenticação e permissões](./autenticacao-e-permissoes.md)) |
| Token | uso único: o formulário remonta o widget após cada envio |
| Falha ou expiração | `onToken(null)`: com captcha exigido e sem token, o formulário mostra o aviso de captcha e não envia |

## Notificações push

Saída/entrada, plugin `@capacitor/push-notifications` encapsulado em
[push-notifications.ts](../src/lib/platform/push-notifications.ts) e exposto pelo `DeviceContext` (`registerPush`,
`subscribePushToken`).

- No nativo, registra o aparelho e guarda o token e as últimas notificações (até 30) no storage local.
- Na web não há push nativo: no lugar do token fica um "motivo".
- O token entra no `deviceid` descritivo do login ([device-info.ts](../src/lib/platform/device-info.ts)); a identidade
  estável do aparelho no backend é o `jkt` da chave DPoP
  ([autenticação e permissões](./autenticacao-e-permissoes.md) → "Canais, vinculação e renovação do token").
- O repositório não versiona `android/app/google-services.json`.

## Atestado do app (Play Integrity / App Attest)

Saída, pedido no login do nativo ([app-attestation.ts](../src/lib/platform/app-attestation.ts)). O plugin nativo não
está instalado: `obterAtestadoApp` devolve `null` e o backend aceita a ausência.

## Importação, exportação e relatórios

- **PDF/planilha do backend:** relatórios e exportações gerados no backend chegam como arquivo
  por `baixarArquivo` ([services/api/recursos.ts](../src/services/api/recursos.ts)), com o nome do `Content-Disposition`, e são
  entregues por [save-file.ts](../src/lib/platform/save-file.ts) (compartilhar no mobile, download no desktop).
- Não há importação de arquivos para o backend.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Turnstile | [src/components/Turnstile.tsx](../src/components/Turnstile.tsx) |
| Regra do captcha | [src/hooks/use-captcha-required.ts](../src/hooks/use-captcha-required.ts) |
| Push | [src/lib/platform/push-notifications.ts](../src/lib/platform/push-notifications.ts) |
| Atestado | [src/lib/platform/app-attestation.ts](../src/lib/platform/app-attestation.ts) |
| Download de arquivos | [src/services/api/recursos.ts](../src/services/api/recursos.ts), [src/lib/platform/save-file.ts](../src/lib/platform/save-file.ts) |

Voltar ao [índice](./README.md).
