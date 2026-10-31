// ═══════════════════════════════════════════════════════════
//  src/engine/finance.js — Comptabilité + PDF sécurisé
// ═══════════════════════════════════════════════════════════
import { query, queryOne } from '../db/database';
import { TX_TYPE } from '../constants/enums';
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { escapeHtml as h } from '../utils/html';
import { formatNombre } from '../utils/format';
import { formatDateFR, todayStr } from '../utils/dates';
import { CATEGORIES_DEPENSES, CATEGORIES_RECETTES } from '../constants/especes';

export async function totalsPeriode(dateDebut, dateFin) {
  const dep = await queryOne(
    "SELECT SUM(montant) as total FROM transactions WHERE type='depense' AND date BETWEEN ? AND ?",
    [dateDebut, dateFin]
  );
  const rec = await queryOne(
    "SELECT SUM(montant) as total FROM transactions WHERE type='recette' AND date BETWEEN ? AND ?",
    [dateDebut, dateFin]
  );
  const totalD = dep?.total || 0;
  const totalR = rec?.total || 0;
  return {
    depenses: parseFloat(totalD.toFixed(0)),
    recettes: parseFloat(totalR.toFixed(0)),
    benefice: parseFloat((totalR - totalD).toFixed(0)),
    roi_pct:  totalD > 0
      ? parseFloat(((totalR - totalD) / totalD * 100).toFixed(1))
      : 0,
  };
}

export async function parCategorie(type, dateDebut, dateFin) {
  return query(
    `SELECT categorie, SUM(montant) as total, COUNT(*) as nb
     FROM transactions
     WHERE type = ? AND date BETWEEN ? AND ?
     GROUP BY categorie ORDER BY total DESC`,
    [type, dateDebut, dateFin]
  );
}

export async function dernieresTrans(limite = 20) {
  return query(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?',
    [limite]
  );
}

export async function roiBande(bandeId) {
  const charges = await queryOne(
    "SELECT SUM(montant) as total FROM transactions WHERE reference_id=? AND reference_type='bande' AND type='depense'",
    [bandeId]
  );
  const revenus = await queryOne(
    "SELECT SUM(montant) as total FROM transactions WHERE reference_id=? AND reference_type='bande' AND type='recette'",
    [bandeId]
  );
  const totalC = charges?.total || 0;
  const totalR = revenus?.total || 0;
  return {
    charges: parseFloat(totalC.toFixed(0)),
    revenus: parseFloat(totalR.toFixed(0)),
    marge:   parseFloat((totalR - totalC).toFixed(0)),
    roi_pct: totalC > 0
      ? parseFloat(((totalR - totalC) / totalC * 100).toFixed(1))
      : 0,
  };
}

export function formatMontant(n, devise = 'FCFA') {
  return `${Math.round(Number(n) || 0)} ${devise}`;
}

// ── PDF avec fallback robuste ─────────────────────────────
export async function genererRapportPDF(nomFerme, dateDebut, dateFin) {
  let totaux, depCat, recCat, transactions;

  try {
    [totaux, depCat, recCat, transactions] = await Promise.all([
      totalsPeriode(dateDebut, dateFin),
      parCategorie(TX_TYPE.DEPENSE, dateDebut, dateFin),
      parCategorie(TX_TYPE.RECETTE, dateDebut, dateFin),
      query(
        'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC LIMIT 50',
        [dateDebut, dateFin]
      ),
    ]);
  } catch (e) {
    throw new Error('Lecture des données impossible.');
  }

  const nomCat = (id) => [...CATEGORIES_DEPENSES, ...CATEGORIES_RECETTES].find((c) => c.id === id)?.nom || id;
  const vide = (n, txt) => `<tr><td colspan="${n}" class="vide">${txt}</td></tr>`;
  const lignesCat = (liste, vide0, couleur) => (liste || []).map((d) =>
    `<tr><td>${h(nomCat(d.categorie))}</td><td>${h(d.nb)} op.</td><td class="r" style="color:${couleur}">${formatNombre(d.total)} FCFA</td></tr>`
  ).join('') || vide(3, vide0);
  const lignesJournal = (transactions || []).map((t) => {
    const rec = t.type === 'recette';
    return `<tr><td>${h(formatDateFR(t.date))}</td><td>${h(nomCat(t.categorie))}</td><td>${h(t.description)}</td>
      <td class="r" style="font-weight:700;color:${rec ? '#1E7A3E' : '#B42318'}">${rec ? '+' : '−'}${formatNombre(t.montant)} FCFA</td></tr>`;
  }).join('') || vide(4, 'Aucune transaction');

  const benef = totaux?.benefice || 0;
  const couleurBenef = benef >= 0 ? '#1E7A3E' : '#B42318';
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Helvetica,Arial,sans-serif;color:#141C17;padding:28px;font-size:12px}
  .hd{border-bottom:3px solid #1B6B43;padding-bottom:12px;margin-bottom:18px}
  .hd h1{font-size:22px;color:#1B6B43}.hd p{color:#46544B;margin-top:4px}
  .tot{display:flex;gap:10px;margin-bottom:16px}
  .tc{flex:1;padding:12px;border:1px solid #D9DED3;border-radius:6px}
  .tc small{color:#5C6A60;text-transform:uppercase;font-size:10px;letter-spacing:.5px}
  .tc div{font-size:17px;font-weight:700;margin-top:4px}
  h2{font-size:13px;margin:16px 0 8px;color:#1B6B43}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#EDEFE8;text-align:left;padding:7px 9px;font-size:11px}
  td{padding:6px 9px;border-bottom:1px solid #E5E8E0;font-size:11px}
  .r{text-align:right}.vide{color:#5C6A60;text-align:center}
  .ft{margin-top:22px;color:#5C6A60;font-size:10px;border-top:1px solid #D9DED3;padding-top:10px}
</style></head><body>
<div class="hd"><h1>FermI — Rapport financier</h1>
<p>${h(nomFerme)} · du ${h(formatDateFR(dateDebut))} au ${h(formatDateFR(dateFin))}</p>
<p>Édité le ${h(formatDateFR(todayStr()))}</p></div>
<div class="tot">
  <div class="tc"><small>Dépenses</small><div style="color:#B42318">${formatNombre(totaux?.depenses || 0)} FCFA</div></div>
  <div class="tc"><small>Recettes</small><div style="color:#1E7A3E">${formatNombre(totaux?.recettes || 0)} FCFA</div></div>
  <div class="tc"><small>Résultat</small><div style="color:${couleurBenef}">${benef > 0 ? '+' : ''}${formatNombre(benef)} FCFA</div></div>
  <div class="tc"><small>Rendement</small><div>${h(formatNombre(totaux?.roi_pct || 0, 1))} %</div></div>
</div>
<h2>Dépenses par catégorie</h2>
<table><tr><th>Catégorie</th><th>Opérations</th><th class="r">Montant</th></tr>${lignesCat(depCat, 'Aucune dépense', '#B42318')}</table>
<h2>Recettes par catégorie</h2>
<table><tr><th>Catégorie</th><th>Opérations</th><th class="r">Montant</th></tr>${lignesCat(recCat, 'Aucune recette', '#1E7A3E')}</table>
<h2>Dernières opérations (50 maximum)</h2>
<table><tr><th>Date</th><th>Catégorie</th><th>Description</th><th class="r">Montant</th></tr>${lignesJournal}</table>
<div class="ft">Document établi à partir des saisies de l'utilisateur dans FermI. Il n'a pas de valeur de document comptable certifié.</div>
</body></html>`;

  let uri;
  try {
    const result = await Print.printToFileAsync({ html, base64: false });
    uri = result.uri;
  } catch {
    throw new Error("Impossible de générer le PDF sur cet appareil.");
  }

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Rapport financier FermI' });
      return { uri, shared: true };
    }
  } catch { /* le fichier est créé même si le partage est annulé */ }
  return { uri, shared: false };
}
