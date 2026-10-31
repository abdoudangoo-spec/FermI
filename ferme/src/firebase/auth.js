// ═══════════════════════════════════════════════════════════
//  src/firebase/auth.js — Authentification (email + téléphone) et profil
// ═══════════════════════════════════════════════════════════
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updateProfile, onAuthStateChanged, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, signInWithPhoneNumber, deleteUser,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './config';
import { supprimerEspacePrive } from './cloud';
import { supprimerContenusUtilisateur } from './market';
import { LEGAL_VERSION } from '../constants/legal';
import { nettoyerTexte } from '../utils/validation';
import { logger } from '../utils/logger';

const ZONES_OK = ['sahelienne', 'soudano_guineenne', 'equatoriale', 'hautes_terres', 'australe', 'maghreb'];
const TYPES_OK = ['volailles_ponte', 'volailles_chair', 'moutons', 'chevres', 'mixte'];

// ── Profil Firestore ───────────────────────────────────────
// role et plan sont imposés par les règles de sécurité : le client ne peut pas les modifier.
async function creerProfil(uid, data) {
  await setDoc(doc(db, 'utilisateurs', uid), {
    uid,
    nom: nettoyerTexte(data.nom, 80),
    email: nettoyerTexte(data.email, 120),
    telephone: nettoyerTexte(data.telephone, 20),
    pays: nettoyerTexte(data.pays, 40),
    zone: ZONES_OK.includes(data.zone) ? data.zone : 'soudano_guineenne',
    type_elevage: (data.type_elevage || []).filter((t) => TYPES_OK.includes(t)),
    role: 'eleveur',
    plan: 'gratuit',
    majeur_confirme: true,
    cgu_version: LEGAL_VERSION,
    cgu_acceptee_le: serverTimestamp(),
    cree_le: serverTimestamp(),
    modifie_le: serverTimestamp(),
  });
}

export async function lireProfil(uid) {
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    logger.warn('[Auth] lireProfil', e?.message);
    return null;
  }
}

/** Crée un profil minimal si le compte n'en a pas (création interrompue, hors ligne…). */
export async function assurerProfil(user) {
  const existant = await lireProfil(user.uid);
  if (existant) return existant;
  try {
    await creerProfil(user.uid, { nom: user.displayName || '', email: user.email || '', telephone: user.phoneNumber || '' });
    return await lireProfil(user.uid);
  } catch (e) {
    logger.warn('[Auth] assurerProfil', e?.message);
    return null;
  }
}

// Champs que l'utilisateur a le droit de modifier lui-même.
const CHAMPS_MODIFIABLES = ['nom', 'telephone', 'pays', 'zone', 'type_elevage', 'photo_url'];

export async function majProfil(uid, data) {
  const propre = {};
  for (const k of CHAMPS_MODIFIABLES) if (data[k] !== undefined) propre[k] = data[k];
  if (propre.nom !== undefined) propre.nom = nettoyerTexte(propre.nom, 80);
  if (propre.telephone !== undefined) propre.telephone = nettoyerTexte(propre.telephone, 20);
  if (propre.zone !== undefined && !ZONES_OK.includes(propre.zone)) delete propre.zone;
  await updateDoc(doc(db, 'utilisateurs', uid), { ...propre, modifie_le: serverTimestamp() });
  if (auth.currentUser) {
    if (propre.nom) await updateProfile(auth.currentUser, { displayName: propre.nom });
    if (propre.photo_url) await updateProfile(auth.currentUser, { photoURL: propre.photo_url });
  }
}

// ── Inscription / connexion ────────────────────────────────
export async function inscrire({ nom, email, motDePasse, telephone, pays, zone, typeElevage }) {
  const { user } = await createUserWithEmailAndPassword(auth, email, motDePasse);
  try { await updateProfile(user, { displayName: nettoyerTexte(nom, 80) }); } catch { /* non bloquant */ }
  try {
    await creerProfil(user.uid, { nom, email, telephone, pays, zone, type_elevage: typeElevage });
  } catch (e) {
    logger.warn('[Auth] profil différé', e?.message); // sera recréé par assurerProfil à la prochaine ouverture
  }
  try { await sendEmailVerification(user); } catch (e) { logger.warn('[Auth] email de vérification', e?.message); }
  return user;
}

export async function connecter(email, motDePasse) {
  const { user } = await signInWithEmailAndPassword(auth, email, motDePasse);
  return user;
}

export async function deconnecter() {
  await signOut(auth);
}

export async function reinitialiserMotDePasse(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function renvoyerEmailVerification() {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');
  if (!user.email) throw new Error("Ce compte n'a pas d'adresse email");
  await sendEmailVerification(user);
}

export async function rafraichirUtilisateur() {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  return auth.currentUser;
}

export async function changerMotDePasse(ancien, nouveau) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Non connecté');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, ancien));
  await updatePassword(user, nouveau);
}

// ── Téléphone (SMS) ────────────────────────────────────────
export async function envoyerOTP(numero, recaptchaVerifier) {
  const n = numero.trim();
  return signInWithPhoneNumber(auth, n.startsWith('+') ? n : `+${n}`, recaptchaVerifier);
}

export async function verifierOTP(confirmateur, code) {
  const credential = await confirmateur.confirm(code.trim());
  const user = credential.user;
  await assurerProfil(user);
  return user;
}

export const ecouterAuth = (cb) => onAuthStateChanged(auth, cb);

// ── Suppression du compte et de toutes les données (RGPD art. 17) ──
// Ordre : réauthentification → contenus partagés → espace privé → photo → profil → compte.
export async function supprimerCompte(motDePasseActuel) {
  const user = auth.currentUser;
  if (!user) throw new Error('Non connecté');
  if (user.email) {
    if (!motDePasseActuel) throw Object.assign(new Error('mot de passe requis'), { code: 'auth/missing-password' });
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, motDePasseActuel));
  }
  await supprimerContenusUtilisateur(user.uid);
  await supprimerEspacePrive(user.uid);
  try { await deleteObject(ref(storage, `avatars/${user.uid}.jpg`)); } catch { /* pas de photo */ }
  await deleteDoc(doc(db, 'utilisateurs', user.uid));
  await deleteUser(user);
}
