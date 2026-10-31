// ═══════════════════════════════════════════════════════════
//  src/constants/enums.js
//  Toutes les chaînes constantes centralisées
//  Remplace les magic strings répétées dans l'app
// ═══════════════════════════════════════════════════════════

// ── Types de transactions ─────────────────────────────────
export const TX_TYPE = {
  DEPENSE: 'depense',
  RECETTE: 'recette',
};

// ── Catégories dépenses ───────────────────────────────────
// NB : ces valeurs DOIVENT rester synchronisées avec les ids de
// CATEGORIES_DEPENSES (src/constants/especes.js), seule source de
// vérité utilisée par les écrans (Picker, dashboard...). Un ancien
// jeu de valeurs ('materiel', 'medicament', 'batiment', 'autre_depense')
// ne correspondait à aucune catégorie réellement affichée/enregistrée.
export const CAT_DEP = {
  ALIMENT:      'aliment',
  VACCIN:       'vaccin',
  MAIN_OEUVRE:  'main_oeuvre',
  EQUIPEMENT:   'equipement',
  ENERGIE:      'energie',
  TRANSPORT:    'transport',
  AUTRE_DEP:    'autres',
};

// ── Catégories recettes ───────────────────────────────────
// NB : idem — synchronisé avec CATEGORIES_RECETTES (especes.js).
export const CAT_REC = {
  VENTE_OEUFS:   'vente_oeufs',
  VENTE_ANIMAUX: 'vente_animaux',
  VENTE_LAIT:    'vente_lait',
  VENTE_FIENTE:  'vente_fiente',
  VENTE_VIANDE:  'vente_viande',
  SUBVENTION:    'subvention',
  AUTRE_REC:     'autres',
};

// ── Espèces volailles ─────────────────────────────────────
export const ESPECE_VOL = {
  LOHMANN:      'lohmann',
  ISA_BROWN:    'isa_brown',
  FAYOUMI:      'fayoumi',
  NAKED_NECK:   'naked_neck',
  POULET_CHAIR: 'poulet_chair',
  PINTADE:      'pintade_chair',
};

// ── Espèces ruminants ─────────────────────────────────────
export const ESPECE_RUM = {
  MOUTON: 'mouton',
  CHEVRE: 'chevre',
};

// ── Zones climatiques ─────────────────────────────────────
export const ZONE = {
  SAHELIENNE:        'sahelienne',
  SOUDANO_GUINEENNE: 'soudano_guineenne',
  EQUATORIALE:       'equatoriale',
  HAUTES_TERRES:     'hautes_terres',
  AUSTRALE:          'australe',
  MAGHREB:           'maghreb',
};

// ── Statuts bandes / troupeaux ────────────────────────────
export const STATUT = {
  ACTIVE:   'active',
  TERMINEE: 'terminee',
  ACTIF:    'actif',
  INACTIF:  'inactif',
};

// ── Types actes sanitaires ────────────────────────────────
export const ACTE_SANITAIRE = {
  VACCIN:          'vaccin',
  DEPARASITAGE:    'depar',
  HYGIENE:         'hygiene',
  VIDE_SANITAIRE:  'vide_sanitaire',
};

// ── Sexe animaux ──────────────────────────────────────────
export const SEXE = {
  FEMELLE: 'F',
  MALE:    'M',
};

// ── Statuts annonces marché ───────────────────────────────
export const ANNONCE_STATUT = {
  ACTIVE:  'active',
  VENDUE:  'vendue',
  EXPIREE: 'expiree',
};

// ── Plans utilisateurs ────────────────────────────────────
export const PLAN = {
  GRATUIT: 'gratuit',
  PRO:     'pro',
};

// ── Rôles utilisateurs ────────────────────────────────────
export const ROLE = {
  ELEVEUR:       'eleveur',
  VETERINAIRE:   'veterinaire',
  CONSEILLER:    'conseiller',
};
