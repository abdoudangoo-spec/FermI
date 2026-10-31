import { useMemo } from 'react';
import { View, Text, Switch } from 'react-native';
import { router } from 'expo-router';
import { useBandStore } from '../../store/bandStore';
import { useAppStore } from '../../store/appStore';
import { usePiConnection } from '../../hooks/usePiConnection';
import { ESPECES_VOLAILLES } from '../../constants/especes';
import { ageSemaines } from '../../engine/aviculture';
import { Content, Card, Section, Stat, Pill, Button, Banner, ListItem, ProgressBar, Divider, Row, KeyValue, Icon } from '../../components/ui';
import { EmptyState, LoadingState, ErrorState } from '../../components/states';
import { useToast, useConfirm } from '../../components/feedback';
import { formatNombre, sansEmoji } from '../../utils/format';
import { useTheme, toneColors, space, radius, type } from '../../theme';

const NOMS_ACTIONNEURS = {
  ventil: 'Ventilation', brumisateur: 'Brumisation', clim: 'Climatisation', chauffage: 'Chauffage',
  humidif: 'Humidificateur', lampe: 'Éclairage', eau: 'Abreuvoir', distributeur: 'Distributeur d\'aliment',
  acaricide: 'Traitement acaricide', alarme: 'Alarme',
};

function etat(valeur, min, max) {
  if (valeur === null || valeur === undefined) return 'neutral';
  if (valeur >= min && valeur <= max) return 'success';
  if (valeur < min * 0.8 || valeur > max * 1.15) return 'danger';
  return 'warning';
}

function Mesure({ label, valeur, unite, tone, repere }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ width: '48%', backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: space.md, borderLeftWidth: 4, borderLeftColor: t.fg }}>
      <Text style={[type.caption, { color: c.textMuted }]}>{label}</Text>
      <Text style={[type.title, type.numeric, { color: c.text, marginTop: 2 }]}>{valeur}<Text style={[type.caption, { color: c.textMuted }]}> {unite}</Text></Text>
      {repere ? <Text style={[type.caption, { color: c.textMuted }]}>{repere}</Text> : null}
    </View>
  );
}

export default function Surveillance() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const bandActive = useBandStore((s) => s.bandActive);
  const config = useAppStore((s) => s.config);

  const bande = useMemo(() => (bandActive ? {
    id: bandActive.id, espece_id: bandActive.espece_id, effectif_actuel: bandActive.effectif_actuel,
    semaine_age: ageSemaines(bandActive), zone_id: config?.zone_id, apiUrl: config?.api_url,
  } : null), [bandActive, config?.zone_id, config?.api_url]);

  const { sensors, result, mode, piReachable, lastUpdate, loading, erreur, refresh, commander, commanderTout, configure } = usePiConnection(bande);
  const espece = bandActive ? ESPECES_VOLAILLES[bandActive.espece_id] : null;

  if (!bandActive || !espece) {
    return (
      <Content>
        <EmptyState icon="hardware-chip-outline" title="Aucune bande à surveiller" message="Créez une bande de volailles dans l'onglet Volailles pour suivre les conditions du poulailler."
          actionLabel="Aller aux volailles" onAction={() => router.replace('/(tabs)/elevage')} />
      </Content>
    );
  }
  if (loading && !sensors) return <LoadingState label="Lecture des capteurs…" />;
  if (erreur && !sensors) return <ErrorState message={erreur} onRetry={refresh} />;
  if (!sensors || !result) return <LoadingState label="Lecture des capteurs…" />;

  const heure = lastUpdate ? `${String(lastUpdate.getHours()).padStart(2, '0')}:${String(lastUpdate.getMinutes()).padStart(2, '0')}` : '';
  const eauParAnimal = bandActive.effectif_actuel > 0 ? Math.round((sensors.eauConsommee_ml || 0) / bandActive.effectif_actuel) : 0;
  const stressTone = { none: 'success', mild: 'success', moderate: 'warning', severe: 'danger', danger: 'danger' }[result.stress.niveau] || 'neutral';
  const peutCommander = mode === 'live' && piReachable;

  const envoyer = async (cle, valeur) => {
    const a = result.actionneurs[cle];
    const ok = await confirm({
      title: `${valeur ? 'Activer' : 'Couper'} : ${NOMS_ACTIONNEURS[cle]}`,
      message: 'La commande sera envoyée immédiatement à votre contrôleur.',
      confirmLabel: 'Envoyer',
    });
    if (!ok) return;
    const r = await commander(cle, valeur, a.protocole);
    if (r.succes) toast.success('Commande envoyée.'); else toast.error('Le contrôleur n’a pas confirmé la commande.');
  };

  const toutAppliquer = async () => {
    const ok = await confirm({
      title: 'Appliquer les recommandations ?',
      message: 'Toutes les commandes recommandées seront envoyées au contrôleur.', confirmLabel: 'Appliquer',
    });
    if (!ok) return;
    const commandes = Object.entries(result.actionneurs).filter(([k]) => !k.startsWith('_')).map(([k, a]) => ({ actionneur: k, valeur: a.pct ?? a.on, protocole: a.protocole }));
    const r = await commanderTout(commandes);
    if (r.succes) toast.success('Recommandations appliquées.'); else toast.error('Le contrôleur n’a pas confirmé les commandes.');
  };

  return (
    <Content onRefresh={refresh} refreshing={loading}>
      {mode === 'demo' ? (
        <Banner tone="warning"
          text={configure ? 'Contrôleur injoignable : les valeurs affichées sont simulées (démonstration).' : "Mode démonstration : aucune mesure réelle. Les valeurs affichées sont simulées."}
          action="Configurer le contrôleur" onAction={() => router.push('/(tabs)/parametres')} />
      ) : null}
      {mode === 'cache' ? <Banner tone="info" text={`Contrôleur injoignable. Dernières mesures réelles (${heure}).`} /> : null}
      {mode === 'live' ? <Row><Pill icon="wifi" tone="success" label={`Mesures réelles · ${heure}`} /></Row> : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.label, { color: c.textMuted }]}>CONFORT THERMIQUE (THI)</Text>
            <Text style={[type.display, type.numeric, { color: toneColors(c, stressTone).fg }]}>{formatNombre(result.thi, 1)}</Text>
          </View>
          <Pill label={sansEmoji(result.stress.label)} tone={stressTone} />
        </Row>
        <View style={{ marginTop: space.md, gap: 6 }}>
          <Text style={[type.caption, { color: c.textSub }]}>Score global des conditions : {result.score.global} / 100</Text>
          <ProgressBar value={result.score.global} tone={result.score.global >= 75 ? 'success' : result.score.global >= 50 ? 'warning' : 'danger'} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' }}>
        <Mesure label="Température" valeur={formatNombre(sensors.temperature, 1)} unite="°C" tone={etat(sensors.temperature, espece.tempOptMin, espece.tempOptMax)} repere={`Idéal ${espece.tempOptMin}–${espece.tempOptMax} °C`} />
        <Mesure label="Humidité" valeur={formatNombre(sensors.humidite)} unite="%" tone={etat(sensors.humidite, 40, 70)} repere="Idéal 40–70 %" />
        <Mesure label="CO₂" valeur={formatNombre(sensors.co2_ppm)} unite="ppm" tone={etat(sensors.co2_ppm, 0, 2500)} repere="Maximum 2 500 ppm" />
        <Mesure label="Aliment restant" valeur={formatNombre(sensors.nourriturePct)} unite="%" tone={etat(sensors.nourriturePct, 20, 100)} />
        <Mesure label="Eau / animal" valeur={formatNombre(eauParAnimal)} unite="ml" tone={etat(eauParAnimal, 180, 1000)} />
        <Mesure label="pH de l'eau" valeur={sensors.phEau !== undefined ? formatNombre(sensors.phEau, 1) : '—'} unite="" tone={sensors.phEau !== undefined ? etat(sensors.phEau, 6.5, 7.5) : 'neutral'} repere="Idéal 6,5–7,5" />
      </View>

      {result.alertes.length > 0 ? (
        <>
          <Section title="Alertes" />
          {result.alertes.map((a) => (
            <Banner key={a.message} tone={a.niveau === 'ATTENTION' ? 'warning' : 'danger'} text={`${sansEmoji(a.message)} — ${sansEmoji(a.action)}`} />
          ))}
        </>
      ) : null}

      <Section title="Actionneurs recommandés" />
      <Card>
        {Object.entries(result.actionneurs).filter(([k]) => !k.startsWith('_')).map(([k, a], i) => (
          <View key={k}>
            {i > 0 ? <Divider /> : null}
            <ListItem
              icon={a.on ? 'flash' : 'flash-off-outline'} tone={a.on ? 'primary' : 'neutral'}
              title={NOMS_ACTIONNEURS[k] || k}
              subtitle={a.on ? (a.pct !== null && a.pct !== undefined ? `Recommandé : actif à ${a.pct} %` : 'Recommandé : actif') : 'Recommandé : arrêt'}
              right={peutCommander ? (
                <Switch value={!!a.on} onValueChange={(v) => envoyer(k, v)} trackColor={{ true: c.primary, false: c.border }} accessibilityLabel={`Commander ${NOMS_ACTIONNEURS[k] || k}`} />
              ) : null}
            />
          </View>
        ))}
      </Card>
      {peutCommander ? <Button label="Appliquer toutes les recommandations" icon="flash" variant="secondary" onPress={toutAppliquer} /> : (
        <Text style={[type.caption, { color: c.textMuted }]}>Les commandes ne sont possibles qu'avec un contrôleur connecté. Ces valeurs sont des recommandations calculées.</Text>
      )}

      {result.ration ? (
        <>
          <Section title="Ration du jour" />
          <Card>
            <Row gap={space.lg}>
              <Stat label="Aliment total" value={formatNombre(result.ration.troupeau.totalRation_kg, 1)} unit="kg" />
              <Stat label="Eau totale" value={formatNombre(result.ration.troupeau.totalEau_L)} unit="L" />
            </Row>
            <KeyValue label="Par animal" value={`${result.ration.parAnimal.ration_g} g · ${result.ration.parAnimal.eau_ml} ml`} />
            {result.ration.distribution.map((d) => (
              <KeyValue key={d.heure} label={`${d.heure} · ${sansEmoji(d.label)}`} value={`${formatNombre(d.g)} g`} />
            ))}
            {result.ration.corrections.map((x) => (
              <Row key={x} gap={6} style={{ marginTop: 4 }}>
                <Icon name="information-circle-outline" size={16} color={c.textMuted} />
                <Text style={[type.caption, { color: c.textSub, flex: 1 }]}>{sansEmoji(x)}</Text>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {result.tauxPonte ? (
        <Card>
          <Text style={[type.label, { color: c.textMuted }]}>PONTE ESTIMÉE SELON LES CONDITIONS</Text>
          <Row gap={space.lg} style={{ marginTop: space.sm }}>
            <Stat label="Taux estimé" value={`${formatNombre(result.tauxPonte.taux)} %`} />
            <Stat label="Phase" value={result.tauxPonte.phase} />
          </Row>
        </Card>
      ) : null}
    </Content>
  );
}
