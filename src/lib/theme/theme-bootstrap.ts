/**
 * Tema ANTES da primeira pintura (sem dependências de cliente — importável no
 * layout raiz, no servidor). Mesmo papel do `VIEW_BOOTSTRAP_SCRIPT` para a view.
 *
 * Sem isto a página pinta com os tokens genéricos de `tokens.css` e só após a
 * hidratação o ThemeProvider aplica as cores da marca — a primária "pisca".
 *
 * - `THEME_BOOTSTRAP_CSS`: as CSS vars do esquema ativo da marca do BUILD
 *   (config estática), claro e escuro, com os mesmos seletores de `tokens.css`
 *   e especificidade maior (vence independente da ordem no <head>). São os
 *   mesmos valores que o ThemeProvider aplica depois — nada muda na hidratação.
 * - `THEME_BOOTSTRAP_SCRIPT`: aplica as preferências salvas (tema, fonte,
 *   arredondamento, escala) em `<html>` antes de pintar, espelhando o
 *   ThemeProvider.
 *
 * Limite: o override de marca do devtools (só em dev) vem do storage e continua
 * entrando após montar.
 */
import { activeBrand, brandThemeContract } from "@/config/brand";
import { systemConfig } from "@/lib/config/system-config";
import { storageKeys } from "@/lib/platform/storage";
import { resolveCssVars, type ResolvedTheme } from "@/lib/theme/color-scheme";

function declarations(theme: ResolvedTheme): string {
  const vars = resolveCssVars(systemConfig.colorScheme, brandThemeContract(activeBrand), theme);
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
}

const light = declarations("light");
const dark = declarations("dark");

export const THEME_BOOTSTRAP_CSS =
  `html:root,html:root[data-theme="light"]{${light}}` +
  `html:root[data-theme="dark"]{${dark}}` +
  `@media (prefers-color-scheme: dark){html:root:not([data-theme]){${dark}}}`;

// Chaves do storage + defaults da config estática (sem preferência salva, vale o default).
const prefs = JSON.stringify({
  keys: {
    theme: storageKeys.theme,
    font: storageKeys.fontPreset,
    radius: storageKeys.radiusPreset,
    scale: storageKeys.fontScale,
  },
  defaults: {
    theme: systemConfig.theme,
    font: systemConfig.fontPreset,
    radius: systemConfig.radiusPreset,
    scale: systemConfig.fontScale,
  },
});

export const THEME_BOOTSTRAP_SCRIPT = `try{var p=${prefs},k=p.keys,d=p.defaults,h=document.documentElement,g=function(x){try{return localStorage.getItem(x)}catch(e){return null}},pick=function(v,ok,fb){return ok.indexOf(v)>=0?v:fb},t=pick(g(k.theme),["system","light","dark"],d.theme),f=pick(g(k.font),["manrope","system","reading"],d.font),r=pick(g(k.radius),["high","default","light","none"],d.radius),z=Number(g(k.scale));if(!(z>0&&isFinite(z)))z=d.scale;if(t!=="system")h.dataset.theme=t;h.dataset.font=f;if(r!=="default")h.dataset.radius=r;h.style.setProperty("--font-scale",String(Math.round(z*100)/100))}catch(e){}`;
