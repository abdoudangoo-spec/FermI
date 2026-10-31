// ═══════════════════════════════════════════════════════════
//  src/store/financeStore.js — Finance uniquement
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import { insert, query, queryOne } from '../db/database';
import { todayStr, periodeDates } from '../utils/dates';

function getPeriodeMois() {
  const { debut, fin } = periodeDates('mois');
  return { debut, fin: todayStr() > fin ? todayStr() : fin };
}

async function calcTotaux(dateDebut, dateFin) {
  const [dep, rec] = await Promise.all([
    queryOne(
      "SELECT SUM(montant) as t FROM transactions WHERE type='depense' AND date BETWEEN ? AND ?",
      [dateDebut, dateFin]
    ),
    queryOne(
      "SELECT SUM(montant) as t FROM transactions WHERE type='recette' AND date BETWEEN ? AND ?",
      [dateDebut, dateFin]
    ),
  ]);
  const d = dep?.t || 0;
  const r = rec?.t || 0;
  return {
    depenses: parseFloat(d.toFixed(0)),
    recettes: parseFloat(r.toFixed(0)),
    benefice: parseFloat((r - d).toFixed(0)),
    roi_pct:  d > 0 ? parseFloat(((r - d) / d * 100).toFixed(1)) : 0,
  };
}

export const useFinanceStore = create((set, get) => ({
  transactions:  [],
  totauxMois:    { depenses: 0, recettes: 0, benefice: 0, roi_pct: 0 },
  depCat:        [],
  recCat:        [],
  isLoading:     false,
  error:         null,

  // ── Charger tout pour la période ──────────────────────
  loadPeriode: async (dateDebut, dateFin) => {
    set({ isLoading: true });
    try {
      const [totaux, dep, rec, trans] = await Promise.all([
        calcTotaux(dateDebut, dateFin),
        query(
          `SELECT categorie, SUM(montant) as total, COUNT(*) as nb
           FROM transactions WHERE type='depense' AND date BETWEEN ? AND ?
           GROUP BY categorie ORDER BY total DESC`,
          [dateDebut, dateFin]
        ),
        query(
          `SELECT categorie, SUM(montant) as total, COUNT(*) as nb
           FROM transactions WHERE type='recette' AND date BETWEEN ? AND ?
           GROUP BY categorie ORDER BY total DESC`,
          [dateDebut, dateFin]
        ),
        query(
          'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC LIMIT 50',
          [dateDebut, dateFin]
        ),
      ]);
      set({
        totauxMois:   totaux,
        depCat:       dep,
        recCat:       rec,
        transactions: trans,
        isLoading:    false,
      });
    } catch (e) {
      set({ error: "Opération impossible. Réessayez.", isLoading: false });
    }
  },

  // ── Init mois courant ──────────────────────────────────
  loadMoisCourant: async () => {
    const { debut, fin } = getPeriodeMois();
    await get().loadPeriode(debut, fin);
  },

  // ── Ajouter transaction ────────────────────────────────
  ajouterTransaction: async (data) => {
    try {
      await insert('transactions', data);
      const { debut, fin } = getPeriodeMois();
      await get().loadPeriode(debut, fin);
      return { success: true };
    } catch (e) {
      set({ error: "Opération impossible. Réessayez." });
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  // ── Totaux mois courant (pour le dashboard) ────────────
  getTotauxMois: async () => {
    try {
      const { debut, fin } = getPeriodeMois();
      const totaux = await calcTotaux(debut, fin);
      set({ totauxMois: totaux });
      return totaux;
    } catch (e) {
      return { depenses: 0, recettes: 0, benefice: 0, roi_pct: 0 };
    }
  },

  clearError: () => set({ error: null }),
}));
