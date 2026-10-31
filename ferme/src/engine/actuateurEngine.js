// ═══════════════════════════════════════════════════════════
//  src/engine/actuateurEngine.js — Actionneurs + alertes
// ═══════════════════════════════════════════════════════════
import { niveauStress } from './thiEngine';

export function calculerActionneurs(espece, zone, sensors, thi, heure) {
  if (!espece || !sensors) return null;
  const h = heure ?? sensors.heureActuelle ?? new Date().getHours();
  const errTemp = ((espece.tempOptMin + espece.tempOptMax) / 2) - sensors.temperature;
  const stress  = niveauStress(thi, espece.id);

  let ventilPct = 20;
  if (stress.niveau === 'danger')   ventilPct = 100;
  else if (stress.niveau === 'severe')   ventilPct = 85;
  else if (stress.niveau === 'moderate') ventilPct = 65;
  else if (stress.niveau === 'mild')     ventilPct = 45;
  if ((sensors.co2_ppm||0) > 3000) ventilPct = 100;
  else if ((sensors.co2_ppm||0) > 2000) ventilPct = Math.max(ventilPct, 70);
  if (zone?.id === 'equatoriale') ventilPct = Math.min(100, ventilPct + 15);

  const lumiereOn = h >= 5.5 && h < (5.5 + espece.lumiere);
  const tropical  = (zone?.tempMax || 30) > 35;

  return {
    ventil:      { on:true,                         pct:Math.round(ventilPct),                                          protocole:'pwm_gpio' },
    brumisateur: { on:stress.niveau!=='none'&&stress.niveau!=='mild', pct:stress.niveau!=='none'&&stress.niveau!=='mild'?100:0, protocole:'relay_433mhz' },
    clim:        { on:stress.niveau==='severe'||stress.niveau==='danger'||errTemp<-5, pct:stress.niveau==='danger'?100:stress.niveau==='severe'?80:errTemp<-5?Math.min(100,Math.round(-errTemp*15)):0, protocole:'ir_blaster' },
    chauffage:   { on:errTemp>3&&(zone?.tempMin||15)<15, pct:errTemp>3&&(zone?.tempMin||15)<15?Math.min(100,Math.round(errTemp*12)):0, protocole:'relay_gpio' },
    humidif:     { on:(sensors.humidite||60)<40&&(zone?.humMin||30)<35&&stress.niveau==='none', pct:null, protocole:'relay_gpio' },
    lampe:       { on:lumiereOn, pct:lumiereOn?100:0, protocole:'dimmer_wifi' },
    eau:         { on:(sensors.eauConsommee_ml||0)<(espece.eau_ml_par_jour||250)*0.8, pct:null, protocole:'relay_wifi' },
    distributeur:{ on:[tropical?6:7,tropical?10.5:12.5,tropical?18:16.5].some(t=>Math.abs(h-t)<0.083), pct:null, protocole:'servo_wifi' },
    acaricide:   { on:Boolean(sensors.pouxDetectes)&&(h<6||h>=21), pct:null, protocole:'relay_433mhz' },
    alarme:      { on:stress.niveau==='danger'||(sensors.co2_ppm||0)>4000, pct:null, protocole:'buzzer_gpio' },
    _meta: { thi, stressNiveau:stress.niveau, tempErreur:parseFloat(errTemp.toFixed(1)), heure:parseFloat(h.toFixed(2)), tropical },
  };
}

export function genererAlertes(espece, zone, sensors, thi) {
  if (!sensors) return [];
  const alertes = [];
  const stress  = niveauStress(thi, espece?.id);
  if (stress.niveau==='danger')   alertes.push({ niveau:'DANGER',    message:`🚨 THI ${thi} — Mortalité probable`, action:'Clim max + aspersion toiture', couleur:'#dc2626' });
  else if (stress.niveau==='severe')   alertes.push({ niveau:'CRITIQUE',  message:`🔶 Stress sévère THI ${thi}`, action:'Brumisation + eau fraîche', couleur:'#f97316' });
  else if (stress.niveau==='moderate') alertes.push({ niveau:'ATTENTION', message:`⚠️ Stress modéré THI ${thi}`, action:'Ventilation + brumisation', couleur:'#f59e0b' });
  const tempMax = (espece?.tempOptMax||24) + (espece?.heatTolerance==='high'?5:0);
  if (sensors.temperature > tempMax+8) alertes.push({ niveau:'CRITIQUE',  message:`🌡️ Surchauffe ${sensors.temperature}°C`, action:'Refroidissement urgent', couleur:'#ef4444' });
  if (sensors.temperature < (espece?.tempOptMin||18)-3) alertes.push({ niveau:'ATTENTION', message:`❄️ Froid ${sensors.temperature}°C`, action:'Chauffage — risque mycoplasmose', couleur:'#3b82f6' });
  if ((sensors.co2_ppm||0)>4000) alertes.push({ niveau:'CRITIQUE',  message:`☁️ CO₂ dangereux (${sensors.co2_ppm}ppm)`, action:'Ventilation forcée immédiate', couleur:'#ef4444' });
  if (sensors.pouxDetectes)       alertes.push({ niveau:'CRITIQUE',  message:'🦟 Poux rouges détectés', action:'Acaricide nuit + nettoyage perchoirs', couleur:'#ef4444' });
  if ((sensors.nourriturePct||0)<10) alertes.push({ niveau:'CRITIQUE', message:`🌾 Distributeur vide (${sensors.nourriturePct?.toFixed(0)}%)`, action:'Remplir urgemment', couleur:'#f97316' });
  if (sensors.phEau !== undefined && (sensors.phEau<6.0||sensors.phEau>8.5)) alertes.push({ niveau:'ATTENTION', message:`🧪 pH eau hors plage (${sensors.phEau})`, action:'Corriger pH 6.5–7.5', couleur:'#f59e0b' });
  return alertes;
}
