// ═══════════════════════════════════════════════════════════
//  src/engine/thiEngine.js — THI + stress thermique africain
// ═══════════════════════════════════════════════════════════
import { ESPECES_VOLAILLES, ZONES } from '../constants/especes';

export function calculerTHI(tempC, humidite) {
  const tempF = tempC * 9 / 5 + 32;
  return parseFloat((tempF - (0.55 - 0.0055 * humidite) * (tempF - 58.8)).toFixed(1));
}

export function niveauStress(thi, especeId = 'lohmann') {
  const espece = ESPECES_VOLAILLES[especeId];
  const bonus  = espece?.heatTolerance === 'high' ? 4 : espece?.heatTolerance === 'medium' ? 2 : 0;
  const s = { none: 74+bonus, mild: 79+bonus, moderate: 84+bonus, severe: 88+bonus };
  if (thi < s.none)     return { niveau:'none',     couleur:'#22c55e', icone:'✅', label:'Aucun stress' };
  if (thi < s.mild)     return { niveau:'mild',     couleur:'#84cc16', icone:'🟡', label:'Stress léger' };
  if (thi < s.moderate) return { niveau:'moderate', couleur:'#f59e0b', icone:'⚠️', label:'Stress modéré' };
  if (thi < s.severe)   return { niveau:'severe',   couleur:'#f97316', icone:'🔶', label:'Stress sévère' };
  return                       { niveau:'danger',   couleur:'#ef4444', icone:'🚨', label:'DANGER — Mortalité' };
}

export function getSaisonActuelle(zoneId) {
  const zone = ZONES[zoneId];
  if (!zone?.saisons) return null;
  const mois = new Date().getMonth() + 1;
  return zone.saisons.find(s => s.mois?.includes(mois)) || zone.saisons[0];
}
