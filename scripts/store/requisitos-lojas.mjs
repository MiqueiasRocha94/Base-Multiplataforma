// Requisitos da Google Play e da App Store conferidos pelo validar-material.mjs. É dado, não lógica: cada regra traz a
// fonte oficial. As lojas mudam as regras; antes de cada envio, confira as páginas e atualize VERIFICADO_EM.

const VERIFICADO_EM = "2026-11-12";

const FONTES = {
  playTextos: "https://support.google.com/googleplay/android-developer/answer/9859152",
  playImagens: "https://support.google.com/googleplay/android-developer/answer/9866151",
  playNovidades: "fonte secundária; não confirmado na ajuda oficial da Play",
  appleVersao: "https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information",
  appleApp: "https://developer.apple.com/help/app-store-connect/reference/app-information/app-information",
  appleCapturas: "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications",
};

// Campos de texto da fonte (store/textos/<idioma>.md) e o arquivo de cada loja no layout do fastlane.
const CAMPOS = {
  "nome": { android: "title.txt", ios: "name.txt" },
  "descricao-curta": { android: "short_description.txt" },
  "descricao": { android: "full_description.txt", ios: "description.txt" },
  "subtitulo": { ios: "subtitle.txt" },
  "palavras-chave": { ios: "keywords.txt" },
  "texto-promocional": { ios: "promotional_text.txt" },
  "url-suporte": { ios: "support_url.txt" },
  "url-privacidade": { ios: "privacy_url.txt" },
  "url-marketing": { ios: "marketing_url.txt" },
};

// Regras por arquivo de texto da saída. max/min em caracteres; maxBytes em bytes UTF-8; aviso = não bloqueia.
const TEXTOS = {
  android: {
    "title.txt": { obrigatorio: true, max: 30, fonte: FONTES.playTextos },
    "short_description.txt": { obrigatorio: true, max: 80, fonte: FONTES.playTextos },
    "full_description.txt": { obrigatorio: true, max: 4000, fonte: FONTES.playTextos },
    "changelogs/*.txt": { max: 500, aviso: true, fonte: FONTES.playNovidades },
  },
  ios: {
    "name.txt": { obrigatorio: true, min: 2, max: 30, fonte: FONTES.appleApp },
    "subtitle.txt": { max: 30, fonte: FONTES.appleApp },
    "description.txt": { obrigatorio: true, max: 4000, fonte: FONTES.appleVersao },
    "keywords.txt": { obrigatorio: true, maxBytes: 100, palavraMin: 3, fonte: FONTES.appleVersao },
    "promotional_text.txt": { max: 170, fonte: FONTES.appleVersao },
    "release_notes.txt": { max: 4000, fonte: FONTES.appleVersao },
    "support_url.txt": { obrigatorio: true, url: true, fonte: FONTES.appleVersao },
    "privacy_url.txt": { obrigatorio: true, url: true, fonte: FONTES.appleApp },
    "marketing_url.txt": { url: true, fonte: FONTES.appleVersao },
  },
};

// Imagens da Play, por pasta de android/<idioma>/images/.
const IMAGENS_PLAY = {
  icone: { arquivo: "icon", largura: 512, altura: 512, formatos: ["png"], maxKB: 1024, alfa: true,
    obrigatorio: true, fonte: FONTES.playImagens },
  destaque: { arquivo: "featureGraphic", largura: 1024, altura: 500, formatos: ["png", "jpeg"], alfa: false,
    obrigatorio: true, fonte: FONTES.playImagens },
  capturas: {
    pastas: ["phoneScreenshots", "sevenInchScreenshots", "tenInchScreenshots"],
    formatos: ["png", "jpeg"], alfa: false, ladoMin: 320, ladoMax: 3840, proporcaoMax: 2, maxPorPasta: 8,
    minTotal: 2, fonte: FONTES.playImagens,
  },
  // Para o app aparecer como app de tablet; fora disso a Play aceita a captura, por isso só aviso.
  tablet: { pastas: ["sevenInchScreenshots", "tenInchScreenshots"], ladoMin: 1080, ladoMax: 7680,
    proporcoes: ["9:16", "16:9"], min: 4, fonte: FONTES.playImagens },
};

// Capturas da App Store: grupos por tamanho de tela, em retrato (paisagem = mesmas medidas trocadas).
const CAPTURAS_APPLE = {
  formatos: ["png", "jpeg"], alfa: false, minPorGrupo: 1, maxPorGrupo: 10, fonte: FONTES.appleCapturas,
  grupos: {
    "iphone-6.9": { aparelho: "iphone", medidas: [[1260, 2736], [1290, 2796], [1320, 2868]] },
    "iphone-6.5": { aparelho: "iphone", medidas: [[1284, 2778], [1242, 2688]] },
    "iphone-6.3": { aparelho: "iphone", medidas: [[1179, 2556], [1206, 2622]] },
    "ipad-13": { aparelho: "ipad", medidas: [[2064, 2752], [2048, 2732]] },
  },
  // A página oficial lista o iPhone com Dynamic Island de tela média como obrigatório e o iPad 13" se o app roda em
  // iPad. Ela também diz que basta a maior resolução exigida quando a interface é igual entre tamanhos; por isso a
  // falta do grupo médio é aviso, e a falta de qualquer iPhone é erro.
  iphoneRecomendado: "iphone-6.3",
  ipadObrigatorio: "ipad-13",
};

export { VERIFICADO_EM, FONTES, CAMPOS, TEXTOS, IMAGENS_PLAY, CAPTURAS_APPLE };
