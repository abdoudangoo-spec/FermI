// ═══════════════════════════════════════════════════════════
//  src/utils/piUrl.js — Validation de l'adresse du contrôleur IoT
//  Le trafic HTTP en clair n'est toléré que sur le réseau local ;
//  toute adresse publique doit passer par HTTPS.
// ═══════════════════════════════════════════════════════════
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipv4Prive(host) {
  const m = IPV4.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

export function estHoteLocal(host) {
  const h = String(host || '').toLowerCase();
  return h === 'localhost' || h.endsWith('.local') || ipv4Prive(h);
}

/** Retourne { ok, url, erreur } — url normalisée (sans slash final ni chemin). */
export function validerUrlPi(saisie) {
  const brut = String(saisie || '').trim();
  if (!brut) return { ok: false, url: '', erreur: "Entrez l'adresse du contrôleur." };
  if (brut.length > 200) return { ok: false, url: '', erreur: 'Adresse trop longue.' };
  const m = /^(https?):\/\/([^/:?#\s@]+)(?::(\d{1,5}))?\/?$/i.exec(brut);
  if (!m) return { ok: false, url: '', erreur: 'Format attendu : http://192.168.1.42:8080' };
  const [, schema, host, port] = m;
  if (port && (Number(port) < 1 || Number(port) > 65535)) return { ok: false, url: '', erreur: 'Port invalide.' };
  if (schema.toLowerCase() === 'http' && !estHoteLocal(host)) {
    return { ok: false, url: '', erreur: "Une adresse hors réseau local doit utiliser https://." };
  }
  return { ok: true, url: `${schema.toLowerCase()}://${host}${port ? `:${port}` : ''}`, erreur: null };
}
