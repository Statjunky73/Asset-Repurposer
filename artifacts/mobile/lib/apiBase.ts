export function apiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const protocol = domain?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${domain}${path}`;
}
