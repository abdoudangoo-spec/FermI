import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useRuminantStore } from '../../store/ruminantStore';
import { ESPECES_RUMINANTS } from '../../constants/especes';
import { calculerGMQ, calculerRationRuminant, dateSevragePrevue } from '../../engine/ruminants';
import { Content, ChipRow, IconButton, Card, Section, Stat, Pill, Button, Banner, ListItem, Divider, Row, KeyValue } from '../../components/ui';
import { EmptyState, LoadingState } from '../../components/states';
import { FormSheet } from '../../components/FormSheet';
import { useToast } from '../../components/feedback';
import { formatNombre } from '../../utils/format';
import { formatDateFR, todayStr, diffDays } from '../../utils/dates';
import { useTheme, space, type } from '../../theme';

const SECTIONS = [
  { id: 'registre', label: 'Registre' },
  { id: 'naissances', label: 'Naissances' },
  { id: 'pesees', label: 'Pesées' },
  { id: 'lait', label: 'Lait' },
  { id: 'troupeaux', label: 'Troupeaux' },
];
const OPTIONS_ESPECES = Object.values(ESPECES_RUMINANTS).map((e) => ({ value: e.id, label: e.nom }));
const OPTIONS_SEXE = [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }];

export default function Ruminants() {
  const { c } = useTheme();
  const toast = useToast();
  const troupeaux = useRuminantStore((s) => s.troupeaux);
  const troupeau = useRuminantStore((s) => s.troupeauActif);
  const animaux = useRuminantStore((s) => s.animaux);
  const setTroupeauActif = useRuminantStore((s) => s.setTroupeauActif);
  const ajouterTroupeau = useRuminantStore((s) => s.ajouterTroupeau);
  const loadAnimaux = useRuminantStore((s) => s.loadAnimaux);
  const ajouterAnimal = useRuminantStore((s) => s.ajouterAnimal);
  const enregistrerNaissance = useRuminantStore((s) => s.enregistrerNaissance);
  const enregistrerPesee = useRuminantStore((s) => s.enregistrerPesee);
  const getPesees = useRuminantStore((s) => s.getPesees);
  const enregistrerLait = useRuminantStore((s) => s.enregistrerLait);
  const statsLait7j = useRuminantStore((s) => s.statsLait7j);

  const [section, setSection] = useState('registre');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lait, setLait] = useState(null);
  const [peseesParAnimal, setPesees] = useState({});
  const [tick, setTick] = useState(0);
  const monte = useRef(true);
  useEffect(() => () => { monte.current = false; }, []);

  const tid = troupeau?.id;
  const espece = troupeau ? ESPECES_RUMINANTS[troupeau.espece] : null;

  const charger = useCallback(async () => {
    if (!tid) return;
    setLoading(true);
    await loadAnimaux(tid);
    const l = await statsLait7j(tid);
    if (!monte.current) return;
    setLait(l);
    setLoading(false);
  }, [tid, loadAnimaux, statsLait7j]);

  useEffect(() => { charger(); }, [charger]);

  // Pesées des 8 premiers animaux (limite volontaire pour garder l'écran fluide)
  useEffect(() => {
    if (section !== 'pesees' || animaux.length === 0) return;
    let annule = false;
    (async () => {
      const out = {};
      for (const a of animaux.slice(0, 8)) out[a.id] = await getPesees(a.id);
      if (!annule && monte.current) setPesees(out);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, animaux, tick]);

  const troupeauForm = (
    <FormSheet visible={form === 'troupeau'} onClose={() => setForm(null)} title="Nouveau troupeau" submitLabel="Créer le troupeau"
      fields={[
        { name: 'nom', label: 'Nom du troupeau', type: 'text', required: true, maxLen: 60 },
        { name: 'espece', label: 'Espèce', type: 'select', options: OPTIONS_ESPECES, default: 'mouton' },
        { name: 'total', label: "Effectif total", type: 'integer', required: true, positive: true, max: 100000 },
        { name: 'femelles', label: 'Femelles', type: 'integer', half: true, max: 100000, default: '0' },
        { name: 'males', label: 'Mâles', type: 'integer', half: true, max: 100000, default: '0' },
        { name: 'jeunes', label: 'Jeunes', type: 'integer', max: 100000, default: '0' },
      ]}
      check={(v) => ((v.femelles || 0) + (v.males || 0) > v.total
        ? { femelles: 'Femelles + mâles dépassent l\'effectif total.' } : {})}
      onSubmit={async (v) => {
        const id = await ajouterTroupeau({
          nom: v.nom, espece: v.espece, effectif_total: v.total,
          nb_femelles: v.femelles || 0, nb_males: v.males || 0, nb_jeunes: v.jeunes || 0,
        });
        if (!id) return { error: 'Création impossible.' };
        toast.success('Troupeau créé avec son calendrier sanitaire.');
        return null;
      }} />
  );

  if (troupeaux.length === 0) {
    return (
      <Content>
        <EmptyState icon="paw-outline" title="Aucun troupeau" message="Créez un troupeau de moutons ou de chèvres pour tenir le registre, les pesées et la production de lait."
          actionLabel="Créer un troupeau" onAction={() => setForm('troupeau')} />
        {troupeauForm}
      </Content>
    );
  }

  const enregistrer = (fn, message) => async (v) => {
    const r = await fn(v);
    if (!r.success) return { error: r.error || 'Enregistrement impossible.' };
    toast.success(message);
    charger();
    return null;
  };

  const optionsAnimaux = animaux.map((a) => ({ value: a.id, label: `${a.numero}${a.nom ? ` · ${a.nom}` : ''}` }));
  const ration = espece ? calculerRationRuminant(espece, troupeau.effectif_total || 0, 25) : null;
  const sevrageRetard = espece ? animaux.filter((a) => a.date_naissance && diffDays(a.date_naissance, todayStr()) > espece.sevrage_jours + 14).length : 0;

  return (
    <Content>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: c.text }]} numberOfLines={1}>{troupeau?.nom}</Text>
            <Text style={[type.caption, { color: c.textMuted }]}>
              {espece?.nom} · {formatNombre(troupeau?.effectif_total)} têtes · {troupeau?.nb_femelles} F · {troupeau?.nb_males} M · {troupeau?.nb_jeunes} jeunes
            </Text>
          </View>
          <IconButton icon="add-circle-outline" tone="primary" label="Nouveau troupeau" onPress={() => setForm('troupeau')} />
        </Row>
      </Card>

      <ChipRow options={SECTIONS} value={section} onChange={setSection} />
      {sevrageRetard > 0 ? <Banner tone="warning" text={`${sevrageRetard} animal(aux) à sevrer depuis plus de 2 semaines.`} /> : null}
      {loading && animaux.length === 0 ? <LoadingState label="Chargement du troupeau…" /> : null}

      {section === 'registre' ? (
        <>
          <Button label="Ajouter un animal" icon="add-circle-outline" onPress={() => setForm('animal')} />
          {animaux.length === 0 && !loading ? (
            <EmptyState icon="list-outline" title="Registre vide" message="Ajoutez les animaux de ce troupeau avec leur numéro d'identification." />
          ) : (
            <Card>
              {animaux.map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListItem title={`${a.numero}${a.nom ? ` · ${a.nom}` : ''}`}
                    subtitle={`${a.sexe === 'F' ? 'Femelle' : 'Mâle'}${a.race ? ` · ${a.race}` : ''}${a.date_naissance ? ` · né(e) le ${formatDateFR(a.date_naissance)}` : ''}`}
                    right={a.date_naissance && espece ? <Pill label={`Sevrage ${formatDateFR(dateSevragePrevue(a.date_naissance, espece))}`} /> : null} />
                </View>
              ))}
            </Card>
          )}
          {ration ? (
            <>
              <Section title="Ration indicative du troupeau" />
              <Card>
                <KeyValue label="Fourrage / animal / jour" value={`${formatNombre(ration.rationParAnimal_kg, 1)} kg`} />
                <KeyValue label="Eau / animal / jour" value={`${formatNombre(ration.eauParAnimal_L, 1)} L`} />
                <KeyValue label="Total fourrage / jour" value={`${formatNombre(ration.totalRation_kg)} kg`} />
                <KeyValue label="Total eau / jour" value={`${formatNombre(ration.totalEau_L)} L`} />
                <Text style={[type.caption, { color: c.textMuted }]}>Valeurs de référence à 25 °C ; adaptez selon l'état des animaux et l'avis de votre technicien.</Text>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {section === 'naissances' ? (
        <>
          <Button label="Enregistrer une naissance" icon="add-circle-outline" onPress={() => setForm('naissance')} />
          <Card>
            <Text style={[type.body, { color: c.textSub }]}>
              Chaque naissance met à jour automatiquement l'effectif du troupeau (+ jeunes vivants).
              {espece ? ` Gestation : ${espece.gestation_jours} jours · sevrage : ${espece.sevrage_jours} jours.` : ''}
            </Text>
          </Card>
        </>
      ) : null}

      {section === 'pesees' ? (
        <>
          <Button label="Enregistrer une pesée" icon="add-circle-outline" onPress={() => setForm('pesee')} disabled={animaux.length === 0} />
          {animaux.length === 0 ? <Banner tone="info" text="Ajoutez d'abord un animal au registre." /> : null}
          {animaux.slice(0, 8).map((a) => {
            const liste = peseesParAnimal[a.id] || [];
            if (liste.length === 0) return null;
            const gmq = liste.length >= 2 ? calculerGMQ(liste[liste.length - 1].poids_kg, liste[0].poids_kg, Math.max(1, diffDays(liste[liste.length - 1].date, liste[0].date))) : null;
            return (
              <Card key={a.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[type.heading, { color: c.text }]}>{a.numero}{a.nom ? ` · ${a.nom}` : ''}</Text>
                  {gmq !== null ? <Pill label={`GMQ ${formatNombre(gmq)} g/j`} tone={gmq > 100 ? 'success' : 'warning'} /> : null}
                </Row>
                {liste.slice(0, 4).map((p) => (
                  <KeyValue key={p.id} label={formatDateFR(p.date)} value={`${formatNombre(p.poids_kg, 1)} kg`} />
                ))}
              </Card>
            );
          })}
        </>
      ) : null}

      {section === 'lait' ? (
        <>
          {lait ? (
            <Card>
              <Text style={[type.label, { color: c.textMuted }]}>7 DERNIERS JOURS</Text>
              <Row gap={space.lg} style={{ marginTop: space.sm }}>
                <Stat label="Total" value={formatNombre(lait.totalL || 0, 1)} unit="L" />
                <Stat label="Moyenne/jour" value={formatNombre(lait.moyL || 0, 1)} unit="L" />
                <Stat label="Jours saisis" value={String(lait.jours || 0)} />
              </Row>
            </Card>
          ) : null}
          <Button label="Saisir la traite du jour" icon="add-circle-outline" onPress={() => setForm('lait')} />
        </>
      ) : null}

      {section === 'troupeaux' ? (
        troupeaux.map((t) => {
          const sel = t.id === tid;
          return (
            <Card key={t.id} style={sel ? { borderColor: c.primary, borderWidth: 2 } : null}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: c.text }]}>{t.nom}</Text>
                  <Text style={[type.caption, { color: c.textMuted }]}>{ESPECES_RUMINANTS[t.espece]?.nom} · {formatNombre(t.effectif_total)} têtes</Text>
                </View>
                {sel ? <Pill label="Sélectionné" tone="primary" /> : <Button label="Sélectionner" size="sm" onPress={() => setTroupeauActif(t)} />}
              </Row>
            </Card>
          );
        })
      ) : null}

      {troupeauForm}

      <FormSheet visible={form === 'animal'} onClose={() => setForm(null)} title="Nouvel animal"
        fields={[
          { name: 'numero', label: "Numéro d'identification", type: 'text', required: true, maxLen: 30, autoCapitalize: 'characters' },
          { name: 'nom', label: 'Nom', type: 'text', maxLen: 40 },
          { name: 'sexe', label: 'Sexe', type: 'select', options: OPTIONS_SEXE, default: 'F' },
          { name: 'date_naissance', label: 'Date de naissance', type: 'date', futur: false },
          { name: 'race', label: 'Race', type: 'text', maxLen: 40 },
        ]}
        check={(v) => (animaux.some((a) => a.numero.toLowerCase() === v.numero.toLowerCase()) ? { numero: 'Ce numéro existe déjà dans le troupeau.' } : {})}
        onSubmit={enregistrer((v) => ajouterAnimal({
          troupeau_id: tid, numero: v.numero, nom: v.nom, sexe: v.sexe, espece: troupeau.espece,
          race: v.race, date_naissance: v.date_naissance || null,
        }), 'Animal ajouté.')} />

      <FormSheet visible={form === 'naissance'} onClose={() => setForm(null)} title="Naissance"
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
          { name: 'nb', label: 'Nombre de naissances', type: 'stepper', min: 1, max: 6, default: 1 },
          { name: 'vivants', label: 'Nés vivants', type: 'stepper', min: 0, max: 6, default: 1 },
          { name: 'poids', label: 'Poids moyen à la naissance (kg)', type: 'number', max: 20 },
        ]}
        check={(v) => (v.vivants > v.nb ? { vivants: 'Ne peut pas dépasser le nombre de naissances.' } : {})}
        onSubmit={enregistrer((v) => enregistrerNaissance(tid, {
          date: v.date, nb_naissances: v.nb, nb_vivants: v.vivants, nb_morts_nes: v.nb - v.vivants, poids_naissance_kg: v.poids || 0,
        }), 'Naissance enregistrée.')} />

      <FormSheet visible={form === 'pesee'} onClose={() => setForm(null)} title="Pesée"
        fields={[
          { name: 'animal', label: 'Animal', type: 'select', options: optionsAnimaux, default: optionsAnimaux[0]?.value },
          { name: 'poids', label: 'Poids (kg)', type: 'number', required: true, positive: true, max: 500 },
          { name: 'notes', label: 'Notes', type: 'text' },
        ]}
        onSubmit={async (v) => {
          const r = await enregistrerPesee(v.animal, v.poids, v.notes);
          if (!r.success) return { error: r.error || 'Enregistrement impossible.' };
          toast.success('Pesée enregistrée.');
          setTick((t) => t + 1);
          return null;
        }} />

      <FormSheet visible={form === 'lait'} onClose={() => setForm(null)} title="Traite du jour"
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
          { name: 'matin', label: 'Matin (L)', type: 'number', half: true, max: 200, default: '0' },
          { name: 'soir', label: 'Soir (L)', type: 'number', half: true, max: 200, default: '0' },
        ]}
        check={(v) => (((v.matin || 0) + (v.soir || 0)) <= 0 ? { matin: 'Saisissez au moins une quantité.' } : {})}
        onSubmit={enregistrer((v) => enregistrerLait(tid, { date: v.date, matin_L: v.matin || 0, soir_L: v.soir || 0 }), 'Production enregistrée.')} />
    </Content>
  );
}
