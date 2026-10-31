import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useMarketStore } from '../../store/marketStore';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Content, ChipRow, Card, Button, Pill, Row, IconButton, Sheet, Field, Divider, Banner } from '../../components/ui';
import { EmptyState, LoadingState, ErrorState } from '../../components/states';
import { FormSheet } from '../../components/FormSheet';
import { useToast, useConfirm } from '../../components/feedback';
import { CATEGORIES_FORUM, MOTIFS_SIGNALEMENT, libelle, millis, MenuActions } from './shared';
import { tempsRelatif } from '../../utils/dates';
import { useTheme, space, type } from '../../theme';

const FILTRES = [{ id: 'tous', label: 'Tout' }, ...CATEGORIES_FORUM.map((c) => ({ id: c.value, label: c.label }))];

export default function Forum() {
  const { c } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const uid = useAuthStore((s) => s.user?.uid);
  const { posts, postsStatut, postsErreur, chargerPosts, publierPost, supprimerPost, reponses, chargerReponses, repondre, signaler } = useMarketStore();
  const blocages = useAppStore((s) => s.blocages);
  const masques = useAppStore((s) => s.masques);
  const bloquer = useAppStore((s) => s.bloquerUtilisateur);

  const [filtre, setFiltre] = useState('tous');
  const [form, setForm] = useState(false);
  const [ouvert, setOuvert] = useState(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [menu, setMenu] = useState(null);
  const [signal, setSignal] = useState(null);

  useEffect(() => { chargerPosts(); }, [chargerPosts]);

  const visibles = useMemo(() => posts.filter((p) => !blocages.includes(p.uid_auteur) && !masques.includes(`post:${p.id}`)
    && (filtre === 'tous' || p.categorie === filtre)), [posts, blocages, masques, filtre]);

  const ouvrir = useCallback(async (p) => {
    setOuvert(p); setTexte('');
    const r = await chargerReponses(p.id);
    if (!r.success) toast.error(r.error);
  }, [chargerReponses, toast]);

  const envoyer = async () => {
    const t = texte.trim();
    if (t.length < 2) { toast.error('Écrivez votre réponse.'); return; }
    setEnvoi(true);
    const r = await repondre(ouvert.id, t);
    setEnvoi(false);
    if (r.success) { setTexte(''); toast.success('Réponse publiée.'); } else toast.error(r.error);
  };

  const actionsPost = (p) => (p.uid_auteur === uid
    ? [{ label: 'Supprimer ma discussion', icon: 'trash-outline', destructive: true, onPress: async () => {
      const ok = await confirm({ title: 'Supprimer cette discussion ?', message: 'Les réponses seront aussi supprimées.', destructive: true, confirmLabel: 'Supprimer' });
      if (!ok) return;
      const r = await supprimerPost(p.id);
      if (r.success) { setOuvert(null); toast.success('Discussion supprimée.'); } else toast.error(r.error);
    } }]
    : [
      { label: 'Signaler', icon: 'flag-outline', onPress: () => setSignal({ typeCible: 'post', cibleId: p.id, uidCible: p.uid_auteur }) },
      { label: 'Bloquer cet utilisateur', icon: 'ban-outline', destructive: true, onPress: async () => {
        const ok = await confirm({ title: 'Bloquer cet utilisateur ?', message: 'Ses contenus ne seront plus affichés sur cet appareil.', destructive: true, confirmLabel: 'Bloquer' });
        if (!ok) return;
        const r = await bloquer(p.uid_auteur);
        if (r.success) { setOuvert(null); toast.success('Utilisateur bloqué.'); } else toast.error(r.error);
      } },
    ]);

  const listeReponses = (ouvert && reponses[ouvert.id] ? reponses[ouvert.id] : []).filter((r) => !blocages.includes(r.uid_auteur) && !masques.includes(`reponse:${r.id}`));

  return (
    <Content onRefresh={chargerPosts} refreshing={postsStatut === 'loading' && posts.length > 0}>
      <Button label="Nouvelle discussion" icon="add" onPress={() => setForm(true)} />
      <ChipRow options={FILTRES} value={filtre} onChange={setFiltre} />
      <Banner tone="warning" text="En cas d'urgence sanitaire, contactez d'abord un vétérinaire : le forum ne remplace pas un avis professionnel." />

      {postsStatut === 'loading' && posts.length === 0 ? <LoadingState label="Chargement du forum…" /> : null}
      {postsStatut === 'error' ? <ErrorState message={postsErreur} onRetry={chargerPosts} /> : null}
      {postsStatut === 'ready' && visibles.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="Aucune discussion" message="Posez une question à la communauté d'éleveurs." actionLabel="Poser une question" onAction={() => setForm(true)} />
      ) : null}

      {visibles.map((p) => (
        <Card key={p.id}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Pill label={libelle(CATEGORIES_FORUM, p.categorie)} tone={p.categorie === 'urgence' ? 'danger' : 'neutral'} />
              <Text style={[type.heading, { color: c.text }]}>{p.titre}</Text>
              <Text style={[type.body, { color: c.textSub }]} numberOfLines={3}>{p.contenu}</Text>
              <Text style={[type.caption, { color: c.textMuted }]}>{p.auteur} · {tempsRelatif(millis(p.publie_le))}</Text>
            </View>
            <IconButton icon="ellipsis-horizontal" label="Plus d'actions" onPress={() => setMenu(p)} />
          </Row>
          <View style={{ marginTop: space.md }}><Button label="Lire et répondre" size="sm" variant="secondary" icon="chatbubble-outline" onPress={() => ouvrir(p)} /></View>
        </Card>
      ))}

      <MenuActions visible={!!menu} onClose={() => setMenu(null)} title={menu?.titre || 'Actions'} actions={menu ? actionsPost(menu) : []} />

      <Sheet visible={!!ouvert} onClose={() => setOuvert(null)} title={ouvert?.titre || ''}
        footer={(
          <View style={{ gap: space.sm }}>
            <Field value={texte} onChangeText={setTexte} placeholder="Votre réponse…" multiline maxLength={1000} accessibilityLabel="Votre réponse" />
            <Button label="Répondre" onPress={envoyer} loading={envoi} />
          </View>
        )}>
        {ouvert ? <Text style={[type.body, { color: c.text }]}>{ouvert.contenu}</Text> : null}
        <Text style={[type.caption, { color: c.textMuted, marginBottom: space.sm }]}>{ouvert?.auteur}</Text>
        <Divider />
        {listeReponses.length === 0 ? <Text style={[type.body, { color: c.textMuted, marginTop: space.md }]}>Aucune réponse pour le moment.</Text> : null}
        {listeReponses.map((r) => (
          <View key={r.id} style={{ marginTop: space.md, gap: 2 }}>
            <Text style={[type.label, { color: c.text }]}>{r.auteur} <Text style={[type.caption, { color: c.textMuted }]}>· {tempsRelatif(millis(r.publie_le))}</Text></Text>
            <Text style={[type.body, { color: c.textSub }]}>{r.contenu}</Text>
            {r.uid_auteur !== uid ? (
              <Button label="Signaler" size="sm" variant="ghost" onPress={() => setSignal({ typeCible: 'reponse', cibleId: r.id, uidCible: r.uid_auteur })} style={{ alignSelf: 'flex-start' }} />
            ) : null}
          </View>
        ))}
      </Sheet>

      <FormSheet visible={form} onClose={() => setForm(false)} title="Nouvelle discussion" submitLabel="Publier"
        fields={[
          { name: 'categorie', label: 'Catégorie', type: 'select', options: CATEGORIES_FORUM, default: 'conseil' },
          { name: 'titre', label: 'Titre', type: 'text', required: true, maxLen: 120 },
          { name: 'contenu', label: 'Votre message', type: 'multiline', required: true, maxLen: 2000, rules: [(x) => (String(x || '').trim().length < 10 ? 'Message trop court (10 caractères minimum)' : null)] },
        ]}
        onSubmit={async (v) => {
          const r = await publierPost(v);
          if (!r.success) return { error: r.error };
          toast.success('Discussion publiée.');
          return null;
        }} />

      <FormSheet visible={!!signal} onClose={() => setSignal(null)} title="Signaler ce contenu" submitLabel="Envoyer le signalement" variant="danger"
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
