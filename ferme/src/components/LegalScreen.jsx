import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card } from './ui';
import { useTheme, space, type } from '../theme';
import { LEGAL_VERSION, LEGAL_DATE } from '../constants/legal';

export default function LegalScreen({ title, sections }) {
  const { c } = useTheme();
  return (
    <Screen
      title={title}
      subtitle={`Version ${LEGAL_VERSION} · mise à jour le ${LEGAL_DATE}`}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/parametres'))}
      edges={['top', 'bottom']}
    >
      {sections.map((s) => (
        <Card key={s.titre}>
          <View style={{ gap: space.sm }}>
            <Text style={[type.heading, { color: c.text }]} accessibilityRole="header">{s.titre}</Text>
            <Text style={[type.body, { color: c.textSub }]} selectable>{s.texte}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
