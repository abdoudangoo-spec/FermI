// Formatage des nombres — sans dépendre d'Intl (comportement identique sur tous les appareils).
export function formatNombre(n, decimales = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const fixed = Math.abs(x).toFixed(decimales);
  const [entier, dec] = fixed.split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const signe = x < 0 && Number(fixed) !== 0 ? '−' : '';
  return `${signe}${groupe}${dec ? `,${dec}` : ''}`;
}

export const formatMontantUI = (n, devise = 'FCFA') => `${formatNombre(n)} ${devise}`;

export function formatSigne(n) {
  const x = Number(n) || 0;
  return `${x > 0 ? '+' : ''}${formatNombre(x)}`;
}

export function pluriel(n, singulier, plur) {
  return `${formatNombre(n)} ${Math.abs(n) > 1 ? plur || `${singulier}s` : singulier}`;
}

/** Retire les pictogrammes emoji d'un texte issu des moteurs de calcul. */
export function sansEmoji(texte) {
  return String(texte ?? '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2190-\u2BFF\u2600-\u27BF\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
