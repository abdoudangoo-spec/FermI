import { useEffect, useRef, useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../src/store/authStore';
import { useAppStore } from '../../src/store/appStore';
import { ZONES } from '../../src/constants/especes';
import { PAYS, labelPays } from '../../src/constants/pays';
import { SUPPORT_EMAIL } from '../../src/constants/config';
import { Screen, Card, Section, ListItem, Divider, Avatar, Button, Pill, Row, PasswordField, Banner } from '../../src/components/ui';
import { FormSheet } from '../../src/components/FormSheet';
import { useToast, useConfirm } from '../../src/components/feedback';
import { MenuActions } from '../../src/features/marche/shared';
import { choisirEtEnvoyerPhoto } from '../../src/utils/images';
import { lireCleControleur, ecrireCleControleur } from '../../src/utils/secure';
import { validerUrlPi } from '../../src/utils/piUrl';
import { evaluerMotDePasse } from '../../src/utils/validation';
import { pingPi } from '../../src/engine/poulaillerEngine';
import { exporterTables } from '../../src/db/database';
import { listerContenusUtilisateur } from '../../src/firebase/market';
import { syncerDonnees, compterEnAttente } from '../../src/sync/syncManager';
import { todayStr } from '../../src/utils/dates';
import { useTheme, space, type } from '../../src/theme';

const OPTIONS_PAYS = PAYS.map((p) => ({ value: p.value, label: p.label }));
const OPTIONS_ZONES = Object.values(ZONES).map((z) => ({ value: z.id, label: z.nom }));

export default function Parametres() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const profil = useAuthStore((s) => s.profil);
  const seDeconnecter = useAuthStore((s) => s.seDeconnecter);
  const majProfil = useAuthStore((s) => s.majProfil);
  const supprimerCompte = useAuthStore((s) => s.supprimerCompte);
  const changerMotDePasse = useAuthStore((s) => s.changerMotDePasse);
  const config = useAppStore((s) => s.config);
  const updateConfig = useAppStore((s) => s.updateConfig);
  const blocages = useAppStore((s) => s.blocages);
  const debloquer = useAppStore((s) => s.debloquerUtilisateur);

  const [form, setForm] = useState(null);
  const [menuPhoto, setMenuPhoto] = useState(false);
  const [cle, setCle] = useState('');
  const [attente, setAttente] = useState(0);
  const [busy, setBusy] = useState(null); // 'photo' | 'export' | 'sync'
  const monte = useRef(true);
  useEffect(() => () => { monte.current = false; }, []);
  useEffect(() => { lireCleControleur().then((k) => { if (monte.current) setCle(k); }); }, []);
  useEffect(() => { compterEnAttente().then((n) => { if (monte.current) setAttente(n); }).catch(() => null); }, [busy]);

  const estEmail = !!user?.email;
  const nom = profil?.nom || user?.displayName || 'Mon compte';
  const photo = profil?.photo_url || user?.photoURL || null;
  const zone = ZONES[config?.zone_id] || ZONES.soudano_guineenne;
  const version = Constants.expoConfig?.version || '';

  const changerPhoto = async (source) => {
    setBusy('photo');
    const r = await choisirEtEnvoyerPhoto({ uid: user.uid, source, dossier: 'avatars' });
    if (r.erreur) toast.error(r.erreur);
    else if (r.url) {
      const m = await majProfil({ photo_url: r.url });
      if (m.success) toast.success('Photo mise à jour.'); else toast.error(m.error);
    }
    if (monte.current) setBusy(null);
  };

  const synchroniser = async () => {
    setBusy('sync');
    const r = await syncerDonnees({ force: true });
    if (!monte.current) return;
    setBusy(null);
    if (r.skip) toast.info(r.reason === 'pas de réseau' ? 'Pas de connexion internet : la sauvegarde reprendra plus tard.' : 'Sauvegarde déjà à jour.');
    else if (r.errors > 0) toast.error('Sauvegarde incomplète. Réessayez plus tard.');
    else toast.success('Données sauvegardées.');
  };

  const exporter = async () => {
    setBusy('export');
    try {
      const donnees = await exporterTables();
      let contenus = null;
      try { contenus = await listerContenusUtilisateur(user.uid); } catch { contenus = null; }
      const contenu = {
        application: 'FermI', exporte_le: new Date().toISOString(),
        compte: { email: user.email || null, telephone: user.phoneNumber || null, nom, pays: profil?.pays || null, zone: profil?.zone || null },
        donnees_elevage: donnees,
        contenus_publics: contenus || 'indisponible hors ligne',
      };
      const chemin = `${FileSystem.cacheDirectory}fermi-export-${todayStr()}.json`;
      await FileSystem.writeAsStringAsync(chemin, JSON.stringify(contenu, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(chemin, { mimeType: 'application/json', dialogTitle: 'Mes données FermI' });
      else toast.info('Fichier créé, mais le partage n’est pas disponible sur cet appareil.');
    } catch {
      toast.error("Impossible de créer l'export.");
    } finally { if (monte.current) setBusy(null); }
  };

  const deconnexion = async () => {
    const ok = await confirm({ title: 'Se déconnecter ?', message: 'Vos données restent sur cet appareil. Si un autre compte se connecte ici, elles seront effacées de l\'appareil (elles restent sauvegardées dans votre espace).', confirmLabel: 'Se déconnecter' });
    if (!ok) return;
    await seDeconnecter();
    router.replace('/(auth)/login');
  };

  const contacter = async () => {
    if (!SUPPORT_EMAIL) { toast.info("L'adresse de contact n'est pas encore configurée."); return; }
    try { await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('FermI — assistance')}`); } catch { toast.info(`Écrivez-nous à ${SUPPORT_EMAIL}`); }
  };

  const tester = async (url, token) => {
    const v = validerUrlPi(url);
    if (!v.ok) { toast.error(v.erreur); return; }
    const ok = await pingPi(v.url, token);
    if (ok) toast.success('Le contrôleur répond.'); else toast.error('Aucune réponse. Vérifiez l\'adresse, le Wi‑Fi et la clé.');
  };

  return (
    <Screen title="Paramètres" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
      <Card>
        <Row gap={space.lg}>
          <Avatar name={nom} uri={photo} />
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: c.text }]} numberOfLines={1}>{nom}</Text>
            <Text style={[type.caption, { color: c.textMuted }]} numberOfLines={1}>{user?.email || user?.phoneNumber || ''}</Text>
            <Text style={[type.caption, { color: c.textMuted }]}>{labelPays(profil?.pays)}</Text>
          </View>
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.md }}>
          <Button label="Modifier" size="sm" variant="secondary" icon="create-outline" onPress={() => setForm('profil')} style={{ flex: 1 }} />
          <Button label="Photo" size="sm" variant="secondary" icon="camera-outline" loading={busy === 'photo'} onPress={() => setMenuPhoto(true)} style={{ flex: 1 }} />
        </Row>
      </Card>

      <Section title="Ma ferme" />
      <Card>
        <ListItem icon="home-outline" title={config?.nom || 'Ma ferme'} subtitle={zone.nom} onPress={() => setForm('ferme')} />
        <Divider />
        <ListItem icon="hardware-chip-outline" title="Contrôleur IoT"
          subtitle={config?.api_url ? config.api_url : 'Non configuré — mode démonstration'}
          right={config?.api_url ? <Pill tone="success" label="Configuré" /> : <Pill label="Démo" />} onPress={() => setForm('pi')} />
      </Card>

      <Section title="Données et sauvegarde" />
      <Card>
        <ListItem icon="cloud-upload-outline" title="Sauvegarder maintenant" subtitle={attente === 0 ? 'Tout est sauvegardé' : `${attente} élément(s) en attente`}
          right={busy === 'sync' ? <Pill label="En cours…" tone="info" /> : null} onPress={busy ? undefined : synchroniser} />
        <Divider />
        <ListItem icon="download-outline" title="Exporter mes données" subtitle="Fichier JSON : élevage, compte, contenus publiés" onPress={busy ? undefined : exporter}
          right={busy === 'export' ? <Pill label="Export…" tone="info" /> : null} />
      </Card>

      <Section title="Sécurité" />
      <Card>
        {estEmail ? <ListItem icon="lock-closed-outline" title="Changer le mot de passe" onPress={() => setForm('mdp')} /> : <ListItem icon="call-outline" title="Connecté par SMS" subtitle="Aucun mot de passe à gérer" />}
        {blocages.length > 0 ? <Divider /> : null}
        {blocages.length > 0 ? <ListItem icon="ban-outline" title="Utilisateurs bloqués" subtitle={`${blocages.length} utilisateur(s)`} onPress={() => setForm('bloques')} /> : null}
      </Card>

      <Section title="Aide et informations légales" />
      <Card>
        <ListItem icon="mail-outline" title="Contacter l'assistance" subtitle={SUPPORT_EMAIL || undefined} onPress={contacter} />
        <Divider />
        <ListItem icon="document-text-outline" title="Conditions d'utilisation" onPress={() => router.push('/legal/cgu')} />
        <Divider />
        <ListItem icon="shield-checkmark-outline" title="Politique de confidentialité" onPress={() => router.push('/legal/confidentialite')} />
      </Card>

      <Button label="Se déconnecter" variant="secondary" icon="log-out-outline" onPress={deconnexion} />
      <Button label="Supprimer mon compte" variant="dangerOutline" icon="trash-outline" onPress={() => setForm('suppression')} />
      <Text style={[type.caption, { color: c.textMuted, textAlign: 'center' }]}>FermI{version ? ` · version ${version}` : ''}</Text>

      <MenuActions visible={menuPhoto} onClose={() => setMenuPhoto(false)} title="Photo de profil"
        actions={[
          { label: 'Choisir dans la galerie', icon: 'image-outline', onPress: () => changerPhoto('galerie') },
          { label: 'Prendre une photo', icon: 'camera-outline', onPress: () => changerPhoto('camera') },
        ]} />

      <FormSheet visible={form === 'profil'} onClose={() => setForm(null)} title="Modifier le profil"
        initial={{ nom: profil?.nom || user?.displayName || '', telephone: profil?.telephone || '', pays: profil?.pays || 'senegal' }}
        fields={[
          { name: 'nom', label: 'Nom', type: 'text', required: true, maxLen: 80 },
          { name: 'telephone', label: 'Téléphone', type: 'phone' },
          { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS },
        ]}
        onSubmit={async (v) => {
          const r = await majProfil({ nom: v.nom, telephone: v.telephone, pays: v.pays });
          if (!r.success) return { error: r.error };
          toast.success('Profil mis à jour.');
          return null;
        }} />

      <FormSheet visible={form === 'ferme'} onClose={() => setForm(null)} title="Ma ferme"
        initial={{ nom: config?.nom || '', zone: config?.zone_id || 'soudano_guineenne' }}
        fields={[
          { name: 'nom', label: 'Nom de la ferme', type: 'text', required: true, maxLen: 60 },
          { name: 'zone', label: 'Zone climatique', type: 'select', options: OPTIONS_ZONES },
        ]}
        onSubmit={async (v) => {
          const r = await updateConfig({ nom: v.nom, zone_id: v.zone });
          if (!r.success) return { error: r.error };
          await majProfil({ zone: v.zone });
          toast.success('Ferme mise à jour.');
          return null;
        }} />

      <FormSheet visible={form === 'pi'} onClose={() => setForm(null)} title="Contrôleur IoT" submitLabel="Enregistrer"
        initial={{ url: config?.api_url || '', token: cle }}
        intro="Adresse de votre Raspberry Pi (ou équivalent) sur le réseau local. Laissez vide pour utiliser le mode démonstration."
        fields={[
          { name: 'url', label: 'Adresse du contrôleur', type: 'text', maxLen: 200, autoCapitalize: 'none', placeholder: 'http://192.168.1.42:8080',
            hint: 'HTTP uniquement sur le réseau local ; HTTPS obligatoire sinon.',
            rules: [(x) => (String(x || '').trim() ? (validerUrlPi(x).ok ? null : validerUrlPi(x).erreur) : null)] },
          { name: 'token', type: 'custom', render: (values, set) => (
            <View style={{ gap: space.md }}>
              <PasswordField nouveau label="Clé d'accès (facultative)" value={values.token || ''} onChangeText={set} autoComplete="off" textContentType="none" />
              <Text style={[type.caption, { color: c.textMuted }]}>Conservée dans le stockage sécurisé de l'appareil, jamais envoyée à nos serveurs.</Text>
              <Button label="Tester la connexion" variant="secondary" icon="wifi" onPress={() => tester(values.url, values.token)} />
            </View>
          ) },
        ]}
        onSubmit={async (v) => {
          const url = v.url ? validerUrlPi(v.url).url : '';
          const r = await updateConfig({ api_url: url });
          if (!r.success) return { error: r.error };
          const ok = await ecrireCleControleur(url ? (v.token || '') : '');
          if (!ok) return { error: "Impossible d'enregistrer la clé dans le stockage sécurisé." };
          setCle(url ? (v.token || '') : '');
          toast.success(url ? 'Contrôleur enregistré.' : 'Configuration effacée : mode démonstration.');
          return null;
        }} />

      <FormSheet visible={form === 'mdp'} onClose={() => setForm(null)} title="Changer le mot de passe"
        fields={[
          { name: 'ancien', type: 'custom', render: (v, set, err) => <PasswordField label="Mot de passe actuel" value={v.ancien || ''} onChangeText={set} error={err} /> },
          { name: 'nouveau', type: 'custom', render: (v, set, err) => <PasswordField nouveau label="Nouveau mot de passe" value={v.nouveau || ''} onChangeText={set} error={err} hint="10 caractères minimum, lettres et chiffres" /> },
          { name: 'confirm', type: 'custom', render: (v, set, err) => <PasswordField nouveau label="Confirmer" value={v.confirm || ''} onChangeText={set} error={err} /> },
        ]}
        check={(v) => {
          const e = {};
          if (!v.ancien) e.ancien = 'Mot de passe actuel requis';
          const ev = evaluerMotDePasse(v.nouveau, user?.email || '');
          if (!ev.valide) e.nouveau = `Trop faible : ${ev.erreurs.join(', ')}`;
          if (v.nouveau !== v.confirm) e.confirm = 'Les mots de passe ne correspondent pas';
          return e;
        }}
        onSubmit={async (v) => {
          const r = await changerMotDePasse(v.ancien, v.nouveau);
          if (!r.success) return { error: r.error };
          toast.success('Mot de passe modifié.');
          return null;
        }} />

      <FormSheet visible={form === 'suppression'} onClose={() => setForm(null)} title="Supprimer mon compte" variant="danger" submitLabel="Supprimer définitivement"
        intro="Votre compte, vos données d'élevage sauvegardées, vos annonces et vos messages seront effacés définitivement. Cette action est irréversible. Pensez à exporter vos données avant."
        fields={[
          ...(estEmail ? [{ name: 'mdp', type: 'custom', render: (v, set, err) => <PasswordField label="Mot de passe" value={v.mdp || ''} onChangeText={set} error={err} /> }] : []),
          { name: 'ok', type: 'checkbox', required: true, label: 'Je comprends que la suppression est définitive.', requiredMessage: 'Confirmation requise.' },
        ]}
        check={(v) => (estEmail && !v.mdp ? { mdp: 'Mot de passe requis' } : {})}
        onSubmit={async (v) => {
          const r = await supprimerCompte(v.mdp);
          if (!r.success) return { error: r.error };
          router.replace('/(auth)/compte-supprime');
          return null;
        }} />

      <FormSheet visible={form === 'bloques'} onClose={() => setForm(null)} title="Utilisateurs bloqués" submitLabel="Fermer"
        fields={[{ name: 'liste', type: 'custom', render: () => (
          <View>
            {blocages.map((id, i) => (
              <View key={id}>
                {i > 0 ? <Divider /> : null}
                <ListItem title={`Utilisateur ${i + 1}`} subtitle={`Identifiant …${String(id).slice(-4)}`}
                  right={<Button label="Débloquer" size="sm" variant="secondary" onPress={async () => { const r = await debloquer(id); if (r.success) toast.success('Utilisateur débloqué.'); }} />} />
              </View>
            ))}
            {blocages.length === 0 ? <Banner tone="info" text="Aucun utilisateur bloqué." /> : null}
          </View>
        ) }]}
        onSubmit={async () => null} />
    </Screen>
  );
}
