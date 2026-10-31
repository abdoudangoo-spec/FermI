# Sécurité et confidentialité — FermI

## Mesures en place

| Domaine | Mesure |
|---|---|
| Accès aux données | Règles Firestore/Storage en refus par défaut ; chaque utilisateur n'accède qu'à son espace ; `role` et `plan` non modifiables ; validation des champs à la création |
| Authentification | Mot de passe 10 caractères minimum + liste de mots courants ; message de connexion identique (pas d'énumération) ; blocage temporaire après 5 échecs ; email vérifié obligatoire |
| Compte | Âge 18+ et acceptation des CGU enregistrés (version + date) ; changement de mot de passe ; suppression complète (espace privé, annonces, messages, photos, profil, compte) |
| Données locales | Requêtes SQL paramétrées, tables et colonnes en liste blanche ; purge si un autre compte se connecte ; sauvegarde cloud Android désactivée |
| Contrôleur IoT | HTTP en clair refusé hors réseau local ; clé d'accès dans le stockage sécurisé (Keychain/Keystore) ; commandes validées et confirmées par l'utilisateur |
| Contenus partagés | Signalement, blocage, masquage immédiat ; numéro de contact publié avec consentement explicite |
| Export PDF | Texte saisi échappé avant génération (pas d'injection HTML) |
| Photos | Recompressées, métadonnées GPS supprimées, 1,5 Mo maximum |
| Journaux | Aucun message technique affiché ; journaux détaillés uniquement en développement |
| Droits RGPD | Accès/portabilité : *Paramètres > Exporter mes données* ; effacement : *Supprimer mon compte* |

## Limites connues

- Base SQLite locale non chiffrée (protégée par le bac à sable du système) ; le chiffrement SQLCipher est une évolution possible.
- La connexion par SMS utilise `expo-firebase-recaptcha` (déprécié) ; à remplacer par une solution native à terme.
- Les règles ne sont efficaces qu'une fois déployées ; activer App Check en production.
- Les textes légaux doivent être validés par un juriste.

## Signaler une vulnérabilité

Écrivez à l'adresse indiquée dans `EXPO_PUBLIC_SUPPORT_EMAIL`, sans divulguer publiquement avant correction.
