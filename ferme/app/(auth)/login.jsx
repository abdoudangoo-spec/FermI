import { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Screen, Field, PasswordField, Button, Banner } from '../../src/components/ui';
import Brand from '../../src/components/Brand';
import { rules, validate } from '../../src/utils/validation';
import { useTheme, space, type } from '../../src/theme';

export default function Login() {
  const { c } = useTheme();
  const seConnecter = useAuthStore((s) => s.seConnecter);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [errors, setErrors] = useState({});
  const mdpRef = useRef(null);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    const v = validate({ email: e, mdp }, {
      email: [rules.required('Adresse email'), rules.email],
      mdp: [rules.required('Mot de passe')],
    });
    setErrors(v.errors);
    if (!v.ok) return;
    const res = await seConnecter(e, mdp);
    if (res.success) router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ paddingVertical: space.xl }}>
        <Brand tagline="Le suivi d'élevage, simple et fiable." />
      </View>
      <Text style={[type.title, { color: c.text }]} accessibilityRole="header">Connexion</Text>
      {error ? <Banner tone="danger" text={error} onClose={clearError} /> : null}
      <Field label="Adresse email" value={email} onChangeText={(t) => { setEmail(t); setErrors({}); }}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
        textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => mdpRef.current?.focus()}
        error={errors.email} placeholder="vous@exemple.com" />
      <PasswordField ref={mdpRef} value={mdp} onChangeText={(t) => { setMdp(t); setErrors({}); }}
        returnKeyType="go" onSubmitEditing={submit} error={errors.mdp} />
      <Button label="Se connecter" onPress={submit} loading={isBusy} />
      <Button label="Mot de passe oublié ?" variant="ghost" onPress={() => { clearError(); router.push('/(auth)/mot-de-passe-oublie'); }} />
      <Button label="Continuer avec un numéro de téléphone" icon="call-outline" variant="secondary" onPress={() => { clearError(); router.push('/(auth)/login-phone'); }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Text style={[type.body, { color: c.textSub }]}>Pas encore de compte ? </Text>
        <Button label="Créer un compte" variant="ghost" size="sm" onPress={() => { clearError(); router.push('/(auth)/register'); }} />
      </View>
    </Screen>
  );
}
