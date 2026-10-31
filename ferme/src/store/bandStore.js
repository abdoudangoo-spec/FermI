// ═══════════════════════════════════════════════════════════
//  src/store/bandStore.js
//  Correction : le store n'appelle PAS genererCalendrierBande
//  => la logique métier reste dans les écrans/hooks
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import { query, insert, update, remove, run } from '../db/database';
import { todayStr, addDays } from '../utils/dates';
import { logger } from '../utils/logger';

export const useBandStore = create((set, get) => ({
  bandes:     [],
  bandActive: null,
  isLoading:  false,
  error:      null,

  loadBandes: async () => {
    set({ isLoading: true });
    try {
      const bandes = await query('SELECT * FROM bandes ORDER BY created_at DESC', []);
      const courante = get().bandActive;
      set({ bandes, bandActive: bandes.find((b) => courante && b.id === courante.id) || bandes[0] || null, isLoading: false });
    } catch (e) {
      set({ error: "Opération impossible. Réessayez.", isLoading: false });
    }
  },

  // Store : CRUD uniquement. Le calendrier est géré par l'écran.
  ajouterBande: async (data) => {
    try {
      const id = await insert('bandes', data);
      const newBande = { ...data, id };
      set((s) => ({
        bandes:    [newBande, ...s.bandes],
        bandActive: s.bandActive || newBande,
      }));
      return { success: true, id };
    } catch (e) {
      set({ error: "Opération impossible. Réessayez." });
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  majBande: async (id, data) => {
    try {
      await update('bandes', id, data);
      set((s) => ({
        bandes:     s.bandes.map((b) => b.id === id ? { ...b, ...data } : b),
        bandActive: s.bandActive?.id === id ? { ...s.bandActive, ...data } : s.bandActive,
      }));
      return { success: true };
    } catch (e) {
      set({ error: "Opération impossible. Réessayez." });
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  supprimerBande: async (id) => {
    try {
      await run("DELETE FROM calendrier_sanitaire WHERE reference_type = 'bande' AND reference_id = ?", [id]);
      await remove('bandes', id);
      set((s) => {
        const bandes = s.bandes.filter((b) => b.id !== id);
        return { bandes, bandActive: bandes[0] || null };
      });
      return { success: true };
    } catch (e) {
      set({ error: "Opération impossible. Réessayez." });
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  setBandeActive: (bande) => set({ bandActive: bande }),

  statsPonte7j: async (bandeId, effectifActuel) => {
    try {
      const date7 = addDays(todayStr(), -7);
      const [ponte, alim] = await Promise.all([
        query(
          'SELECT SUM(nb_oeufs) as total, AVG(nb_oeufs) as moy, COUNT(*) as jours FROM ponte_journaliere WHERE bande_id=? AND date>=?',
          [bandeId, date7]
        ),
        query(
          'SELECT SUM(quantite_kg) as kg FROM consommation_aliment WHERE bande_id=? AND date>=?',
          [bandeId, date7]
        ),
      ]);
      const p = ponte[0] || {};
      const a = alim[0]  || {};
      const totalOeufs = p.total || 0;
      const kgAlim     = a.kg    || 0;
      return {
        totalOeufs,
        moyJour:   parseFloat((p.moy || 0).toFixed(1)),
        jours:     p.jours || 0,
        tauxPonte: effectifActuel > 0
          ? Math.min(100, parseFloat(((p.moy || 0) / effectifActuel * 100).toFixed(1)))
          : 0,
        kgAlim,
        ic: totalOeufs > 0
          ? parseFloat((kgAlim / (totalOeufs / 12)).toFixed(2))
          : null,
      };
    } catch (e) {
      logger.error('[bandStore] statsPonte7j', e);
      return { totalOeufs: 0, moyJour: 0, jours: 0, tauxPonte: 0, kgAlim: 0, ic: null };
    }
  },

  histoPonte: async (bandeId, limite = 14) => {
    try {
      return query('SELECT * FROM ponte_journaliere WHERE bande_id=? ORDER BY date DESC LIMIT ?', [bandeId, limite]);
    } catch (e) {
      logger.error('[bandStore] histoPonte:', e);
      return [];
    }
  },

  saisirPonte: async (bandeId, data) => {
    try {
      await insert('ponte_journaliere', { bande_id: bandeId, ...data });
      return { success: true };
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        return { success: false, error: `Saisie déjà existante pour le ${data.date}` };
      }
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  saisirAliment: async (bandeId, data) => {
    try {
      await insert('consommation_aliment', { bande_id: bandeId, ...data });
      return { success: true };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  saisirMortalite: async (bandeId, nbMorts, cause, effectifActuel) => {
    try {
      if (!Number.isInteger(nbMorts) || nbMorts <= 0) return { success: false, error: 'Nombre de morts invalide' };
      if (nbMorts > effectifActuel) return { success: false, error: `Il ne reste que ${effectifActuel} animaux dans la bande` };
      await insert('mortalite', {
        bande_id: bandeId,
        date:     todayStr(),
        nb_morts: nbMorts,
        cause,
      });
      const newEff = Math.max(0, effectifActuel - nbMorts);
      await update('bandes', bandeId, { effectif_actuel: newEff });
      set((s) => ({
        bandes: s.bandes.map((b) => b.id === bandeId ? { ...b, effectif_actuel: newEff } : b),
        bandActive: s.bandActive?.id === bandeId
          ? { ...s.bandActive, effectif_actuel: newEff }
          : s.bandActive,
      }));
      return { success: true };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  clearError: () => set({ error: null }),
}));
