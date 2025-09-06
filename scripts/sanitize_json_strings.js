#!/usr/bin/env node
/**
 * Sanitize JSON by escaping control characters (U+0000..U+001F)
 * inside JSON string literals. This preserves existing escapes and
 * only transforms raw control chars (e.g., newlines) to \n, \r, \t,
 * or \u00XX as appropriate.
 *
 * Usage:
 *   node scripts/sanitize_json_strings.js <input.json> [output.json]
 */
const fs = require('fs');
const path = require('path');

function sanitizeJsonStrings(src) {
  let out = '';
  let inString = false;
  let escape = false;
  let quoteChar = '"';

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (escape) {
        // If a backslash is followed by a control character (e.g., raw newline),
        // normalize it into a valid JSON escape sequence.
        if (ch === '\n') { out += 'n'; escape = false; continue; }
        if (ch === '\r') { out += 'r'; escape = false; continue; }
        if (ch === '\t') { out += 't'; escape = false; continue; }
        if (ch === '\b') { out += 'b'; escape = false; continue; }
        if (ch === '\f') { out += 'f'; escape = false; continue; }
        // Otherwise, if it's a valid JSON escape starter, keep as-is
        if (ch === 'u') {
          const h1 = src[i+1], h2 = src[i+2], h3 = src[i+3], h4 = src[i+4];
          const isHex = c => !!c && ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
          if (isHex(h1) && isHex(h2) && isHex(h3) && isHex(h4)) {
            out += ch; // valid \uXXXX sequence
          } else {
            out += '\\' + ch; // make it a literal backslash + 'u'
          }
          escape = false;
          continue;
        }
        if (ch === '"' || ch === '\\' || ch === '/' || ch === 'b' || ch === 'f' || ch === 'n' || ch === 'r' || ch === 't') {
          out += ch;
          escape = false;
          continue;
        }
        // Unknown escape like "\ " or "\d": make the backslash literal by adding another backslash
        out += '\\' + ch;
        escape = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === quoteChar) {
        out += ch;
        inString = false;
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code >= 0 && code <= 0x1F) {
        switch (ch) {
          case '\n': out += '\\n'; break;
          case '\r': out += '\\r'; break;
          case '\t': out += '\\t'; break;
          case '\b': out += '\\b'; break;
          case '\f': out += '\\f'; break;
          default: {
            const hex = code.toString(16).padStart(4, '0');
            out += `\\u${hex}`;
          }
        }
      } else {
        out += ch;
      }
    } else {
      out += ch;
      if (ch === '"') {
        inString = true;
        escape = false;
        quoteChar = '"';
      }
    }
  }
  return out;
}

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3] || (inPath.replace(/\.json$/i, '') + '.fixed.json');
  if (!inPath) {
    console.error('Usage: node scripts/sanitize_json_strings.js <input.json> [output.json]');
    process.exit(2);
  }
  const src = fs.readFileSync(inPath, 'utf8');
  const sanitized = sanitizeJsonStrings(src);

  // Validate
  try {
    JSON.parse(sanitized);
  } catch (err) {
    console.error('Validation failed after sanitization:', err && err.message ? err.message : err);
    // Still write the output for debugging
    fs.writeFileSync(outPath, sanitized, 'utf8');
    console.error('Wrote partially sanitized output to', outPath);
    process.exit(1);
  }

  fs.writeFileSync(outPath, sanitized, 'utf8');
  console.log('Sanitized JSON written to', outPath);
}

if (require.main === module) {
  main();
}

