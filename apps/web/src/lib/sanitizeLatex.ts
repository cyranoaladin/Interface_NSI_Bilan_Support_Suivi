export function sanitizeLatex(input: string): string {
  const map: Record<string, string> = {
    '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '#': '\\#', '$': '\\$',
    '%': '\\%', '&': '\\&', '_': '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'
  };
  return (input || '').replace(/[\\{}#$%&_~^]/g, (m) => map[m]);
}

