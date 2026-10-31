# Atualização remota do app (pacote web)

## Situação
Proposta

## Objetivo
Sem o recurso, qualquer mudança de tela no app exige um APK/IPA novo e uma nova revisão nas lojas. O app é Next.js
exportado como estático e servido pelo próprio aparelho (Capacitor), então quase tudo o que muda entre versões é
HTML, CSS e JavaScript.

O objetivo é que um produto feito sobre a base publique o app nas lojas uma vez, com a camada nativa estável, e
entregue a evolução da interface — inclusive telas de perfis lançados depois — como **pacote web atualizado
remotamente**, dentro das regras da Google Play e da App Store. Mudanças na camada nativa continuam saindo por
versão de loja.

## Escopo
Inclui:
- Pacote web assinado, gerado pelo build de homologação/produção, publicado por **marca × ambiente** (canal).
- Verificação, download e aplicação do pacote pelo app, com volta automática ao pacote anterior em caso de falha.
- Regra de compatibilidade entre pacote web e camada nativa.
- Regras de publicação que mantêm o app conforme às políticas das lojas.

Não inclui:
- Abrir no app um site hospedado (`server.url`): o app deixa de funcionar offline, perde a origem local e é o
  padrão que a App Store recusa como funcionalidade mínima.
- Pacotes diferentes por perfil ou por usuário: o pacote é um só por canal; o que cada perfil vê continua decidido
  pelas permissões da sessão e autorizado pela API.
- Mudanças na camada nativa (plugins, permissões do SO, versão do Capacitor, ícone, nome, identificador).
- Serviço de atualização no backend: cada produto define com o seu backend, se quiser trocar o servidor do canal.

## Referências
- [Ambiente e build](../../docs/ambiente-e-build.md) → "Build mobile (Capacitor)", "Páginas publicadas no app",
  "Identidade do app por marca", "Atualização remota do app", "Release"
- [Ferramentas de desenvolvimento](../../docs/ferramentas-dev.md) → "Fora dos artefatos"
- [Plataforma nativa](../../docs/plataforma-nativa.md)
- [Autenticação e permissões](../../docs/autenticacao-e-permissoes.md) → "Perfis no app", "Biometria"
- Google Play — Política do Programa para Desenvolvedores, "Abuso de dispositivo e rede" (download de código
  executável)
- Apple — App Store Review Guidelines 2.1, 2.3.1, 2.3.12, 2.5.2, 2.5.19 e 4.2; Apple Developer Program License
  Agreement 3.3.1 B (código interpretado baixado)

## Requisitos

**Conformidade com as lojas.** O pacote remoto contém só código interpretado pelo WebView (HTML, CSS, JavaScript) e
recursos estáticos. As duas lojas aceitam esse tipo de atualização fora da revisão nas condições abaixo, que valem
para todo pacote publicado:

| Regra | Origem | Como a base cumpre |
| --- | --- | --- |
| Sem código nativo baixado (dex, JAR, `.so`, binários) | Google Play: abuso de dispositivo e rede; Apple 2.5.2 | Pacote só com o `out/` do export estático; plugin nativo novo vai por versão de loja |
| Não mudar o propósito principal do app nem o que foi anunciado na loja | Apple: código interpretado (licença) e 2.3.1 | Recursos novos são do mesmo produto e dos perfis já descritos na ficha da loja |
| Sem loja ou vitrine de outros apps/código | Apple: código interpretado (licença) | Pacote único do próprio app |
| Não contornar assinatura, sandbox ou segurança do SO | Google Play; Apple: código interpretado (licença) | Pacote roda no WebView do app, com as permissões já concedidas |
| Sem conteúdo não confiável no WebView com ponte JavaScript | Google Play: abuso de dispositivo e rede | Assinatura obrigatória com a chave pública no APK; manifesto só da URL fixada no build |
| Sem recurso oculto da revisão | Apple 2.5.19, 2.3.1(a) e 2.1 | Toda versão de loja leva contas de demonstração de **cada perfil** habilitado, para a revisão ver o que o perfil acessa |
| Funcionalidade mínima própria | Apple 4.2 | O app traz o pacote embutido e funciona sem baixar nada; não é um site embrulhado |
| Declarações de dados e permissões em dia | Google Play: Segurança dos dados; Apple: privacidade do app | Recurso que colete dado novo ou use permissão nova sai por versão de loja, com a ficha atualizada antes |

**Quando usar versão de loja em vez de pacote remoto:**
- plugin, permissão ou SDK nativo novo, ou versão nova do Capacitor;
- mudança de nome, ícone, identificador ou propósito anunciado;
- primeiro lançamento de um perfil cujo público ou finalidade não esteja descrito na ficha da loja;
- coleta de dado pessoal de nova categoria.

**Pacote e canais.**
- O pacote é o `out/` do build de homologação/produção da marca, que já sai sem código de desenvolvimento e passa
  pela verificação do artefato; nenhum pacote publicado sai do build de desenvolvimento. Exceção: o canal local do
  APK debug, servido só pelo `npm run dev` na rede da máquina, com chave de desenvolvimento e pacote obrigatório
  (docs/ambiente-e-build.md → "Atualização no desenvolvimento"); esse pacote nunca é publicado.
- Um canal por marca × ambiente (homologação, produção), espelhando os composes de `docker/`.
- A versão do pacote é a **versão da aplicação** (`package.json`). O pacote declara a **versão nativa mínima**
  compatível (`nativeVersion` de `scripts/mobile-apps.json`); o app ignora pacote que exija camada nativa mais nova
  que a instalada.
- O canal de entrega é decidido pelo **conteúdo**, não pelo número: a versão da aplicação segue os Conventional
  Commits nos dois casos. Vai por versão de loja (sobe a versão nativa) o que está em "Quando usar versão de loja";
  o resto vai por pacote remoto.
- Pacote sem o que não é do canal: só os recursos da marca do canal e sem ferramentas de consulta técnica.

**Integridade.**
- Todo pacote é assinado com chave da empresa; o app só aplica pacote com assinatura válida e descarta o resto.
- Download por HTTPS do servidor de atualização do ambiente; o endereço vem da configuração do build, nunca do
  conteúdo baixado.
- A atestação do app (Play Integrity/App Attest) cobre o binário da loja, não o pacote: a assinatura do pacote é o
  controle que garante sua origem.

**Ciclo de atualização.**
- O app consulta o canal ao abrir e baixa em segundo plano; o pacote novo vale a partir da **próxima abertura**,
  sem trocar a interface no meio do uso.
- Versão mínima obrigatória (correção crítica): o pacote marcado como obrigatório é aplicado antes do login, com
  aviso ao usuário.
- Volta automática: se o pacote novo não confirmar inicialização bem-sucedida, o app volta ao pacote embutido no APK
  (comportamento do plugin; o mais seguro) e não tenta o mesmo pacote de novo.
- Recurso opcional na geração do app: desligado por padrão e, desligado, ausente dos artefatos (código, plugin nativo,
  configuração e textos), pelo mesmo mecanismo que remove o código de dev.
- Sem rede ou com falha no servidor, o app segue com o pacote atual.

**Evolução por perfil.** Um produto pode lançar o app por perfil.
- O pacote de cada canal leva só os **perfis lançados no app** (lista em `src/config/mobile-release.json`); telas de
  perfil não lançado ficam fora do artefato (não basta escondê-las em runtime: seria recurso oculto da revisão).
- O **primeiro lançamento de um perfil** sai por versão de loja, com a ficha da loja descrevendo o novo público e
  conta de demonstração do perfil. A evolução de perfil já lançado (telas, correções, recursos) sai por pacote remoto.
- Alternativa: lançar um perfil já com home funcional e pelo menos um recurso real; a partir daí ele evolui por
  pacote remoto. Home vazia ou "em breve" não serve (Apple 2.1 e 4.2).
- Usuário de perfil ainda não lançado que entra no app recebe orientação clara para usar o portal web; a web segue
  com todos os perfis.
- O acesso continua controlado pelas permissões reais da sessão (menu e rota) e, de forma definitiva, pela API.

## Contratos e compatibilidade
- Versão da aplicação (`package.json`): identifica também o pacote web. Versão nativa (`nativeVersion`): define o
  `versionName`/`versionCode` da loja e muda só com a camada nativa.
- Build mobile: lista de páginas e perfis publicados (`src/config/mobile-release.json`, vazia = sem restrição) e
  exclusão das rotas fora dela, conferida pela verificação de artefato.
- Build de homologação/produção: ganha a saída do pacote assinado por marca; a verificação de artefato vale para ele.
- Dependência nativa (plugin de atualização remota): entra no app só gerado com o recurso ligado, e numa versão de
  loja.
- Primeira versão de loja com o mecanismo: apps já publicados só passam a receber pacotes remotos depois de atualizar
  para ela.

## Critérios de aceitação
- App sem rede abre com o pacote embutido ou com o último aplicado, em Android e iOS.
- Pacote novo publicado no canal é baixado e passa a valer na abertura seguinte; o anterior permanece até então.
- Pacote com assinatura inválida, de outro canal ou que exija camada nativa mais nova é descartado sem afetar o uso.
- Pacote que não confirma a inicialização volta ao anterior automaticamente.
- Pacote marcado como obrigatório é aplicado antes do login, com aviso.
- Pacote de produção não contém código de desenvolvimento (mesma verificação do artefato atual).
- Telas de um perfil novo aparecem só para sessões com as permissões do perfil, em desktop e mobile.
- O pacote e o APK de um canal não contêm rotas de perfil não lançado no app nem recursos de outra marca.
- Usuário de perfil não lançado no app é orientado a usar o portal web, sem cair em tela inexistente.
- Cada versão de loja é enviada à revisão com contas de demonstração de todos os perfis habilitados.

## Questões abertas
- Servidor de atualização: a base usa o container web do canal (pacote gerado e assinado no host); serviço no
  backend continua possível em cada produto.
- Guarda e rotação da chave de assinatura dos pacotes.
- Política de pacote obrigatório: quem decide e com que antecedência os usuários são avisados.
- iOS: as regras acima valem para as duas lojas, mas a revisão da Apple é a mais restritiva.
- Confirmar o texto vigente das políticas citadas antes da primeira publicação com o mecanismo.
