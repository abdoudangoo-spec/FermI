// ═══════════════════════════════════════════════════════════
//  src/sync/syncManager.js — Sauvegarde SQLite → cloud (toutes les tables)
//  Une ligne n'est marquée synchronisée qu'après confirmation du serveur.
// ═══════════════════════════════════════════════════════════
import * as Network from 'expo-network';
import { query, run } from '../db/database';
import { SYNC_TABLES } from '../constants/syncTables';
import { pousserLignes, supprimerLigne } from '../firebase/cloud';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';

let enCours = false;
let derniereSync = 0;
const INTERVALLE_MIN_MS = 20_000;
const TAILLE_LOT = 200;
const MAX_TENTATIVES = 8;

export async function isConnected() {
  try {
    const s = await Network.getNetworkStateAsync();
    return s.isConnected === true && s.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function syncerDonnees({ force = false } = {}) {
  if (enCours) return { skip: true, reason: 'déjà en cours' };
  if (!auth.currentUser) return { skip: true, reason: 'non connecté' };
  if (!force && Date.now() - derniereSync < INTERVALLE_MIN_MS) return { skip: true, reason: 'trop récent' };
  if (!(await isConnected())) return { skip: true, reason: 'pas de réseau' };

  enCours = true;
  let synced = 0;
  let errors = 0;
  try {
    // 1. Suppressions en attente
    const suppressions = await query("SELECT * FROM sync_queue WHERE operation = 'delete' AND attempts < ? ORDER BY id ASC", [MAX_TENTATIVES]);
    for (const s of suppressions) {
      try {
        await supprimerLigne(s.table_name, s.record_id);
        await run('DELETE FROM sync_queue WHERE id = ?', [s.id]);
        synced += 1;
      } catch (e) {
        errors += 1;
        await run('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [s.id]);
        logger.warn('[Sync] suppression', e?.code);
      }
    }
    // 2. Créations / modifications
    for (const table of SYNC_TABLES) {
      for (let tour = 0; tour < 25; tour += 1) {
        const rows = await query(`SELECT * FROM ${table} WHERE synced = 0 OR synced IS NULL ORDER BY id ASC LIMIT ${TAILLE_LOT}`, []);
        if (rows.length === 0) break;
        try {
          await pousserLignes(table, rows);
          await run(`UPDATE ${table} SET synced = 1 WHERE id IN (${rows.map(() => '?').join(',')})`, rows.map((r) => r.id));
          synced += rows.length;
        } catch (e) {
          errors += 1;
          logger.warn(`[Sync] ${table}`, e?.code);
          break;
        }
        if (rows.length < TAILLE_LOT) break;
      }
    }
    if (errors === 0) derniereSync = Date.now();
    return { synced, errors };
  } catch (e) {
    logger.error('[Sync] erreur globale', e);
    return { synced, errors: errors + 1 };
  } finally {
    enCours = false;
  }
}

/** Nombre d'éléments en attente d'envoi. */
export async function compterEnAttente() {
  let n = 0;
  for (const t of SYNC_TABLES) {
    const r = await query(`SELECT COUNT(*) AS n FROM ${t} WHERE synced = 0 OR synced IS NULL`, []);
    n += r[0]?.n || 0;
  }
  const q = await query("SELECT COUNT(*) AS n FROM sync_queue WHERE operation = 'delete'", []);
  return n + (q[0]?.n || 0);
}

/** Écoute le réseau ; retourne la fonction d'arrêt. */
export function demarrerEcouteReseau(onSyncComplete) {
  let derniereValeur = null;
  const notifier = (r) => { if (onSyncComplete) onSyncComplete(r); };

  const intervalle = setInterval(async () => {
    try {
      const ok = await isConnected();
      if (ok && derniereValeur === false) notifier(await syncerDonnees());
      derniereValeur = ok;
    } catch { /* le sondage ne doit jamais planter l'application */ }
  }, 15_000);

  const depart = setTimeout(async () => {
    try {
      const ok = await isConnected();
      derniereValeur = ok;
      if (ok) notifier(await syncerDonnees());
    } catch { /* idem */ }
  }, 4_000);

  return () => { clearInterval(intervalle); clearTimeout(depart); };
}
