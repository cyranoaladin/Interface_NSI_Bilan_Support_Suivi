/**
 * @file MarkdownRenderer.test.js
 * Tests unitaires pour le composant MarkdownRenderer
 */

const React = require('react');
const renderer = require('react-test-renderer');
const { MarkdownRenderer } = require('../pdf-components');

describe('MarkdownRenderer', () => {
  it('rend du texte simple sans formatage', () => {
    const tree = renderer.create(
      React.createElement(MarkdownRenderer, { text: 'Bonjour NSI' })
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('rend du texte en gras (**...**)', () => {
    const tree = renderer.create(
      React.createElement(MarkdownRenderer, { text: 'Ceci est **important**' })
    ).toJSON();

    const flattened = JSON.stringify(tree);
    expect(flattened).toContain('important');
  });

  it('rend une liste à puces (- item)', () => {
    const tree = renderer.create(
      React.createElement(MarkdownRenderer, { text: '- Item 1\n- Item 2' })
    ).toJSON();

    const flattened = JSON.stringify(tree);
    expect(flattened).toContain('• Item 1');
    expect(flattened).toContain('• Item 2');
  });

  it('gère les lignes vides (sauts de ligne)', () => {
    const tree = renderer.create(
      React.createElement(MarkdownRenderer, { text: 'Texte avant\n\nTexte après' })
    ).toJSON();

    const flattened = JSON.stringify(tree);
    expect(flattened).toContain('Texte avant');
    expect(flattened).toContain('Texte après');
  });
});