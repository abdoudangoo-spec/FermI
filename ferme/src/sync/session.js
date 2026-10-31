// ═══════════════════════════════════════════════════════════
//  src/sync/session.js — Ouverture de session des données locales
//  - purge si un autre compte se connecte sur l'appareil
//  - restauration depuis le cloud sur un appareil vide
// ═══════════════════════════════════════════════════════════
import {
  lireProprietaire, definirProprietaire, viderToutesLesDonnees, compterDonnees, restaurerTable,
} from '../db/database';
import { SYNC_TABLES } from '../constants/syncTables';
import { lireTable } from '../firebase/cloud';
import { auth } from '../firebase/config';
import { useAppStore } from '../store/appStore';
import { useBandStore } from '../store/bandStore';
import { useRuminantStore } from '../store/ruminantStore';
import { useFinanceStore } from '../store/financeStore';
import { logger } from '../utils/logger';

export async function rechargerStores() {
  await Promise.all([
    useAppStore.getState().init(),
    useBandStore.getState().loadBandes(),
    useRuminantStore.getState().loadTroupeaux(),
    useFinanceStore.getState().loadMoisCourant(),
  ]);
}

export async function restaurerDepuisCloud() {
  let total = 0;
  for (const table of SYNC_TABLES) {
    const rows = await lireTable(table);
    total += await restaurerTable(table, rows);
  }
  return total;
}

/** Retourne { purge, restaure } */
export async function ouvrirSession(uid) {
  const resultat = { purge: false, restaure: 0 };
  const proprietaire = await lireProprietaire();
  if (proprietaire && proprietaire !== uid) {
    await viderToutesLesDonnees();
    resultat.purge = true;
  }
  if (proprietaire !== uid) await definirProprietaire(uid);
  // La restauration n'a lieu que pour le compte réellement connecté.
  if (auth.currentUser?.uid === uid && (await compterDonnees()) === 0) {
    try { resultat.restaure = await restaurerDepuisCloud(); } catch (e) { logger.warn('[Session] restauration', e?.code); }
  }
  if (resultat.purge || resultat.restaure > 0) await rechargerStores();
  return resultat;
}
