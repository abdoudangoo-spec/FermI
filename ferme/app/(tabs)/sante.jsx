import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { useBandStore } from '../../src/store/bandStore';
import { query, insert, remove } from '../../src/db/database';
import { alertesSanitaires, marquerAccompli, enregistrerVideSanitaire } from '../../src/engine/sante';
import { Screen, Tabs, Content, Card, Button, Banner, ListItem, Pill, Divider, Row } from '../../src/components/ui';
import { EmptyState, LoadingState, ErrorState } from '../../src/components/states';
import { FormSheet } from '../../src/components/FormSheet';
import { useToast, useConfirm } from '../../src/components/feedback';
import { formatDateFR, todayStr } from '../../src/utils/dates';
import { space } from '../../src/theme';

const ONGLETS = [
  { id: 'alertes', label: 'À faire' },
  { id: 'calendrier', label: 'Calendrier' },
  { id: 'hygiene', label: 'Hygiène' },
  { id: 'visiteurs', label: 'Visiteurs' },
];
const TYPES_ACTE = [
  { value: 'nettoyage', label: 'Nettoyage' },
  { value: 'desinfection', label: 'Désinfection' },
  { value: 'depoussierage', label: 'Dépoussiérage' },
  { value: 'deratisation', label: 'Dératisation' },
  { value: 'insecticide', label: 'Traitement insecticide' },
];
const LIBELLE_ACTE = Object.fromEntries([...TYPES_ACTE, { value: 'vide_sanitaire', label: 'Vide sanitaire' }].map((t) => [t.value, t.label]));
const LIBELLE_TYPE = { vaccin: 'Vaccin', traitement: 'Traitement', vermifuge: 'Vermifuge', controle: 'Contrôle' };

export default function Sante() {
  const toast = useToast();
  const confirm = useConfirm();
  const initApp = useAppStore((s) => s.init);
  const bandes = useBandStore((s) => s.bandes);

  const [tab, setTab] = useState('alertes');
  const [etat, setEtat] = useState('loading'); // loading | ready | error
  const [data, setData] = useState({ alertes: [], calendrier: [], hygiene: [], visiteurs: [] });
  const [form, setForm] = useState(null);

  const charger = useCallback(async () => {
    try {
      const [alertes, calendrier, hygiene, visiteurs] = await Promise.all([
        alertesSanitaires(),
        query('SELECT * FROM calendrier_sanitaire ORDER BY prochain_acte ASC LIMIT 100', []),
        query('SELECT * FROM registre_hygiene ORDER BY date DESC, id DESC LIMIT 30', []),
        query('SELECT * FROM visiteurs ORDER BY date DESC, id DESC LIMIT 30', []),
      ]);
      setData({ alertes, calendrier, hygiene, visiteurs });
      setEtat('ready');
    } catch {
      setEtat('error');
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const accomplir = async (a) => {
    const ok = await confirm({ title: 'Acte réalisé ?', message: `« ${a.nom} » sera marqué comme fait aujourd'hui${a.periodicite_jours ? ' et reprogrammé automatiquement' : ''}.`, confirmLabel: 'Confirmer' });
    if (!ok) return;
    try {
      await marquerAccompli(a.id, todayStr());
      await charger();
      await initApp();
      toast.success('Acte enregistré.');
    } catch { toast.error('Enregistrement impossible.'); }
  };

  const supprimerVisiteur = async (v) => {
    const ok = await confirm({ title: 'Supprimer cette visite ?', message: 'La ligne sera effacée du registre.', destructive: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try { await remove('visiteurs', v.id); await charger(); toast.success('Visite supprimée.'); } catch { toast.error('Suppression impossible.'); }
  };

  const enregistrer = (fn, message) => async (v) => {
    try { await fn(v); } catch { return { error: 'Enregistrement impossible.' }; }
    toast.success(message);
    charger();
    return null;
  };

  const optionsBandes = [{ value: 'Général', label: 'Tout le site' }, ...bandes.map((b) => ({ value: String(b.id), label: b.nom }))];

  return (
    <Screen title="Santé" scroll={false} below={<Tabs tabs={ONGLETS} active={tab} onSelect={setTab} />}>
      {etat === 'loading' ? <LoadingState label="Chargement du suivi sanitaire…" /> : null}
      {etat === 'error' ? <ErrorState message="Le suivi sanitaire n'a pas pu être lu." onRetry={() => { setEtat('loading'); charger(); }} /> : null}
      {etat === 'ready' ? (
        <Content onRefresh={charger}>
          {tab === 'alertes' ? (
            data.alertes.length === 0 ? (
              <EmptyState icon="shield-checkmark-outline" title="Rien à faire cette semaine" message="Les vaccins et traitements à venir apparaîtront ici dès qu'ils approchent." />
            ) : (
              <Card>
                {data.alertes.map((a, i) => (
                  <View key={a.id}>
                    {i > 0 ? <Divider /> : null}
                    <ListItem icon={a.enRetard ? 'alert-circle-outline' : 'calendar-outline'} tone={a.enRetard ? 'danger' : 'warning'}
                      title={a.nom}
                      subtitle={`${formatDateFR(a.prochain_acte)} · ${a.enRetard ? `en retard de ${Math.abs(a.joursRestants)} j` : a.joursRestants === 0 ? "aujourd'hui" : `dans ${a.joursRestants} j`}`}
                      right={<Button label="Fait" size="sm" onPress={() => accomplir(a)} />} />
                  </View>
                ))}
              </Card>
            )
          ) : null}

          {tab === 'calendrier' ? (
            data.calendrier.length === 0 ? (
              <EmptyState icon="calendar-outline" title="Calendrier vide" message="Le calendrier sanitaire est créé automatiquement à la création d'une bande ou d'un troupeau." />
            ) : (
              <Card>
                {data.calendrier.map((e, i) => (
                  <View key={e.id}>
                    {i > 0 ? <Divider /> : null}
                    <ListItem title={e.nom}
                      subtitle={`${LIBELLE_TYPE[e.type] || e.type} · ${e.prochain_acte ? formatDateFR(e.prochain_acte) : 'sans date'}${e.dernier_acte ? ` · dernier : ${formatDateFR(e.dernier_acte)}` : ''}`}
                      right={<Pill label={e.statut === 'fait' ? 'Fait' : e.prochain_acte && e.prochain_acte < todayStr() ? 'En retard' : 'À faire'} tone={e.statut === 'fait' ? 'success' : e.prochain_acte && e.prochain_acte < todayStr() ? 'danger' : 'warning'} />} />
                  </View>
                ))}
              </Card>
            )
          ) : null}

          {tab === 'hygiene' ? (
            <>
              <Row gap={space.sm}>
                <Button label="Acte d'hygiène" icon="add" onPress={() => setForm('hygiene')} style={{ flex: 1 }} />
                <Button label="Vide sanitaire" variant="secondary" onPress={() => setForm('vide')} style={{ flex: 1 }} />
              </Row>
              {data.hygiene.length === 0 ? (
                <EmptyState icon="sparkles-outline" title="Registre d'hygiène vide" message="Notez vos nettoyages, désinfections et vides sanitaires pour la traçabilité." />
              ) : (
                <Card>
                  {data.hygiene.map((h, i) => (
                    <View key={h.id}>
                      {i > 0 ? <Divider /> : null}
                      <ListItem title={LIBELLE_ACTE[h.type_acte] || h.type_acte}
                        subtitle={[formatDateFR(h.date), h.zone, h.produit_utilise].filter(Boolean).join(' · ')} />
                    </View>
                  ))}
                </Card>
              )}
            </>
          ) : null}

          {tab === 'visiteurs' ? (
            <>
              <Banner tone="info" text="Le registre des visiteurs contient des noms de personnes : ne saisissez que le nécessaire et supprimez les lignes devenues inutiles." />
              <Button label="Enregistrer un visiteur" icon="add" onPress={() => setForm('visiteur')} />
              {data.visiteurs.length === 0 ? (
                <EmptyState icon="people-outline" title="Aucun visiteur" message="Enregistrez les visites pour assurer la traçabilité sanitaire de votre élevage." />
              ) : (
                <Card>
                  {data.visiteurs.map((v, i) => (
                    <View key={v.id}>
                      {i > 0 ? <Divider /> : null}
                      <ListItem title={v.nom} subtitle={[formatDateFR(v.date), v.motif, v.mesures_prises].filter(Boolean).join(' · ')}
                        right={<Button label="Supprimer" size="sm" variant="ghost" onPress={() => supprimerVisiteur(v)} />} />
                    </View>
                  ))}
                </Card>
              )}
            </>
          ) : null}
        </Content>
      ) : null}

      <FormSheet visible={form === 'hygiene'} onClose={() => setForm(null)} title="Acte d'hygiène"
        fields={[
          { name: 'type', label: "Type d'acte", type: 'select', options: TYPES_ACTE, default: 'nettoyage' },
          { name: 'zone', label: 'Zone traitée', type: 'text', placeholder: 'Ex. poulailler A, perchoirs', maxLen: 80 },
          { name: 'produit', label: 'Produit utilisé', type: 'text', maxLen: 80 },
          { name: 'obs', label: 'Observations', type: 'multiline', maxLen: 500 },
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
        ]}
        onSubmit={enregistrer((v) => insert('registre_hygiene', { date: v.date, type_acte: v.type, zone: v.zone, produit_utilise: v.produit, observations: v.obs }), 'Acte enregistré.')} />

      <FormSheet visible={form === 'vide'} onClose={() => setForm(null)} title="Vide sanitaire"
        fields={[
          { name: 'bande', label: 'Concerne', type: 'select', options: optionsBandes, default: 'Général' },
          { name: 'debut', label: 'Début', type: 'date', required: true, default: todayStr },
          { name: 'fin', label: 'Fin prévue', type: 'date', required: true },
          { name: 'notes', label: 'Notes', type: 'text', maxLen: 200 },
        ]}
        check={(v) => (v.fin && v.debut && v.fin < v.debut ? { fin: 'La fin doit être après le début.' } : {})}
        onSubmit={enregistrer((v) => enregistrerVideSanitaire(v.bande, v.debut, v.fin, v.notes), 'Vide sanitaire enregistré.')} />

      <FormSheet visible={form === 'visiteur'} onClose={() => setForm(null)} title="Nouveau visiteur"
        fields={[
          { name: 'nom', label: 'Nom', type: 'text', required: true, maxLen: 80 },
          { name: 'motif', label: 'Motif de la visite', type: 'text', placeholder: 'Ex. vétérinaire, acheteur', maxLen: 120 },
          { name: 'mesures', label: 'Mesures de biosécurité prises', type: 'text', placeholder: 'Ex. bottes fournies, mains désinfectées', maxLen: 160 },
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
        ]}
        onSubmit={enregistrer((v) => insert('visiteurs', { date: v.date, nom: v.nom, motif: v.motif, mesures_prises: v.mesures }), 'Visite enregistrée.')} />
    </Screen>
  );
}
