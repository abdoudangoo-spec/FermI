import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Screen, Field, Button, Banner } from '../../src/components/ui';
import { SuccessState } from '../../src/components/states';
import { rules, validate } from '../../src/utils/validation';
import { useTheme, type } from '../../src/theme';

export default function MotDePasseOublie() {
  const { c } = useTheme();
  const motDePasseOublie = useAuthStore((s) => s.motDePasseOublie);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState(null);
  const [envoye, setEnvoye] = useState(false);

  if (envoye) {
    return (
      <SuccessState
        title="Vérifiez votre boîte mail"
        message="Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Pensez à regarder dans les courriers indésirables."
        primaryLabel="Retour à la connexion" onPrimary={() => router.replace('/(auth)/login')}
      />
    );
  }

  const submit = async () => {
    const e = email.trim().toLowerCase();
    const v = validate({ email: e }, { email: [rules.required('Adresse email'), rules.email] });
    setErr(v.errors.email || null);
    if (!v.ok) return;
    const res = await motDePasseOublie(e);
    if (res.success) setEnvoye(true);
  };

  return (
    <Screen title="Mot de passe oublié" onBack={() => router.back()} edges={['top', 'bottom']}>
      <Text style={[type.body, { color: c.textSub }]}>Entrez l'adresse email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.</Text>
      {error ? <Banner tone="danger" text={error} /> : null}
      <Field label="Adresse email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        autoCorrect={false} autoComplete="email" textContentType="emailAddress" error={err} returnKeyType="send" onSubmitEditing={submit} />
      <Button label="Envoyer le lien" onPress={submit} loading={isBusy} />
    </Screen>
  );
}
