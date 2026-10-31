export const ESPECES_VOLAILLES = {
  lohmann: {
    id: 'lohmann', nom: 'Lohmann Brown', emoji: '🐔', couleur: '#f59e0b',
    cycleDebut: 18, cycleFin: 72, alerteFin: 8, tauxMax: 95,
    tempOptMin: 18, tempOptMax: 24, lumiere: 16,
    ration_g_par_jour: 115, eau_ml_par_jour: 250,
    heatTolerance: 'low',
    vaccins: ['Marek (J1)', 'Newcastle (J7)', 'Gumboro (J14)', 'Newcastle rappel (J21)', 'Variole (J28)'],
  },
  isa_brown: {
    id: 'isa_brown', nom: 'ISA Brown', emoji: '🐓', couleur: '#ef4444',
    cycleDebut: 20, cycleFin: 70, alerteFin: 8, tauxMax: 92,
    tempOptMin: 18, tempOptMax: 24, lumiere: 16,
    ration_g_par_jour: 110, eau_ml_par_jour: 245,
    heatTolerance: 'low',
    vaccins: ['Marek (J1)', 'Newcastle (J7)', 'Gumboro (J14)', 'Newcastle rappel (J21)'],
  },
  fayoumi: {
    id: 'fayoumi', nom: 'Fayoumi (Race locale)', emoji: '🐤', couleur: '#eab308',
    cycleDebut: 22, cycleFin: 90, alerteFin: 10, tauxMax: 70,
    tempOptMin: 22, tempOptMax: 34, lumiere: 13,
    ration_g_par_jour: 90, eau_ml_par_jour: 200,
    heatTolerance: 'high',
    vaccins: ['Newcastle (J7)', 'Newcastle rappel (J28)'],
  },
  naked_neck: {
    id: 'naked_neck', nom: 'Naked Neck', emoji: '🦢', couleur: '#f97316',
    cycleDebut: 20, cycleFin: 80, alerteFin: 10, tauxMax: 75,
    tempOptMin: 20, tempOptMax: 32, lumiere: 14,
    ration_g_par_jour: 100, eau_ml_par_jour: 210,
    heatTolerance: 'high',
    vaccins: ['Newcastle (J7)', 'Newcastle rappel (J28)'],
  },
  poulet_chair: {
    id: 'poulet_chair', nom: 'Poulet Chair Ross 308', emoji: '🍗', couleur: '#22c55e',
    type: 'chair', cycleDebut: 0, cycleFin: 8, alerteFin: 1,
    tempOptMin: 20, tempOptMax: 28, lumiere: 23,
    poids_abattage_kg: 2.8, gainJournalier_g: 60,
    ration_g_par_jour: 150, eau_ml_par_jour: 280,
    heatTolerance: 'low',
    vaccins: ['Newcastle (J7)', 'Gumboro (J14)'],
    phases: [
      { label: 'Démarrage',  debut: 0, fin: 2, temp: 32, ration: 45 },
      { label: 'Croissance', debut: 2, fin: 5, temp: 26, ration: 130 },
      { label: 'Finition',   debut: 5, fin: 8, temp: 22, ration: 200 },
    ],
  },
  pintade_chair: {
    id: 'pintade_chair', nom: 'Pintade de Chair', emoji: '🦃', couleur: '#8b5cf6',
    type: 'chair', cycleDebut: 0, cycleFin: 12, alerteFin: 2,
    tempOptMin: 18, tempOptMax: 30, lumiere: 16,
    poids_abattage_kg: 1.8, gainJournalier_g: 22,
    ration_g_par_jour: 120, eau_ml_par_jour: 220,
    heatTolerance: 'medium',
    vaccins: ['Newcastle (J7)', 'Newcastle rappel (J28)'],
    phases: [
      { label: 'Poussin',       debut: 0,  fin: 3,  temp: 34, ration: 50 },
      { label: 'Intermédiaire', debut: 3,  fin: 8,  temp: 26, ration: 100 },
      { label: 'Finition',      debut: 8,  fin: 12, temp: 22, ration: 150 },
    ],
  },
};

export const ESPECES_RUMINANTS = {
  mouton: {
    id: 'mouton', nom: 'Mouton', emoji: '🐑', couleur: '#06b6d4',
    type: 'ruminant',
    gestation_jours: 150,
    sevrage_jours: 90,
    poids_naissance_kg: 3.5,
    poids_adulte_kg: 40,
    production_lait_L_jour: 0.8,
    duree_lactation_jours: 120,
    ration_kg_par_jour: 1.5,
    eau_L_par_jour: 4.0,
    vaccins: ['Pasteurellose (2×/an)', 'Clavelée (1×/an)', 'Entérotoxémie (2×/an)', 'Fièvre aphteuse'],
    parasites: 'Déparasiter tous les 3 mois',
  },
  chevre: {
    id: 'chevre', nom: 'Chèvre', emoji: '🐐', couleur: '#ec4899',
    type: 'ruminant',
    gestation_jours: 150,
    sevrage_jours: 60,
    poids_naissance_kg: 3.0,
    poids_adulte_kg: 35,
    production_lait_L_jour: 1.5,
    duree_lactation_jours: 180,
    ration_kg_par_jour: 1.2,
    eau_L_par_jour: 3.5,
    vaccins: ['Pasteurellose (2×/an)', 'Brucellose (1×/an)', 'Entérotoxémie (2×/an)'],
    parasites: 'Déparasiter tous les 3 mois',
  },
};

// ── Zones africaines (condensées) ───────────────────────
// NB : tempMin/humMin/humMax/thiSeuil sont utilisés par les moteurs
// (capteurValidation, actuateurEngine, rationEngine, poulaillerEngine) —
// ils manquaient ici, ce qui faisait retomber TOUTES les zones sur les
// valeurs par défaut génériques et annulait la spécificité climatique.
export const ZONES = {
  sahelienne:        { id:'sahelienne',        nom:'Zone Sahélienne',             emoji:'☀️', couleur:'#f97316', tempMin:20, tempMax:48, humMin:10, humMax:45, thiSeuil:80, pays:'Mali, Niger, Burkina, Tchad, Sénégal' },
  soudano_guineenne: { id:'soudano_guineenne', nom:'Zone Soudano-Guinéenne',      emoji:'🌦️', couleur:'#84cc16', tempMin:18, tempMax:40, humMin:35, humMax:80, thiSeuil:78, pays:'Sénégal, Gambie, Guinée, Bénin, Togo' },
  equatoriale:       { id:'equatoriale',       nom:'Zone Équatoriale',             emoji:'🌧️', couleur:'#10b981', tempMin:22, tempMax:34, humMin:65, humMax:95, thiSeuil:76, pays:"Côte d'Ivoire, Ghana, Cameroun, Gabon" },
  hautes_terres:     { id:'hautes_terres',     nom:'Hautes Terres Est-Africaines', emoji:'🏔️', couleur:'#06b6d4', tempMin:8,  tempMax:28, humMin:45, humMax:80, thiSeuil:73, pays:'Éthiopie, Kenya, Rwanda, Burundi' },
  australe:          { id:'australe',          nom:'Zone Australe',                emoji:'🌍', couleur:'#f59e0b', tempMin:12, tempMax:38, humMin:20, humMax:65, thiSeuil:77, pays:'Zimbabwe, Zambie, Malawi, Botswana' },
  maghreb:           { id:'maghreb',           nom:'Zone Maghreb',                 emoji:'🌊', couleur:'#8b5cf6', tempMin:8,  tempMax:45, humMin:15, humMax:55, thiSeuil:78, pays:'Maroc, Algérie, Tunisie, Égypte' },
};

// ── Catégories financières ───────────────────────────────
export const CATEGORIES_DEPENSES = [
  { id: 'aliment',      nom: 'Alimentation',      emoji: '🌾' },
  { id: 'vaccin',       nom: 'Vaccins & Médicaments', emoji: '💉' },
  { id: 'main_oeuvre',  nom: "Main d'oeuvre",     emoji: '👷' },
  { id: 'equipement',   nom: 'Équipement',         emoji: '🔧' },
  { id: 'energie',      nom: 'Énergie (eau/élec)', emoji: '💡' },
  { id: 'transport',    nom: 'Transport',           emoji: '🚛' },
  { id: 'autres',       nom: 'Autres dépenses',    emoji: '📦' },
];

export const CATEGORIES_RECETTES = [
  { id: 'vente_animaux', nom: 'Vente animaux vifs',  emoji: '🐾' },
  { id: 'vente_oeufs',   nom: 'Vente œufs',          emoji: '🥚' },
  { id: 'vente_lait',    nom: 'Vente lait',           emoji: '🥛' },
  { id: 'vente_viande',  nom: 'Vente viande',         emoji: '🥩' },
  { id: 'vente_fiente',  nom: 'Vente fiente/fumier',  emoji: '♻️' },
  { id: 'subvention',    nom: 'Subvention/Aide',      emoji: '🏦' },
  { id: 'autres',        nom: 'Autres recettes',      emoji: '💰' },
];
