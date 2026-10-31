import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useAuthStore } from '../../src/store/authStore';
import { app as firebaseApp } from '../../src/firebase/config';
import { INDICATIFS } from '../../src/constants/pays';
import { Screen, Field, Select, Button, Banner, Checkbox, Card } from '../../src/components/ui';
import { useTheme, space, type } from '../../src/theme';

export default function LoginPhone() {
  const { c } = useTheme();
  const envoyerOTPTel = useAuthStore((s) => s.envoyerOTPTel);
  const verifierOTPTel = useAuthStore((s) => s.verifierOTPTel);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [etape, setEtape] = useState(1);
  const [indicatif, setIndicatif] = useState('+227');
  const [numero, setNumero] = useState('');
  const [code, setCode] = useState('');
  const [confirmateur, setConfirmateur] = useState(null);
  const [accord, setAccord] = useState(false);
  const [errors, setErrors] = useState({});
  const [secondes, setSecondes] = useState(0);
  const recaptcha = useRef(null);
  const compteur = useRef(null);

  useEffect(() => () => { if (compteur.current) clearInterval(compteur.current); }, []);

  const demarrerCompteur = () => {
    setSecondes(60);
    if (compteur.current) clearInterval(compteur.current);
    compteur.current = setInterval(() => {
      setSecondes((s) => {
        if (s <= 1) { clearInterval(compteur.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const envoyer = async () => {
    const n = numero.replace(/\s/g, '');
    const e = {};
    if (!/^\d{6,12}$/.test(n)) e.numero = 'Entrez entre 6 et 12 chiffres, sans l\'indicatif.';
    if (!accord) e.accord = 'Confirmez votre âge et acceptez les conditions pour continuer.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!recaptcha.current) { setErrors({ numero: 'Vérification de sécurité indisponible. Relancez l\'écran.' }); return; }
    clearError();
    const res = await envoyerOTPTel(`${indicatif}${n}`, recaptcha.current);
    if (res.success) { setConfirmateur(res.confirmateur); setEtape(2); demarrerCompteur(); }
  };

  const verifier = async () => {
    if (!/^\d{6}$/.test(code)) { setErrors({ code: 'Le code contient 6 chiffres.' }); return; }
    if (!confirmateur) { setErrors({ code: 'Session expirée. Demandez un nouveau code.' }); return; }
    setErrors({});
    const res = await verifierOTPTel(confirmateur, code);
    if (res.success) router.replace('/');
  };

  const retourNumero = () => { clearError(); setCode(''); setConfirmateur(null); setEtape(1); };

  return (
    <Screen title="Connexion par SMS" subtitle={etape === 1 ? 'Recevez un code de vérification' : `Code envoyé au ${indicatif} ${numero}`}
      onBack={() => (etape === 2 ? retourNumero() : router.back())} edges={['top', 'bottom']}>
      <FirebaseRecaptchaVerifierModal ref={recaptcha} firebaseConfig={firebaseApp.options} attemptInvisibleVerification title="Vérification de sécurité" cancelLabel="Annuler" />
      {error ? <Banner tone="danger" text={error} onClose={clearError} /> : null}

      {etape === 1 ? (
        <>
          <Select label="Indicatif du pays" value={indicatif} onChange={setIndicatif} options={INDICATIFS} />
          <Field label="Numéro de téléphone" value={numero} onChangeText={(t) => { setNumero(t.replace(/[^\d\s]/g, '')); setErrors({}); }}
            keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="90 00 00 00" error={errors.numero} maxLength={16} />
          <Checkbox checked={accord} onChange={(x) => { setAccord(x); setErrors({}); }} error={errors.accord}>
            <Text style={[type.body, { color: c.text }]}>
              J'ai 18 ans révolus et j'accepte les{' '}
              <Text style={{ color: c.primary, fontWeight: '700' }} onPress={() => router.push('/legal/cgu')} accessibilityRole="link">conditions</Text>
              {' '}et la{' '}
              <Text style={{ color: c.primary, fontWeight: '700' }} onPress={() => router.push('/legal/confidentialite')} accessibilityRole="link">politique de confidentialité</Text>.
            </Text>
            {errors.accord ? <Text style={[type.caption, { color: c.danger }]}>{errors.accord}</Text> : null}
          </Checkbox>
          <Button label="Envoyer le code" onPress={envoyer} loading={isBusy} />
          <Card><Text style={[type.caption, { color: c.textSub }]}>Un code à 6 chiffres vous sera envoyé par SMS. Des frais de votre opérateur peuvent s'appliquer.</Text></Card>
        </>
      ) : (
        <>
          <Field label="Code à 6 chiffres" value={code} onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
            keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} error={errors.code}
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }} />
          <Button label="Vérifier le code" onPress={verifier} loading={isBusy} />
          <View style={{ alignItems: 'center', gap: space.sm }}>
            {secondes > 0
              ? <Text style={[type.body, { color: c.textSub }]}>Nouveau code possible dans {secondes} s</Text>
              : <Button label="Modifier le numéro ou renvoyer un code" variant="ghost" onPress={retourNumero} />}
          </View>
        </>
      )}
    </Screen>
  );
}
