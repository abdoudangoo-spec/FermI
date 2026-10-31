// ═══════════════════════════════════════════════════════
//  src/engine/sante.js — Santé & Biosécurité
// ═══════════════════════════════════════════════════════
import { insert, query, update } from '../db/database';
import { todayStr, addDays, parseDateStr, diffDays } from '../utils/dates';

// ── Calendrier vaccinal standard volailles ─────────────
export const PROTOCOLES_VOLAILLES = [
  { nom: 'Marek',          jour: 1,   type: 'vaccin',      description: 'Vaccination Marek en couvoir ou J1' },
  { nom: 'Newcastle J7',   jour: 7,   type: 'vaccin',      description: 'Newcastle par eau de boisson (souche HB1)' },
  { nom: 'Gumboro J14',    jour: 14,  type: 'vaccin',      description: 'Gumboro (IBD) par eau de boisson' },
  { nom: 'Newcastle J21',  jour: 21,  type: 'vaccin',      description: 'Rappel Newcastle' },
  { nom: 'Bronchite J28',  jour: 28,  type: 'vaccin',      description: 'Bronchite Infectieuse (IB)' },
  { nom: 'Vers J30',       jour: 30,  type: 'depar',       description: 'Déparasitage interne (Pipérazine)' },
  { nom: 'Variole J60',    jour: 60,  type: 'vaccin',      description: 'Variole aviaire (zones tropicales++)' },
  { nom: 'Newcastle J60',  jour: 60,  type: 'vaccin',      description: 'Rappel Newcastle (souche La Sota)' },
  { nom: 'Dépar J90',      jour: 90,  type: 'depar',       description: 'Deuxième déparasitage' },
  { nom: 'Newcastle J120', jour: 120, type: 'vaccin',      description: 'Rappel Newcastle 4 mois' },
  { nom: 'Vide sanitaire', jour: 0,   type: 'hygiene',     description: 'Entre chaque bande : vide sanitaire 3 semaines minimum', periodique: true },
];

// ── Calendrier vaccinal petits ruminants ──────────────
export const PROTOCOLES_RUMINANTS = [
  { nom: 'Entérotoxémie',   periodicite: 180, type: 'vaccin',  description: 'Clostridium: 2 fois/an' },
  { nom: 'Pasteurellose',   periodicite: 180, type: 'vaccin',  description: '2 fois/an, début saisons' },
  { nom: 'Clavelée',        periodicite: 365, type: 'vaccin',  description: 'Annuel pour les moutons' },
  { nom: 'Brucellose',      periodicite: 365, type: 'vaccin',  description: 'Annuel pour chèvres (femelles)' },
  { nom: 'Dépar interne',   periodicite: 90,  type: 'depar',   description: 'Tous les 3 mois (Albendazole)' },
  { nom: 'Dépar externe',   periodicite: 60,  type: 'depar',   description: 'Bain/spray tous les 2 mois (tiques/gale)' },
  { nom: 'Parage sabots',   periodicite: 90,  type: 'hygiene', description: 'Parage des sabots tous les 3 mois' },
];

// ── Générer le calendrier d'une bande ─────────────────
export async function genererCalendrierBande(bandeId, dateDebutStr, especeId) {
  const debut = parseDateStr(dateDebutStr) ? dateDebutStr : todayStr();

  for (const proto of PROTOCOLES_VOLAILLES) {
    const dateStr = addDays(debut, proto.jour);

    await insert('calendrier_sanitaire', {
      nom:            proto.nom,
      espece:         'volaille',
      type:           proto.type,
      description:    proto.description,
      age_semaines_debut: Math.floor(proto.jour / 7),
      prochain_acte:  dateStr,
      statut:         'a_faire',
      reference_id:   bandeId,
      reference_type: 'bande',
    });
  }
}

// ── Générer le calendrier d'un troupeau ruminant ──────
export async function genererCalendrierTroupeau(troupeauId, especeId) {
  for (const proto of PROTOCOLES_RUMINANTS) {
    const dateStr = addDays(todayStr(), Math.floor(proto.periodicite / 2));

    await insert('calendrier_sanitaire', {
      nom:               proto.nom,
      espece:            especeId,
      type:              proto.type,
      description:       proto.description,
      periodicite_jours: proto.periodicite,
      prochain_acte:     dateStr,
      statut:            'a_faire',
      reference_id:      troupeauId,
      reference_type:    'troupeau',
    });
  }
}

// ── Alertes sanitaires imminentes (7 jours) ───────────
export async function alertesSanitaires() {
  const aujourd = todayStr();
  const limite  = addDays(aujourd, 7);

  const urgents = await query(
    `SELECT * FROM calendrier_sanitaire
     WHERE prochain_acte <= ? AND statut = 'a_faire'
     ORDER BY prochain_acte ASC`,
    [limite]
  );

  return urgents.map(e => ({
    ...e,
    enRetard: e.prochain_acte < aujourd,
    joursRestants: diffDays(aujourd, e.prochain_acte),
  }));
}

// ── Marquer acte accompli + calculer prochain ─────────
export async function marquerAccompli(id, dateRealisee) {
  const evt = await query(`SELECT * FROM calendrier_sanitaire WHERE id = ?`, [id]);
  const e = evt[0];
  if (!e) return;

  const updates = { dernier_acte: dateRealisee, statut: 'fait' };

  if (e.periodicite_jours) {
    updates.prochain_acte = addDays(dateRealisee, e.periodicite_jours);
    updates.statut = 'a_faire';
  }
  await update('calendrier_sanitaire', id, updates);
}

// ── Vide sanitaire ────────────────────────────────────
export async function enregistrerVideSanitaire(bandeId, dateDebut, dateFin, notes) {
  await insert('registre_hygiene', {
    date:         dateDebut,
    type_acte:    'vide_sanitaire',
    zone:         `Bande ${bandeId}`,
    observations: `Vide sanitaire du ${dateDebut} au ${dateFin}. ${notes || ''}`,
  });
}
