import { sanitizeLatex } from '../sanitizeLatex';

describe('sanitizeLatex', () => {
  it('escapes latex special characters', () => {
    const s = String('10% & cost_$ ^ { } ~ # \\');
    const out = sanitizeLatex(s);
    expect(out).toContain('\\%');
    expect(out).toContain('\\&');
    expect(out).toContain('\\_');
    expect(out).toContain('\\textasciicircum{}');
    expect(out).toContain('\\{');
    expect(out).toContain('\\}');
    expect(out).toContain('\\textasciitilde{}');
    expect(out).toContain('\\#');
    expect(out).toContain('\\textbackslash{}');
  });
});

