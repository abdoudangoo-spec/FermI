// ═══════════════════════════════════════════════════════════
//  src/store/appStore.js — Configuration, alertes sanitaires, modération locale
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import { query, queryOne, run } from '../db/database';
import { todayStr, addDays, diffDays } from '../utils/dates';
import { logger } from '../utils/logger';

const CONFIG_DEFAUT = { nom: 'Ma ferme', zone_id: 'soudano_guineenne', api_url: '' };

async function chargerAlertes() {
  const today = todayStr();
  const alertes = await query(
    "SELECT * FROM calendrier_sanitaire WHERE prochain_acte <= ? AND statut='a_faire' ORDER BY prochain_acte ASC",
    [addDays(today, 7)]
  );
  return alertes.map((a) => ({
    ...a,
    enRetard: a.prochain_acte < today,
    joursRestants: diffDays(today, a.prochain_acte),
  }));
}

export const useAppStore = create((set, get) => ({
  config: CONFIG_DEFAUT,
  alertesSante: [],
  blocages: [],
  masques: [],
  isReady: false,
  error: null,

  init: async () => {
    try {
      const cfg = await queryOne('SELECT * FROM config LIMIT 1', []);
      const [alertesSante, bloques, masques] = await Promise.all([
        chargerAlertes(),
        query('SELECT identifiant FROM utilisateurs_bloques', []),
        query('SELECT type_cible, cible_id FROM contenus_masques', []),
      ]);
      set({
        config: cfg || CONFIG_DEFAUT,
        alertesSante,
        blocages: bloques.map((b) => b.identifiant),
        masques: masques.map((m) => `${m.type_cible}:${m.cible_id}`),
        isReady: true,
        error: null,
      });
    } catch (e) {
      logger.error('[appStore] init', e);
      set({ isReady: true, error: 'Impossible de lire les données locales.' });
    }
  },

  updateConfig: async (data) => {
    try {
      const merged = { ...get().config, ...data };
      await run(
        'UPDATE config SET nom = ?, zone_id = ?, api_url = ? WHERE id = (SELECT id FROM config LIMIT 1)',
        [merged.nom, merged.zone_id, merged.api_url || '']
      );
      set({ config: merged });
      return { success: true };
    } catch (e) {
      logger.error('[appStore] updateConfig', e);
      return { success: false, error: "Impossible d'enregistrer la configuration." };
    }
  },

  refreshAlertes: async () => {
    try { set({ alertesSante: await chargerAlertes() }); } catch (e) { logger.error('[appStore] alertes', e); }
  },

  // ── Modération (côté appareil) ───────────────────────────
  bloquerUtilisateur: async (uid) => {
    if (!uid) return { success: false, error: 'Utilisateur inconnu' };
    try {
      await run('INSERT OR IGNORE INTO utilisateurs_bloques (identifiant) VALUES (?)', [uid]);
      set((s) => ({ blocages: [...new Set([...s.blocages, uid])] }));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Impossible de bloquer cet utilisateur.' };
    }
  },

  debloquerUtilisateur: async (uid) => {
    try {
      await run('DELETE FROM utilisateurs_bloques WHERE identifiant = ?', [uid]);
      set((s) => ({ blocages: s.blocages.filter((id) => id !== uid) }));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Impossible de débloquer cet utilisateur.' };
    }
  },

  masquerContenu: async (type, id) => {
    try {
      await run('INSERT OR IGNORE INTO contenus_masques (type_cible, cible_id) VALUES (?, ?)', [type, String(id)]);
      set((s) => ({ masques: [...new Set([...s.masques, `${type}:${id}`])] }));
    } catch (e) {
      logger.error('[appStore] masquer', e);
    }
  },

  clearError: () => set({ error: null }),
}));
