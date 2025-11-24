export const resolveAssetHref = (href: string): string => {
  if (!href) return '#';
  if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return href;
  if (href.startsWith('/NSI/BDD_NSI/')) return href;
  const trimmed = href.replace(/^\/+/, '');
  return `/NSI/BDD_NSI/${trimmed}`;
};

export const isSensitiveResource = (href: string): boolean => /(?:solutions?|corrections?)/i.test(href);