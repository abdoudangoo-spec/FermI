// ═══════════════════════════════════════════════════════════
//  src/engine/poulaillerEngine.js
//  Point d'entrée unique — ré-exporte les 4 sous-modules
//  et expose runCycle + pingPi/lireCapteursPi/commanderActionneur
// ═══════════════════════════════════════════════════════════

export { calculerTHI, niveauStress, getSaisonActuelle }       from './thiEngine';
export { calculerRation, estimerTauxPonte }                    from './rationEngine';
export { calculerActionneurs, genererAlertes }                 from './actuateurEngine';
export { validerCapteursRecu, simulerCapteurs }                from './capteurValidation';

import { calculerTHI, niveauStress, getSaisonActuelle } from './thiEngine';
import { calculerRation, estimerTauxPonte }             from './rationEngine';
import { calculerActionneurs, genererAlertes }          from './actuateurEngine';
import { validerCapteursRecu }                          from './capteurValidation';

const TIMEOUT_MS  = 6000;
const MAX_RETRIES = 1;

function entetes(token, json = false) {
  const h = { Accept: 'application/json' };
  if (json) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchAvecTimeout(url, options = {}, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    if (retries > 0 && err.name !== 'AbortError') {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchAvecTimeout(url, options, retries - 1);
    }
    throw err;
  }
}

const base = (u) => String(u).replace(/\/$/, '');
const NOM_ACTIONNEUR = /^[a-z_]{1,32}$/;
const PROTOCOLES = /^[a-z0-9_]{1,32}$/;

export async function lireCapteursPi(baseUrl, token = '') {
  try {
    const resp = await fetchAvecTimeout(`${base(baseUrl)}/api/etat`, { headers: entetes(token) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const data = validerCapteursRecu(json?.capteurs ?? json);
    if (!data) throw new Error('Données capteurs invalides');
    return { data, online: true, cached: false, error: null };
  } catch (err) {
    return { data: null, online: false, cached: false, error: err.message };
  }
}

export async function commanderActionneur(baseUrl, actionneur, valeur, protocole = 'relay_gpio', token = '') {
  if (!NOM_ACTIONNEUR.test(actionneur)) return { succes: false, erreur: 'Nom actionneur invalide' };
  if (!PROTOCOLES.test(protocole)) return { succes: false, erreur: 'Protocole invalide' };
  if (typeof valeur !== 'boolean' && (typeof valeur !== 'number' || !Number.isFinite(valeur))) return { succes: false, erreur: 'Valeur invalide' };
  if (typeof valeur === 'number' && (valeur < 0 || valeur > 100)) return { succes: false, erreur: 'Valeur hors plage 0-100' };
  try {
    const resp = await fetchAvecTimeout(`${base(baseUrl)}/api/commande`, {
      method: 'POST', headers: entetes(token, true), body: JSON.stringify({ actionneur, valeur, protocole }),
    }, 0);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return { succes: true, erreur: null };
  } catch (err) {
    return { succes: false, erreur: err.message };
  }
}

export async function commanderBatch(baseUrl, commandes, token = '') {
  if (!Array.isArray(commandes) || commandes.length === 0 || commandes.length > 20) return { succes: false, erreur: 'Commandes invalides' };
  for (const cmd of commandes) {
    if (!NOM_ACTIONNEUR.test(cmd.actionneur)) return { succes: false, erreur: `Actionneur invalide: ${cmd.actionneur}` };
  }
  try {
    const resp = await fetchAvecTimeout(`${base(baseUrl)}/api/commandes/batch`, {
      method: 'POST', headers: entetes(token, true), body: JSON.stringify({ commandes }),
    }, 0);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return { succes: true, result: await resp.json(), erreur: null };
  } catch (err) {
    return { succes: false, erreur: err.message };
  }
}

export async function pingPi(baseUrl, token = '') {
  try {
    const resp = await fetchAvecTimeout(`${base(baseUrl)}/api/ping`, { headers: entetes(token) }, 0);
    return resp.ok;
  } catch { return false; }
}

export async function lireHistoriquePi(baseUrl, heures = 24, token = '') {
  try {
    const h = Math.min(Math.max(1, Math.round(heures)), 168);
    const resp = await fetchAvecTimeout(`${base(baseUrl)}/api/historique?heures=${h}`, { headers: entetes(token) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    return Array.isArray(json) ? json : [];
  } catch { return []; }
}

export function runCycle(espece, zone, nombre, semaineAge, sensors) {
  if (!espece || !sensors) return null;
  const thi    = calculerTHI(sensors.temperature, sensors.humidite);
  const stress = niveauStress(thi, espece.id);
  const h      = sensors.heureActuelle ?? new Date().getHours();
  const eauPA  = nombre > 0 ? (sensors.eauConsommee_ml || 0) / nombre : 0;
  const conditions = {
    lumiereOk:    (sensors.lumiereSolaire||0) >= espece.lumiere * 0.85,
    tempOk:       sensors.temperature >= espece.tempOptMin && sensors.temperature <= espece.tempOptMax,
    eauOk:        eauPA >= 180,
    nourritureOk: (sensors.nourriturePct||0) > 20,
    pouxDetectes: Boolean(sensors.pouxDetectes),
    enMue:        Boolean(sensors.enMue),
    malade:       Boolean(sensors.malade),
    effectif:     nombre,
  };
  const checks = [
    { k:'Lumière',   ok:conditions.lumiereOk,    score:conditions.lumiereOk    ?100:50 },
    { k:'Température',ok:conditions.tempOk,      score:conditions.tempOk       ?100:55 },
    { k:'THI Zone',  ok:thi<(zone?.thiSeuil||78),score:stress.niveau==='none'?100:stress.niveau==='mild'?75:stress.niveau==='moderate'?45:stress.niveau==='severe'?20:0 },
    { k:'Eau',       ok:conditions.eauOk,         score:conditions.eauOk        ?100:35 },
    { k:'Nourriture',ok:conditions.nourritureOk, score:conditions.nourritureOk ?100:45 },
    { k:'Santé',     ok:!conditions.pouxDetectes, score:conditions.pouxDetectes ?0:100 },
  ];
  return {
    thi, stress,
    saison:      getSaisonActuelle(zone?.id),
    ration:      calculerRation(espece, zone, nombre, sensors.temperature, sensors.humidite, semaineAge),
    tauxPonte:   estimerTauxPonte(espece, semaineAge, conditions, thi),
    actionneurs: calculerActionneurs(espece, zone, sensors, thi, h),
    alertes:     genererAlertes(espece, zone, sensors, thi),
    score:       { checks, global: Math.round(checks.reduce((s,c)=>s+c.score,0)/checks.length) },
    conditions,
  };
}
