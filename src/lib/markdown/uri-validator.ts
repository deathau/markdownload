export function validateUri(href: string, baseURI: string): string {
  try {
    new URL(href);
    return href;
  } catch {
    const baseUrl = new URL(baseURI);

    if (href.startsWith('/')) {
      return baseUrl.origin + href;
    }

    const basePath = baseUrl.href.endsWith('/') ? baseUrl.href : baseUrl.href + '/';
    return basePath + href;
  }
}
