import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useFinanceStore } from '../../store/financeStore';
import { Content, Card, Section, Stat, Button, Banner, ListItem, Pill, Divider, Row } from '../../components/ui';
import { EmptyState } from '../../components/states';
import { FormSheet } from '../../components/FormSheet';
import { useToast } from '../../components/feedback';
import { formatNombre } from '../../utils/format';
import { periodeDates, formatDateFR, todayStr } from '../../utils/dates';
import { useTheme, space, type } from '../../theme';

const REPERES = [
  { titre: 'Fiente fraîche', conseil: 'Faites-la sécher quelques jours au soleil avant livraison.' },
  { titre: 'Compost de fiente (4 semaines)', conseil: 'Meilleure valeur : idéal pour les maraîchers.' },
  { titre: 'Fumier de moutons et de chèvres', conseil: 'Adapté aux arbres fruitiers et aux cultures.' },
  { titre: 'Biogaz', conseil: "Étudiez la rentabilité selon la taille de votre élevage avant d'investir." },
];

export default function Fiente() {
  const { c } = useTheme();
  const toast = useToast();
  const { transactions, ajouterTransaction, loadPeriode } = useFinanceStore();
  const [form, setForm] = useState(false);

  useEffect(() => { const { debut, fin } = periodeDates('annee'); loadPeriode(debut, fin); }, [loadPeriode]);

  const ventes = transactions.filter((t) => t.categorie === 'vente_fiente');
  const total = ventes.reduce((s, t) => s + (t.montant || 0), 0);

  return (
    <Content>
      <Card>
        <Text style={[type.label, { color: c.textMuted }]}>VENTES DE L'ANNÉE</Text>
        <Row gap={space.lg} style={{ marginTop: space.sm }}>
          <Stat label="Total vendu" value={formatNombre(total)} unit="FCFA" tone="success" />
          <Stat label="Ventes" value={String(ventes.length)} />
        </Row>
      </Card>
      <Button label="Enregistrer une vente" icon="leaf-outline" onPress={() => setForm(true)} />

      <Section title="Repères de valorisation" />
      <Banner tone="info" text="Repères généraux, sans prix garanti : comparez avec les prix pratiqués sur votre marché local." />
      <Card>
        {REPERES.map((r, i) => (
          <View key={r.titre}>{i > 0 ? <Divider /> : null}<ListItem title={r.titre} subtitle={r.conseil} /></View>
        ))}
      </Card>

      <Section title="Historique des ventes" />
      {ventes.length === 0 ? (
        <EmptyState icon="leaf-outline" title="Aucune vente enregistrée" message="Valorisez la fiente et le fumier de votre élevage : chaque vente alimente votre journal." />
      ) : (
        <Card>
          {ventes.map((t, i) => (
            <View key={t.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem icon="leaf-outline" tone="success" title={t.description} subtitle={formatDateFR(t.date)}
                right={<Pill tone="success" label={`+${formatNombre(t.montant)} F`} />} />
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={form} onClose={() => setForm(false)} title="Vente de fiente ou de fumier"
        fields={[
          { name: 'kg', label: 'Quantité (kg)', type: 'number', required: true, positive: true, max: 1e6 },
          { name: 'prix', label: 'Prix par kg (FCFA)', type: 'number', required: true, positive: true, max: 1e5, default: '60' },
          { name: 'acheteur', label: "Acheteur", type: 'text', maxLen: 60 },
          { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
        ]}
        onSubmit={async (v) => {
          const montant = Math.round(v.kg * v.prix);
          const r = await ajouterTransaction({
            type: 'recette', categorie: 'vente_fiente', montant, date: v.date, devise: 'FCFA',
            description: `Vente : ${formatNombre(v.kg, 1)} kg à ${formatNombre(v.prix)} FCFA/kg${v.acheteur ? ` — ${v.acheteur}` : ''}`,
          });
          if (!r.success) return { error: r.error };
          toast.success(`Vente enregistrée : ${formatNombre(montant)} FCFA`);
          const { debut, fin } = periodeDates('annee');
          loadPeriode(debut, fin);
          return null;
        }} />
    </Content>
  );
}
