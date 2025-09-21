/**
 * @file MarkdownRenderer.perf.test.js
 * Mesure de performance pour MarkdownRenderer avec perfOptimized=true.
 * Échoue si le rendu dépasse 500ms sur un texte volumineux.
 */

const React = require('react');
const renderer = require('react-test-renderer');
const { MarkdownRenderer } = require('../pdf-components');

function makeHeavyText() {
  const paras = [];
  for (let i = 0; i < 200; i++) {
    paras.push(`Paragraphe ${i+1}: Ceci est un texte de test avec **mise en forme** et un lien [MDN](https://developer.mozilla.org/).`);
  }
  const bullets = [];
  for (let j = 0; j < 200; j++) {
    bullets.push(`- Élément de liste ${j+1} avec un lien https://example.com/${j}`);
  }
  return [...paras, '', ...bullets].join('\n');
}

describe('MarkdownRenderer performance (perfOptimized)', () => {
  it('rend un texte volumineux en <= 500ms', () => {
    const big = makeHeavyText();
    const t0 = Date.now();
    const tree = renderer.create(
      React.createElement(MarkdownRenderer, { text: big, perfOptimized: true })
    ).toJSON();
    const dt = Date.now() - t0;
    expect(dt).toBeLessThanOrEqual(500);
    expect(tree).toBeTruthy();
  });
});
