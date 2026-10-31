import { router } from 'expo-router';
import { ErrorState } from '../src/components/states';

export default function NotFound() {
  return (
    <ErrorState full title="Page introuvable" message="Ce lien ne mène à aucun écran de FermI."
      onRetry={() => router.replace('/')} retryLabel="Retour à l'accueil" />
  );
}
