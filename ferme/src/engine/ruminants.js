// ═══════════════════════════════════════════════════════
//  src/engine/ruminants.js
//  Naissances, sevrage, pesées, lait, GMQ
// ═══════════════════════════════════════════════════════
import { query } from '../db/database';
import { todayStr, addDays, parseDateStr, diffDays } from '../utils/dates';

// ── Gain Moyen Quotidien (GMQ) ─────────────────────────
export function calculerGMQ(poids1, poids2, nbJours) {
  if (!nbJours || nbJours === 0) return 0;
  return parseFloat(((poids2 - poids1) / nbJours * 1000).toFixed(0)); // g/jour
}

// ── Date de sevrage prévue ─────────────────────────────
export function dateSevragePrevue(dateNaissance, espece) {
  if (!dateNaissance) return null;
  if (!parseDateStr(dateNaissance)) return null;
  return addDays(dateNaissance, espece.sevrage_jours);
}

// ── Date vêlage/agnelage prévu ─────────────────────────
export function dateMiseBas(dateSaillie, espece) {
  if (!dateSaillie) return null;
  if (!parseDateStr(dateSaillie)) return null;
  return addDays(dateSaillie, espece.gestation_jours);
}

// ── Production laitière statistiques ──────────────────
export async function statsLaitTroupeau(troupeauId, dateDebut, dateFin) {
  const res = await query(
    `SELECT SUM(matin_L + soir_L) as total_L,
            AVG(matin_L + soir_L) as moy_jour_L,
            COUNT(DISTINCT date) as nb_jours,
            COUNT(DISTINCT animal_id) as nb_animaux
     FROM production_lait
     WHERE troupeau_id = ? AND date BETWEEN ? AND ?`,
    [troupeauId, dateDebut, dateFin]
  );
  const r = res[0] || {};
  return {
    totalL:         parseFloat((r.total_L || 0).toFixed(1)),
    moyJourL:       parseFloat((r.moy_jour_L || 0).toFixed(2)),
    nbJours:        r.nb_jours || 0,
    nbAnimauxTraits:r.nb_animaux || 0,
  };
}

// ── Historique pesées animal ───────────────────────────
export async function courbePoidsAnimal(animalId) {
  const pesees = await query(
    `SELECT date, poids_kg FROM pesees WHERE animal_id = ? ORDER BY date ASC`,
    [animalId]
  );
  if (pesees.length < 2) return { pesees, gmqGlobal: null };

  const first = pesees[0];
  const last  = pesees[pesees.length - 1];
  const jours = diffDays(first.date, last.date);
  const gmqGlobal = calculerGMQ(first.poids_kg, last.poids_kg, jours);
  return { pesees, gmqGlobal };
}

// ── Alertes sevrages en retard ─────────────────────────
export async function alertesSevrages(espece) {
  const limite = addDays(todayStr(), -espece.sevrage_jours - 14); // 2 semaines de retard max

  return query(
    `SELECT a.id, a.numero, a.nom, a.date_naissance
     FROM animaux a
     LEFT JOIN sevrages s ON s.animal_id = a.id
     WHERE a.espece = ? AND a.date_naissance < ? AND s.id IS NULL AND a.statut = 'actif'`,
    [espece.id, limite]
  );
}

// ── Calcul ration ruminants ────────────────────────────
export function calculerRationRuminant(espece, nb, temperature) {
  let ration_kg = espece.ration_kg_par_jour;
  let eau_L = espece.eau_L_par_jour;
  const corrections = [];

  if (temperature > 30) {
    eau_L *= (1 + (temperature - 30) * 0.05);
    corrections.push(`Chaleur: eau +${Math.round((temperature-30)*5)}%`);
  }
  if (temperature < 15) {
    ration_kg *= 1.1;
    corrections.push('Froid: ration +10%');
  }

  return {
    rationParAnimal_kg: parseFloat(ration_kg.toFixed(2)),
    eauParAnimal_L:     parseFloat(eau_L.toFixed(1)),
    totalRation_kg:     parseFloat((ration_kg * nb).toFixed(1)),
    totalEau_L:         parseFloat((eau_L * nb).toFixed(0)),
    corrections,
  };
}
