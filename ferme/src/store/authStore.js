// ═══════════════════════════════════════════════════════════
//  src/store/authStore.js — Session utilisateur
//  isLoading = démarrage uniquement ; isBusy = action en cours (connexion, etc.)
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import {
  inscrire, connecter, deconnecter, reinitialiserMotDePasse, lireProfil, assurerProfil,
  majProfil as majProfilFirebase, ecouterAuth, envoyerOTP, verifierOTP,
  supprimerCompte as supprimerCompteFirebase, renvoyerEmailVerification,
  rafraichirUtilisateur, changerMotDePasse as changerMdpFirebase,
} from '../firebase/auth';
import { viderToutesLesDonnees } from '../db/database';
import { ouvrirSession } from '../sync/session';
import { syncerDonnees } from '../sync/syncManager';
import { messageErreur, estErreurIdentifiants } from '../utils/errors';
import { logger } from '../utils/logger';

// ── Limitation locale des tentatives de connexion ──────────
const ESSAIS_AVANT_BLOCAGE = 5;
let echecs = 0;
let bloqueJusqua = 0;

export function __resetLimiteur() { echecs = 0; bloqueJusqua = 0; }

function secondesRestantes() {
  return Math.max(0, Math.ceil((bloqueJusqua - Date.now()) / 1000));
}

function enregistrerEchec() {
  echecs += 1;
  if (echecs >= ESSAIS_AVANT_BLOCAGE) {
    const palier = echecs - ESSAIS_AVANT_BLOCAGE;
    bloqueJusqua = Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** palier);
  }
}

async function avecDelai(promesse, ms) {
  let timer;
  const limite = new Promise((resolve) => { timer = setTimeout(resolve, ms); });
  try { await Promise.race([promesse, limite]); } finally { clearTimeout(timer); }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profil: null,
  isLoading: true,
  isBusy: false,
  isConnecte: false,
  error: null,

  // Écoute Firebase Auth — retourne la fonction de désabonnement.
  init: () => ecouterAuth(async (firebaseUser) => {
    if (!firebaseUser) {
      set({ user: null, profil: null, isConnecte: false, isLoading: false });
      return;
    }
    set({ user: firebaseUser, isConnecte: true, isLoading: false, error: null });
    // Travaux de fond : ne bloquent jamais l'affichage.
    try {
      const profil = (await lireProfil(firebaseUser.uid)) || (await assurerProfil(firebaseUser));
      if (get().user?.uid === firebaseUser.uid) set({ profil });
    } catch (e) { logger.warn('[auth] profil', e?.code); }
    try { await ouvrirSession(firebaseUser.uid); } catch (e) { logger.warn('[auth] session', e?.code); }
  }),

  sInscrire: async (data) => {
    set({ isBusy: true, error: null });
    try {
      const user = await inscrire(data);
      set({ user, isConnecte: true, isBusy: false });
      return { success: true };
    } catch (e) {
      const msg = messageErreur(e);
      set({ isBusy: false, error: msg });
      return { success: false, error: msg };
    }
  },

  seConnecter: async (email, motDePasse) => {
    const attente = secondesRestantes();
    if (attente > 0) {
      const msg = `Trop de tentatives. Réessayez dans ${attente} s.`;
      set({ error: msg });
      return { success: false, error: msg };
    }
    set({ isBusy: true, error: null });
    try {
      const user = await connecter(email, motDePasse);
      echecs = 0;
      bloqueJusqua = 0;
      set({ user, isConnecte: true, isBusy: false });
      return { success: true };
    } catch (e) {
      if (estErreurIdentifiants(e)) enregistrerEchec();
      const msg = messageErreur(e);
      set({ isBusy: false, error: msg });
      return { success: false, error: msg };
    }
  },

  seDeconnecter: async () => {
    // Dernière sauvegarde avant de quitter (au plus 8 s, sans bloquer si hors ligne).
    try { await avecDelai(syncerDonnees({ force: true }), 8000); } catch { /* ignoré */ }
    try { await deconnecter(); } catch (e) { logger.warn('[auth] signOut', e?.code); }
    set({ user: null, profil: null, isConnecte: false });
  },

  // Réponse identique que le compte existe ou non (pas d'énumération de comptes).
  motDePasseOublie: async (email) => {
    set({ isBusy: true, error: null });
    try {
      await reinitialiserMotDePasse(email);
    } catch (e) {
      if (e?.code !== 'auth/user-not-found') {
        const msg = messageErreur(e);
        set({ isBusy: false, error: msg });
        return { success: false, error: msg };
      }
    }
    set({ isBusy: false });
    return { success: true };
  },

  majProfil: async (data) => {
    const { user } = get();
    if (!user) return { success: false, error: 'Non connecté' };
    try {
      await majProfilFirebase(user.uid, data);
      set((s) => ({ profil: { ...s.profil, ...data } }));
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "Impossible d'enregistrer le profil.") };
    }
  },

  changerMotDePasse: async (ancien, nouveau) => {
    try {
      await changerMdpFirebase(ancien, nouveau);
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, 'Impossible de changer le mot de passe.') };
    }
  },

  envoyerOTPTel: async (numero, recaptchaVerifier) => {
    set({ isBusy: true, error: null });
    try {
      const confirmateur = await envoyerOTP(numero, recaptchaVerifier);
      set({ isBusy: false });
      return { success: true, confirmateur };
    } catch (e) {
      const msg = messageErreur(e, "Impossible d'envoyer le SMS.");
      set({ isBusy: false, error: msg });
      return { success: false, error: msg };
    }
  },

  verifierOTPTel: async (confirmateur, code) => {
    set({ isBusy: true, error: null });
    try {
      const user = await verifierOTP(confirmateur, code);
      set({ user, isConnecte: true, isBusy: false });
      return { success: true };
    } catch (e) {
      const msg = messageErreur(e, 'Code incorrect.');
      set({ isBusy: false, error: msg });
      return { success: false, error: msg };
    }
  },

  supprimerCompte: async (motDePasseActuel) => {
    set({ isBusy: true, error: null });
    try {
      await supprimerCompteFirebase(motDePasseActuel);
      await viderToutesLesDonnees();
      set({ user: null, profil: null, isConnecte: false, isBusy: false });
      return { success: true };
    } catch (e) {
      const msg = e?.code === 'auth/missing-password' ? 'Entrez votre mot de passe pour confirmer.' : messageErreur(e, 'Impossible de supprimer le compte pour le moment.');
      set({ isBusy: false, error: msg });
      return { success: false, error: msg };
    }
  },

  renvoyerVerificationEmail: async () => {
    try {
      await renvoyerEmailVerification();
      return { success: true };
    } catch (e) {
      return { success: false, error: messageErreur(e, "Impossible d'envoyer l'email pour le moment.") };
    }
  },

  rafraichirEmailVerifie: async () => {
    try {
      const user = await rafraichirUtilisateur();
      if (user) set({ user });
      return { success: true, verifie: !!user?.emailVerified };
    } catch (e) {
      return { success: false, verifie: false, error: messageErreur(e) };
    }
  },

  clearError: () => set({ error: null }),
}));
