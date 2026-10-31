// Tables locales synchronisées vers le cloud (ordre = ordre de restauration : parents d'abord).
export const SYNC_TABLES = [
  'bandes', 'troupeaux_rum', 'animaux',
  'ponte_journaliere', 'mortalite', 'consommation_aliment',
  'naissances', 'pesees', 'production_lait', 'sevrages',
  'transactions', 'budgets', 'calendrier_sanitaire', 'registre_hygiene', 'visiteurs',
];

// Suppression en cascade côté cloud : [table enfant, colonne de liaison]
export const CASCADE = {
  bandes:        [['ponte_journaliere', 'bande_id'], ['mortalite', 'bande_id'], ['consommation_aliment', 'bande_id']],
  troupeaux_rum: [['animaux', 'troupeau_id'], ['naissances', 'troupeau_id'], ['production_lait', 'troupeau_id']],
  animaux:       [['pesees', 'animal_id'], ['sevrages', 'animal_id']],
};
