import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useBandStore } from '../../store/bandStore';
import { ESPECES_VOLAILLES } from '../../constants/especes';
import { alerteFinCycle, ageSemaines } from '../../engine/aviculture';
import { genererCalendrierBande } from '../../engine/sante';
import { Content, ChipRow, IconButton, Card, Section, Stat, Pill, Button, Banner, ListItem, ProgressBar, Divider, Row, KeyValue } from '../../components/ui';
import { EmptyState, LoadingState } from '../../components/states';
import { FormSheet } from '../../components/FormSheet';
import { useToast, useConfirm } from '../../components/feedback';
import { formatNombre } from '../../utils/format';
import { formatDateFR, todayStr } from '../../utils/dates';
import { useTheme, space, type } from '../../theme';

const SECTIONS = [
  { id: 'ponte', label: 'Ponte' },
  { id: 'aliment', label: 'Alimentation' },
  { id: 'mortalite', label: 'Mortalité' },
  { id: 'bandes', label: 'Bandes' },
];

const OPTIONS_ESPECES = Object.values(ESPECES_VOLAILLES).map((e) => ({ value: e.id, label: e.nom }));

const REFERENCE_IC = [
  ['< 2,5', 'Excellent', 'success'], ['2,5 – 3,0', 'Bon', 'primary'],
  ['3,0 – 3,5', 'Moyen', 'warning'], ['> 3,5', 'À améliorer', 'danger'],
];

export default function Volailles() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const bandes = useBandStore((s) => s.bandes);
  const bandActive = useBandStore((s) => s.bandActive);
  const setBandeActive = useBandStore((s) => s.setBandeActive);
  const ajouterBande = useBandStore((s) => s.ajouterBande);
  const majBande = useBandStore((s) => s.majBande);
  const supprimerBande = useBandStore((s) => s.supprimerBande);
  const statsPonte7j = useBandStore((s) => s.statsPonte7j);
  const histoPonte = useBandStore((s) => s.histoPonte);
  const saisirPonte = useBandStore((s) => s.saisirPonte);
  const saisirAliment = useBandStore((s) => s.saisirAliment);
  const saisirMortalite = useBandStore((s) => s.saisirMortalite);

  const [section, setSection] = useState('ponte');
  const [stats, setStats] = useState(null);
  const [histo, setHisto] = useState([]);
  const [form, setForm] = useState(null); // 'bande' | 'ponte' | 'aliment' | 'mortalite'
  const monte = useRef(true);
  useEffect(() => () => { monte.current = false; }, []);

  const bandeId = bandActive?.id;
  const effectif = bandActive?.effectif_actuel;

  const charger = useCallback(async () => {
    if (!bandeId) return;
    const [s, h] = await Promise.all([statsPonte7j(bandeId, effectif), histoPonte(bandeId, 14)]);
    if (!monte.current) return;
    setStats(s); setHisto(h);
  }, [bandeId, effectif, statsPonte7j, histoPonte]);

  useEffect(() => { charger(); }, [charger]);

  if (bandes.length === 0) {
    return (
      <Content>
        <EmptyState icon="egg-outline" title="Aucune bande de volailles"
          message="Créez une bande pour suivre la ponte, l'alimentation et la mortalité."
          actionLabel="Créer une bande" onAction={() => setForm('bande')} />
        <BandeForm visible={form === 'bande'} onClose={() => setForm(null)} onCreate={ajouterBande} toast={toast} />
      </Content>
    );
  }

  const espece = bandActive ? ESPECES_VOLAILLES[bandActive.espece_id] : null;
  const age = ageSemaines(bandActive);
  const alerte = espece ? alerteFinCycle(espece, age) : null;
  const tauxMort = bandActive && bandActive.effectif_initial > 0
    ? (1 - bandActive.effectif_actuel / bandActive.effectif_initial) * 100 : 0;

  const enregistrer = (fn, message) => async (vals) => {
    const res = await fn(vals);
    if (!res.success) return { error: res.error || "Enregistrement impossible." };
    toast.success(message);
    charger();
    return null;
  };

  return (
    <Content>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: c.text }]} numberOfLines={1}>{bandActive?.nom}</Text>
            <Text style={[type.caption, { color: c.textMuted }]}>
              {espece?.nom} · {formatNombre(effectif)} animaux · semaine {age}
            </Text>
          </View>
          <IconButton icon="add-circle-outline" tone="primary" label="Nouvelle bande" onPress={() => setForm('bande')} />
        </Row>
      </Card>

      <ChipRow options={SECTIONS} value={section} onChange={setSection} />

      {alerte?.active ? <Banner tone={alerte.urgence === 'fin' ? 'danger' : 'warning'} text={alerte.msg} /> : null}

      {!stats && (section === 'ponte' || section === 'aliment') ? <LoadingState label="Chargement des statistiques…" /> : null}

      {section === 'ponte' && stats ? (
        <>
          <Card>
            <Text style={[type.label, { color: c.textMuted }]}>7 DERNIERS JOURS</Text>
            <Row gap={space.lg} style={{ marginTop: space.sm }}>
              <Stat label="Œufs" value={formatNombre(stats.totalOeufs)} />
              <Stat label="Moyenne/jour" value={formatNombre(stats.moyJour, 1)} />
              <Stat label="Taux de ponte" value={`${formatNombre(stats.tauxPonte, 1)} %`} tone={stats.tauxPonte >= 75 ? 'success' : 'warning'} />
            </Row>
            <View style={{ marginTop: space.md }}><ProgressBar value={stats.tauxPonte} tone={stats.tauxPonte >= 75 ? 'success' : 'warning'} /></View>
          </Card>
          <Button label="Saisir la ponte du jour" icon="add-circle-outline" onPress={() => setForm('ponte')} />
          <Section title="Historique (14 derniers relevés)" />
          {histo.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Aucun relevé" message="Saisissez la ponte du jour pour suivre l'évolution." />
          ) : (
            <Card>
              {histo.map((p, i) => {
                const tx = effectif > 0 ? Math.min(100, (p.nb_oeufs / effectif) * 100) : 0;
                return (
                  <View key={p.id}>
                    {i > 0 ? <Divider /> : null}
                    <ListItem title={formatDateFR(p.date)}
                      subtitle={p.nb_oeufs_casses > 0 ? `${p.nb_oeufs_casses} cassé(s) ou sale(s)` : undefined}
                      right={(
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[type.heading, type.numeric, { color: c.text }]}>{formatNombre(p.nb_oeufs)} œufs</Text>
                          <Text style={[type.caption, { color: tx >= 75 ? c.success : c.warning }]}>{formatNombre(tx, 1)} %</Text>
                        </View>
                      )} />
                  </View>
                );
              })}
            </Card>
          )}
        </>
      ) : null}

      {section === 'aliment' && stats ? (
        <>
          <Card>
            <Text style={[type.label, { color: c.textMuted }]}>INDICE DE CONSOMMATION · 7 JOURS</Text>
            <Text style={[type.display, type.numeric, { color: c.text, marginTop: space.sm }]}>{stats.ic !== null ? formatNombre(stats.ic, 2) : '—'}</Text>
            <Text style={[type.caption, { color: c.textSub }]}>kg d'aliment par douzaine d'œufs</Text>
            <View style={{ marginTop: space.sm }}>
              {stats.ic === null
                ? <Pill label="Saisissez l'aliment consommé et la ponte" />
                : <Pill label={stats.ic < 2.5 ? 'Excellent' : stats.ic < 3.5 ? 'Moyen' : 'À améliorer'} tone={stats.ic < 2.5 ? 'success' : stats.ic < 3.5 ? 'warning' : 'danger'} />}
            </View>
            <KeyValue label="Aliment distribué (7 j)" value={`${formatNombre(stats.kgAlim, 1)} kg`} />
          </Card>
          <Button label="Saisir la consommation d'aliment" icon="add-circle-outline" onPress={() => setForm('aliment')} />
          <Section title="Repères pour pondeuses" />
          <Card>
            {REFERENCE_IC.map(([v, l, t], i) => (
              <View key={v}>{i > 0 ? <Divider /> : null}<ListItem title={`${v} kg/douzaine`} right={<Pill label={l} tone={t} />} /></View>
            ))}
          </Card>
        </>
      ) : null}

      {section === 'mortalite' ? (
        <>
          <Card>
            <Row gap={space.lg}>
              <Stat label="Effectif initial" value={formatNombre(bandActive.effectif_initial)} />
              <Stat label="Actuel" value={formatNombre(bandActive.effectif_actuel)} tone="success" />
              <Stat label="Pertes" value={formatNombre(bandActive.effectif_initial - bandActive.effectif_actuel)} tone="danger" />
            </Row>
            <View style={{ marginTop: space.md }}>
              <ProgressBar value={bandActive.effectif_actuel} max={Math.max(1, bandActive.effectif_initial)} tone="success" />
            </View>
            <Text style={[type.caption, { color: c.textSub, marginTop: space.sm }]}>Taux de mortalité : {formatNombre(tauxMort, 1)} %</Text>
          </Card>
          <Button label="Saisir une mortalité" icon="add-circle-outline" variant="dangerOutline" onPress={() => setForm('mortalite')} />
        </>
      ) : null}

      {section === 'bandes' ? (
        <>
          {bandes.map((b) => {
            const sel = b.id === bandeId;
            return (
              <Card key={b.id} style={sel ? { borderColor: c.primary, borderWidth: 2 } : null}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.heading, { color: c.text }]}>{b.nom}</Text>
                    <Text style={[type.caption, { color: c.textMuted }]}>
                      {ESPECES_VOLAILLES[b.espece_id]?.nom} · {formatNombre(b.effectif_actuel)} animaux · semaine {ageSemaines(b)}
                    </Text>
                    <Text style={[type.caption, { color: c.textMuted }]}>Mise en place le {formatDateFR(b.date_mise_en_place)}</Text>
                  </View>
                  <Pill label={b.statut === 'active' ? 'Active' : 'Terminée'} tone={b.statut === 'active' ? 'success' : 'neutral'} />
                </Row>
                <Row gap={space.sm} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
                  {!sel ? <Button label="Sélectionner" size="sm" onPress={() => setBandeActive(b)} /> : <Pill label="Sélectionnée" tone="primary" />}
                  <Button size="sm" variant="secondary" label={b.statut === 'active' ? 'Terminer' : 'Réactiver'}
                    onPress={async () => {
                      const r = await majBande(b.id, { statut: b.statut === 'active' ? 'terminee' : 'active' });
                      if (!r.success) toast.error("Modification impossible."); else toast.success('Bande mise à jour.');
                    }} />
                  <Button size="sm" variant="dangerOutline" label="Supprimer"
                    onPress={async () => {
                      const ok = await confirm({
                        title: `Supprimer « ${b.nom} » ?`, destructive: true, confirmLabel: 'Supprimer',
                        message: 'La bande et tout son historique (ponte, aliment, mortalité) seront effacés définitivement.',
                      });
                      if (!ok) return;
                      const r = await supprimerBande(b.id);
                      if (r.success) toast.success('Bande supprimée.'); else toast.error('Suppression impossible.');
                    }} />
                </Row>
              </Card>
            );
          })}
        </>
      ) : null}

      <BandeForm visible={form === 'bande'} onClose={() => setForm(null)} onCreate={ajouterBande} toast={toast} />

      <FormSheet visible={form === 'ponte'} onClose={() => setForm(null)} title="Ponte du jour" submitLabel="Enregistrer"
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
          { name: 'nb_oeufs', label: "Œufs ramassés", type: 'integer', required: true, max: 100000 },
          { name: 'nb_oeufs_casses', label: 'Cassés ou sales', type: 'integer', max: 100000, default: '0' },
          { name: 'temperature', label: 'Température (°C)', type: 'number', half: true, max: 70 },
          { name: 'humidite', label: 'Humidité (%)', type: 'number', half: true, max: 100 },
        ]}
        check={(v) => {
          const e = {};
          if (v.nb_oeufs > effectif) e.nb_oeufs = `Plus d'œufs que d'animaux (${effectif}). Vérifiez la saisie.`;
          if ((v.nb_oeufs_casses || 0) > (v.nb_oeufs || 0)) e.nb_oeufs_casses = "Ne peut pas dépasser le nombre d'œufs ramassés.";
          return e;
        }}
        onSubmit={enregistrer((v) => saisirPonte(bandeId, {
          date: v.date, nb_oeufs: v.nb_oeufs, nb_oeufs_casses: v.nb_oeufs_casses || 0,
          temperature_manuelle: v.temperature, humidite_manuelle: v.humidite,
        }), 'Ponte enregistrée.')} />

      <FormSheet visible={form === 'aliment'} onClose={() => setForm(null)} title="Consommation d'aliment"
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
          { name: 'quantite', label: 'Quantité consommée (kg)', type: 'number', required: true, positive: true, max: 5000 },
          { name: 'cout', label: 'Coût unitaire (FCFA/kg)', type: 'number', max: 100000 },
        ]}
        onSubmit={enregistrer((v) => saisirAliment(bandeId, { date: v.date, quantite_kg: v.quantite, cout_unitaire: v.cout || 0 }), 'Consommation enregistrée.')} />

      <FormSheet visible={form === 'mortalite'} onClose={() => setForm(null)} title="Mortalité" variant="danger"
        fields={[
          { name: 'nb', label: 'Nombre de morts', type: 'stepper', min: 1, max: Math.max(1, effectif || 1), default: 1 },
          { name: 'cause', label: 'Cause supposée', type: 'text', placeholder: 'Ex. maladie respiratoire' },
        ]}
        onSubmit={enregistrer((v) => saisirMortalite(bandeId, v.nb, v.cause || 'inconnue', effectif), 'Mortalité enregistrée.')} />
    </Content>
  );
}

function BandeForm({ visible, onClose, onCreate, toast }) {
  return (
    <FormSheet visible={visible} onClose={onClose} title="Nouvelle bande" submitLabel="Créer la bande"
      fields={[
        { name: 'nom', label: 'Nom de la bande', type: 'text', required: true, maxLen: 60, placeholder: 'Ex. Lohmann avril' },
        { name: 'espece', label: 'Espèce', type: 'select', options: OPTIONS_ESPECES, default: 'lohmann' },
        { name: 'effectif', label: "Effectif initial", type: 'integer', required: true, positive: true, max: 100000, default: '100' },
        { name: 'age', label: "Âge à la mise en place (semaines)", type: 'stepper', min: 0, max: 200, default: 0 },
        { name: 'date', label: 'Date de mise en place', type: 'date', required: true, futur: false, default: todayStr },
      ]}
      onSubmit={async (v) => {
        const res = await onCreate({
          nom: v.nom, espece_id: v.espece, effectif_initial: v.effectif, effectif_actuel: v.effectif,
          date_mise_en_place: v.date, semaine_age: v.age, statut: 'active',
        });
        if (!res.success) return { error: res.error || 'Création impossible.' };
        try { await genererCalendrierBande(res.id, v.date, v.espece); } catch { /* le calendrier peut être régénéré */ }
        toast.success('Bande créée avec son calendrier sanitaire.');
        return null;
      }}
    />
  );
}
