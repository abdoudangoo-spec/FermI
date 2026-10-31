import { View, Text } from 'react-native';
import { Icon } from './ui';
import { useTheme, space, radius, type } from '../theme';
import { APP_NAME } from '../constants/config';

export default function Brand({ tagline, size = 'lg' }) {
  const { c } = useTheme();
  const box = size === 'lg' ? 64 : 40;
  return (
    <View style={{ alignItems: 'center', gap: space.md }} accessibilityRole="header">
      <View style={{ width: box, height: box, borderRadius: radius.lg, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="leaf" size={box * 0.5} color={c.onPrimary} />
      </View>
      <Text style={[size === 'lg' ? type.display : type.title, { color: c.text }]}>{APP_NAME}</Text>
      {tagline ? <Text style={[type.body, { color: c.textSub, textAlign: 'center' }]}>{tagline}</Text> : null}
    </View>
  );
}
