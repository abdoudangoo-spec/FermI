import { router } from 'expo-router';
import { SuccessState } from '../../src/components/states';

export default function CompteSupprime() {
  return (
    <SuccessState
      title="Compte supprimé"
      message="Votre compte et toutes vos données ont été effacés de FermI et de cet appareil."
      primaryLabel="Retour à l'accueil" onPrimary={() => router.replace('/(auth)/login')}
    />
  );
}
