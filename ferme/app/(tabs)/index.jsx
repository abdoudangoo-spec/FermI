import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { useBandStore } from '../../src/store/bandStore';
import { useRuminantStore } from '../../src/store/ruminantStore';
import { useFinanceStore } from '../../src/store/financeStore';
import { useAuthStore } from '../../src/store/authStore';
import { ZONES, ESPECES_VOLAILLES } from '../../src/constants/especes';
import { Screen, Card, Section, Stat, Pill, ListItem, IconButton, Banner, Divider, Row } from '../../src/components/ui';
import { EmptyState } from '../../src/components/states';
import { compterEnAttente, isConnected, syncerDonnees } from '../../src/sync/syncManager';
import { formatNombre, formatSigne } from '../../src/utils/format';
import { formatDateFR, formatMoisAnnee, todayStr } from '../../src/utils/dates';
import { useTheme, space, type } from '../../src/theme';

function EtatSauvegarde() {
  const connecte = useAuthStore((s) => s.isConnecte);
  const [etat, setEtat] = useState({ n: 0, reseau: true });
  const rafraichir = useCallback(async () => {
    try { setEtat({ n: await compterEnAttente(), reseau: await isConnected() }); } catch { /* indicateur facultatif */ }
  }, []);
  useEffect(() => { rafraichir(); const t = setInterval(rafraichir, 20000); return () => clearInterval(t); }, [rafraichir]);
  if (!connecte) return null;
  const ok = etat.n === 0;
  return (
    <Pill
      icon={ok ? 'cloud-done-outline' : etat.reseau ? 'cloud-upload-outline' : 'cloud-offline-outline'}
      tone={ok ? 'success' : 'warning'}
      label={ok ? 'Sauvegardé' : etat.reseau ? `${etat.n} à envoyer` : 'Hors ligne'}
    />
  );
}

export default function Accueil() {
  const { c } = useTheme();
  const config = useAppStore((s) => s.config);
  const alertes = useAppStore((s) => s.alertesSante);
  const init = useAppStore((s) => s.init);
  const bandes = useBandStore((s) => s.bandes);
  const loadBandes = useBandStore((s) => s.loadBandes);
  const troupeaux = useRuminantStore((s) => s.troupeaux);
  const loadTroupeaux = useRuminantStore((s) => s.loadTroupeaux);
  const totaux = useFinanceStore((s) => s.totauxMois);
  const loadFinance = useFinanceStore((s) => s.loadMoisCourant);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(async () => {
    await Promise.all([init(), loadBandes(), loadTroupeaux(), loadFinance()]);
  }, [init, loadBandes, loadTroupeaux, loadFinance]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const onRefresh = async () => {
    setRefreshing(true);
    await syncerDonnees({ force: true }).catch(() => null);
    await charger();
    setRefreshing(false);
  };

  const zone = ZONES[config?.zone_id] || ZONES.soudano_guineenne;
  const actives = bandes.filter((b) => b.statut === 'active');
  const totalVolailles = actives.reduce((s, b) => s + (b.effectif_actuel || 0), 0);
  const totalRuminants = troupeaux.reduce((s, t) => s + (t.effectif_total || 0), 0);
  const vide = actives.length === 0 && troupeaux.length === 0;
  const retards = alertes.filter((a) => a.enRetard).length;

  return (
    <Screen
      title={config?.nom || 'Ma ferme'}
      subtitle={`${zone.nom} · ${formatDateFR(todayStr())}`}
      onRefresh={onRefresh}
      refreshing={refreshing}
      right={<IconButton icon="settings-outline" label="Paramètres" onPress={() => router.push('/(tabs)/parametres')} />}
    >
      <EtatSauvegarde />
      {alertes.length > 0 ? (
        <Banner
          tone={retards > 0 ? 'danger' : 'warning'}
          text={retards > 0 ? `${retards} acte(s) sanitaire(s) en retard` : `${alertes.length} acte(s) sanitaire(s) à faire cette semaine`}
          action="Voir la santé" onAction={() => router.push('/(tabs)/sante')}
        />
      ) : null}

      {vide ? (
        <Card>
          <EmptyState icon="paw-outline" title="Bienvenue dans FermI"
            message="Créez votre première bande de volailles ou votre premier troupeau pour commencer le suivi."
            actionLabel="Commencer" onAction={() => router.push('/(tabs)/elevage')} />
        </Card>
      ) : (
        <>
          <Section title="Cheptel" />
          <Card>
            <Row gap={space.lg}>
              <Stat label="Volailles" value={formatNombre(totalVolailles)} />
              <Stat label="Ruminants" value={formatNombre(totalRuminants)} />
            </Row>
            <Text style={[type.caption, { color: c.textMuted, marginTop: space.sm }]}>
              {actives.length} bande(s) active(s) · {troupeaux.length} troupeau(x)
            </Text>
          </Card>
        </>
      )}

      <Section title={`Finances · ${formatMoisAnnee()}`} action="Détails" onAction={() => router.push('/(tabs)/finance')} />
      <Card>
        <Row gap={space.lg}>
          <Stat label="Dépenses" value={formatNombre(totaux.depenses)} unit="FCFA" tone="danger" />
          <Stat label="Recettes" value={formatNombre(totaux.recettes)} unit="FCFA" tone="success" />
        </Row>
        <View style={{ height: space.md }} />
        <Divider />
        <View style={{ marginTop: space.md }}>
          <Stat label="Résultat du mois" value={formatSigne(totaux.benefice)} unit="FCFA" tone={totaux.benefice >= 0 ? 'success' : 'danger'} />
        </View>
      </Card>

      {actives.length > 0 ? (
        <>
          <Section title="Bandes actives" action="Gérer" onAction={() => router.push('/(tabs)/elevage')} />
          <Card>
            {actives.slice(0, 3).map((b, i) => (
              <View key={b.id}>
                {i > 0 ? <Divider /> : null}
                <ListItem icon="egg-outline" title={b.nom}
                  subtitle={`${ESPECES_VOLAILLES[b.espece_id]?.nom || b.espece_id} · ${formatNombre(b.effectif_actuel)} animaux · semaine ${b.semaine_age}`} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {alertes.length > 0 ? (
        <>
          <Section title="Prochains actes sanitaires" action="Tout voir" onAction={() => router.push('/(tabs)/sante')} />
          <Card>
            {alertes.slice(0, 3).map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <Divider /> : null}
                <ListItem icon={a.enRetard ? 'alert-circle-outline' : 'calendar-outline'} tone={a.enRetard ? 'danger' : 'warning'} title={a.nom}
                  subtitle={a.enRetard ? `En retard de ${Math.abs(a.joursRestants)} j` : a.joursRestants === 0 ? "Aujourd'hui" : `Dans ${a.joursRestants} j`} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Section title="Ressources" />
      <Card>
        <ListItem icon="book-outline" title="Guides de construction" subtitle="Matériel d'élevage à fabriquer soi-même" onPress={() => router.push('/(tabs)/guides')} />
      </Card>
    </Screen>
  );
}
