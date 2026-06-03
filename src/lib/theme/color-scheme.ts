export const themeColors = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  background: "var(--color-background)",
  surface: "var(--color-surface)",
  text: "var(--color-text)",
  success: "var(--color-success)",
  error: "var(--color-error)",
} as const;

export type ThemeColorName = keyof typeof themeColors;
