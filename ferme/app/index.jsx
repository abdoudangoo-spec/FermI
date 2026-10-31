import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LoadingState } from '../src/components/states';

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isConnecte = useAuthStore((s) => s.isConnecte);
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <LoadingState full label="Vérification de votre session…" />;
  if (!isConnecte) return <Redirect href="/(auth)/login" />;
  // Comptes email : accès bloqué tant que l'adresse n'est pas confirmée.
  if (user?.email && !user.emailVerified) return <Redirect href="/(auth)/verification-email" />;
  return <Redirect href="/(tabs)" />;
}
