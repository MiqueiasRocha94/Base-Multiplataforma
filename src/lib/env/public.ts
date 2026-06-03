function getEnv(name: string) {
  return process.env[name];
}

export function getPublicEnv() {
  return {
    apiUrl: getEnv("NEXT_PUBLIC_API_URL") ?? "",
    appName: getEnv("NEXT_PUBLIC_APP_NAME") ?? "Base Multiplataforma",
  };
}
