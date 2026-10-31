// ═══════════════════════════════════════════════════════════
//  src/db/database.js — SQLite « offline-first »
//  Requêtes toujours paramétrées ; noms de tables en liste blanche.
// ═══════════════════════════════════════════════════════════
import * as SQLite from 'expo-sqlite';
import { SYNC_TABLES } from '../constants/syncTables';
import { logger } from '../utils/logger';

let db = null;
let dbPromise = null;

// Pour les tests uniquement
export function __resetDB() { db = null; dbPromise = null; }

export async function getDB() {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('ferme_pro_v2.db');
      await d.execAsync('PRAGMA journal_mode = WAL;');
      await d.execAsync('PRAGMA foreign_keys = ON;');
      db = d;
      return d;
    })().catch((e) => { dbPromise = null; throw e; });
  }
  return dbPromise;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL DEFAULT 'Ma ferme',
    zone_id TEXT DEFAULT 'soudano_guineenne',
    api_url TEXT DEFAULT '',
    mode_auto INTEGER DEFAULT 1,
    owner_uid TEXT DEFAULT '',
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS bandes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    espece_id TEXT NOT NULL,
    effectif_initial INTEGER NOT NULL CHECK (effectif_initial >= 0),
    effectif_actuel INTEGER NOT NULL CHECK (effectif_actuel >= 0),
    date_mise_en_place TEXT NOT NULL,
    semaine_age INTEGER DEFAULT 0,
    statut TEXT DEFAULT 'active',
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS ponte_journaliere (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bande_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    nb_oeufs INTEGER NOT NULL CHECK (nb_oeufs >= 0),
    nb_oeufs_casses INTEGER DEFAULT 0,
    poids_moyen_g REAL DEFAULT 60,
    temperature_manuelle REAL,
    humidite_manuelle REAL,
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(bande_id) REFERENCES bandes(id) ON DELETE CASCADE,
    UNIQUE(bande_id, date)
  );
  CREATE TABLE IF NOT EXISTS mortalite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bande_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    nb_morts INTEGER NOT NULL CHECK (nb_morts > 0),
    cause TEXT DEFAULT 'inconnue',
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(bande_id) REFERENCES bandes(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS consommation_aliment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bande_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    quantite_kg REAL NOT NULL CHECK (quantite_kg > 0),
    type_aliment TEXT DEFAULT 'standard',
    cout_unitaire REAL DEFAULT 0,
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(bande_id) REFERENCES bandes(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS troupeaux_rum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    espece TEXT NOT NULL,
    effectif_total INTEGER DEFAULT 0,
    nb_femelles INTEGER DEFAULT 0,
    nb_males INTEGER DEFAULT 0,
    nb_jeunes INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS animaux (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troupeau_id INTEGER NOT NULL,
    numero TEXT NOT NULL,
    nom TEXT DEFAULT '',
    sexe TEXT NOT NULL,
    espece TEXT NOT NULL,
    race TEXT DEFAULT '',
    date_naissance TEXT,
    mere_id INTEGER,
    pere_id INTEGER,
    poids_initial_kg REAL DEFAULT 0,
    statut TEXT DEFAULT 'actif',
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(troupeau_id) REFERENCES troupeaux_rum(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS naissances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troupeau_id INTEGER NOT NULL,
    mere_id INTEGER,
    date TEXT NOT NULL,
    nb_naissances INTEGER DEFAULT 1,
    nb_vivants INTEGER DEFAULT 1,
    nb_morts_nes INTEGER DEFAULT 0,
    poids_naissance_kg REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(troupeau_id) REFERENCES troupeaux_rum(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS pesees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    poids_kg REAL NOT NULL CHECK (poids_kg > 0),
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(animal_id) REFERENCES animaux(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS production_lait (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    troupeau_id INTEGER NOT NULL,
    animal_id INTEGER,
    date TEXT NOT NULL,
    matin_L REAL DEFAULT 0,
    soir_L REAL DEFAULT 0,
    qualite TEXT DEFAULT 'normale',
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(troupeau_id) REFERENCES troupeaux_rum(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sevrages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    date_naissance TEXT,
    date_sevrage TEXT,
    poids_sevrage_kg REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(animal_id) REFERENCES animaux(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('depense','recette')),
    categorie TEXT NOT NULL,
    sous_categorie TEXT DEFAULT '',
    montant REAL NOT NULL CHECK (montant > 0),
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    reference_id INTEGER,
    reference_type TEXT DEFAULT '',
    tva REAL DEFAULT 0,
    devise TEXT DEFAULT 'FCFA',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categorie TEXT NOT NULL,
    montant_prevu REAL NOT NULL,
    mois TEXT NOT NULL,
    notes TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS calendrier_sanitaire (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    espece TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT DEFAULT '',
    age_semaines_debut INTEGER DEFAULT 0,
    age_semaines_fin INTEGER,
    periodicite_jours INTEGER,
    dernier_acte TEXT,
    prochain_acte TEXT,
    statut TEXT DEFAULT 'a_faire',
    reference_id INTEGER,
    reference_type TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS registre_hygiene (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type_acte TEXT NOT NULL,
    zone TEXT DEFAULT '',
    responsable TEXT DEFAULT '',
    produit_utilise TEXT DEFAULT '',
    observations TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS visiteurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    nom TEXT NOT NULL,
    motif TEXT DEFAULT '',
    mesures_prises TEXT DEFAULT '',
    synced INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  -- Modération côté appareil : utilisateurs bloqués (uid) et contenus masqués
  CREATE TABLE IF NOT EXISTS utilisateurs_bloques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifiant TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS contenus_masques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_cible TEXT NOT NULL,
    cible_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(type_cible, cible_id)
  );
  CREATE TABLE IF NOT EXISTS historique_capteurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bande_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    temperature REAL,
    humidite REAL,
    co2_ppm INTEGER,
    nourriture REAL,
    eau_ml INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_hist_bande_ts ON historique_capteurs(bande_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_ponte_bande_date ON ponte_journaliere(bande_id, date);
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_cal_prochain ON calendrier_sanitaire(statut, prochain_acte);
`;

// Colonnes ajoutées après la première version : migration douce des installations existantes.
const MIGRATIONS = [
  ['config', 'owner_uid', "TEXT DEFAULT ''"],
  ['bandes', 'synced', 'INTEGER DEFAULT 0'],
  ['troupeaux_rum', 'synced', 'INTEGER DEFAULT 0'],
  ['animaux', 'synced', 'INTEGER DEFAULT 0'],
  ['budgets', 'synced', 'INTEGER DEFAULT 0'],
  ['calendrier_sanitaire', 'reference_type', "TEXT DEFAULT ''"],
];

async function ajouterColonneSiAbsente(database, table, colonne, ddl) {
  const cols = await database.getAllAsync(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === colonne)) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${ddl};`);
  }
}

export async function initDB() {
  const database = await getDB();
  await database.execAsync(SCHEMA);
  for (const [table, colonne, ddl] of MIGRATIONS) {
    try { await ajouterColonneSiAbsente(database, table, colonne, ddl); } catch (e) { logger.warn('[DB] migration', e?.message); }
  }
  // Anciennes tables locales du marché/forum (désormais hébergés dans le cloud)
  for (const t of ['annonces_marche', 'posts_forum', 'reponses_forum', 'signalements']) {
    try { await database.execAsync(`DROP TABLE IF EXISTS ${t};`); } catch { /* sans importance */ }
  }
  const cfg = await database.getFirstAsync('SELECT id FROM config LIMIT 1');
  if (!cfg) {
    await database.runAsync('INSERT INTO config (nom, zone_id) VALUES (?, ?)', ['Ma ferme', 'soudano_guineenne']);
  }
}

// ── Liste blanche des tables (prévention d'injection SQL) ──
const TABLES_AUTORISEES = new Set([
  'config', ...SYNC_TABLES, 'sync_queue', 'historique_capteurs',
  'utilisateurs_bloques', 'contenus_masques',
]);
const TABLES_SYNC = new Set(SYNC_TABLES);

function assertTable(table) {
  if (!TABLES_AUTORISEES.has(table)) throw new Error(`Table non autorisée: ${table}`);
}

const COLONNE_VALIDE = /^[A-Za-z_][A-Za-z0-9_]*$/;
function assertColonnes(keys) {
  for (const k of keys) if (!COLONNE_VALIDE.test(k)) throw new Error(`Colonne invalide: ${k}`);
}

// ── CRUD ──────────────────────────────────────────────────
// assertTable() est appelé HORS du try/catch : une table hors liste blanche
// est une erreur de programmation, elle doit remonter (fail fast).
export async function insert(table, data) {
  assertTable(table);
  try {
    const database = await getDB();
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    assertColonnes(keys);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => data[k]);
    const result = await database.runAsync(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
    return result.lastInsertRowId;
  } catch (e) {
    logger.error(`[DB] insert(${table})`, e);
    throw e;
  }
}

export async function update(table, id, data) {
  assertTable(table);
  try {
    const database = await getDB();
    const payload = { ...data };
    // Toute modification d'une table synchronisée doit repartir vers le cloud.
    if (TABLES_SYNC.has(table) && payload.synced === undefined) payload.synced = 0;
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    assertColonnes(keys);
    const set = keys.map((k) => `${k} = ?`).join(', ');
    await database.runAsync(`UPDATE ${table} SET ${set} WHERE id = ?`, [...keys.map((k) => payload[k]), id]);
  } catch (e) {
    logger.error(`[DB] update(${table}, ${id})`, e);
    throw e;
  }
}

export async function remove(table, id) {
  assertTable(table);
  try {
    const database = await getDB();
    await database.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
    if (TABLES_SYNC.has(table)) {
      // Trace de suppression : sera répercutée dans le cloud à la prochaine synchronisation.
      await database.runAsync(
        "INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, 'delete', '{}')",
        [table, id]
      );
    }
  } catch (e) {
    logger.error(`[DB] remove(${table}, ${id})`, e);
    throw e;
  }
}

/** `where` doit être un littéral écrit dans le code (jamais une saisie utilisateur) ; les valeurs passent par `params`. */
export async function fetchAll(table, where = '', params = []) {
  assertTable(table);
  try {
    const database = await getDB();
    return await database.getAllAsync(`SELECT * FROM ${table} ${where} ORDER BY id DESC`, params);
  } catch (e) {
    logger.error(`[DB] fetchAll(${table})`, e);
    return [];
  }
}

export async function fetchOne(table, id) {
  assertTable(table);
  try {
    const database = await getDB();
    return await database.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  } catch (e) {
    logger.error(`[DB] fetchOne(${table}, ${id})`, e);
    return null;
  }
}

export async function query(sql, params = []) {
  try {
    const database = await getDB();
    return await database.getAllAsync(sql, params);
  } catch (e) {
    logger.error('[DB] query', e);
    return [];
  }
}

export async function queryOne(sql, params = []) {
  try {
    const database = await getDB();
    return await database.getFirstAsync(sql, params);
  } catch (e) {
    logger.error('[DB] queryOne', e);
    return null;
  }
}

/** Instruction d'écriture (UPDATE / DELETE) — lève l'erreur au lieu de l'avaler. */
export async function run(sql, params = []) {
  const database = await getDB();
  return database.runAsync(sql, params);
}

// ── Propriétaire des données locales ───────────────────────
// Les données locales appartiennent à un compte. Si un autre compte se connecte
// sur le même appareil, elles sont purgées (pas de fuite entre comptes).
export async function lireProprietaire() {
  const row = await queryOne('SELECT owner_uid FROM config LIMIT 1', []);
  return row?.owner_uid || '';
}

export async function definirProprietaire(uid) {
  await run('UPDATE config SET owner_uid = ? WHERE id = (SELECT id FROM config LIMIT 1)', [uid || '']);
}

export async function compterDonnees() {
  let total = 0;
  for (const t of SYNC_TABLES) {
    const r = await queryOne(`SELECT COUNT(*) AS n FROM ${t}`, []);
    total += r?.n || 0;
  }
  return total;
}

// ── Export / restauration ─────────────────────────────────
export async function exporterTables() {
  const out = {};
  for (const t of SYNC_TABLES) out[t] = await query(`SELECT * FROM ${t} ORDER BY id ASC`, []);
  return out;
}

/** Insère des lignes avec leur identifiant d'origine (restauration depuis le cloud). */
export async function restaurerTable(table, rows) {
  assertTable(table);
  if (!TABLES_SYNC.has(table) || !Array.isArray(rows) || rows.length === 0) return 0;
  const database = await getDB();
  const cols = (await database.getAllAsync(`PRAGMA table_info(${table})`)).map((c) => c.name);
  let n = 0;
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => cols.includes(k) && row[k] !== undefined && k !== 'synced');
    if (!keys.includes('id')) continue;
    const all = [...keys, 'synced'];
    await database.runAsync(
      `INSERT OR IGNORE INTO ${table} (${all.join(', ')}) VALUES (${all.map(() => '?').join(', ')})`,
      [...keys.map((k) => row[k]), 1]
    );
    n += 1;
  }
  return n;
}

// ── Purge complète des données locales ─────────────────────
const TABLES_A_VIDER = [...SYNC_TABLES, 'sync_queue', 'historique_capteurs', 'utilisateurs_bloques', 'contenus_masques'];

export async function viderToutesLesDonnees() {
  try {
    const database = await getDB();
    await database.execAsync('PRAGMA foreign_keys = OFF;');
    for (const table of TABLES_A_VIDER) await database.runAsync(`DELETE FROM ${table};`);
    await database.runAsync('DELETE FROM config;');
    await database.runAsync('INSERT INTO config (nom, zone_id) VALUES (?, ?)', ['Ma ferme', 'soudano_guineenne']);
    await database.execAsync('PRAGMA foreign_keys = ON;');
    return true;
  } catch (e) {
    logger.error('[DB] viderToutesLesDonnees', e);
    try { (await getDB()).execAsync('PRAGMA foreign_keys = ON;'); } catch { /* ignore */ }
    return false;
  }
}
