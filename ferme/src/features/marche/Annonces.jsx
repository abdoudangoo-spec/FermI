import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Linking } from 'react-native';
import { useMarketStore } from '../../store/marketStore';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Content, ChipRow, Card, Button, Field, Icon, Pill, Row, IconButton, Banner } from '../../components/ui';
import { EmptyState, LoadingState, ErrorState } from '../../components/states';
import { FormSheet } from '../../components/FormSheet';
import { useToast, useConfirm } from '../../components/feedback';
import { CATEGORIES_MARCHE, MOTIFS_SIGNALEMENT, iconeCategorie, libelle, millis, MenuActions } from './shared';
import { choisirEtEnvoyerPhoto } from '../../utils/images';
import { formatNombre } from '../../utils/format';
import { tempsRelatif } from '../../utils/dates';
import { useTheme, space, radius, type } from '../../theme';

const FILTRES = [{ id: 'tous', label: 'Tout' }, ...CATEGORIES_MARCHE.map((c) => ({ id: c.value, label: c.label }))];

function Vignette({ annonce }) {
  const { c } = useTheme();
  if (annonce.photo_url) {
    return <Image source={{ uri: annonce.photo_url }} style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} accessibilityIgnoresInvertColors accessibilityLabel={`Photo : ${annonce.titre}`} />;
  }
  return (
    <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={iconeCategorie(annonce.categorie)} size={32} color={c.primary} />
    </View>
  );
}

export default function Annonces() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const uid = useAuthStore((s) => s.user?.uid);
  const { annonces, annoncesStatut, annoncesErreur, chargerAnnonces, publierAnnonce, supprimerAnnonce, signaler } = useMarketStore();
  const blocages = useAppStore((s) => s.blocages);
  const masques = useAppStore((s) => s.masques);
  const bloquer = useAppStore((s) => s.bloquerUtilisateur);

  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [form, setForm] = useState(false);
  const [menu, setMenu] = useState(null);
  const [signal, setSignal] = useState(null);
  const [photo, setPhoto] = useState(null); // { url, chemin }
  const [photoBusy, setPhotoBusy] = useState(false);

  const charger = useCallback(() => chargerAnnonces(filtre === 'tous' ? null : filtre), [chargerAnnonces, filtre]);
  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return annonces.filter((a) => !blocages.includes(a.uid_vendeur) && !masques.includes(`annonce:${a.id}`)
      && (!q || `${a.titre} ${a.description} ${a.localisation}`.toLowerCase().includes(q)));
  }, [annonces, blocages, masques, recherche]);

  const appeler = async (a) => {
    const num = String(a.contact || '').replace(/[^\d+]/g, '');
    if (!num) { toast.error("Ce vendeur n'a pas laissé de numéro."); return; }
    try { await Linking.openURL(`tel:${num}`); } catch { toast.error("Impossible d'ouvrir l'application téléphone."); }
  };

  const ajouterPhoto = async (source) => {
    setPhotoBusy(true);
    const r = await choisirEtEnvoyerPhoto({ uid, source, dossier: 'annonces' });
    setPhotoBusy(false);
    if (r.erreur) toast.error(r.erreur);
    else if (r.url) setPhoto({ url: r.url, chemin: r.chemin });
  };

  const actionsDe = (a) => (a.uid_vendeur === uid
    ? [{ label: 'Supprimer mon annonce', icon: 'trash-outline', destructive: true, onPress: async () => {
      const ok = await confirm({ title: 'Supprimer cette annonce ?', destructive: true, confirmLabel: 'Supprimer' });
      if (!ok) return;
      const r = await supprimerAnnonce(a);
      if (r.success) toast.success('Annonce supprimée.'); else toast.error(r.error);
    } }]
    : [
      { label: 'Signaler cette annonce', icon: 'flag-outline', onPress: () => setSignal({ typeCible: 'annonce', cibleId: a.id, uidCible: a.uid_vendeur }) },
      { label: 'Bloquer ce vendeur', icon: 'ban-outline', destructive: true, onPress: async () => {
        const ok = await confirm({ title: 'Bloquer ce vendeur ?', message: 'Ses annonces et messages ne seront plus affichés sur cet appareil.', destructive: true, confirmLabel: 'Bloquer' });
        if (!ok) return;
        const r = await bloquer(a.uid_vendeur);
        if (r.success) toast.success('Vendeur bloqué.'); else toast.error(r.error);
      } },
    ]);

  return (
    <Content onRefresh={charger} refreshing={annoncesStatut === 'loading' && annonces.length > 0}>
      <Button label="Publier une annonce" icon="add" onPress={() => { setPhoto(null); setForm(true); }} />
      <Field value={recherche} onChangeText={setRecherche} placeholder="Rechercher une annonce…" accessibilityLabel="Rechercher" returnKeyType="search" maxLength={60} />
      <ChipRow options={FILTRES} value={filtre} onChange={setFiltre} />

      {annoncesStatut === 'loading' && annonces.length === 0 ? <LoadingState label="Chargement des annonces…" /> : null}
      {annoncesStatut === 'error' ? <ErrorState message={annoncesErreur} onRetry={charger} /> : null}
      {annoncesStatut === 'ready' && visibles.length === 0 ? (
        <EmptyState icon="storefront-outline" title={recherche ? 'Aucun résultat' : 'Aucune annonce pour le moment'}
          message={recherche ? 'Essayez un autre mot-clé.' : 'Soyez le premier à publier dans cette catégorie.'}
          actionLabel={recherche ? undefined : 'Publier une annonce'} onAction={() => { setPhoto(null); setForm(true); }} />
      ) : null}

      {visibles.map((a) => (
        <Card key={a.id}>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <Vignette annonce={a} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.heading, { color: c.text }]} numberOfLines={2}>{a.titre}</Text>
              <Text style={[type.title, type.numeric, { color: c.primary }]}>{formatNombre(a.prix)} {a.unite || 'FCFA'}</Text>
              <Text style={[type.caption, { color: c.textMuted }]} numberOfLines={1}>{a.localisation} · {tempsRelatif(millis(a.publie_le))}</Text>
              <Text style={[type.caption, { color: c.textMuted }]} numberOfLines={1}>{a.vendeur}{a.quantite > 1 ? ` · quantité : ${a.quantite}` : ''}</Text>
            </View>
            <IconButton icon="ellipsis-horizontal" label="Plus d'actions" onPress={() => setMenu(a)} />
          </Row>
          {a.description ? <Text style={[type.body, { color: c.textSub, marginTop: space.sm }]} numberOfLines={4}>{a.description}</Text> : null}
          <Row gap={space.sm} style={{ marginTop: space.md }}>
            <Pill label={libelle(CATEGORIES_MARCHE, a.categorie)} />
            {a.uid_vendeur !== uid ? <View style={{ flex: 1, alignItems: 'flex-end' }}><Button label="Appeler" icon="call-outline" size="sm" onPress={() => appeler(a)} /></View> : <Pill label="Mon annonce" tone="primary" />}
          </Row>
        </Card>
      ))}

      {visibles.length > 0 ? <Banner tone="info" text="Vérifiez toujours le vendeur et le produit avant tout paiement. FermI n'intervient pas dans les transactions." /> : null}

      <MenuActions visible={!!menu} onClose={() => setMenu(null)} title={menu?.titre || 'Actions'} actions={menu ? actionsDe(menu) : []} />

      <FormSheet visible={form} onClose={() => setForm(false)} title="Nouvelle annonce" submitLabel="Publier"
        fields={[
          { name: 'categorie', label: 'Catégorie', type: 'select', options: CATEGORIES_MARCHE, default: 'animaux_vivants' },
          { name: 'titre', label: 'Titre', type: 'text', required: true, maxLen: 80, placeholder: 'Ex. 20 pondeuses Lohmann' },
          { name: 'description', label: 'Description', type: 'multiline', maxLen: 1000 },
          { name: 'prix', label: 'Prix (FCFA)', type: 'number', required: true, positive: true, max: 1e9, half: true },
          { name: 'quantite', label: 'Quantité', type: 'integer', max: 100000, half: true, default: '1' },
          { name: 'localisation', label: 'Localisation (ville, quartier)', type: 'text', required: true, maxLen: 80 },
          { name: 'contact', label: 'Téléphone de contact', type: 'phone', required: true, hint: 'Ce numéro sera visible par les autres utilisateurs connectés.' },
          { name: 'photo', label: 'Photo', type: 'custom', render: () => (
            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: c.textSub }]}>Photo · facultatif</Text>
              {photo ? <Image source={{ uri: photo.url }} style={{ width: '100%', height: 160, borderRadius: radius.md }} accessibilityLabel="Photo de l'annonce" accessibilityIgnoresInvertColors /> : null}
              <Row gap={space.sm}>
                <Button label="Galerie" size="sm" variant="secondary" icon="image-outline" loading={photoBusy} onPress={() => ajouterPhoto('galerie')} style={{ flex: 1 }} />
                <Button label="Appareil photo" size="sm" variant="secondary" icon="camera-outline" disabled={photoBusy} onPress={() => ajouterPhoto('camera')} style={{ flex: 1 }} />
              </Row>
            </View>
          ) },
          { name: 'accord', type: 'checkbox', required: true, label: "Je confirme que cette annonce est conforme aux conditions d'utilisation et j'accepte que mon nom et mon téléphone soient visibles.", requiredMessage: 'Confirmation requise pour publier.' },
        ]}
        onSubmit={async (v) => {
          const r = await publierAnnonce({ ...v, photo_url: photo?.url, photo_path: photo?.chemin });
          if (!r.success) return { error: r.error };
          toast.success('Annonce publiée.');
          charger();
          return null;
        }} />

      <FormSheet visible={!!signal} onClose={() => setSignal(null)} title="Signaler cette annonce" submitLabel="Envoyer le signalement" variant="danger"
        fields={[
          { name: 'motif', label: 'Motif', type: 'select', options: MOTIFS_SIGNALEMENT, default: 'spam' },
          { name: 'details', label: 'Précisions', type: 'multiline', maxLen: 500 },
        ]}
        onSubmit={async (v) => {
          const r = await signaler({ ...signal, motif: v.motif, details: v.details });
          if (!r.success) return { error: r.error };
          toast.success('Merci. Le contenu est masqué sur votre appareil et sera examiné.');
          return null;
        }} />
    </Content>
  );
}
