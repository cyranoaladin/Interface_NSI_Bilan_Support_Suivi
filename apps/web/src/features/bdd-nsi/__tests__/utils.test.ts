import { resolveAssetHref, isSensitiveResource } from '../utils';

describe('resolveAssetHref', () => {
  it('returns anchors/http/mailto as-is', () => {
    expect(resolveAssetHref('#x')).toBe('#x');
    expect(resolveAssetHref('http://x')).toBe('http://x');
    expect(resolveAssetHref('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('prefixes relative BDD assets with /NSI/BDD_NSI', () => {
    expect(resolveAssetHref('etudiant/datasets/a.csv')).toBe('/NSI/BDD_NSI/etudiant/datasets/a.csv');
    expect(resolveAssetHref('/etudiant/datasets/a.csv')).toBe('/NSI/BDD_NSI/etudiant/datasets/a.csv');
  });
  it('keeps absolute BDD path', () => {
    expect(resolveAssetHref('/NSI/BDD_NSI/x.sql')).toBe('/NSI/BDD_NSI/x.sql');
  });
});

describe('isSensitiveResource', () => {
  it('detects solutions/corrections resources', () => {
    expect(isSensitiveResource('enseignant/sql/solutions/solutions_biblio.sql')).toBe(true);
    expect(isSensitiveResource('enseignant/docs/corrections_types.md')).toBe(true);
    expect(isSensitiveResource('etudiant/datasets/biblio_lecteur.csv')).toBe(false);
  });
});