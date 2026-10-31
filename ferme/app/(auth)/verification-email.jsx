import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Screen, Button, Banner, Icon } from '../../src/components/ui';
import { SuccessState } from '../../src/components/states';
import { useToast, useConfirm } from '../../src/components/feedback';
import { useTheme, toneColors, space, radius, type } from '../../src/theme';

const DELAI_RENVOI_S = 30;

export default function VerificationEmail() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const seDeconnecter = useAuthStore((s) => s.seDeconnecter);
  const renvoyer = useAuthStore((s) => s.renvoyerVerificationEmail);
  const rafraichir = useAuthStore((s) => s.rafraichirEmailVerifie);

  const [verifie, setVerifie] = useState(false);
  const [verification, setVerification] = useState(false);
  const [renvoi, setRenvoi] = useState(false);
  const [attente, setAttente] = useState(0);
  const [message, setMessage] = useState(null);
  const monte = useRef(true);
  useEffect(() => () => { monte.current = false; }, []);

  useEffect(() => {
    if (attente <= 0) return undefined;
    const t = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  // Contrôle automatique toutes les 5 s pendant que l'écran est ouvert.
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await rafraichir();
      if (monte.current && r.verifie) setVerifie(true);
    }, 5000);
    return () => clearInterval(t);
  }, [rafraichir]);

  if (verifie) {
    return <SuccessState title="Adresse confirmée" message="Votre compte est prêt. Bienvenue dans FermI." primaryLabel="Accéder à FermI" onPrimary={() => router.replace('/(tabs)')} />;
  }

  const verifier = async () => {
    setVerification(true);
    setMessage(null);
    const r = await rafraichir();
    if (!monte.current) return;
    setVerification(false);
    if (r.verifie) setVerifie(true);
    else setMessage("L'adresse n'est pas encore confirmée. Ouvrez le lien reçu par email (vérifiez les courriers indésirables), puis réessayez.");
  };

  const renvoyerEmail = async () => {
    setRenvoi(true);
    const r = await renvoyer();
    if (!monte.current) return;
    setRenvoi(false);
    if (r.success) { setAttente(DELAI_RENVOI_S); toast.success('Un nouveau lien a été envoyé.'); } else toast.error(r.error);
  };

  const quitter = async () => {
    const ok = await confirm({ title: 'Se déconnecter ?', message: 'Vous pourrez confirmer votre adresse plus tard en vous reconnectant.', confirmLabel: 'Se déconnecter' });
    if (!ok) return;
    await seDeconnecter();
    router.replace('/(auth)/login');
  };

  const t = toneColors(c, 'info');
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ alignItems: 'center', paddingTop: space.xl, gap: space.md }}>
        <View style={{ width: 80, height: 80, borderRadius: radius.pill, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail-outline" size={36} color={t.fg} />
        </View>
        <Text style={[type.title, { color: c.text, textAlign: 'center' }]} accessibilityRole="header">Confirmez votre adresse email</Text>
        <Text style={[type.body, { color: c.textSub, textAlign: 'center' }]}>
          Un lien de confirmation a été envoyé à {user?.email || 'votre adresse'}. Ouvrez-le, puis revenez ici.
        </Text>
      </View>
      {message ? <Banner tone="warning" text={message} /> : null}
      <Button label="J'ai confirmé mon adresse" onPress={verifier} loading={verification} />
      <Button label={attente > 0 ? `Renvoyer le lien (${attente} s)` : 'Renvoyer le lien'} variant="secondary" onPress={renvoyerEmail} loading={renvoi} disabled={attente > 0} />
      <Button label="Se déconnecter" variant="ghost" onPress={quitter} />
    </Screen>
  );
}
