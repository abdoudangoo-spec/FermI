import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAppStore } from '../../src/store/appStore';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/theme';
import { LoadingState } from '../../src/components/states';

function TabIcon({ name, color, badge }) {
  const { c } = useTheme();
  return (
    <View>
      <Ionicons name={name} size={24} color={color} />
      {badge > 0 ? (
        <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: c.danger, borderRadius: 99, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  const nbAlertes = useAppStore((s) => s.alertesSante.length);
  const isConnecte = useAuthStore((s) => s.isConnecte);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  // Garde d'accès : liens profonds et restauration de navigation inclus.
  if (isLoading) return <LoadingState full label="Vérification de votre session…" />;
  if (!isConnecte) return <Redirect href="/(auth)/login" />;
  if (user?.email && !user.emailVerified) return <Redirect href="/(auth)/verification-email" />;

  const icone = (on, off, badge) => ({ color, focused }) => <TabIcon name={focused ? on : off} color={color} badge={badge} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icone('home', 'home-outline') }} />
      <Tabs.Screen name="elevage" options={{ title: 'Élevage', tabBarIcon: icone('paw', 'paw-outline') }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance', tabBarIcon: icone('wallet', 'wallet-outline') }} />
      <Tabs.Screen name="sante" options={{ title: 'Santé', tabBarIcon: icone('medkit', 'medkit-outline', nbAlertes) }} />
      <Tabs.Screen name="marche" options={{ title: 'Marché', tabBarIcon: icone('storefront', 'storefront-outline') }} />
      <Tabs.Screen name="guides" options={{ href: null, title: 'Guides' }} />
      <Tabs.Screen name="parametres" options={{ href: null, title: 'Paramètres' }} />
    </Tabs>
  );
}
