// ═══════════════════════════════════════════════════════════
//  src/store/ruminantStore.js — Petits ruminants uniquement
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import { query, insert, run } from '../db/database';
import { todayStr, addDays } from '../utils/dates';
import { logger } from '../utils/logger';
import { genererCalendrierTroupeau } from '../engine/sante';

export const useRuminantStore = create((set, get) => ({
  troupeaux:     [],
  troupeauActif: null,
  animaux:       [],
  isLoading:     false,
  error:         null,

  // ── Charger les troupeaux ──────────────────────────────
  loadTroupeaux: async () => {
    set({ isLoading: true });
    try {
      const troupeaux = await query('SELECT * FROM troupeaux_rum ORDER BY created_at DESC', []);
      const courant = get().troupeauActif;
      set({ troupeaux, troupeauActif: troupeaux.find((t) => courant && t.id === courant.id) || troupeaux[0] || null, isLoading: false });
    } catch (e) {
      set({ error: "Opération impossible. Réessayez.", isLoading: false });
    }
  },

  // ── Ajouter troupeau ───────────────────────────────────
  ajouterTroupeau: async (data) => {
    try {
      const id = await insert('troupeaux_rum', data);
      await genererCalendrierTroupeau(id, data.espece);
      const t = { ...data, id };
      set((s) => ({
        troupeaux:     [t, ...s.troupeaux],
        troupeauActif: s.troupeauActif || t,
      }));
      return id;
    } catch (e) {
      set({ error: "Opération impossible. Réessayez." });
      return null;
    }
  },

  setTroupeauActif: (t) => set({ troupeauActif: t }),

  // ── Charger animaux du troupeau actif ──────────────────
  loadAnimaux: async (troupeauId) => {
    try {
      const animaux = await query(
        "SELECT * FROM animaux WHERE troupeau_id=? AND statut='actif' ORDER BY date_naissance DESC, id DESC",
        [troupeauId]
      );
      set({ animaux });
    } catch (e) {
      logger.error('[ruminantStore] loadAnimaux:', e);
      set({ animaux: [] });
    }
  },

  // ── Ajouter animal ─────────────────────────────────────
  ajouterAnimal: async (data) => {
    try {
      const id = await insert('animaux', data);
      const a  = { ...data, id };
      set((s) => ({ animaux: [a, ...s.animaux] }));
      return { success: true, id };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  // ── Enregistrer naissance ──────────────────────────────
  enregistrerNaissance: async (troupeauId, data) => {
    try {
      await insert('naissances', { troupeau_id: troupeauId, ...data });
      // NB : incrément SQL fait via requête paramétrée dédiée — update()
      // lie toujours ses valeurs en tant que paramètres (?), donc lui passer
      // une expression du type "nb_jeunes + 3" l'insérait comme texte littéral
      // au lieu de l'évaluer, corrompant la colonne (affinité INTEGER).
      await run(
        'UPDATE troupeaux_rum SET nb_jeunes = nb_jeunes + ?, effectif_total = effectif_total + ?, synced = 0 WHERE id = ?',
        [data.nb_vivants, data.nb_vivants, troupeauId]
      );
      // Rafraîchir les troupeaux
      const troupeaux = await query('SELECT * FROM troupeaux_rum ORDER BY created_at DESC', []);
      set({ troupeaux, troupeauActif: troupeaux.find((t) => t.id === troupeauId) || null });
      return { success: true };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  // ── Enregistrer pesée ──────────────────────────────────
  enregistrerPesee: async (animalId, poids, notes = '') => {
    try {
      await insert('pesees', {
        animal_id: animalId,
        date:      todayStr(),
        poids_kg:  poids,
        notes,
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  // ── Dernières pesées d'un animal ──────────────────────
  getPesees: async (animalId) => {
    try {
      return query(
        'SELECT * FROM pesees WHERE animal_id=? ORDER BY date DESC LIMIT 10',
        [animalId]
      );
    } catch (e) {
      return [];
    }
  },

  // ── Enregistrer production lait ───────────────────────
  enregistrerLait: async (troupeauId, data) => {
    try {
      await insert('production_lait', { troupeau_id: troupeauId, ...data });
      return { success: true };
    } catch (e) {
      return { success: false, error: "Opération impossible. Réessayez." };
    }
  },

  // ── Stats lait 7 jours ─────────────────────────────────
  statsLait7j: async (troupeauId) => {
    try {
      const res = await query(
        `SELECT SUM(matin_L + soir_L) as totalL, AVG(matin_L + soir_L) as moyL,
                COUNT(DISTINCT date) as jours
         FROM production_lait WHERE troupeau_id=? AND date>=?`,
        [troupeauId, addDays(todayStr(), -7)]
      );
      return res[0] || { totalL: 0, moyL: 0, jours: 0 };
    } catch (e) {
      return { totalL: 0, moyL: 0, jours: 0 };
    }
  },

  // ── Animaux à sevrer (en retard) ──────────────────────
  getAnimauxASevrer: async (especeId, joursSevrage) => {
    try {
      return query(
        `SELECT a.* FROM animaux a
         LEFT JOIN sevrages s ON s.animal_id = a.id
         WHERE a.espece=? AND a.date_naissance < ? AND s.id IS NULL AND a.statut='actif'`,
        [especeId, addDays(todayStr(), -joursSevrage - 14)]
      );
    } catch (e) {
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));
