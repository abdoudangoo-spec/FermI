// ═══════════════════════════════════════════════════════════
//  src/firebase/cloud.js — Sauvegarde / restauration des données d'élevage
//  Espace privé : utilisateurs/{uid}/{table}/{id}. Les erreurs sont PROPAGÉES
//  (jamais avalées) : une ligne n'est marquée « synchronisée » que si l'envoi a réussi.
// ═══════════════════════════════════════════════════════════
import {
  collection, doc, getDocs, writeBatch, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './config';
import { SYNC_TABLES, CASCADE } from '../constants/syncTables';

const LOT = 400; // limite Firestore : 500 opérations par lot

function uidCourant() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Utilisateur non connecté');
  return uid;
}

function verifierTable(table) {
  if (!SYNC_TABLES.includes(table)) throw new Error(`Table non synchronisable: ${table}`);
}

export async function pousserLignes(table, rows) {
  verifierTable(table);
  const uid = uidCourant();
  for (let i = 0; i < rows.length; i += LOT) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + LOT)) {
      const { synced, ...data } = row; // eslint-disable-line no-unused-vars
      batch.set(doc(db, 'utilisateurs', uid, table, String(row.id)), { ...data, synced_at: serverTimestamp() });
    }
    await batch.commit();
  }
}

async function supprimerDocs(refs) {
  for (let i = 0; i < refs.length; i += LOT) {
    const batch = writeBatch(db);
    refs.slice(i, i + LOT).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

export async function supprimerLigne(table, id) {
  verifierTable(table);
  const uid = uidCourant();
  const refs = [doc(db, 'utilisateurs', uid, table, String(id))];
  for (const [enfant, colonne] of CASCADE[table] || []) {
    const snap = await getDocs(query(collection(db, 'utilisateurs', uid, enfant), where(colonne, '==', Number(id))));
    snap.forEach((d) => refs.push(d.ref));
    if (enfant === 'animaux') {
      for (const d of snap.docs) {
        for (const [petitEnfant, col2] of CASCADE.animaux) {
          const s2 = await getDocs(query(collection(db, 'utilisateurs', uid, petitEnfant), where(col2, '==', Number(d.id))));
          s2.forEach((x) => refs.push(x.ref));
        }
      }
    }
  }
  await supprimerDocs(refs);
}

export async function lireTable(table) {
  verifierTable(table);
  const uid = uidCourant();
  const snap = await getDocs(collection(db, 'utilisateurs', uid, table));
  return snap.docs.map((d) => {
    const { synced_at, ...data } = d.data(); // eslint-disable-line no-unused-vars
    return { ...data, id: Number(d.id) };
  }).filter((r) => Number.isFinite(r.id));
}

/** Efface tout l'espace privé de l'utilisateur (suppression de compte, RGPD art. 17). */
export async function supprimerEspacePrive(uid) {
  for (const table of SYNC_TABLES) {
    const snap = await getDocs(collection(db, 'utilisateurs', uid, table));
    await supprimerDocs(snap.docs.map((d) => d.ref));
  }
}
