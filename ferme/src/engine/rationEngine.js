// ═══════════════════════════════════════════════════════════
//  src/engine/rationEngine.js — Ration + taux de ponte
// ═══════════════════════════════════════════════════════════
import { calculerTHI, niveauStress } from './thiEngine';

export function calculerRation(espece, zone, nbAnimaux, temperature, humidite, semaineAge) {
  if (!espece || !zone) return null;
  const thi = calculerTHI(temperature, humidite);
  const stress = niveauStress(thi, espece.id);
  let rationBase_g = espece.ration_g_par_jour || 110;
  let eauBase_ml   = espece.eau_ml_par_jour   || 250;
  const corrections = [];

  // Seuil de confort thermique : 21°C par défaut (pondeuses adultes), ou la
  // température optimale propre à la phase d'âge en cours (poussins de chair,
  // qui ont besoin de bien plus de chaleur en démarrage qu'en finition).
  let seuilConfort = 21;
  if (espece.phases) {
    const ph = espece.phases.find(p => semaineAge >= p.debut && semaineAge < p.fin)
      || espece.phases[espece.phases.length - 1];
    if (ph) {
      rationBase_g = ph.ration;
      if (ph.temp != null) seuilConfort = ph.temp;
      corrections.push(`Phase ${ph.label} → ${ph.ration}g/animal`);
    }
  }
  const seuilChaudExtreme = seuilConfort + 11;

  let facteurChaleur = 1.0;
  if (temperature > seuilChaudExtreme) {
    facteurChaleur = Math.max(0.60, 1 - (temperature - seuilChaudExtreme) * 0.046);
    corrections.push(`Chaleur extrême ${temperature}°C → aliment ${Math.round(facteurChaleur*100)}%`);
  } else if (temperature > seuilConfort) {
    facteurChaleur = Math.max(0.80, 1 - (temperature - seuilConfort) * 0.015);
    corrections.push(`Chaleur ${temperature}°C → aliment ${Math.round(facteurChaleur*100)}%`);
  }
  if (espece.heatTolerance === 'high')   facteurChaleur = Math.min(1, facteurChaleur * 1.15);
  if (espece.heatTolerance === 'medium') facteurChaleur = Math.min(1, facteurChaleur * 1.08);
  if (temperature < 15) {
    const bonus = (15 - temperature) * 0.012;
    facteurChaleur = Math.min(1.20, facteurChaleur + bonus);
    corrections.push(`Froid ${temperature}°C → aliment +${Math.round(bonus*100)}%`);
  }

  let facteurEau = 1.0;
  if (thi >= 88)           { facteurEau = 1.50; corrections.push('THI danger → eau +50%'); }
  else if (thi >= 84)      { facteurEau = 1.35; corrections.push('THI sévère → eau +35%'); }
  else if (thi >= 79)      { facteurEau = 1.20; corrections.push('THI modéré → eau +20%'); }
  else if (temperature > 30) {
    facteurEau = 1 + (temperature - 30) * 0.025;
    corrections.push(`Chaleur → eau +${Math.round((facteurEau-1)*100)}%`);
  }
  if (zone?.id === 'sahelienne' || zone?.id === 'maghreb') {
    facteurEau *= 1.10; corrections.push('Zone aride → eau +10%');
  }

  if (thi >= 79) corrections.push('⚡ Électrolytes (NaCl + KCl) dans l\'eau');

  const tropical = (zone?.tempMax || 30) > 35;
  const distribution = tropical
    ? [{ heure:'06:00',pct:45,label:'Tôt matin — fraîcheur (principal)' },
       { heure:'10:30',pct:20,label:'Milieu matinée' },
       { heure:'18:00',pct:35,label:'Soir — fraîcheur' }]
    : [{ heure:'07:00',pct:40,label:'Matin — stimulation ponte' },
       { heure:'12:30',pct:25,label:'Midi' },
       { heure:'16:30',pct:35,label:'Soir — réserves nuit' }];

  const rationCorrigee_g = Math.round(rationBase_g * facteurChaleur);
  const eauCorrigee_ml   = Math.round(eauBase_ml * facteurEau);

  return {
    parAnimal: { ration_g: rationCorrigee_g, eau_ml: eauCorrigee_ml, electrolytes: thi >= 79 },
    troupeau:  { totalRation_kg: parseFloat((rationCorrigee_g * nbAnimaux / 1000).toFixed(2)), totalEau_L: parseFloat((eauCorrigee_ml * nbAnimaux / 1000).toFixed(1)) },
    distribution: distribution.map(d => ({ ...d, g: Math.round(rationCorrigee_g * nbAnimaux * d.pct / 100) })),
    corrections, thi, stress,
    facteurChaleur: parseFloat(facteurChaleur.toFixed(3)),
  };
}

export function estimerTauxPonte(espece, semaineAge, conditions, thi) {
  if (espece.type === 'chair' || !espece.tauxMax) return null;
  const { cycleDebut, cycleFin, tauxMax } = espece;
  if (semaineAge < cycleDebut) return { taux:5,  phase:'pré-ponte',   couleur:'#6b7280', oeufsPrevus:0 };
  if (semaineAge > cycleFin)   return { taux:12, phase:'fin de cycle', couleur:'#ef4444', oeufsPrevus:0 };

  let taux = tauxMax;
  const semCycle = semaineAge - cycleDebut;
  const durCycle = cycleFin - cycleDebut;
  let phase;
  if (semCycle < 8) {
    taux *= (semCycle / 8) * 0.92 + 0.08; phase = 'montée';
  } else if (semCycle < durCycle * 0.65) {
    phase = 'plateau';
  } else {
    taux *= Math.max(0.15, 1 - ((semCycle - durCycle*0.65) / (durCycle*0.45)) * 0.65);
    phase = 'déclin';
  }

  if (!conditions.lumiereOk)    taux -= 18;
  if (!conditions.eauOk)        taux -= 22;
  if (!conditions.tempOk)       taux -= 8;
  if (!conditions.nourritureOk) taux -= 12;
  if (conditions.pouxDetectes)  taux -= 20;
  if (conditions.enMue)         taux -= 45;
  if (conditions.malade)        taux -= 30;

  const stress = niveauStress(thi, espece.id);
  if (stress.niveau === 'mild')     taux -= 8;
  if (stress.niveau === 'moderate') taux -= 18;
  if (stress.niveau === 'severe')   taux -= 35;
  if (stress.niveau === 'danger')   taux -= 55;

  taux = Math.max(0, Math.min(tauxMax, Math.round(taux)));
  return {
    taux, phase,
    couleur: taux >= tauxMax*0.85 ? '#22c55e' : taux >= tauxMax*0.65 ? '#f59e0b' : '#ef4444',
    oeufsPrevus: Math.round(taux / 100 * (conditions.effectif || 0)),
  };
}
