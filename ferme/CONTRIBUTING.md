# Contribuer à FermI

## Fichiers "barrel" — `src/engine/poulaillerEngine.js`

`poulaillerEngine.js` ré-exporte des fonctions déjà définies dans
`thiEngine.js`, `rationEngine.js`, `actuateurEngine.js` et
`capteurValidation.js` :

```js
export { calculerTHI, niveauStress, getSaisonActuelle } from './thiEngine';
// ...
import { calculerTHI, niveauStress, getSaisonActuelle } from './thiEngine';
// ...
```

**Ce n'est pas un doublon accidentel.** C'est un fichier "barrel" (point
d'entrée unique) qui sert deux usages différents :

1. **Réexport public** — les écrans (`app/**`) et hooks (`usePiConnection`)
   importent depuis `poulaillerEngine.js` plutôt que de piocher dans
   chaque sous-module individuellement. Ça donne un seul point d'entrée
   stable pour tout ce qui touche au moteur poulailler.
2. **Import interne pour usage local** — `runCycle()`, qui vit dans ce
   même fichier, a besoin de `calculerTHI`, `calculerRation`, etc. Comme
   JS ne permet pas d'utiliser directement ses propres `export` réexportés
   dans le même fichier, on les réimporte localement juste après.

**Si vous touchez ce fichier :** gardez les deux mêmes noms de fonctions
synchronisés entre le bloc `export { ... } from '...'` et le bloc
`import { ... } from '...'` qui suit. C'est exactement ce genre de
désynchronisation (un import qui pointe vers le mauvais module, ou une
fonction non exportée) qui a causé le bug corrigé lors du dernier audit —
raison pour laquelle ESLint (`import/named`, `import/no-unresolved`) est
maintenant configuré pour l'attraper automatiquement (`npm run lint`).

## Avant de committer

```bash
npm run lint       # doit passer sans erreur (les warnings existants sont tolérés)
npm test           # doit passer
```

La CI (`.github/workflows/ci.yml`) exécute les deux à chaque push/PR et
bloque le merge si l'un des deux échoue.

## Convention de langue

Tous les textes visibles par l'utilisateur (labels, messages d'erreur,
alertes) sont en français. Les commentaires de code peuvent être en
français ou en anglais selon le contexte déjà en place dans le fichier.

## Hors périmètre du dépôt

Les règles de sécurité Firestore (`firestore.rules`) sont gérées
directement dans la Console Firebase et ne font pas partie de ce dépôt.
Si vous modifiez la structure des documents `utilisateurs/{uid}` ou
ajoutez une nouvelle collection, pensez à vérifier/mettre à jour ces
règles manuellement dans la Console — ce n'est pas quelque chose qu'un
outil automatisé sur ce repo peut détecter ou corriger.
