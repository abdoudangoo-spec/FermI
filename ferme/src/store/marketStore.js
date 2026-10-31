// ═══════════════════════════════════════════════════════════
//  src/store/marketStore.js — Annonces et forum (contenus partagés, en ligne)
//  Chaque liste expose un statut : idle | loading | ready | error.
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import {
  listerAnnonces, publierAnnonce, supprimerAnnonce, listerPosts, publierPost,
  listerReponses, publierReponse, supprimerPost, signaler,
} from '../firebase/market';
import { messageErreur } from '../utils/errors';
import { useAppStore } from './appStore';

export const useMarketStore = create((set, get) => ({
  annonces: [], annoncesStatut: 'idle', annoncesErreur: null,
  posts: [], postsStatut: 'idle', postsErreur: null,
  reponses: {}, // postId -> liste

  chargerAnnonces: async (categorie = null) => {
    set({ annoncesStatut: 'loading', annoncesErreur: null });
    try {
      set({ annonces: await listerAnnonces(categorie), annoncesStatut: 'ready' });
    } catch (e) {
      set({ annoncesStatut: 'error', annoncesErreur: messageErreur(e, 'Impossible de charger les annonces.') });
    }
  },

  publierAnnonce: async (data) => {
    try {
      const id = await publierAnnonce(data);
      return { success: true, id };
    } catch (e) {
      return { success: false, error: messageErreur(e, "L'annonce n'a pas pu être publiée.") };
    }
  },

  supprimerAnnonce: async (annonce) => {
    try {
      await supprimerAnnonce(annonce);
      set((s) => ({ annonces: s.annonces.filter((a) => a.id !== annonce.id) }));
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "Suppression impossible.") };
    }
  },

  chargerPosts: async () => {
    set({ postsStatut: 'loading', postsErreur: null });
    try {
      set({ posts: await listerPosts(), postsStatut: 'ready' });
    } catch (e) {
      set({ postsStatut: 'error', postsErreur: messageErreur(e, 'Impossible de charger le forum.') });
    }
  },

  publierPost: async (data) => {
    try {
      await publierPost(data);
      await get().chargerPosts();
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "Le message n'a pas pu être publié.") };
    }
  },

  supprimerPost: async (postId) => {
    try {
      await supprimerPost(postId);
      set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, 'Suppression impossible.') };
    }
  },

  chargerReponses: async (postId) => {
    try {
      const liste = await listerReponses(postId);
      set((s) => ({ reponses: { ...s.reponses, [postId]: liste } }));
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, 'Impossible de charger les réponses.') };
    }
  },

  repondre: async (postId, contenu) => {
    try {
      await publierReponse(postId, contenu);
      await get().chargerReponses(postId);
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "La réponse n'a pas pu être publiée.") };
    }
  },

  // Signale au serveur ET masque immédiatement le contenu sur l'appareil.
  signaler: async ({ typeCible, cibleId, motif, details, uidCible }) => {
    try {
      await signaler({ typeCible, cibleId, motif, details, uidCible });
      await useAppStore.getState().masquerContenu(typeCible, cibleId);
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "Le signalement n'a pas pu être envoyé.") };
    }
  },
}));
