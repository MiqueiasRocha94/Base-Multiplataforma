import type { FontPreset, AppTheme } from "@/contexts/ThemeProvider";

export const themeOptions: Array<{ value: AppTheme; labelKey: "themeSystem" | "themeLight" | "themeDark" }> = [
  { value: "system", labelKey: "themeSystem" },
  { value: "light", labelKey: "themeLight" },
  { value: "dark", labelKey: "themeDark" },
];

export const fontPresets: Array<{ value: FontPreset; labelKey: "fontSystem" | "fontReading" | "fontCompact" }> = [
  { value: "system", labelKey: "fontSystem" },
  { value: "reading", labelKey: "fontReading" },
  { value: "compact", labelKey: "fontCompact" },
];
