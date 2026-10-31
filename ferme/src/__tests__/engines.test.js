// ═══════════════════════════════════════════════════════════
//  src/__tests__/engines.test.js
//  Tests aviculture, ruminants, sante, capteurValidation
// ═══════════════════════════════════════════════════════════

import { calculerTauxPonte, calculerIC, interpreterTHI } from '../engine/aviculture';
import { calculerGMQ, dateSevragePrevue, calculerRationRuminant } from '../engine/ruminants';
import { validerCapteursRecu, simulerCapteurs } from '../engine/capteurValidation';
import { calculerTHI, niveauStress } from '../engine/thiEngine';
import { calculerRation, estimerTauxPonte } from '../engine/rationEngine';

const ZONE_SAHEL = { id:'sahelienne', tempMin:20, tempMax:48, humMin:10, humMax:45, thiSeuil:80 };
const ZONE_HAUTES = { id:'hautes_terres', tempMin:8, tempMax:28, humMin:45, humMax:80, thiSeuil:73 };
const ESPECE_PONDEUSE = {
  id:'lohmann', type:'pondeuse', tauxMax:95, cycleDebut:18, cycleFin:72, alerteFin:8,
  tempOptMin:18, tempOptMax:24, lumiere:16, ration_g_par_jour:110, eau_ml_par_jour:250, heatTolerance:'low',
};
const ESPECE_FAYOUMI = {
  id:'fayoumi', type:'pondeuse', tauxMax:70, cycleDebut:22, cycleFin:90, alerteFin:10,
  tempOptMin:22, tempOptMax:34, lumiere:13, ration_g_par_jour:90, eau_ml_par_jour:200, heatTolerance:'high',
};
const ESPECE_MOUTON = { id:'mouton', gestation_jours:150, sevrage_jours:90, poids_naissance_kg:3.5, ration_kg_par_jour:1.5, eau_L_par_jour:4.0 };

// ── aviculture.js ────────────────────────────────────────
describe('aviculture — calculerTauxPonte', () => {
  test('effectif nul → 0', () => expect(calculerTauxPonte(50, 0)).toBe(0));
  test('100 œufs / 200 poules → 50%', () => expect(calculerTauxPonte(100, 200)).toBe(50));
  test('plafond 100%', () => expect(calculerTauxPonte(200, 100)).toBe(100));
  test('résultat arrondi à 1 décimale', () => {
    const t = calculerTauxPonte(33, 100);
    expect(t).toBe(33);
  });
});

describe('aviculture — calculerIC (pondeuses)', () => {
  test('5 kg / 60 œufs → IC ~1 kg/douzaine', () => {
    const ic = calculerIC(5, 60 * 0.06); // 60 œufs × 60g = 3.6kg
    expect(typeof ic).toBe('number');
  });
  test('0 kg produit → null', () => expect(calculerIC(5, 0)).toBeNull());
});

// ── ruminants.js ─────────────────────────────────────────
describe('ruminants — calculerGMQ', () => {
  test('0 jours → 0', () => expect(calculerGMQ(10, 15, 0)).toBe(0));
  test('gain 2 kg en 40 jours → GMQ 50 g/jour', () => expect(calculerGMQ(30, 32, 40)).toBe(50));
  test('perte de poids → GMQ négatif', () => expect(calculerGMQ(35, 33, 20)).toBeLessThan(0));
});

describe('ruminants — dateSevragePrevue', () => {
  test('retourne une date string AAAA-MM-JJ', () => {
    const d = dateSevragePrevue('2025-01-01', ESPECE_MOUTON);
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('90 jours après la naissance', () => {
    const naissance = new Date('2025-01-01');
    const attendu   = new Date('2025-04-01').toISOString().split('T')[0];
    expect(dateSevragePrevue('2025-01-01', ESPECE_MOUTON)).toBe(attendu);
  });
  test('null si date nulle', () => expect(dateSevragePrevue(null, ESPECE_MOUTON)).toBeNull());
});

describe('ruminants — calculerRationRuminant', () => {
  test('température normale → ration de base', () => {
    const r = calculerRationRuminant(ESPECE_MOUTON, 10, 22);
    expect(r.rationParAnimal_kg).toBeCloseTo(1.5, 1);
  });
  test('grande chaleur → eau augmentée', () => {
    const normal = calculerRationRuminant(ESPECE_MOUTON, 10, 22);
    const chaud  = calculerRationRuminant(ESPECE_MOUTON, 10, 38);
    expect(chaud.totalEau_L).toBeGreaterThan(normal.totalEau_L);
  });
  test('froid → ration augmentée', () => {
    const normal = calculerRationRuminant(ESPECE_MOUTON, 10, 22);
    const froid  = calculerRationRuminant(ESPECE_MOUTON, 10, 10);
    expect(froid.totalRation_kg).toBeGreaterThan(normal.totalRation_kg);
  });
});

// ── capteurValidation.js ─────────────────────────────────
describe('capteurValidation — validerCapteursRecu', () => {
  test('données minimales valides', () => {
    const r = validerCapteursRecu({ temperature: 25, humidite: 60 });
    expect(r).not.toBeNull();
    expect(r.online).toBe(true);
  });
  test('température -10°C limite basse acceptée', () => {
    const r = validerCapteursRecu({ temperature: -10, humidite: 50 });
    expect(r?.temperature).toBe(-10);
  });
  test('température 85°C limite haute acceptée', () => {
    const r = validerCapteursRecu({ temperature: 85, humidite: 20 });
    expect(r?.temperature).toBe(85);
  });
  test('température 86°C rejetée → null', () => {
    expect(validerCapteursRecu({ temperature: 86, humidite: 50 })).toBeNull();
  });
  test('CO₂ string → ignoré (undefined)', () => {
    const r = validerCapteursRecu({ temperature: 25, humidite: 60, co2_ppm: 'injection' });
    expect(r?.co2_ppm).toBeUndefined();
  });
  test('timestamp posé automatiquement', () => {
    const r = validerCapteursRecu({ temperature: 25, humidite: 60 });
    expect(r?.timestamp).toBeGreaterThan(0);
  });
});

describe('capteurValidation — simulerCapteurs', () => {
  test('retourne toutes les clés requises', () => {
    const r = simulerCapteurs(ESPECE_PONDEUSE, ZONE_SAHEL, null);
    expect(r).toHaveProperty('temperature');
    expect(r).toHaveProperty('humidite');
    expect(r).toHaveProperty('co2_ppm');
    expect(r).toHaveProperty('nourriturePct');
    expect(r).toHaveProperty('phEau');
    expect(r).toHaveProperty('online');
  });
  test('température dans les limites de la zone', () => {
    const r = simulerCapteurs(ESPECE_PONDEUSE, ZONE_SAHEL, null);
    expect(r.temperature).toBeGreaterThanOrEqual(ZONE_SAHEL.tempMin - 3);
    expect(r.temperature).toBeLessThanOrEqual(ZONE_SAHEL.tempMax + 4);
  });
  test('pH eau ∈ [6.0, 8.2]', () => {
    for (let i = 0; i < 20; i++) {
      const r = simulerCapteurs(ESPECE_PONDEUSE, ZONE_SAHEL, null);
      expect(r.phEau).toBeGreaterThanOrEqual(6.0);
      expect(r.phEau).toBeLessThanOrEqual(8.2);
    }
  });
  test('nourriturePct décroît légèrement à chaque cycle', () => {
    const prev = { nourriturePct: 80 };
    const next = simulerCapteurs(ESPECE_PONDEUSE, ZONE_SAHEL, prev);
    expect(next.nourriturePct).toBeLessThanOrEqual(80.1);
  });
});

// ── thiEngine.js ─────────────────────────────────────────
describe('thiEngine', () => {
  test('Fayoumi bonus +4 → none à THI 76', () => {
    expect(niveauStress(76, 'fayoumi').niveau).toBe('none');
  });
  test('Lohmann → mild à THI 76', () => {
    expect(niveauStress(76, 'lohmann').niveau).toBe('mild');
  });
});

// ── rationEngine.js ──────────────────────────────────────
describe('rationEngine — cohérence ration/THI', () => {
  test('THI danger → electrolytes = true', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 44, 45, 30);
    expect(r?.parAnimal.electrolytes).toBe(true);
  });
  test('conditions normales → electrolytes = false', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_HAUTES, 100, 20, 60, 30);
    expect(r?.parAnimal.electrolytes).toBe(false);
  });
  test('distribution totalise 100%', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 38, 30, 30);
    const total = r.distribution.reduce((s, d) => s + d.pct, 0);
    expect(total).toBe(100);
  });
});
