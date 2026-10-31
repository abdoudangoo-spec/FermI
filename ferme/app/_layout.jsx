import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { useAppStore } from '../src/store/appStore';
import { useBandStore } from '../src/store/bandStore';
import { useRuminantStore } from '../src/store/ruminantStore';
import { useFinanceStore } from '../src/store/financeStore';
import { initDB } from '../src/db/database';
import { demarrerEcouteReseau } from '../src/sync/syncManager';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { FeedbackProvider } from '../src/components/feedback';
import { LoadingState, ErrorState } from '../src/components/states';
import { useTheme } from '../src/theme';

function Racine() {
  const { c } = useTheme();
  const [boot, setBoot] = useState('loading'); // loading | ready | error
  const initAuth = useAuthStore((s) => s.init);

  const demarrer = useCallback(async () => {
    setBoot('loading');
    try {
      await initDB();
      await useAppStore.getState().init();
      await Promise.all([
        useBandStore.getState().loadBandes(),
        useRuminantStore.getState().loadTroupeaux(),
        useFinanceStore.getState().loadMoisCourant(),
      ]);
      setBoot('ready');
    } catch {
      setBoot('error');
    }
  }, []);

  useEffect(() => { demarrer(); }, [demarrer]);

  // L'authentification et la synchronisation ne démarrent qu'une fois la base locale prête.
  useEffect(() => {
    if (boot !== 'ready') return undefined;
    const stopAuth = initAuth();
    const stopSync = demarrerEcouteReseau();
    return () => { if (stopAuth) stopAuth(); stopSync(); };
  }, [boot, initAuth]);

  if (boot === 'loading') return <LoadingState full label="Ouverture de FermI…" />;
  if (boot === 'error') {
    return (
      <ErrorState full title="Démarrage impossible"
        message="Les données de l'appareil n'ont pas pu être ouvertes. Fermez complètement l'application puis réessayez."
        onRetry={demarrer} />
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <FeedbackProvider>
          <ErrorBoundary>
            <Racine />
          </ErrorBoundary>
        </FeedbackProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
