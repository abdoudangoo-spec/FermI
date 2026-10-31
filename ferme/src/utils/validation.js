// ═══════════════════════════════════════════════════════════
//  src/utils/validation.js — Validation de saisie (sans dépendance)
//  Chaque règle renvoie un message d'erreur (string) ou null.
// ═══════════════════════════════════════════════════════════
import { isValidDateStr, todayStr } from './dates';

const vide = (x) => x === undefined || x === null || String(x).trim() === '';

export const rules = {
  required: (label) => (x) => (vide(x) ? `${label} requis` : null),
  maxLen: (n, label = 'Ce champ') => (x) => (String(x ?? '').length > n ? `${label} : ${n} caractères maximum` : null),
  minLen: (n, label = 'Ce champ') => (x) => (vide(x) || String(x).trim().length >= n ? null : `${label} : ${n} caractères minimum`),
  email: (x) => (vide(x) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(x).trim()) ? null : 'Adresse email invalide'),
  phone: (x) => (vide(x) || /^\+?[\d\s().-]{7,18}$/.test(String(x).trim()) ? null : 'Numéro de téléphone invalide'),
  date: (label = 'Date', { futur = true } = {}) => (x) => {
    if (vide(x)) return null;
    if (!isValidDateStr(x)) return `${label} invalide (AAAA-MM-JJ)`;
    if (!futur && x > todayStr()) return `${label} ne peut pas être dans le futur`;
    return null;
  },
  nombre: (label, { min = 0, max = 1e9, entier = false } = {}) => (x) => {
    if (vide(x)) return null;
    const n = toNumber(x);
    if (!Number.isFinite(n)) return `${label} invalide`;
    if (entier && !Number.isInteger(n)) return `${label} doit être un nombre entier`;
    if (n < min) return `${label} doit être ≥ ${min}`;
    if (n > max) return `${label} doit être ≤ ${max}`;
    return null;
  },
  positif: (label) => (x) => {
    if (vide(x)) return null;
    return toNumber(x) > 0 ? null : `${label} doit être supérieur à 0`;
  },
  mini: (n, label) => (x) => (vide(x) || toNumber(x) >= n ? null : `${label} doit être ≥ ${n}`),
};

/** "12,5" → 12.5 ; "" → NaN */
export function toNumber(x) {
  if (typeof x === 'number') return x;
  if (vide(x)) return NaN;
  const n = Number(String(x).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** schema = { champ: [règle, règle…] } — retourne { ok, errors } (première erreur par champ). */
export function validate(values, schema) {
  const errors = {};
  for (const [champ, liste] of Object.entries(schema)) {
    for (const regle of liste) {
      const msg = regle(values[champ], values);
      if (msg) { errors[champ] = msg; break; }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// ── Mot de passe ─────────────────────────────────────────
const MOTS_DE_PASSE_FAIBLES = new Set([
  '1234567890', 'password123', 'motdepasse1', 'azertyuiop', 'qwertyuiop', 'abcdefghij',
  'password12', 'motdepasse', 'azerty1234', 'qwerty1234', '0123456789', 'aaaaaaaaaa',
]);

/** Retourne { score 0-4, label, erreurs[] } — 10 caractères mini, lettres + chiffres. */
export function evaluerMotDePasse(mdp, email = '') {
  const m = String(mdp || '');
  const erreurs = [];
  if (m.length < 10) erreurs.push('10 caractères minimum');
  if (!/[A-Za-zÀ-ÿ]/.test(m)) erreurs.push('au moins une lettre');
  if (!/\d/.test(m)) erreurs.push('au moins un chiffre');
  if (MOTS_DE_PASSE_FAIBLES.has(m.toLowerCase())) erreurs.push('mot de passe trop courant');
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && m.toLowerCase().includes(local)) erreurs.push("ne doit pas contenir votre adresse email");
  if (/^(.)\1+$/.test(m)) erreurs.push('caractères tous identiques');
  let score = 0;
  if (m.length >= 10) score++;
  if (m.length >= 14) score++;
  if (/[a-z]/.test(m) && /[A-Z]/.test(m)) score++;
  if (/[^A-Za-z0-9]/.test(m) && /\d/.test(m)) score++;
  if (erreurs.length > 0) score = Math.min(score, 1);
  const labels = ['Très faible', 'Faible', 'Correct', 'Bon', 'Excellent'];
  return { score, label: labels[score], erreurs, valide: erreurs.length === 0 };
}

/** Supprime les caractères de contrôle et normalise les espaces d'un texte libre. */
export function nettoyerTexte(x, max = 2000) {
  return String(x ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}
