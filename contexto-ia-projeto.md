# Contexto de IA do Projeto

## Visao geral

Este projeto e uma base multiplataforma feita para servir como ponto de partida de produtos digitais que precisam funcionar bem na web e no mobile sem duplicar arquitetura. A stack principal usa `Next.js 16`, `React 19`, `Tailwind CSS 4`, `TypeScript`, `i18next` e `Capacitor`, permitindo que a mesma experiencia de produto seja distribuida como aplicacao web e tambem encapsulada como app nativo.

O conceito central da base e:

- manter uma unica fonte de verdade para layout, navegacao, identidade visual e componentes reutilizaveis
- separar claramente area publica e area autenticada
- adaptar a experiencia de interface conforme o dispositivo, sem recriar o produto do zero para mobile
- facilitar evolucao orientada por IA, com convencoes previsiveis de pastas, contexto e componentes

## Objetivo do projeto

O projeto existe para acelerar a criacao de portais, paines administrativos, areas logadas, vitrines institucionais e fluxos de autenticacao com uma estrutura preparada para:

- navegacao publica e privada
- internacionalizacao
- tema claro e escuro
- suporte a recursos nativos via Capacitor
- composicao responsiva com shell desktop e mobile
- expansao gradual de componentes de design system

Em termos de produto, esta base nao representa apenas um site. Ela representa um ecossistema de aplicacao com cara de plataforma.

## Conceito de UX

A experiencia deve transmitir tres ideias:

- clareza: o usuario precisa entender rapidamente onde esta, o que pode fazer e qual o proximo passo
- continuidade: a mesma logica de uso deve funcionar no desktop e no mobile, mesmo com adaptacoes de layout
- confianca: a interface deve parecer solida, organizada e consistente, especialmente em areas de autenticacao, dados e operacoes

Isso significa que as decisoes de UX devem priorizar:

- navegacao previsivel
- hierarquia visual evidente
- estados bem definidos para autenticacao, carregamento, vazio e erro
- baixo atrito em tarefas recorrentes
- componentes reutilizaveis com comportamento consistente

## Estrutura de arquitetura

Hoje a base esta organizada com separacao clara entre roteamento, contexto global, servicos, adaptadores de plataforma e componentes.

### Estrutura principal

```text
src/
  app/
    layout.tsx
    page.tsx
    (Public)/
    (Portal)/
  components/
    ui/
  contexts/
  lib/
    auth/
    env/
    i18n/
    platform/
    preferences/
    theme/
  services/
    api/
  styles/
```

### Leitura conceitual da estrutura

- `src/app`
  Define rotas, layouts e composicao por area usando App Router.
- `src/app/(Public)`
  Agrupa fluxos publicos como entrada, home, login e registro.
- `src/app/(Portal)`
  Agrupa a area protegida, onde o usuario autenticado consome a plataforma.
- `src/components`
  Reune blocos de interface reutilizaveis, incluindo shells, navegacao e secoes de pagina.
- `src/components/ui`
  E o nucleo do design system inicial, com componentes basicos como `Button`, `Card`, `Input`, `Label` e `GenericTable`.
- `src/contexts`
  Centraliza estados globais de experiencia, como autenticacao, tema, idioma, dispositivo, UI e modo de desenvolvimento.
- `src/lib/platform`
  Encapsula recursos dependentes de plataforma, como biometria, notificacoes, arquivos, camera e storage.
- `src/services/api`
  Concentra a camada de comunicacao HTTP e integracao com backend.
- `src/styles`
  Guarda tokens visuais globais reutilizados por toda a interface.

## Estrutura de layout

O layout atual segue uma ideia de shell adaptativo.

### Shell global

O `src/app/layout.tsx` delega a composicao visual para `AppLayout`, que envolve a aplicacao com providers e decide qual shell renderizar:

- `DesktopShell`
- `MobileShell`

Essa decisao acontece a partir do `DeviceContext`, o que e um bom padrao para manter comportamento responsivo em nivel arquitetural, nao apenas visual.

### Desktop

No desktop, a estrutura e:

- `Header`
- area principal dentro de `ContentWrapper`
- `WebSidebar` quando houver navegacao lateral relevante
- `Footer`

Esse modelo favorece:

- exploracao ampla
- leitura paralela de navegacao e conteudo
- melhor uso de largura horizontal

### Mobile

No mobile, a estrutura e:

- `TopBar`
- conteudo principal
- `BottomBar` para navegacao autenticada

Esse modelo favorece:

- foco em uma tarefa por vez
- navegacao por polegar
- reducao de ruido visual

### Diretriz de layout

A ideia mais importante para a IA manter ao evoluir a interface e:

- desktop prioriza contexto e navegacao expandida
- mobile prioriza foco, resumibilidade e acoes essenciais

Nao se trata apenas de responsividade CSS. Trata-se de adaptar a forma de uso.

## Direcao visual e identidade

Os tokens atuais mostram uma identidade mais calorosa, organica e institucional, fugindo do padrao frio de dashboard generico.

### Paleta observada

Baseando-se em `src/styles/tokens.css`, a identidade usa:

- verde profundo como cor primaria
- amarelo quente como cor secundaria
- fundos claros com tom neutro quente
- superficies suaves e contrastes moderados
- versao dark coerente com os mesmos significados cromaticos

### Leitura de marca

Essa paleta comunica:

- estabilidade
- confianca
- maturidade
- proximidade
- seriedade sem rigidez excessiva

### Diretriz visual

Ao criar novas telas ou componentes, a IA deve preservar:

- superficies arredondadas
- contraste confortavel para leitura
- blocos de conteudo com espacamento generoso
- uso intencional da cor primaria em acoes e estados ativos
- uso da cor secundaria para destaque e calor visual, sem excesso

## UI e comportamento esperado

### Principios de interface

- a pagina deve comunicar a funcao principal em poucos segundos
- a navegacao deve permanecer consistente entre areas semelhantes
- os componentes devem parecer parte da mesma familia
- a interface deve evitar excesso de informacao por tela
- estados vazios e mensagens auxiliares devem orientar a proxima acao

### Hierarquia de conteudo

Cada tela idealmente deve responder nesta ordem:

1. Onde estou?
2. O que posso fazer aqui?
3. Qual informacao e mais importante?
4. Qual acao principal devo executar?

### Adaptacao por contexto

A base ja sugere uma regra util:

- em telas publicas, destacar descoberta, apresentacao e conversao
- em telas autenticadas, destacar produtividade, navegacao e continuidade de uso

## Componentes basicos do projeto

Os componentes basicos ja presentes formam um mini design system com potencial de expansao.

### Componentes fundamentais

- `Button`
  Botao com variantes semanticas como principal, outline, secundaria, ghost e danger. Ja considera adaptacao de uso no mobile.
- `Card`
  Componente de container para agrupar conteudo, muito importante para manter consistencia visual entre blocos.
- `Input`
  Base para formularios e fluxos de autenticacao.
- `Label`
  Rotulacao consistente para campos e secoes.
- `GenericTable`
  Tabela adaptativa que vira cards no mobile, reforcando a estrategia multiplataforma da base.

### Componentes estruturais

- `AppLayout`
  Orquestra providers e shell.
- `ContentWrapper`
  Centraliza e controla largura e respiracao do conteudo.
- `Header`, `Footer`, `TopBar`, `BottomBar`, `WebSidebar`
  Constroem a espinha dorsal da navegacao.

### Componentes de experiencia

- `ThemeToggleButton`
  Ajusta preferencia visual.
- `LocaleSwitcher`
  Expande acessibilidade linguistica.
- `AccountMenu`
  Concentra acoes do usuario autenticado.
- `DeveloperModeOverlay`
  Da suporte a fluxo tecnico sem poluir a experiencia comum.

## Contextos globais importantes

Os providers mostram quais dimensoes do produto sao estruturais e nao apenas detalhes:

- `ThemeProvider`
  Tema e preferencia visual sao parte central da experiencia.
- `LanguageProvider`
  O produto nasce preparado para multiplos idiomas.
- `AuthProvider`
  Autenticacao afeta navegacao, shell e acesso.
- `DeviceProvider`
  O dispositivo influencia a interface de forma arquitetural.
- `DeveloperModeProvider`
  Existe preocupacao com fluxo de diagnostico e desenvolvimento.
- `UIProvider`
  Estados compartilhados de interface podem crescer de forma centralizada.

## Modelo de navegacao

O projeto trabalha com dois grandes dominios de experiencia:

### 1. Dominio publico

Voltado para:

- entrada no produto
- apresentacao de proposta de valor
- autenticacao
- cadastro

### 2. Dominio portal

Voltado para:

- uso recorrente
- acesso autenticado
- informacoes operacionais
- perfil e continuidade da jornada

Essa divisao e importante porque a IA deve sempre avaliar se uma nova funcionalidade pertence:

- a uma experiencia de descoberta
- a uma experiencia de operacao

Misturar as duas reduz clareza.

## Regras praticas para a IA ao evoluir este projeto

### Estrutura

- manter novas rotas dentro da logica do App Router
- colocar implementacoes locais em `_components` e `_lib` quando fizer sentido
- evitar componentes gigantes com responsabilidade misturada
- reaproveitar `contexts`, `lib` e `services` antes de criar novas camadas

### Layout

- respeitar a separacao entre shell desktop e shell mobile
- nao assumir que uma tabela desktop funciona bem no mobile sem adaptacao
- priorizar `ContentWrapper`, `Card` e `Button` como blocos base da composicao

### UI/UX

- reduzir atrito em formularios
- manter linguagem de interface simples e objetiva
- reforcar estados ativos, foco, erro, sucesso e vazio
- evitar poluicao visual em paginas autenticadas
- usar a cor como suporte de hierarquia, nao como decoracao gratuita

### Componentizacao

- expandir primeiro `src/components/ui` antes de criar variacoes soltas
- manter API dos componentes previsivel
- pensar sempre em reutilizacao entre publico, portal, web e mobile

## O que este projeto quer ser

Este projeto quer ser uma base confiavel para produtos digitais multiplataforma com:

- arquitetura clara
- identidade visual consistente
- experiencia adaptativa real entre desktop e mobile
- componentes fundamentais bem definidos
- espaco seguro para crescer em complexidade sem perder organizacao

Em resumo, nao e apenas um boilerplate tecnico. E uma fundacao de produto.

## Resumo executivo para uso por IA

Se uma IA precisar tomar decisoes rapidas neste repositorio, ela deve assumir que:

- esta base serve uma aplicacao web e mobile com o mesmo nucleo
- `src/app` organiza experiencia publica e autenticada
- o layout muda por contexto de dispositivo, nao apenas por breakpoint
- o design system ainda e enxuto, mas ja tem componentes-base suficientes para consolidacao
- consistencia, clareza e reutilizacao valem mais que efeitos visuais soltos
- qualquer evolucao deve fortalecer a base como plataforma, nao fragmenta-la
