// Journalisation sobre : aucun détail technique en production, jamais de données personnelles.
/* global __DEV__ */
const dev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
export const logger = {
  debug: (...a) => { if (dev) console.log(...a); },
  warn:  (...a) => { if (dev) console.warn(...a); },
  error: (scope, err) => { if (dev) console.error(scope, err?.message || err); },
};
