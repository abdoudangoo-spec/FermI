// ═══════════════════════════════════════════════════════
//  src/engine/aviculture.js
//  Algorithme complet : ponte, IC, mortalité, cycles
// ═══════════════════════════════════════════════════════
import { query } from '../db/database';
import { todayStr, diffDays } from '../utils/dates';

// ── Âge actuel d'une bande (semaines) ───────────────────
// semaine_age = âge à la mise en place ; il progresse ensuite avec le calendrier.
export function ageSemaines(bande, today = todayStr()) {
  if (!bande) return 0;
  const base = Number(bande.semaine_age) || 0;
  const ecoule = bande.date_mise_en_place ? Math.max(0, Math.floor(diffDays(bande.date_mise_en_place, today) / 7)) : 0;
  return base + ecoule;
}

// ── Taux de ponte ─────────────────────────────────────
export function calculerTauxPonte(nbOeufs, effectifActuel) {
  if (!effectifActuel || effectifActuel === 0) return 0;
  return Math.min(100, parseFloat(((nbOeufs / effectifActuel) * 100).toFixed(1)));
}

// ── Indice de Consommation (IC) ────────────────────────
// IC = kg aliment consommé / kg poids produit (viande ou œufs)
export function calculerIC(kgAliment, kgProduit) {
  if (!kgProduit || kgProduit === 0) return null;
  return parseFloat((kgAliment / kgProduit).toFixed(2));
}

// IC pondeuses = kg aliment / douzaine d'œufs
export function calculerICPondeuse(kgAliment, nbOeufs) {
  if (!nbOeufs || nbOeufs === 0) return null;
  const douzaines = nbOeufs / 12;
  return parseFloat((kgAliment / douzaines).toFixed(2));
}

// ── Taux de mortalité ──────────────────────────────────
export function calculerTauxMortalite(nbMorts, effectifInitial) {
  if (!effectifInitial || effectifInitial === 0) return 0;
  return parseFloat(((nbMorts / effectifInitial) * 100).toFixed(2));
}

// ── Alerte fin de cycle ────────────────────────────────
export function alerteFinCycle(espece, semaineAge) {
  const fin = espece.cycleFin;
  const restant = fin - semaineAge;
  const isPond = !espece.type || espece.type !== 'chair';

  if (restant <= 0) return {
    active: true, urgence: 'fin', semRestantes: 0,
    msg: isPond ? 'Cycle de ponte terminé — planifier renouvellement' : 'Âge abattage atteint',
  };
  if (restant <= espece.alerteFin) return {
    active: true, urgence: restant <= 2 ? 'critique' : 'proche',
    semRestantes: restant,
    msg: isPond ? `Fin de ponte dans ${restant} semaine(s)` : `Abattage dans ${restant} semaine(s)`,
  };
  return { active: false, urgence: 'none', semRestantes: restant, msg: '' };
}

// ── Statistiques bande (sur période) ──────────────────
export async function statsBande(bandeId, dateDebut, dateFin) {
  const ponte = await query(
    `SELECT SUM(nb_oeufs) as total_oeufs, SUM(nb_oeufs_casses) as total_casses,
            AVG(nb_oeufs) as moy_oeufs, COUNT(*) as nb_jours
     FROM ponte_journaliere
     WHERE bande_id = ? AND date BETWEEN ? AND ?`,
    [bandeId, dateDebut, dateFin]
  );

  const mortalite = await query(
    `SELECT SUM(nb_morts) as total_morts FROM mortalite
     WHERE bande_id = ? AND date BETWEEN ? AND ?`,
    [bandeId, dateDebut, dateFin]
  );

  const aliment = await query(
    `SELECT SUM(quantite_kg) as total_kg FROM consommation_aliment
     WHERE bande_id = ? AND date BETWEEN ? AND ?`,
    [bandeId, dateDebut, dateFin]
  );

  const p = ponte[0] || {};
  const m = mortalite[0] || {};
  const a = aliment[0] || {};

  const totalOeufs = p.total_oeufs || 0;
  const totalKgAliment = a.total_kg || 0;
  // Poids œufs en kg (60g moyen par œuf)
  const poidsTotalOeufsKg = totalOeufs * 0.06;
  const ic = calculerICPondeuse(totalKgAliment, totalOeufs);

  return {
    totalOeufs,
    totalCasses: p.total_casses || 0,
    moyenneJournaliere: parseFloat((p.moy_oeufs || 0).toFixed(1)),
    nbJours: p.nb_jours || 0,
    totalMorts: m.total_morts || 0,
    totalKgAliment,
    ic,
    poidsTotalOeufsKg,
  };
}

// ── Calcul ration volailles adaptée ───────────────────
export function calculerRationVolailles(espece, nbAnimaux, temperature, semaineAge) {
  let ration_g = espece.ration_g_par_jour;
  let eau_ml = espece.eau_ml_par_jour;
  const corrections = [];

  // Phase chair
  if (espece.phases) {
    const ph = espece.phases.find(p => semaineAge >= p.debut && semaineAge < p.fin)
      || espece.phases[espece.phases.length - 1];
    if (ph) { ration_g = ph.ration; corrections.push(`Phase ${ph.label}: ${ph.ration}g/animal`); }
  }

  // Chaleur (>28°C: réduction aliment, augmentation eau)
  if (temperature > 28) {
    const delta = temperature - 28;
    const factor = Math.max(0.7, 1 - delta * 0.02);
    ration_g *= factor;
    eau_ml *= (1 + delta * 0.06);
    corrections.push(`Chaleur ${temperature}°C: aliment -${Math.round((1-factor)*100)}%`);
  }
  if (temperature < 15) {
    ration_g *= (1 + (15 - temperature) * 0.01);
    corrections.push(`Froid ${temperature}°C: aliment +${Math.round((temperature-15)*-1)}%`);
  }

  return {
    rationParAnimal_g: Math.round(ration_g),
    eauParAnimal_ml: Math.round(eau_ml),
    totalRation_kg: parseFloat((ration_g * nbAnimaux / 1000).toFixed(2)),
    totalEau_L: parseFloat((eau_ml * nbAnimaux / 1000).toFixed(1)),
    corrections,
  };
}

// ── Interprétation THI (calcul du THI lui-même : voir thiEngine.js,
//    source unique — importer calculerTHI depuis './thiEngine' côté appelant) ────
export function interpreterTHI(thi) {
  if (thi < 74) return { niveau: 'normal',   label: 'Aucun stress',   couleur: '#22c55e', icon: '✅' };
  if (thi < 79) return { niveau: 'leger',    label: 'Stress léger',   couleur: '#84cc16', icon: '🟡' };
  if (thi < 84) return { niveau: 'modere',   label: 'Stress modéré',  couleur: '#f59e0b', icon: '⚠️' };
  if (thi < 88) return { niveau: 'severe',   label: 'Stress sévère',  couleur: '#f97316', icon: '🔶' };
  return              { niveau: 'danger',    label: 'DANGER mortalité',couleur: '#ef4444', icon: '🚨' };
}
