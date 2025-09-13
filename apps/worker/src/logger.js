module.exports = {
  info: (...args) => console.log('[worker]', ...args),
  warn: (...args) => console.warn('[worker]', ...args),
  error: (...args) => console.error('[worker]', ...args),
};

