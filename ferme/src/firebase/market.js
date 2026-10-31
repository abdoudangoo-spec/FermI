// ═══════════════════════════════════════════════════════════
//  src/firebase/market.js — Place de marché et forum (contenus partagés)
//  Champs en liste blanche ; validation répliquée dans firestore.rules.
// ═══════════════════════════════════════════════════════════
import {
  collection, collectionGroup, doc, addDoc, getDocs, deleteDoc, query, where,
  orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, auth, storage } from './config';
import { nettoyerTexte } from '../utils/validation';

function utilisateur() {
  const u = auth.currentUser;
  if (!u) throw new Error('Connexion requise');
  return u;
}

const avecId = (d) => ({ id: d.id, ...d.data() });

// ── Annonces ───────────────────────────────────────────────
export async function listerAnnonces(categorie = null) {
  const c = [where('statut', '==', 'active')];
  if (categorie) c.push(where('categorie', '==', categorie));
  c.push(orderBy('publie_le', 'desc'), limit(60));
  const snap = await getDocs(query(collection(db, 'marche_annonces'), ...c));
  return snap.docs.map(avecId);
}

export async function publierAnnonce(a) {
  const u = utilisateur();
  const data = {
    categorie: a.categorie,
    titre: nettoyerTexte(a.titre, 80),
    description: nettoyerTexte(a.description, 1000),
    prix: Number(a.prix),
    unite: 'FCFA',
    quantite: Number(a.quantite) || 1,
    localisation: nettoyerTexte(a.localisation, 80),
    contact: nettoyerTexte(a.contact, 20),
    photo_url: a.photo_url || '',
    photo_path: a.photo_path || '',
    vendeur: nettoyerTexte(u.displayName || 'Éleveur', 60),
    uid_vendeur: u.uid,
    statut: 'active',
    publie_le: serverTimestamp(),
  };
  const r = await addDoc(collection(db, 'marche_annonces'), data);
  return r.id;
}

export async function supprimerAnnonce(a) {
  await deleteDoc(doc(db, 'marche_annonces', a.id));
  if (a.photo_path) { try { await deleteObject(ref(storage, a.photo_path)); } catch { /* photo déjà absente */ } }
}

// ── Forum ──────────────────────────────────────────────────
export async function listerPosts() {
  const snap = await getDocs(query(collection(db, 'forum_posts'), orderBy('publie_le', 'desc'), limit(30)));
  return snap.docs.map(avecId);
}

export async function publierPost(p) {
  const u = utilisateur();
  const r = await addDoc(collection(db, 'forum_posts'), {
    titre: nettoyerTexte(p.titre, 120),
    contenu: nettoyerTexte(p.contenu, 2000),
    categorie: p.categorie,
    uid_auteur: u.uid,
    auteur: nettoyerTexte(u.displayName || 'Éleveur', 60),
    publie_le: serverTimestamp(),
  });
  return r.id;
}

export async function listerReponses(postId) {
  const snap = await getDocs(query(collection(db, 'forum_posts', postId, 'reponses'), orderBy('publie_le', 'asc'), limit(100)));
  return snap.docs.map(avecId);
}

export async function publierReponse(postId, contenu) {
  const u = utilisateur();
  await addDoc(collection(db, 'forum_posts', postId, 'reponses'), {
    contenu: nettoyerTexte(contenu, 1000),
    uid_auteur: u.uid,
    auteur: nettoyerTexte(u.displayName || 'Éleveur', 60),
    publie_le: serverTimestamp(),
  });
}

export async function supprimerPost(postId) {
  const reps = await getDocs(collection(db, 'forum_posts', postId, 'reponses'));
  const batch = writeBatch(db);
  reps.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'forum_posts', postId));
  await batch.commit();
}

// ── Modération ─────────────────────────────────────────────
export async function signaler({ typeCible, cibleId, motif, details, uidCible }) {
  const u = utilisateur();
  await addDoc(collection(db, 'signalements'), {
    type_cible: typeCible,
    cible_id: String(cibleId),
    uid_cible: uidCible || '',
    motif,
    details: nettoyerTexte(details, 500),
    uid_signalant: u.uid,
    cree_le: serverTimestamp(),
  });
}

// ── Effacement des contenus d'un utilisateur (suppression de compte) ──
export async function supprimerContenusUtilisateur(uid) {
  const annonces = await getDocs(query(collection(db, 'marche_annonces'), where('uid_vendeur', '==', uid)));
  for (const d of annonces.docs) await supprimerAnnonce({ id: d.id, ...d.data() });
  const posts = await getDocs(query(collection(db, 'forum_posts'), where('uid_auteur', '==', uid)));
  for (const d of posts.docs) await supprimerPost(d.id);
  const reponses = await getDocs(query(collectionGroup(db, 'reponses'), where('uid_auteur', '==', uid)));
  for (const d of reponses.docs) await deleteDoc(d.ref);
}

// ── Export des contenus publics de l'utilisateur (droit d'accès) ──
export async function listerContenusUtilisateur(uid) {
  const clean = (d) => {
    const x = { id: d.id, ...d.data() };
    for (const k of Object.keys(x)) if (x[k] && typeof x[k].toMillis === 'function') x[k] = new Date(x[k].toMillis()).toISOString();
    return x;
  };
  const [annonces, posts, reponses] = await Promise.all([
    getDocs(query(collection(db, 'marche_annonces'), where('uid_vendeur', '==', uid))),
    getDocs(query(collection(db, 'forum_posts'), where('uid_auteur', '==', uid))),
    getDocs(query(collectionGroup(db, 'reponses'), where('uid_auteur', '==', uid))),
  ]);
  return { annonces: annonces.docs.map(clean), discussions: posts.docs.map(clean), reponses: reponses.docs.map(clean) };
}
