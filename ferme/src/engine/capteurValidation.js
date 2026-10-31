// ═══════════════════════════════════════════════════════════
//  src/engine/capteurValidation.js — Validation + simulation
// ═══════════════════════════════════════════════════════════
export function validerCapteursRecu(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const safe = {};
  if (typeof raw.temperature === 'number' && raw.temperature >= -10 && raw.temperature <= 85)
    safe.temperature = parseFloat(raw.temperature.toFixed(1));
  if (typeof raw.humidite === 'number' && raw.humidite >= 0 && raw.humidite <= 100)
    safe.humidite = parseFloat(raw.humidite.toFixed(1));
  if (typeof raw.co2_ppm === 'number' && raw.co2_ppm >= 300 && raw.co2_ppm <= 15000)
    safe.co2_ppm = Math.round(raw.co2_ppm);
  if (typeof raw.lumiereSolaire === 'number' && raw.lumiereSolaire >= 0 && raw.lumiereSolaire <= 24)
    safe.lumiereSolaire = parseFloat(raw.lumiereSolaire.toFixed(1));
  if (typeof raw.nourriturePct === 'number' && raw.nourriturePct >= 0 && raw.nourriturePct <= 100)
    safe.nourriturePct = parseFloat(raw.nourriturePct.toFixed(1));
  if (typeof raw.eauConsommee_ml === 'number' && raw.eauConsommee_ml >= 0 && raw.eauConsommee_ml <= 500000)
    safe.eauConsommee_ml = Math.round(raw.eauConsommee_ml);
  if (typeof raw.phEau === 'number' && raw.phEau >= 0 && raw.phEau <= 14)
    safe.phEau = parseFloat(raw.phEau.toFixed(2));
  safe.pouxDetectes = Boolean(raw.pouxDetectes);
  safe.enMue        = Boolean(raw.enMue);
  safe.malade       = Boolean(raw.malade);
  if (safe.temperature === undefined || safe.humidite === undefined) return null;
  safe.timestamp = Date.now();
  safe.online    = true;
  return safe;
}

export function simulerCapteurs(espece, zone, prevSensors) {
  const r = (v, bruit) => Math.max(0, v + (Math.random() - 0.5) * bruit * 2);
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const tempMin = zone?.tempMin || 18;
  const tempMax = zone?.tempMax || 35;
  const facteurH = Math.sin((h - 6) * Math.PI / 12);
  const tempCible = h >= 6 && h <= 18
    ? (tempMin + (tempMax - tempMin) * 0.25) + (tempMax - tempMin) * 0.5 * Math.max(0, facteurH)
    : tempMin + (tempMax - tempMin) * 0.25;
  const temp = parseFloat(Math.max(tempMin-2, Math.min(tempMax+3, r(prevSensors?.temperature ?? tempCible, 0.5))).toFixed(1));
  const humBase = zone?.humMax && zone?.humMin ? zone.humMin + (zone.humMax - zone.humMin) * (1 - (temp-tempMin)/(tempMax-tempMin)) : 60;
  return {
    temperature:     temp,
    humidite:        parseFloat(Math.max(zone?.humMin??15, Math.min(zone?.humMax??95, r(prevSensors?.humidite ?? humBase, 2.5))).toFixed(1)),
    co2_ppm:         Math.round(Math.max(700, Math.min(3500, r(prevSensors?.co2_ppm ?? 1400, 120)))),
    lumiereSolaire:  h>=5.5&&h<=19.5 ? Math.min(espece?.lumiere??16, h-5.5) : 0,
    heureActuelle:   parseFloat(h.toFixed(3)),
    nourriturePct:   parseFloat(Math.max(0, Math.min(100, (prevSensors?.nourriturePct ?? 70) - Math.random()*0.5)).toFixed(1)),
    eauConsommee_ml: Math.round(Math.max(0, r(prevSensors?.eauConsommee_ml ?? 4500, 180))),
    phEau:           parseFloat(Math.max(6.0, Math.min(8.2, r(prevSensors?.phEau ?? 7.1, 0.08))).toFixed(2)),
    pouxDetectes:    (prevSensors?.pouxDetectes ?? false) || Math.random() < 0.015,
    enMue:           Math.random() < 0.03,
    malade:          Math.random() < 0.01,
    online:          false,
    simule:          true,
    timestamp:       Date.now(),
  };
}
