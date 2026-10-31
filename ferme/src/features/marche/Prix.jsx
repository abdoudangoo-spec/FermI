import { View, Text } from 'react-native';
import { Content, Card, Banner, ListItem, Divider } from '../../components/ui';
import { formatNombre } from '../../utils/format';
import { useTheme, type } from '../../theme';

// Fourchettes de référence saisies par l'éditeur : indicatives, non actualisées automatiquement.
const REPERES = [
  { produit: "Œuf (à l'unité)", min: 50, max: 100 },
  { produit: 'Plateau de 30 œufs', min: 1500, max: 2800 },
  { produit: 'Poulet vif (1 kg)', min: 1800, max: 2500 },
  { produit: 'Mouton vif (par tête)', min: 35000, max: 80000 },
  { produit: 'Chèvre vive (par tête)', min: 25000, max: 55000 },
  { produit: 'Lait de chèvre (litre)', min: 400, max: 800 },
  { produit: 'Fiente compostée (kg)', min: 40, max: 80 },
  { produit: 'Aliment pondeuse (sac de 50 kg)', min: 14000, max: 18000 },
  { produit: 'Aliment chair (sac de 50 kg)', min: 15000, max: 20000 },
  { produit: 'Son de blé (sac de 50 kg)', min: 5000, max: 8000 },
];

export default function Prix() {
  const { c } = useTheme();
  return (
    <Content>
      <Banner tone="warning" text="Fourchettes indicatives pour l'Afrique de l'Ouest, non mises à jour automatiquement. Les prix réels varient selon la saison, la région et la qualité : comparez avec votre marché local." />
      <Card>
        {REPERES.map((p, i) => (
          <View key={p.produit}>
            {i > 0 ? <Divider /> : null}
            <ListItem title={p.produit} right={<Text style={[type.body, type.numeric, { color: c.text, fontWeight: '600' }]}>{formatNombre(p.min)} – {formatNombre(p.max)} FCFA</Text>} />
          </View>
        ))}
      </Card>
    </Content>
  );
}
