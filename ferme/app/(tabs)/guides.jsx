import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { GUIDES_DIY, CATEGORIES_GUIDES } from '../../src/constants/guides';
import { Screen, Card, Section, Pill, ListItem, Divider, ChipRow, Row, Banner } from '../../src/components/ui';
import { EmptyState } from '../../src/components/states';
import { useTheme, space, radius, type } from '../../src/theme';

const ICONE_CATEGORIE = { Volailles: 'egg-outline', Ruminants: 'paw-outline', 'Économie circulaire': 'leaf-outline' };
const TON_DIFFICULTE = { Facile: 'success', Intermédiaire: 'warning', Avancé: 'danger' };
const FILTRES = CATEGORIES_GUIDES.map((c) => ({ id: c, label: c }));

const REPERES = [
  { icon: 'resize-outline', titre: 'Surfaces', desc: "Prévoyez environ 1,5 m² par ruminant adulte ; pour les volailles, la densité dépend du mode d'élevage." },
  { icon: 'water-outline', titre: "Besoins en eau", desc: "Les besoins augmentent nettement par temps chaud : vérifiez que l'eau reste propre et fraîche." },
  { icon: 'thermometer-outline', titre: 'Températures de confort', desc: 'Pondeuses : environ 18 à 24 °C. Poulets de chair : plus chaud au démarrage, puis 20 à 28 °C.' },
  { icon: 'bulb-outline', titre: "Économies d'énergie", desc: "Les lampes LED consomment beaucoup moins que les ampoules classiques ; une minuterie évite les oublis d'extinction." },
  { icon: 'leaf-outline', titre: 'Plantes utiles', desc: "Certaines plantes (neem, moringa) sont utilisées en complément : demandez conseil à un technicien avant tout usage sur vos animaux." },
];

function Detail({ guide, onBack }) {
  const { c } = useTheme();
  return (
    <Screen title={guide.titre} subtitle={`${guide.categorie} · ${guide.duree}`} onBack={onBack}>
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Pill label={guide.difficulte} tone={TON_DIFFICULTE[guide.difficulte] || 'neutral'} />
        <Pill label={`Coût estimé : ${guide.cout_estime}`} />
        <Pill label={`Durée : ${guide.duree}`} />
      </Row>
      <Section title="Matériel nécessaire" />
      <Card>
        {guide.materiel.map((m, i) => (
          <View key={m} style={{ flexDirection: 'row', gap: space.sm, paddingVertical: 6, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border }}>
            <Text style={[type.body, { color: c.primary }]}>•</Text>
            <Text style={[type.body, { color: c.text, flex: 1 }]}>{m}</Text>
          </View>
        ))}
      </Card>
      <Section title="Étapes" />
      {guide.etapes.map((e, i) => (
        <Card key={e}>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onPrimary, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <Text style={[type.body, { color: c.text, flex: 1 }]}>{e}</Text>
          </Row>
        </Card>
      ))}
      <Banner tone="info" text={guide.conseil} />
      <Text style={[type.caption, { color: c.textMuted }]}>Coûts et durées indicatifs. Respectez les règles de sécurité lors de l'utilisation d'outils et de matériaux.</Text>
    </Screen>
  );
}

export default function Guides() {
  const { c } = useTheme();
  const [filtre, setFiltre] = useState('Tous');
  const [guide, setGuide] = useState(null);

  if (guide) return <Detail guide={guide} onBack={() => setGuide(null)} />;
  const liste = filtre === 'Tous' ? GUIDES_DIY : GUIDES_DIY.filter((g) => g.categorie === filtre);

  return (
    <Screen title="Guides" subtitle={`${GUIDES_DIY.length} guides de fabrication`} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
      <ChipRow options={FILTRES} value={filtre} onChange={setFiltre} />
      <Text style={[type.body, { color: c.textSub }]}>Fabriquez votre matériel avec des ressources locales, à moindre coût.</Text>
      {liste.length === 0 ? <EmptyState icon="book-outline" title="Aucun guide" message="Aucun guide dans cette catégorie." /> : (
        <Card>
          {liste.map((g, i) => (
            <View key={g.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem icon={ICONE_CATEGORIE[g.categorie] || 'construct-outline'} title={g.titre} subtitle={`${g.difficulte} · ${g.cout_estime} · ${g.duree}`} onPress={() => setGuide(g)} />
            </View>
          ))}
        </Card>
      )}
      <Section title="Repères utiles" />
      <Card>
        {REPERES.map((r, i) => (
          <View key={r.titre}>{i > 0 ? <Divider /> : null}<ListItem icon={r.icon} title={r.titre} subtitle={r.desc} /></View>
        ))}
      </Card>
    </Screen>
  );
}
