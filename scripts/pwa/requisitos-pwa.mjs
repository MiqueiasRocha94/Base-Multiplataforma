// Critérios de instalação de app web (PWA) conferidos pelo validar-pwa.mjs. É dado, não lógica: cada regra traz a
// fonte. Os navegadores mudam os critérios; antes de cada entrega, confira as páginas e atualize VERIFICADO_EM.

const VERIFICADO_EM = "2026-11-12";

const FONTES = {
  chrome: "https://web.dev/articles/install-criteria",
  chromeFetch: "https://developer.chrome.com/blog/update-install-criteria",
  maskable: "https://web.dev/articles/maskable-icon",
  iosIcone: "https://web.dev/codelab-apple-touch-icon",
  ios26: "https://webkit.org/blog/17333/webkit-features-in-safari-26-0/",
  iosPush: "https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/",
  kit: "recomendação do kit (prompts/PWA.md)",
};

// Campos do manifest. aviso = não bloqueia a instalação, mas o kit recomenda.
const MANIFEST = {
  nome: { campos: ["name", "short_name"], fonte: FONTES.chrome },
  startUrl: { campo: "start_url", fonte: FONTES.chrome },
  display: { campo: "display", valores: ["fullscreen", "standalone", "minimal-ui", "window-controls-overlay"],
    fonte: FONTES.chrome },
  relacionados: { campo: "prefer_related_applications", proibido: true, fonte: FONTES.chrome },
  recomendados: { campos: ["id", "scope", "theme_color", "background_color"], aviso: true, fonte: FONTES.kit },
};

// Ícones do manifest: PNG, medida declarada em "sizes" igual à do arquivo.
const ICONES = {
  formatos: ["png"],
  obrigatorios: [192, 512],
  maskable: { medida: 512, aviso: true, fonte: FONTES.maskable },
  fonte: FONTES.chrome,
};

// Ícone da Tela de Início do iOS: tem prioridade sobre os ícones do manifest.
const APPLE_TOUCH_ICON = {
  arquivo: "apple-touch-icon.png",
  largura: 180,
  altura: 180,
  formatos: ["png"],
  aviso: true,
  fonte: FONTES.iosIcone,
};

// Fatos que nenhum script confere; ficam aqui para o roteiro e o doc citarem a mesma fonte.
const OBSERVACOES = [
  { regra: "HTTPS obrigatório (exceto localhost)", fonte: FONTES.chrome },
  { regra: "handler fetch no service worker não é exigido para instalar pelo menu (Chrome 108 Android, 112 desktop)",
    fonte: FONTES.chromeFetch },
  { regra: "aviso automático e beforeinstallprompt dependem da heurística de engajamento do Chrome", fonte: FONTES.chrome },
  { regra: "iOS não dispara beforeinstallprompt: instrução Compartilhar → Adicionar à Tela de Início", fonte: FONTES.iosIcone },
  { regra: "iOS 26: todo site adicionado à Tela de Início abre como app web", fonte: FONTES.ios26 },
  { regra: "web push no iOS só no app da Tela de Início (16.4+)", fonte: FONTES.iosPush },
];

export { VERIFICADO_EM, FONTES, MANIFEST, ICONES, APPLE_TOUCH_ICON, OBSERVACOES };
