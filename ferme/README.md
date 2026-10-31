# FermI

Application mobile (Expo / React Native) de gestion d'élevage : volailles, ruminants, finances, santé,
surveillance IoT facultative, place de marché et forum entre éleveurs. Le suivi fonctionne **hors ligne**
(SQLite) et se sauvegarde dans un espace privé Firebase lorsque l'appareil est connecté.

## Démarrage

```bash
npm install
cp .env.example .env        # renseigner Firebase + coordonnées de l'éditeur
npx expo start
```

## Configuration Firebase (obligatoire)

1. **Authentication** : activer *Email/Mot de passe* et *Téléphone*. Activer la **protection contre l'énumération
   d'emails** et définir une **politique de mot de passe** (10 caractères minimum).
2. **Règles et index** — sans elles, l'app n'est pas sécurisée :
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
3. **Clé API** : restreindre la clé dans Google Cloud (applications Android/iOS) ; activer **App Check** dès la mise en production.
4. **Modération** : les signalements arrivent dans la collection `signalements` (lecture réservée à la console).
   Quelqu'un doit les examiner et supprimer les contenus fautifs (`marche_annonces`, `forum_posts`).

## Avant publication

```bash
npm run check:release   # refuse la publication si contact éditeur / Firebase manquent
npm run check:syntax
npm test
```

Les textes légaux (`src/constants/legal.js`) décrivent le fonctionnement réel de l'app ; faites-les relire
par un juriste de votre pays avant publication. Les coordonnées de l'éditeur viennent de `.env`.

## Structure

| Dossier | Rôle |
|---|---|
| `app/` | Écrans et navigation (expo-router) |
| `src/components/` | Design system : `ui`, `states` (chargement, succès, erreur, vide), `feedback`, `FormSheet` |
| `src/features/` | Contenu des onglets (élevage, finance, marché) |
| `src/store/` | État (zustand) |
| `src/db/`, `src/sync/` | SQLite, sauvegarde cloud, restauration, session |
| `src/firebase/` | Authentification, sauvegarde, marché |
| `src/engine/` | Calculs métier purs (THI, ration, finance, santé…) |
| `firestore.rules`, `storage.rules` | Règles de sécurité à déployer |

## Notes de migration depuis FermeApp9b

- Identifiants d'application passés à `com.fermi.app` (iOS et Android) : c'est une nouvelle application côté stores.
- La base locale conserve son nom : les données d'une installation existante sont migrées automatiquement.
- Le marché et le forum, qui n'étaient visibles que sur l'appareil, sont maintenant réellement partagés (Firestore).
- Les données de capteurs simulées ne sont plus enregistrées ni présentées comme réelles (bandeau « démonstration »).
