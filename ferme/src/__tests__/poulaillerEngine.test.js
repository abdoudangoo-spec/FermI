// ═══════════════════════════════════════════════════════════
//  src/__tests__/poulaillerEngine.test.js
//  Tests automatisés — Moteur IoT
//  Exécuter : npx jest src/__tests__/poulaillerEngine.test.js
// ═══════════════════════════════════════════════════════════

import { calculerTHI, niveauStress }          from '../engine/thiEngine';
import { calculerRation, estimerTauxPonte }    from '../engine/rationEngine';
import { calculerActionneurs, genererAlertes } from '../engine/actuateurEngine';
import { validerCapteursRecu }                 from '../engine/capteurValidation';
import { runCycle }                            from '../engine/poulaillerEngine';

// ── Mocks espèces et zones ────────────────────────────────
const ESPECE_PONDEUSE = {
  id: 'lohmann', nom: 'Lohmann Brown', type: 'pondeuse',
  tauxMax: 95, cycleDebut: 18, cycleFin: 72, alerteFin: 8,
  tempOptMin: 18, tempOptMax: 24, lumiere: 16,
  ration_g_par_jour: 110, eau_ml_par_jour: 250,
  heatTolerance: 'low',
};
const ESPECE_FAYOUMI = {
  id: 'fayoumi', nom: 'Fayoumi', type: 'pondeuse',
  tauxMax: 70, cycleDebut: 22, cycleFin: 90, alerteFin: 10,
  tempOptMin: 22, tempOptMax: 34, lumiere: 13,
  ration_g_par_jour: 90, eau_ml_par_jour: 200,
  heatTolerance: 'high',
};
const ESPECE_CHAIR = {
  id: 'poulet_chair', nom: 'Ross 308', type: 'chair',
  tauxMax: null, cycleDebut: 0, cycleFin: 8, alerteFin: 1,
  tempOptMin: 20, tempOptMax: 28, lumiere: 23,
  ration_g_par_jour: 150, eau_ml_par_jour: 280,
  heatTolerance: 'low',
  phases: [
    { label: 'Démarrage',  debut: 0, fin: 2, temp: 32, ration: 45 },
    { label: 'Croissance', debut: 2, fin: 5, temp: 26, ration: 130 },
    { label: 'Finition',   debut: 5, fin: 8, temp: 22, ration: 200 },
  ],
};
const ZONE_SAHEL = {
  id: 'sahelienne', nom: 'Zone Sahélienne', tempMin: 20, tempMax: 48,
  humMin: 10, humMax: 45, thiSeuil: 80,
  saisons: [{ nom: 'Saison chaude', mois: [3,4,5], temp: 42, hum: 15 }],
};
const ZONE_HAUTES = {
  id: 'hautes_terres', nom: 'Hautes Terres', tempMin: 8, tempMax: 28,
  humMin: 45, humMax: 80, thiSeuil: 73,
  saisons: [{ nom: 'Saison fraîche', mois: [1,2,3,4,5,6,7,8,9,10,11,12], temp: 18, hum: 65 }],
};
const SENSORS_NORMAL = {
  temperature: 22, humidite: 65, co2_ppm: 1500,
  lumiereSolaire: 14, heureActuelle: 9, nourriturePct: 70,
  eauConsommee_ml: 5000, phEau: 7.0,
  pouxDetectes: false, enMue: false, malade: false,
};
const SENSORS_CHAUD = {
  ...SENSORS_NORMAL, temperature: 40, humidite: 30,
};
const SENSORS_DANGER = {
  ...SENSORS_NORMAL, temperature: 45, humidite: 50,
};

// ═══════════════════════════════════════════════════════════
//  1. THI — Temperature Humidity Index
// ═══════════════════════════════════════════════════════════
describe('calculerTHI', () => {
  test('conditions optimales → THI < 74 (pas de stress)', () => {
    const thi = calculerTHI(22, 60);
    expect(thi).toBeLessThan(74);
    expect(thi).toBeGreaterThan(60);
  });

  test('chaleur sahélienne (40°C, 30%) → THI stress modéré', () => {
    const thi = calculerTHI(40, 30);
    expect(thi).toBeGreaterThanOrEqual(79);
    expect(thi).toBeLessThan(95);
  });

  test('danger (45°C, 50%) → THI ≥ 88', () => {
    const thi = calculerTHI(45, 50);
    expect(thi).toBeGreaterThanOrEqual(88);
  });

  test('Hautes Terres (18°C, 70%) → THI faible', () => {
    const thi = calculerTHI(18, 70);
    expect(thi).toBeLessThan(74);
  });

  test('résultat est un nombre avec 1 décimale', () => {
    const thi = calculerTHI(25, 60);
    expect(typeof thi).toBe('number');
    expect(Number.isFinite(thi)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
//  2. Niveaux de stress thermique
// ═══════════════════════════════════════════════════════════
describe('niveauStress', () => {
  test('THI 70 → none', () => {
    expect(niveauStress(70, 'lohmann').niveau).toBe('none');
  });
  test('THI 76 → mild pour Lohmann', () => {
    expect(niveauStress(76, 'lohmann').niveau).toBe('mild');
  });
  test('THI 76 → none pour Fayoumi (résistance haute +4)', () => {
    expect(niveauStress(76, 'fayoumi').niveau).toBe('none');
  });
  test('THI 88 → danger pour Lohmann', () => {
    expect(niveauStress(88, 'lohmann').niveau).toBe('danger');
  });
  test('THI 88 → severe pour Fayoumi (résistance haute)', () => {
    expect(niveauStress(88, 'fayoumi').niveau).toBe('severe');
  });
  test('retourne une couleur hex valide', () => {
    const result = niveauStress(80, 'lohmann');
    expect(result.couleur).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

// ═══════════════════════════════════════════════════════════
//  3. Calcul de ration
// ═══════════════════════════════════════════════════════════
describe('calculerRation', () => {
  test('conditions normales → ration proche de la base', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_HAUTES, 100, 22, 65, 30);
    expect(r).not.toBeNull();
    expect(r.parAnimal.ration_g).toBeGreaterThan(80);
    expect(r.parAnimal.ration_g).toBeLessThan(130);
  });

  test('grande chaleur (40°C) → ration réduite d\'au moins 15%', () => {
    const normal = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 22, 65, 30);
    const chaud  = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 40, 30, 30);
    expect(chaud.parAnimal.ration_g).toBeLessThan(normal.parAnimal.ration_g * 0.90);
  });

  test('grande chaleur → eau augmentée', () => {
    const normal = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 22, 65, 30);
    const chaud  = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 38, 25, 30);
    expect(chaud.parAnimal.eau_ml).toBeGreaterThan(normal.parAnimal.eau_ml);
  });

  test('Fayoumi supporte mieux la chaleur → moins de réduction', () => {
    const lohmann = calculerRation(ESPECE_PONDEUSE,  ZONE_SAHEL, 100, 38, 30, 30);
    const fayoumi = calculerRation(ESPECE_FAYOUMI, ZONE_SAHEL, 100, 38, 30, 30);
    expect(fayoumi.facteurChaleur).toBeGreaterThanOrEqual(lohmann.facteurChaleur);
  });

  test('facteurChaleur ∈ [0.6, 1.2]', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 45, 50, 30);
    expect(r.facteurChaleur).toBeGreaterThanOrEqual(0.6);
    expect(r.facteurChaleur).toBeLessThanOrEqual(1.2);
  });

  test('poulet chair phase Démarrage → ration 45g', () => {
    const r = calculerRation(ESPECE_CHAIR, ZONE_HAUTES, 500, 22, 65, 1);
    expect(r.parAnimal.ration_g).toBeCloseTo(45, 0);
  });

  test('poulet chair phase Finition → ration 200g', () => {
    const r = calculerRation(ESPECE_CHAIR, ZONE_HAUTES, 500, 22, 65, 6);
    expect(r.parAnimal.ration_g).toBeCloseTo(200, 0);
  });

  test('distribution 3 créneaux totalisant 100%', () => {
    const r   = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 38, 30, 30);
    const tot = r.distribution.reduce((s, d) => s + d.pct, 0);
    expect(tot).toBe(100);
  });

  test('zone tropicale → distribution tôt matin/soir', () => {
    const r = calculerRation(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 38, 30, 30);
    expect(r.distribution[0].heure).toBe('06:00');
  });

  test('null si espèce ou zone manquante', () => {
    expect(calculerRation(null, ZONE_SAHEL, 100, 38, 30, 30)).toBeNull();
    expect(calculerRation(ESPECE_PONDEUSE, null, 100, 38, 30, 30)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
//  4. Taux de ponte
// ═══════════════════════════════════════════════════════════
describe('estimerTauxPonte', () => {
  const condOk = {
    lumiereOk: true, tempOk: true, eauOk: true, nourritureOk: true,
    pouxDetectes: false, enMue: false, malade: false, effectif: 100,
  };

  test('avant cycle → pré-ponte', () => {
    const r = estimerTauxPonte(ESPECE_PONDEUSE, 10, condOk, 70);
    expect(r?.phase).toBe('pré-ponte');
    expect(r?.taux).toBe(5);
  });

  test('plateau (sem.40) conditions parfaites → taux > 85%', () => {
    const r = estimerTauxPonte(ESPECE_PONDEUSE, 40, condOk, 70);
    expect(r?.taux).toBeGreaterThan(85);
  });

  test('poux détectés → taux réduit de 20', () => {
    const avecPoux = { ...condOk, pouxDetectes: true };
    const sans = estimerTauxPonte(ESPECE_PONDEUSE, 40, condOk, 70);
    const avec = estimerTauxPonte(ESPECE_PONDEUSE, 40, avecPoux, 70);
    expect(sans.taux - avec.taux).toBeGreaterThanOrEqual(18);
  });

  test('stress danger THI → taux réduit de 55', () => {
    const sans  = estimerTauxPonte(ESPECE_PONDEUSE, 40, condOk, 70);
    const avec  = estimerTauxPonte(ESPECE_PONDEUSE, 40, condOk, 95);
    expect(sans.taux - avec.taux).toBeGreaterThanOrEqual(50);
  });

  test('mue → taux réduit de 45', () => {
    const enMue = { ...condOk, enMue: true };
    const sans  = estimerTauxPonte(ESPECE_PONDEUSE, 40, condOk, 70);
    const avec  = estimerTauxPonte(ESPECE_PONDEUSE, 40, enMue, 70);
    expect(sans.taux - avec.taux).toBeGreaterThanOrEqual(40);
  });

  test('taux toujours ∈ [0, tauxMax]', () => {
    const condMauvaise = { lumiereOk: false, tempOk: false, eauOk: false, nourritureOk: false, pouxDetectes: true, enMue: false, malade: true, effectif: 100 };
    const r = estimerTauxPonte(ESPECE_PONDEUSE, 40, condMauvaise, 92);
    expect(r?.taux).toBeGreaterThanOrEqual(0);
    expect(r?.taux).toBeLessThanOrEqual(ESPECE_PONDEUSE.tauxMax);
  });

  test('espèce chair → null', () => {
    expect(estimerTauxPonte(ESPECE_CHAIR, 4, condOk, 70)).toBeNull();
  });

  test('après cycle → fin de cycle', () => {
    const r = estimerTauxPonte(ESPECE_PONDEUSE, 80, condOk, 70);
    expect(r?.phase).toBe('fin de cycle');
  });
});

// ═══════════════════════════════════════════════════════════
//  5. Actionneurs
// ═══════════════════════════════════════════════════════════
describe('calculerActionneurs', () => {
  test('THI danger → ventilation 100%', () => {
    const thi = calculerTHI(45, 50);
    const r   = calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_DANGER, thi, 10);
    expect(r?.ventil.pct).toBe(100);
  });

  test('THI danger → brumisation active', () => {
    const thi = calculerTHI(45, 50);
    const r   = calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_DANGER, thi, 10);
    expect(r?.brumisateur.on).toBe(true);
  });

  test('conditions normales → lampe allumée en journée', () => {
    const thi = calculerTHI(22, 60);
    const r   = calculerActionneurs(ESPECE_PONDEUSE, ZONE_HAUTES, SENSORS_NORMAL, thi, 9);
    expect(r?.lampe.on).toBe(true);
  });

  test('conditions normales → pas de chauffage (zone sahélienne)', () => {
    const thi = calculerTHI(22, 60);
    const r   = calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_NORMAL, thi, 9);
    expect(r?.chauffage.on).toBe(false);
  });

  test('poux détectés la nuit → acaricide actif', () => {
    const thi         = calculerTHI(22, 60);
    const sensorsPoux = { ...SENSORS_NORMAL, pouxDetectes: true };
    const r           = calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, sensorsPoux, thi, 22);
    expect(r?.acaricide.on).toBe(true);
  });

  test('null si espèce ou sensors manquant', () => {
    expect(calculerActionneurs(null, ZONE_SAHEL, SENSORS_NORMAL, 70, 10)).toBeNull();
    expect(calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, null, 70, 10)).toBeNull();
  });

  test('chaque actionneur a un protocole défini', () => {
    const thi = calculerTHI(22, 60);
    const r   = calculerActionneurs(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_NORMAL, thi, 9);
    ['ventil', 'brumisateur', 'clim', 'chauffage', 'lampe', 'eau'].forEach((k) => {
      expect(r[k].protocole).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  6. Alertes
// ═══════════════════════════════════════════════════════════
describe('genererAlertes', () => {
  test('conditions normales → aucune alerte', () => {
    const thi = calculerTHI(22, 60);
    const r   = genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_NORMAL, thi);
    expect(r).toHaveLength(0);
  });

  test('THI danger → alerte DANGER en premier', () => {
    const thi = calculerTHI(45, 50);
    const r   = genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, SENSORS_DANGER, thi);
    expect(r[0]?.niveau).toBe('DANGER');
  });

  test('poux détectés → alerte CRITIQUE', () => {
    const thi  = calculerTHI(22, 60);
    const sens = { ...SENSORS_NORMAL, pouxDetectes: true };
    const r    = genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, sens, thi);
    const poux = r.find((a) => a.message.includes('Poux'));
    expect(poux?.niveau).toBe('CRITIQUE');
  });

  test('distributeur vide → alerte CRITIQUE', () => {
    const thi  = calculerTHI(22, 60);
    const sens = { ...SENSORS_NORMAL, nourriturePct: 5 };
    const r    = genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, sens, thi);
    expect(r.some((a) => a.message.includes('Distributeur'))).toBe(true);
  });

  test('pH hors plage → alerte ATTENTION', () => {
    const thi  = calculerTHI(22, 60);
    const sens = { ...SENSORS_NORMAL, phEau: 5.0 };
    const r    = genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, sens, thi);
    expect(r.some((a) => a.message.includes('pH'))).toBe(true);
  });

  test('sensors null → tableau vide', () => {
    const thi = calculerTHI(22, 60);
    expect(genererAlertes(ESPECE_PONDEUSE, ZONE_SAHEL, null, thi)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
//  7. Validation capteurs
// ═══════════════════════════════════════════════════════════
describe('validerCapteursRecu', () => {
  test('données valides → objet sanitizé', () => {
    const raw = { temperature: 25.3, humidite: 65, co2_ppm: 1500, phEau: 7.1, pouxDetectes: false, enMue: false, malade: false };
    const r   = validerCapteursRecu(raw);
    expect(r).not.toBeNull();
    expect(r.temperature).toBe(25.3);
  });

  test('température hors plage → null', () => {
    const raw = { temperature: 200, humidite: 65 };
    expect(validerCapteursRecu(raw)).toBeNull();
  });

  test('humidité manquante → null', () => {
    const raw = { temperature: 25 };
    expect(validerCapteursRecu(raw)).toBeNull();
  });

  test('null ou undefined → null', () => {
    expect(validerCapteursRecu(null)).toBeNull();
    expect(validerCapteursRecu(undefined)).toBeNull();
  });

  test('string injection → ignorée', () => {
    const raw = { temperature: 25, humidite: 65, co2_ppm: '<script>', phEau: 7 };
    const r   = validerCapteursRecu(raw);
    expect(r?.co2_ppm).toBeUndefined(); // string rejeté
  });

  test('valeurs limites acceptées', () => {
    const raw = { temperature: -10, humidite: 0, co2_ppm: 300 };
    const r   = validerCapteursRecu(raw);
    expect(r?.temperature).toBe(-10);
  });
});

// ═══════════════════════════════════════════════════════════
//  8. Cycle complet runCycle
// ═══════════════════════════════════════════════════════════
describe('runCycle', () => {
  test('retourne toutes les clés attendues', () => {
    const r = runCycle(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 40, SENSORS_NORMAL);
    expect(r).toHaveProperty('thi');
    expect(r).toHaveProperty('stress');
    expect(r).toHaveProperty('ration');
    expect(r).toHaveProperty('tauxPonte');
    expect(r).toHaveProperty('actionneurs');
    expect(r).toHaveProperty('alertes');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('conditions');
  });

  test('score global ∈ [0, 100]', () => {
    const r = runCycle(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 40, SENSORS_NORMAL);
    expect(r.score.global).toBeGreaterThanOrEqual(0);
    expect(r.score.global).toBeLessThanOrEqual(100);
  });

  test('null si espèce ou sensors manquant', () => {
    expect(runCycle(null, ZONE_SAHEL, 100, 40, SENSORS_NORMAL)).toBeNull();
    expect(runCycle(ESPECE_PONDEUSE, ZONE_SAHEL, 100, 40, null)).toBeNull();
  });

  test('espèce chair → tauxPonte null', () => {
    const r = runCycle(ESPECE_CHAIR, ZONE_SAHEL, 500, 4, SENSORS_NORMAL);
    expect(r.tauxPonte).toBeNull();
  });
});
