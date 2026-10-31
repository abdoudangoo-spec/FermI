// ═══════════════════════════════════════════════════════════
//  src/utils/dates.js — Dates en heure LOCALE
//  Évite toISOString() (UTC) qui décale la date du jour autour de minuit.
// ═══════════════════════════════════════════════════════════
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const pad = (n) => String(n).padStart(2, '0');

export function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayStr = () => toDateStr(new Date());

/** Retourne un Date (minuit local) ou null si la chaîne n'est pas une vraie date AAAA-MM-JJ. */
export function parseDateStr(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export const isValidDateStr = (s) => parseDateStr(s) !== null;

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr) || new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Nombre de jours entiers entre deux dates AAAA-MM-JJ (b - a). */
export function diffDays(a, b) {
  const da = parseDateStr(a);
  const db = parseDateStr(b);
  if (!da || !db) return 0;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

export function formatDateFR(s) {
  const d = parseDateStr(s);
  if (!d) return s || '';
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMoisAnnee(d = new Date()) {
  return `${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Transforme une saisie libre en AAAA-MM-JJ au fil de la frappe (chiffres uniquement). */
export function maskDateInput(text) {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function periodeDates(periode, now = new Date()) {
  const fin = toDateStr(now);
  if (periode === 'trimestre') return { debut: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)), fin };
  if (periode === 'annee') return { debut: toDateStr(new Date(now.getFullYear(), 0, 1)), fin };
  return { debut: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), fin };
}

/** Temps relatif à partir d'un timestamp en secondes ou en millisecondes. */
export function tempsRelatif(ts, now = Date.now()) {
  if (!ts) return "à l'instant";
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const diffS = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffS < 60) return "à l'instant";
  if (diffS < 3600) return `il y a ${Math.floor(diffS / 60)} min`;
  if (diffS < 86400) return `il y a ${Math.floor(diffS / 3600)} h`;
  if (diffS < 604800) return `il y a ${Math.floor(diffS / 86400)} j`;
  return formatDateFR(toDateStr(new Date(ms)));
}
