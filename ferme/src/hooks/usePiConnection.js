// ═══════════════════════════════════════════════════════════
//  src/hooks/usePiConnection.js — Lecture périodique du contrôleur IoT
//  Sans contrôleur joignable : mode DÉMO (valeurs simulées, jamais enregistrées).
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  lireCapteursPi, simulerCapteurs, runCycle, commanderActionneur, commanderBatch, pingPi,
} from '../engine/poulaillerEngine';
import { ESPECES_VOLAILLES, ZONES } from '../constants/especes';
import { insert } from '../db/database';
import { lireCleControleur } from '../utils/secure';
import { validerUrlPi } from '../utils/piUrl';

const POLL_MS = 30_000;
const PERSIST_MS = 5 * 60_000;
const CACHE_MS = 5 * 60_000;

/** mode : 'live' (capteurs réels) | 'cache' (dernières valeurs réelles) | 'demo' (simulation) */
export function usePiConnection(bande) {
  const [sensors, setSensors] = useState(null);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('demo');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [piReachable, setPiReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const timer = useRef(null);
  const etatApp = useRef('active');
  const cache = useRef({ data: null, ts: 0 });
  const precedent = useRef(null);
  const dernierePersistance = useRef(0);
  const abonnement = useRef(null);
  const actif = useRef(true);

  const bandeId = bande?.id;
  const especeId = bande?.espece_id;
  const zoneId = bande?.zone_id;
  const nombre = bande?.effectif_actuel;
  const semaineAge = bande?.semaine_age;
  const urlSaisie = bande?.apiUrl || '';
  const urlOk = urlSaisie && validerUrlPi(urlSaisie).ok ? validerUrlPi(urlSaisie).url : '';

  const cycle = useCallback(async () => {
    if (!especeId || !bandeId) return;
    try {
      const espece = ESPECES_VOLAILLES[especeId];
      const zone = ZONES[zoneId] || ZONES.soudano_guineenne;
      if (!espece) return;
      let data;
      let m = 'demo';
      if (urlOk) {
        const token = await lireCleControleur();
        const resp = await lireCapteursPi(urlOk, token);
        if (resp.data && resp.online) {
          data = resp.data; m = 'live';
          cache.current = { data, ts: Date.now() };
        } else if (cache.current.data && Date.now() - cache.current.ts < CACHE_MS) {
          data = { ...cache.current.data, online: false }; m = 'cache';
        }
      }
      if (!data) data = simulerCapteurs(espece, zone, precedent.current);
      precedent.current = data;
      if (!actif.current) return;
      setSensors(data);
      setResult(runCycle(espece, zone, nombre || 0, semaineAge || 0, data));
      setMode(m);
      setLastUpdate(new Date());
      setErreur(null);
      // Seules les mesures réelles sont enregistrées dans l'historique.
      if (m === 'live' && Date.now() - dernierePersistance.current >= PERSIST_MS) {
        dernierePersistance.current = Date.now();
        await insert('historique_capteurs', {
          bande_id: bandeId, timestamp: Math.floor(Date.now() / 1000),
          temperature: data.temperature, humidite: data.humidite, co2_ppm: data.co2_ppm,
          nourriture: data.nourriturePct, eau_ml: data.eauConsommee_ml,
        });
      }
    } catch {
      if (actif.current) setErreur('Lecture des capteurs impossible pour le moment.');
    }
  }, [bandeId, especeId, zoneId, nombre, semaineAge, urlOk]);

  const verifier = useCallback(async () => {
    if (!urlOk) { setPiReachable(false); return; }
    try { setPiReachable(await pingPi(urlOk, await lireCleControleur())); } catch { setPiReachable(false); }
  }, [urlOk]);

  useEffect(() => {
    actif.current = true;
    if (!bandeId) return undefined;
    setLoading(true);
    cycle().finally(() => { if (actif.current) setLoading(false); });
    verifier();
    timer.current = setInterval(() => { if (etatApp.current === 'active') cycle(); }, POLL_MS);
    abonnement.current = AppState.addEventListener('change', (next) => {
      etatApp.current = next;
      if (next === 'active') { cycle(); verifier(); }
    });
    return () => {
      actif.current = false;
      if (timer.current) clearInterval(timer.current);
      if (abonnement.current) abonnement.current.remove();
    };
  }, [bandeId, cycle, verifier]);

  const commander = useCallback(async (actionneur, valeur, protocole) => {
    if (!urlOk || !piReachable) return { succes: false, erreur: 'Contrôleur non connecté' };
    return commanderActionneur(urlOk, actionneur, valeur, protocole, await lireCleControleur());
  }, [urlOk, piReachable]);

  const commanderTout = useCallback(async (commandes) => {
    if (!urlOk || !piReachable) return { succes: false, erreur: 'Contrôleur non connecté' };
    return commanderBatch(urlOk, commandes, await lireCleControleur());
  }, [urlOk, piReachable]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([cycle(), verifier()]);
    if (actif.current) setLoading(false);
  }, [cycle, verifier]);

  return { sensors, result, mode, piReachable, lastUpdate, loading, erreur, refresh, commander, commanderTout, configure: !!urlOk };
}
