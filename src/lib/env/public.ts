export function getPublicEnv() {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Base Multiplataforma",
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  };
}
