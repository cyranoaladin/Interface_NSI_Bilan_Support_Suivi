// Fonction globale de sanitation des chaînes pour PDF
function stripProblemChars(str) {
  if (str === null || str === undefined) return '';
  let s = String(str);

  // Supprime/neutralise :
  // - caractères de contrôle invisibles sauf tab (9), LF (10), CR (13)
  // - surrogates (supprime toute paire ou isolé, donc hors BMP également)
  // - U+FFFD (replacement char parasite)
  // - Variation Selectors (U+FE00–U+FE0F) et Variation Selectors Supplement (U+E0100–U+E01EF)
  // - Zero-width chars: ZWSP (U+200B), ZWNJ (U+200C), ZWJ (U+200D), WJ (U+2060)
  // - Soft hyphen (U+00AD)
  s = s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\u00AD/g, '')
    .replace(/[\u200B\u200C\u200D\u2060]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    // Variation Selectors Supplement: represented in UTF-16 by lead surrogate \uDB40 + trail in \uDD00-\uDDEF
    .replace(/\uDB40[\uDD00-\uDDEF]/g, '')
    // Remove any surrogate code units (drops all non-BMP as well)
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/\uFFFD/g, '');
  return s;
}

function asciiClamp(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  // Conserver les lettres accentuées et la ponctuation française courante.
  // Autorisé:
  // - ASCII imprimable: \x20-\x7E
  // - Latin-1 supplement et Latin étendu: U+00A0–U+024F (inclut la plupart des lettres accentuées)
  // - Marques combinantes: U+0300–U+036F
  // - Tirets et guillemets typographiques: U+2010–U+2015, U+2018–U+201F, U+2026 (ellipsis)
  // Tout le reste est remplacé par un espace.
  return s.replace(/[^\x20-\x7E\u00A0-\u024F\u0300-\u036F\u2010-\u2015\u2018-\u201F\u2026]/g, ' ');
}

module.exports = { stripProblemChars, asciiClamp };
