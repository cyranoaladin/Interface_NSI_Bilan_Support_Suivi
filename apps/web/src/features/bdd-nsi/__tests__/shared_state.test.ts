import { normalizeDataset, toSolutionToken, fromSolutionToken } from '../shared-state';

describe('shared-state helpers', () => {
  it('normalizes dataset keys with fallback', () => {
    expect(normalizeDataset('bibliotheque')).toBe('bibliotheque');
    expect(normalizeDataset('unknown')).toBeDefined();
  });
  it('encodes/decodes solution tokens', () => {
    expect(toSolutionToken(true)).toBe('on');
    expect(toSolutionToken(false)).toBe('off');
    expect(fromSolutionToken('on', false)).toBe(true);
    expect(fromSolutionToken('off', true)).toBe(false);
    expect(fromSolutionToken('x', true)).toBe(true);
  });
});