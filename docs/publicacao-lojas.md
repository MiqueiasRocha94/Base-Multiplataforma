# Publicação nas lojas

Como um **produto construído sobre a base** leva o app à Google Play e à App Store: o que a base já entrega, o que o
produto cria e a ordem de publicação. A base em si não publica em loja ([visão geral](./visao-geral.md) → "Base e
produto"). Build do APK e identidade por marca ficam em [ambiente e build](./ambiente-e-build.md) → "Build mobile
(Capacitor)"; recursos do aparelho, em [plataforma nativa](./plataforma-nativa.md).

## Visão

| Item | Valor |
| --- | --- |
| Tecnologia | Capacitor 8 (`capacitor.config.ts`), projeto Android gerado em `android/` |
| Formato do repositório | só front; o backend do produto fica em repositório próprio |
| Plataformas | Android pela base (APK); iOS exige macOS com Xcode e não tem build na base |
| Marcas | várias (white-label): um app por marca, identidade em [scripts/mobile-apps.json](../scripts/mobile-apps.json) |
| Identificadores | `appId` por marca em `scripts/mobile-apps.json`; fora de produção leva o sufixo do ambiente ([ambiente e build](./ambiente-e-build.md) → "Identidade do app por marca") |
| Situação | a base não tem app publicado; cada produto registra aqui a situação do seu (primeiro envio, Play App Signing) |

## Ferramentas

O produto escolhe e registra nesta tabela. Ponto de partida para Capacitor:

| Responsabilidade | Ferramenta | Onde roda | Por quê |
| --- | --- | --- | --- |
| Build Android | `npm run apk:production` (Gradle) | máquina ou contêiner `toolchain-android` | já é o build da base |
| Build iOS | Xcode | máquina macOS ou runner macOS do CI | não há build iOS fora do macOS |
| Envio e metadados (Play) | fastlane `supply` | definido pelo produto | o EAS não tem suporte documentado a Capacitor |
| Envio e metadados (Apple) | fastlane `deliver` | definido pelo produto | idem |

- Não trocar a tecnologia do app para usar um serviço de build.
- A Play exige Android App Bundle (`.aab`) para apps novos; a base gera APK. Gerar o AAB é uma mudança no build do
  produto, com plano próprio.
- App mobile de produção pode seguir outra via (por exemplo, um app Expo próprio do produto); nesse caso este doc
  descreve a via adotada.

## Material das lojas

Fonte versionada em `store/` (na raiz, criada pelo produto) e saída gerada em `store/build/` (ignorada pelo git,
recriada a cada montagem, à parte do build do app). Mudar texto ou imagem não exige build do app.

| Item | Onde |
| --- | --- |
| Configuração (idiomas, plataformas, `ipad`, marcas e valores de `{{campo}}`) | `store/store.json` |
| Textos comuns (um `## <campo>` por campo) | `store/textos/<idioma>.md` |
| Textos por marca (só o que a marca sobrescreve) | `store/marcas/<marca>/<idioma>.md` |
| Novidades por versão | `store/novidades/<versão>/<idioma>.md` |
| Imagens Android | `store/imagens/<marca>/android/` (`icon.png`, `featureGraphic`, `phoneScreenshots/`, `sevenInchScreenshots/`, `tenInchScreenshots/`) |
| Capturas iOS | `store/imagens/<marca>/ios/<grupo>/` (`iphone-6.9`, `iphone-6.3`, `ipad-13`…) |

- Campos: `nome`, `descricao-curta` (Play), `descricao`, `subtitulo`, `palavras-chave`, `texto-promocional`,
  `url-suporte`, `url-privacidade`, `url-marketing` (Apple). Texto puro.
- O identificador do app não vai para `store/`: vem de `scripts/mobile-apps.json`.
- O idioma precisa existir nas duas lojas com o mesmo código (`pt-BR`, `en-US`).
- Capturas: do app real, com dados de demonstração (os do `dev-backend`, nunca dado de cliente), mostrando o app em
  uso.

## Publicar

Ordem: versão → build → novidades → montar → validar → enviar.

| Passo | Comando |
| --- | --- |
| Versão nativa | `nativeVersion` em `scripts/mobile-apps.json` ([ambiente e build](./ambiente-e-build.md) → "Release") |
| Build | `npm run apk:production` (marca em `NEXT_PUBLIC_BRAND`) |
| Rascunho das novidades | `npm run store:novidades -- <versão>` |
| Montar | `npm run store:montar -- --versao <versão> --version-code <n> --aab <caminho> --ipa <caminho>` |
| Validar | `npm run store:validar` |
| Enviar | ferramenta escolhida em [Ferramentas](#ferramentas), só com autorização |

Sem `store/`, os comandos `store:*` falham: na base isso é o esperado.

## Versão e novidades

| Item | Valor |
| --- | --- |
| Dono do número de build | `nativeVersion` em `scripts/mobile-apps.json`, convertido em `versionCode` pelo build ([ambiente e build](./ambiente-e-build.md) → "Identidade do app por marca") |
| Versão exibida | `versionName` = `nativeVersion` |
| Novidades | rascunho de `scripts/store/rascunhar-novidades.mjs` a partir do `CHANGELOG.md`, revisado e traduzido por uma pessoa antes do envio; o script nunca sobrescreve texto existente |

## Assinatura e credenciais

Só nomes e locais; nunca o conteúdo.

| Credencial | Onde fica | Quem usa |
| --- | --- | --- |
| Keystore Android | `.secrets/android-signing.production.<marca>.env` (modelo `.secrets/android-signing.production.env.example`) ou `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | `npm run apk:production` |
| Certificado e perfil iOS | definido pelo produto | build iOS |
| Envio Play (conta de serviço) | variável de ambiente ou cofre do CI, definida pelo produto | envio |
| Envio Apple (chave da API do App Store Connect) | variável de ambiente ou cofre do CI, definida pelo produto | envio |

App já publicado usa o keystore existente; nenhuma ferramenta gera chave nova para ele (a Play recusa a atualização).

## Validação

`npm run store:validar` roda [validar-material.mjs](../scripts/store/validar-material.mjs) sobre `store/build/`:
erro bloqueia o envio; aviso é revisado. Os testes dos scripts rodam no `npm test`.

## Itens manuais

O produto preenche responsável e situação de cada um:

| Item | Loja |
| --- | --- |
| Criar o app (identificador, nome, categoria) | Play, Apple |
| Segurança dos dados / Privacidade do app | Play, Apple |
| Classificação de conteúdo / etária | Play, Apple |
| Declaração de recursos financeiros | Play |
| Público-alvo e anúncios | Play, Apple |
| Acesso para a revisão (conta de demonstração só no console da loja) | Play, Apple |
| Política de privacidade publicada e acessível no app | Play, Apple |
| Target API exigido pela Play na data do envio | Play |
| White-label: cada app enviado pela conta do dono da marca | Apple |

## Requisitos das lojas

Limites de texto, medidas de imagem e quantidades de captura ficam em
[requisitos-lojas.mjs](../scripts/store/requisitos-lojas.mjs), com a data da verificação e a página oficial de cada
regra. Antes do envio, conferir as páginas listadas e atualizar o arquivo se mudaram.

## Onde está no código

| Peça | Caminho |
| --- | --- |
| Identidade e versão nativa por marca | [scripts/mobile-apps.json](../scripts/mobile-apps.json) |
| Build e assinatura do APK | [scripts/android-build.mjs](../scripts/android-build.mjs), [scripts/android-signing.mjs](../scripts/android-signing.mjs) |
| Montagem do material | [scripts/store/montar-material.mjs](../scripts/store/montar-material.mjs) |
| Validação do material | [scripts/store/validar-material.mjs](../scripts/store/validar-material.mjs) |
| Rascunho das novidades | [scripts/store/rascunhar-novidades.mjs](../scripts/store/rascunhar-novidades.mjs) |
| Requisitos das lojas | [scripts/store/requisitos-lojas.mjs](../scripts/store/requisitos-lojas.mjs) |
