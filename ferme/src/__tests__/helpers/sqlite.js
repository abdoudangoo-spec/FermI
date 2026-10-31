// expo-sqlite simulé avec node:sqlite (vrai moteur SQLite) pour tester le schéma et les requêtes.
const { DatabaseSync } = require('node:sqlite');
let dbs = {};
async function openDatabaseAsync(name) {
  const db = dbs[name] || (dbs[name] = new DatabaseSync(':memory:'));
  return {
    execAsync: async (sql) => { db.exec(sql); },
    runAsync: async (sql, params = []) => { const r = db.prepare(sql).run(...params); return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes }; },
    getAllAsync: async (sql, params = []) => db.prepare(sql).all(...params).map((r) => ({ ...r })),
    getFirstAsync: async (sql, params = []) => { const r = db.prepare(sql).get(...params); return r ? { ...r } : null; },
  };
}
module.exports = { openDatabaseAsync, __reset: () => { dbs = {}; }, __raw: (n) => dbs[n] };
