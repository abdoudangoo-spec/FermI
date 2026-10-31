import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import * as Network from 'expo-network';
import { useAuthStore } from '../../src/store/authStore';
import { ZONES } from '../../src/constants/especes';
import { PAYS } from '../../src/constants/pays';
import { Screen, Field, PasswordField, Select, Button, Banner, Chip, Checkbox, ProgressBar, Card, Icon } from '../../src/components/ui';
import { SuccessState } from '../../src/components/states';
import { rules, validate, evaluerMotDePasse } from '../../src/utils/validation';
import { useTheme, space, type } from '../../src/theme';

const ETAPES = ['Compte', 'Profil', 'Élevage'];
const TYPES_ELEVAGE = [
  { id: 'volailles_ponte', label: 'Pondeuses' },
  { id: 'volailles_chair', label: 'Poulets de chair' },
  { id: 'moutons', label: 'Moutons' },
  { id: 'chevres', label: 'Chèvres' },
  { id: 'mixte', label: 'Élevage mixte' },
];
const OPTIONS_PAYS = PAYS.map((p) => ({ value: p.value, label: p.label }));
const OPTIONS_ZONES = Object.values(ZONES).map((z) => ({ value: z.id, label: z.nom }));

function ForceMotDePasse({ mdp, email }) {
  const { c } = useTheme();
  const ev = evaluerMotDePasse(mdp, email);
  const couleurs = [c.danger, c.danger, c.warning, c.success, c.success];
  return (
    <View style={{ gap: space.xs }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: mdp && i < ev.score ? couleurs[ev.score] : c.surfaceAlt }} />
        ))}
      </View>
      <Text style={[type.caption, { color: ev.valide ? c.success : c.textMuted }]}>
        {ev.valide ? `Force : ${ev.label}` : `Il manque : ${ev.erreurs.join(', ')}`}
      </Text>
    </View>
  );
}

export default function Register() {
  const { c } = useTheme();
  const sInscrire = useAuthStore((s) => s.sInscrire);
  const isBusy = useAuthStore((s) => s.isBusy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [step, setStep] = useState(0);
  const [termine, setTermine] = useState(false);
  const [v, setV] = useState({ email: '', mdp: '', mdp2: '', nom: '', tel: '', pays: 'senegal', zone: 'soudano_guineenne' });
  const [types, setTypes] = useState([]);
  const [majeur, setMajeur] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, val) => { setV((o) => ({ ...o, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  if (termine) {
    return (
      <SuccessState
        title="Compte créé"
        message="Un email de confirmation vient de vous être envoyé. Confirmez votre adresse pour accéder à FermI."
        primaryLabel="Continuer" onPrimary={() => router.replace('/(auth)/verification-email')}
      />
    );
  }

  const valider = () => {
    let schema = {};
    const extra = {};
    if (step === 0) {
      const ev = evaluerMotDePasse(v.mdp, v.email);
      schema = { email: [rules.required('Adresse email'), rules.email, rules.maxLen(120, 'Adresse email')] };
      if (!v.mdp) extra.mdp = 'Mot de passe requis';
      else if (!ev.valide) extra.mdp = `Mot de passe trop faible : ${ev.erreurs.join(', ')}`;
      if (v.mdp2 !== v.mdp) extra.mdp2 = 'Les mots de passe ne correspondent pas';
    }
    if (step === 1) {
      schema = {
        nom: [rules.required('Nom'), rules.minLen(2, 'Nom'), rules.maxLen(80, 'Nom')],
        tel: [rules.phone],
      };
    }
    if (step === 2) {
      if (types.length === 0) extra.types = "Sélectionnez au moins un type d'élevage";
      if (!majeur) extra.majeur = 'Vous devez avoir 18 ans révolus';
      if (!cgu) extra.cgu = 'Acceptation requise pour créer un compte';
    }
    const res = validate({ ...v, email: v.email.trim().toLowerCase() }, schema);
    const all = { ...res.errors, ...extra };
    setErrors(all);
    return Object.keys(all).length === 0;
  };

  const suivant = () => { if (valider()) { clearError(); setStep((s) => s + 1); } };

  const creer = async () => {
    if (!valider()) return;
    try {
      const etat = await Network.getNetworkStateAsync();
      if (etat.isConnected === false) { setErrors({ reseau: 'Une connexion internet est nécessaire pour créer un compte.' }); return; }
    } catch { /* on tente quand même */ }
    const res = await sInscrire({
      nom: v.nom.trim(), email: v.email.trim().toLowerCase(), motDePasse: v.mdp,
      telephone: v.tel.trim(), pays: v.pays, zone: v.zone, typeElevage: types,
    });
    if (res.success) setTermine(true);
  };

  const retour = () => { if (step > 0) setStep((s) => s - 1); else router.back(); };

  return (
    <Screen title="Créer un compte" subtitle={`Étape ${step + 1} sur ${ETAPES.length} · ${ETAPES[step]}`} onBack={retour} edges={['top', 'bottom']}
      footer={(
        <>
          {step < ETAPES.length - 1
            ? <Button label="Continuer" onPress={suivant} />
            : <Button label="Créer mon compte" onPress={creer} loading={isBusy} />}
          <Button label="J'ai déjà un compte" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
        </>
      )}>
      <ProgressBar value={step + 1} max={ETAPES.length} />
      {error ? <Banner tone="danger" text={error} onClose={clearError} /> : null}
      {errors.reseau ? <Banner tone="warning" text={errors.reseau} /> : null}

      {step === 0 ? (
        <>
          <Field label="Adresse email" value={v.email} onChangeText={(t) => set('email', t)} keyboardType="email-address" autoCapitalize="none"
            autoCorrect={false} autoComplete="email" textContentType="emailAddress" error={errors.email} />
          <PasswordField nouveau label="Mot de passe" value={v.mdp} onChangeText={(t) => set('mdp', t)} error={errors.mdp} />
          {v.mdp ? <ForceMotDePasse mdp={v.mdp} email={v.email} /> : <Text style={[type.caption, { color: c.textMuted }]}>10 caractères minimum, avec des lettres et des chiffres.</Text>}
          <PasswordField nouveau label="Confirmer le mot de passe" value={v.mdp2} onChangeText={(t) => set('mdp2', t)} error={errors.mdp2} />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Field label="Nom complet" value={v.nom} onChangeText={(t) => set('nom', t)} autoComplete="name" textContentType="name" error={errors.nom} maxLength={80} />
          <Field label="Téléphone" optional value={v.tel} onChangeText={(t) => set('tel', t)} keyboardType="phone-pad" autoComplete="tel"
            textContentType="telephoneNumber" error={errors.tel} placeholder="+227 90 00 00 00" maxLength={20} />
          <Select label="Pays" value={v.pays} onChange={(x) => set('pays', x)} options={OPTIONS_PAYS} />
          <Card tone="primary">
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Icon name="shield-checkmark-outline" size={20} color={c.primary} />
              <Text style={[type.caption, { color: c.text, flex: 1 }]}>Vos données ne sont ni vendues ni utilisées pour la publicité. Vous pouvez les exporter ou les supprimer à tout moment.</Text>
            </View>
          </Card>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Select label="Zone climatique" value={v.zone} onChange={(x) => set('zone', x)} options={OPTIONS_ZONES} />
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: c.textSub }]}>Type d'élevage</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {TYPES_ELEVAGE.map((t) => (
                <Chip key={t.id} label={t.label} selected={types.includes(t.id)}
                  onPress={() => { setTypes((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])); setErrors((e) => ({ ...e, types: undefined })); }} />
              ))}
            </View>
            {errors.types ? <Text style={[type.caption, { color: c.danger }]}>{errors.types}</Text> : null}
          </View>
          <Checkbox checked={majeur} onChange={(x) => { setMajeur(x); setErrors((e) => ({ ...e, majeur: undefined })); }} error={errors.majeur}>
            <Text style={[type.body, { color: c.text }]}>Je confirme avoir 18 ans révolus.</Text>
            {errors.majeur ? <Text style={[type.caption, { color: c.danger }]}>{errors.majeur}</Text> : null}
          </Checkbox>
          <Checkbox checked={cgu} onChange={(x) => { setCgu(x); setErrors((e) => ({ ...e, cgu: undefined })); }} error={errors.cgu}>
            <Text style={[type.body, { color: c.text }]}>
              J'accepte les{' '}
              <Text style={{ color: c.primary, fontWeight: '700' }} onPress={() => router.push('/legal/cgu')} accessibilityRole="link">conditions d'utilisation</Text>
              {' '}et la{' '}
              <Text style={{ color: c.primary, fontWeight: '700' }} onPress={() => router.push('/legal/confidentialite')} accessibilityRole="link">politique de confidentialité</Text>.
            </Text>
            {errors.cgu ? <Text style={[type.caption, { color: c.danger }]}>{errors.cgu}</Text> : null}
          </Checkbox>
        </>
      ) : null}
    </Screen>
  );
}
