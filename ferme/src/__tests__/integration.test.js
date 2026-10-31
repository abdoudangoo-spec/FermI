// Tests d'intégration : vrai SQLite + faux Firebase en mémoire (voir jest.config.js).
import { __resetDB, initDB, getDB, insert, update, remove, fetchAll, query, queryOne, lireProprietaire, definirProprietaire, viderToutesLesDonnees, compterDonnees } from '../db/database';
import * as sqlite from 'expo-sqlite';
import { useBandStore } from '../store/bandStore';
import { useRuminantStore } from '../store/ruminantStore';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore, __resetLimiteur } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { genererCalendrierBande, alertesSanitaires } from '../engine/sante';
import { ageSemaines } from '../engine/aviculture';
import { genererRapportPDF } from '../engine/finance';
import { syncerDonnees, compterEnAttente } from '../sync/syncManager';
import { ouvrirSession } from '../sync/session';
import { auth } from '../firebase/config';
import { todayStr, addDays } from '../utils/dates';

let sqliteOk = true;
try { require('node:sqlite'); } catch { sqliteOk = false; }
const suite = sqliteOk ? describe : describe.skip;
const fb = () => globalThis.__fb;
const docsOf = (prefix) => [...fb().docs.keys()].filter((p) => p.startsWith(prefix));

async function freshDB() {
  sqlite.__reset(); __resetDB();
  await initDB();
}
function resetFirebase() {
  const g = fb();
  g.docs.clear(); g.users.clear(); g.deletedFiles.length = 0; g.failFirestore = false; g.verifSent = 0; g.deleted = null;
  auth.currentUser = null; globalThis.__offline = false; __resetLimiteur();
}
async function connecterVerifie(email = 'eleveur@exemple.com') {
  const r = await useAuthStore.getState().sInscrire({ nom: 'Amadou', email, motDePasse: 'Ferme2026Niger!', telephone: '', pays: 'niger', zone: 'sahelienne', typeElevage: ['mixte'] });
  expect(r.success).toBe(true);
  auth.currentUser.emailVerified = true;
  return auth.currentUser;
}

suite('base de données', () => {
  beforeEach(freshDB);

  test('le schéma est créé et initDB est idempotent', async () => {
    await initDB();
    const tables = (await query("SELECT name FROM sqlite_master WHERE type='table'", [])).map((t) => t.name);
    for (const t of ['bandes', 'transactions', 'sync_queue', 'contenus_masques', 'utilisateurs_bloques']) expect(tables).toContain(t);
    expect(tables).not.toContain('annonces_marche');
    expect((await query('SELECT * FROM config', [])).length).toBe(1);
  });

  test("migration d'une ancienne installation sans perte de données", async () => {
    sqlite.__reset(); __resetDB();
    const legacy = await sqlite.openDatabaseAsync('ferme_pro_v2.db');
    await legacy.execAsync(`
      CREATE TABLE config (id INTEGER PRIMARY KEY, nom TEXT NOT NULL DEFAULT 'Ma ferme', zone_id TEXT DEFAULT 'soudano_guineenne', api_url TEXT DEFAULT '', mode_auto INTEGER DEFAULT 1, updated_at INTEGER);
      CREATE TABLE bandes (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, espece_id TEXT NOT NULL, effectif_initial INTEGER NOT NULL, effectif_actuel INTEGER NOT NULL, date_mise_en_place TEXT NOT NULL, semaine_age INTEGER DEFAULT 0, statut TEXT DEFAULT 'active', notes TEXT DEFAULT '', created_at INTEGER);
      CREATE TABLE troupeaux_rum (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, espece TEXT NOT NULL, effectif_total INTEGER DEFAULT 0, nb_femelles INTEGER DEFAULT 0, nb_males INTEGER DEFAULT 0, nb_jeunes INTEGER DEFAULT 0, notes TEXT DEFAULT '', created_at INTEGER);
      CREATE TABLE calendrier_sanitaire (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, espece TEXT NOT NULL, type TEXT NOT NULL, description TEXT DEFAULT '', age_semaines_debut INTEGER DEFAULT 0, age_semaines_fin INTEGER, periodicite_jours INTEGER, dernier_acte TEXT, prochain_acte TEXT, statut TEXT DEFAULT 'a_faire', reference_id INTEGER, synced INTEGER DEFAULT 0, created_at INTEGER);
      CREATE TABLE annonces_marche (id INTEGER PRIMARY KEY, titre TEXT);
      INSERT INTO config (nom) VALUES ('Ancienne ferme');
      INSERT INTO bandes (nom, espece_id, effectif_initial, effectif_actuel, date_mise_en_place) VALUES ('Vieille bande', 'lohmann', 50, 48, '2026-01-01');
    `);
    await initDB();
    const bande = await queryOne('SELECT * FROM bandes', []);
    expect(bande.nom).toBe('Vieille bande');
    expect(bande.synced).toBe(0);
    expect((await queryOne('SELECT * FROM config', [])).nom).toBe('Ancienne ferme');
    expect(await lireProprietaire()).toBe('');
    const cols = (await query('PRAGMA table_info(calendrier_sanitaire)', [])).map((c) => c.name);
    expect(cols).toContain('reference_type');
    const tables = (await query("SELECT name FROM sqlite_master WHERE type='table'", [])).map((t) => t.name);
    expect(tables).not.toContain('annonces_marche');
  });

  test("protection contre l'injection SQL", async () => {
    await expect(insert('bandes; DROP TABLE bandes', { nom: 'x' })).rejects.toThrow('Table non autorisée');
    await expect(update('bandes', 1, { 'nom = 1; --': 'x' })).rejects.toThrow('Colonne invalide');
    await expect(fetchAll('sqlite_master')).rejects.toThrow();
  });

  test('contraintes de cohérence', async () => {
    await expect(insert('transactions', { type: 'depense', categorie: 'aliment', montant: 0, description: 'x', date: '2026-01-01' })).rejects.toThrow();
    await expect(insert('transactions', { type: 'autre', categorie: 'aliment', montant: 5, description: 'x', date: '2026-01-01' })).rejects.toThrow();
    await expect(insert('bandes', { nom: 'x', espece_id: 'lohmann', effectif_initial: -1, effectif_actuel: 0, date_mise_en_place: '2026-01-01' })).rejects.toThrow();
  });

  test('une suppression laisse une trace pour le cloud et un update remet synced à 0', async () => {
    const id = await insert('bandes', { nom: 'B', espece_id: 'lohmann', effectif_initial: 10, effectif_actuel: 10, date_mise_en_place: '2026-01-01', synced: 1 });
    await update('bandes', id, { nom: 'B2' });
    expect((await queryOne('SELECT synced FROM bandes WHERE id=?', [id])).synced).toBe(0);
    await remove('bandes', id);
    const t = await query("SELECT * FROM sync_queue WHERE operation='delete'", []);
    expect(t.length).toBe(1);
    expect(t[0].table_name).toBe('bandes');
  });
});

suite('stores et moteurs', () => {
  beforeEach(async () => { await freshDB(); useBandStore.setState({ bandes: [], bandActive: null }); });

  test('bande : création, ponte, mortalité et suppression complète', async () => {
    const s = useBandStore.getState();
    const r = await s.ajouterBande({ nom: 'Lohmann', espece_id: 'lohmann', effectif_initial: 100, effectif_actuel: 100, date_mise_en_place: addDays(todayStr(), -7), semaine_age: 18, statut: 'active' });
    expect(r.success).toBe(true);
    await genererCalendrierBande(r.id, addDays(todayStr(), -7), 'lohmann');
    const cal = await query("SELECT * FROM calendrier_sanitaire WHERE reference_type='bande' AND reference_id=?", [r.id]);
    expect(cal.length).toBeGreaterThan(0);

    expect((await useBandStore.getState().saisirPonte(r.id, { date: todayStr(), nb_oeufs: 80, nb_oeufs_casses: 2 })).success).toBe(true);
    const stats = await useBandStore.getState().statsPonte7j(r.id, 100);
    expect(stats.totalOeufs).toBe(80);

    const trop = await useBandStore.getState().saisirMortalite(r.id, 500, 'maladie', 100);
    expect(trop.success).toBe(false);
    expect(trop.error).toMatch('100');
    expect((await useBandStore.getState().saisirMortalite(r.id, 4, 'maladie', 100)).success).toBe(true);
    expect((await queryOne('SELECT effectif_actuel FROM bandes WHERE id=?', [r.id])).effectif_actuel).toBe(96);

    expect((await useBandStore.getState().supprimerBande(r.id)).success).toBe(true);
    expect((await query('SELECT * FROM ponte_journaliere', [])).length).toBe(0);
    expect((await query("SELECT * FROM calendrier_sanitaire WHERE reference_type='bande'", [])).length).toBe(0);
  });

  test("l'âge d'une bande progresse avec le temps", () => {
    expect(ageSemaines({ semaine_age: 18, date_mise_en_place: addDays(todayStr(), -14) })).toBe(20);
    expect(ageSemaines({ semaine_age: 5, date_mise_en_place: todayStr() })).toBe(5);
  });

  test('la sélection de bande est conservée au rechargement', async () => {
    const s = useBandStore.getState();
    const a = await s.ajouterBande({ nom: 'A', espece_id: 'lohmann', effectif_initial: 10, effectif_actuel: 10, date_mise_en_place: todayStr(), semaine_age: 0, statut: 'active' });
    const b = await s.ajouterBande({ nom: 'B', espece_id: 'lohmann', effectif_initial: 10, effectif_actuel: 10, date_mise_en_place: todayStr(), semaine_age: 0, statut: 'active' });
    await useBandStore.getState().loadBandes();
    useBandStore.getState().setBandeActive(useBandStore.getState().bandes.find((x) => x.id === a.id));
    await useBandStore.getState().loadBandes();
    expect(useBandStore.getState().bandActive.id).toBe(a.id);
    expect(b.success).toBe(true);
  });

  test('troupeau : naissance met à jour effectif et marque à synchroniser', async () => {
    const id = await useRuminantStore.getState().ajouterTroupeau({ nom: 'Moutons', espece: 'mouton', effectif_total: 10, nb_femelles: 6, nb_males: 2, nb_jeunes: 2 });
    expect(id).toBeTruthy();
    await run0();
    const r = await useRuminantStore.getState().enregistrerNaissance(id, { date: todayStr(), nb_naissances: 2, nb_vivants: 2, nb_morts_nes: 0, poids_naissance_kg: 3 });
    expect(r.success).toBe(true);
    const t = await queryOne('SELECT * FROM troupeaux_rum WHERE id=?', [id]);
    expect(t.effectif_total).toBe(12);
    expect(t.synced).toBe(0);
    const cal = await query("SELECT * FROM calendrier_sanitaire WHERE reference_type='troupeau' AND reference_id=?", [id]);
    expect(cal.length).toBeGreaterThan(0);
  });

  test('finance : totaux, validation et message sans détail technique', async () => {
    const f = useFinanceStore.getState();
    expect((await f.ajouterTransaction({ type: 'depense', categorie: 'aliment', montant: 1000, description: 'Sacs', date: todayStr() })).success).toBe(true);
    expect((await useFinanceStore.getState().ajouterTransaction({ type: 'recette', categorie: 'vente_oeufs', montant: 3000, description: 'Œufs', date: todayStr() })).success).toBe(true);
    const bad = await useFinanceStore.getState().ajouterTransaction({ type: 'depense', categorie: 'aliment', montant: 0, description: 'x', date: todayStr() });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe('Opération impossible. Réessayez.');
    await useFinanceStore.getState().loadMoisCourant();
    const t = useFinanceStore.getState().totauxMois;
    expect(t.depenses).toBe(1000);
    expect(t.recettes).toBe(3000);
    expect(t.benefice).toBe(2000);
  });

  test("le rapport PDF échappe le contenu saisi par l'utilisateur", async () => {
    await insert('transactions', { type: 'depense', categorie: 'aliment', montant: 500, description: '<script>alert(1)</script><img src=x onerror=y>', date: todayStr() });
    const r = await genererRapportPDF('Ferme <b>X</b>', addDays(todayStr(), -1), todayStr());
    expect(r.uri).toBeTruthy();
    const html = globalThis.__lastPdfHtml;
    expect(html).toMatch('FermI');
    expect(html.includes('<script>')).toBe(false);
    expect(html.includes('<img src=x')).toBe(false);
    expect(html).toMatch('&lt;script&gt;');
    expect(html.includes('Ferme <b>X</b>')).toBe(false);
  });

  test('alertes sanitaires : actes en retard détectés', async () => {
    await insert('calendrier_sanitaire', { nom: 'Vaccin test', espece: 'volaille', type: 'vaccin', prochain_acte: addDays(todayStr(), -3), statut: 'a_faire', reference_type: 'bande', reference_id: 1 });
    const a = await alertesSanitaires();
    expect(a.length).toBe(1);
    expect(a[0].enRetard).toBe(true);
    expect(a[0].joursRestants).toBe(-3);
  });
});

async function run0() { /* point de synchronisation des promesses en attente */ await Promise.resolve(); }

suite('authentification, sauvegarde et suppression de compte', () => {
  beforeEach(async () => { await freshDB(); resetFirebase(); });

  test("inscription : profil sans élévation de privilèges, consentement enregistré, email de vérification", async () => {
    const user = await connecterVerifie();
    const profil = fb().docs.get(`utilisateurs/${user.uid}`);
    expect(profil.role).toBe('eleveur');
    expect(profil.plan).toBe('gratuit');
    expect(profil.majeur_confirme).toBe(true);
    expect(profil.cgu_version).toBe('2.0');
    expect(fb().verifSent).toBe(1);
    expect(Object.keys(profil).includes('motDePasse')).toBe(false);
  });

  test('connexion : message générique puis blocage temporaire après 5 échecs', async () => {
    await connecterVerifie();
    await useAuthStore.getState().seDeconnecter();
    const s = useAuthStore.getState();
    for (let i = 0; i < 5; i += 1) {
      const r = await s.seConnecter('eleveur@exemple.com', 'mauvais');
      expect(r.error).toBe('Email ou mot de passe incorrect.');
    }
    const bloque = await s.seConnecter('eleveur@exemple.com', 'Ferme2026Niger!');
    expect(bloque.success).toBe(false);
    expect(bloque.error).toMatch('Trop de tentatives');
  });

  test("mot de passe oublié : même réponse pour un compte inexistant", async () => {
    const r = await useAuthStore.getState().motDePasseOublie('inconnu@exemple.com');
    expect(r.success).toBe(true);
  });

  test('sauvegarde : envoi, modification, suppression en cascade côté cloud', async () => {
    const user = await connecterVerifie();
    const s = useBandStore.getState();
    const b = await s.ajouterBande({ nom: 'Sync', espece_id: 'lohmann', effectif_initial: 20, effectif_actuel: 20, date_mise_en_place: todayStr(), semaine_age: 0, statut: 'active' });
    await s.saisirPonte(b.id, { date: todayStr(), nb_oeufs: 10, nb_oeufs_casses: 0 });
    expect(await compterEnAttente()).toBeGreaterThan(0);

    const r1 = await syncerDonnees({ force: true });
    expect(r1.errors).toBe(0);
    expect(fb().docs.has(`utilisateurs/${user.uid}/bandes/${b.id}`)).toBe(true);
    expect(docsOf(`utilisateurs/${user.uid}/ponte_journaliere/`).length).toBe(1);
    expect(await compterEnAttente()).toBe(0);

    await useBandStore.getState().majBande(b.id, { nom: 'Renommée' });
    expect(await compterEnAttente()).toBe(1);
    await syncerDonnees({ force: true });
    expect(fb().docs.get(`utilisateurs/${user.uid}/bandes/${b.id}`).nom).toBe('Renommée');
    expect(fb().docs.get(`utilisateurs/${user.uid}/bandes/${b.id}`).synced).toBeUndefined();

    await useBandStore.getState().supprimerBande(b.id);
    await syncerDonnees({ force: true });
    expect(fb().docs.has(`utilisateurs/${user.uid}/bandes/${b.id}`)).toBe(false);
    expect(docsOf(`utilisateurs/${user.uid}/ponte_journaliere/`).length).toBe(0);
    expect((await query('SELECT * FROM sync_queue', [])).length).toBe(0);
  });

  test("un échec réseau ne marque jamais les données comme sauvegardées", async () => {
    await connecterVerifie();
    await insert('bandes', { nom: 'Échec', espece_id: 'lohmann', effectif_initial: 5, effectif_actuel: 5, date_mise_en_place: todayStr() });
    fb().failFirestore = true;
    const r = await syncerDonnees({ force: true });
    expect(r.errors).toBeGreaterThan(0);
    expect((await queryOne('SELECT synced FROM bandes', [])).synced).toBe(0);
    fb().failFirestore = false;
    const r2 = await syncerDonnees({ force: true });
    expect(r2.errors).toBe(0);
    expect((await queryOne('SELECT synced FROM bandes', [])).synced).toBe(1);
  });

  test('hors ligne : la sauvegarde attend sans erreur', async () => {
    await connecterVerifie();
    globalThis.__offline = true;
    const r = await syncerDonnees({ force: true });
    expect(r.skip).toBe(true);
  });

  test('session : restauration depuis le cloud sur un appareil vide, purge si autre compte', async () => {
    const user = await connecterVerifie();
    const b = await useBandStore.getState().ajouterBande({ nom: 'Cloud', espece_id: 'lohmann', effectif_initial: 30, effectif_actuel: 30, date_mise_en_place: todayStr(), semaine_age: 0, statut: 'active' });
    await useBandStore.getState().saisirPonte(b.id, { date: todayStr(), nb_oeufs: 12, nb_oeufs_casses: 1 });
    await definirProprietaire(user.uid);
    await syncerDonnees({ force: true });

    await viderToutesLesDonnees();
    expect(await compterDonnees()).toBe(0);
    const r = await ouvrirSession(user.uid);
    expect(r.restaure).toBeGreaterThan(1);
    const restauree = await queryOne('SELECT * FROM bandes', []);
    expect(restauree.id).toBe(b.id);
    expect(restauree.synced).toBe(1);
    expect((await query('SELECT * FROM ponte_journaliere', [])).length).toBe(1);

    // Un autre compte se connecte sur le même appareil : les données du premier sont purgées.
    const second = await connecterVerifie('autre@exemple.com');
    const autre = await ouvrirSession(second.uid);
    expect(autre.purge).toBe(true);
    expect(await lireProprietaire()).toBe(second.uid);
    expect((await query('SELECT * FROM bandes', [])).length).toBe(0);
  });

  test("suppression du compte : refus avec un mauvais mot de passe, puis effacement complet", async () => {
    const user = await connecterVerifie();
    await useBandStore.getState().ajouterBande({ nom: 'À effacer', espece_id: 'lohmann', effectif_initial: 5, effectif_actuel: 5, date_mise_en_place: todayStr(), semaine_age: 0, statut: 'active' });
    await syncerDonnees({ force: true });
    fb().docs.set('marche_annonces/a1', { uid_vendeur: user.uid, titre: 'Mon annonce', photo_path: `annonces/${user.uid}/1.jpg` });
    fb().docs.set('marche_annonces/a2', { uid_vendeur: 'autre', titre: 'Autre' });
    fb().docs.set('forum_posts/p1', { uid_auteur: user.uid, titre: 'Ma question' });
    fb().docs.set('forum_posts/p1/reponses/r1', { uid_auteur: 'autre', contenu: 'x' });
    fb().docs.set('forum_posts/p2', { uid_auteur: 'autre', titre: 'Autre post' });
    fb().docs.set('forum_posts/p2/reponses/r2', { uid_auteur: user.uid, contenu: 'ma réponse' });

    const non = await useAuthStore.getState().supprimerCompte('mauvais');
    expect(non.success).toBe(false);
    expect(fb().docs.has(`utilisateurs/${user.uid}`)).toBe(true);
    expect(fb().deleted).toBeFalsy();

    const oui = await useAuthStore.getState().supprimerCompte('Ferme2026Niger!');
    expect(oui.success).toBe(true);
    expect(docsOf(`utilisateurs/${user.uid}`).length).toBe(0);
    expect(fb().docs.has('marche_annonces/a1')).toBe(false);
    expect(fb().docs.has('marche_annonces/a2')).toBe(true);
    expect(fb().docs.has('forum_posts/p1')).toBe(false);
    expect(fb().docs.has('forum_posts/p1/reponses/r1')).toBe(false);
    expect(fb().docs.has('forum_posts/p2')).toBe(true);
    expect(fb().docs.has('forum_posts/p2/reponses/r2')).toBe(false);
    expect(fb().deletedFiles).toContain(`avatars/${user.uid}.jpg`);
    expect(fb().deletedFiles).toContain(`annonces/${user.uid}/1.jpg`);
    expect(fb().deleted).toBe(user.uid);
    expect(await compterDonnees()).toBe(0);
  });
});

suite('place de marché et modération', () => {
  beforeEach(async () => { await freshDB(); resetFirebase(); useMarketStore.setState({ annonces: [], annoncesStatut: 'idle', posts: [], reponses: {} }); });

  test('publication, liste filtrée, signalement et masquage local', async () => {
    const user = await connecterVerifie();
    const m = useMarketStore.getState();
    const pub = await m.publierAnnonce({ categorie: 'oeufs', titre: '<b>Plateaux</b>', description: 'Frais', prix: 2000, quantite: 3, localisation: 'Niamey', contact: '+22790000000' });
    expect(pub.success).toBe(true);
    const doc = fb().docs.get(`marche_annonces/${pub.id}`);
    expect(doc.uid_vendeur).toBe(user.uid);
    expect(doc.statut).toBe('active');
    expect(doc.vendeur).toBe('Amadou');

    await useMarketStore.getState().chargerAnnonces('oeufs');
    expect(useMarketStore.getState().annoncesStatut).toBe('ready');
    expect(useMarketStore.getState().annonces.length).toBe(1);
    await useMarketStore.getState().chargerAnnonces('lait');
    expect(useMarketStore.getState().annonces.length).toBe(0);

    const sig = await useMarketStore.getState().signaler({ typeCible: 'annonce', cibleId: pub.id, motif: 'spam', details: 'test', uidCible: 'x' });
    expect(sig.success).toBe(true);
    expect(docsOf('signalements/').length).toBe(1);
    expect(useAppStore.getState().masques).toContain(`annonce:${pub.id}`);

    await useAppStore.getState().init();
    expect(useAppStore.getState().masques).toContain(`annonce:${pub.id}`);
    expect((await useAppStore.getState().bloquerUtilisateur('uid_x')).success).toBe(true);
    await useAppStore.getState().init();
    expect(useAppStore.getState().blocages).toContain('uid_x');
  });

  test("l'erreur réseau donne l'état d'erreur de la liste avec un message lisible", async () => {
    await connecterVerifie();
    fb().failFirestore = true;
    await useMarketStore.getState().chargerAnnonces(null);
    const s = useMarketStore.getState();
    expect(s.annoncesStatut).toBe('error');
    expect(s.annoncesErreur).toBe('Connexion impossible. Vérifiez votre accès à internet.');
  });
});
