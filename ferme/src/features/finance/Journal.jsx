import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useFinanceStore } from '../../store/financeStore';
import { Content, ChipRow, Card, Button, Divider, ListItem } from '../../components/ui';
import { EmptyState, LoadingState, ErrorState } from '../../components/states';
import { useToast } from '../../components/feedback';
import TransactionForm from './TransactionForm';
import { nomCategorie } from './categories';
import { formatNombre } from '../../utils/format';
import { periodeDates, formatDateFR } from '../../utils/dates';
import { useTheme, type } from '../../theme';

const FILTRES = [{ id: 'tout', label: 'Tout' }, { id: 'depense', label: 'Dépenses' }, { id: 'recette', label: 'Recettes' }];

export default function Journal() {
  const { c } = useTheme();
  const toast = useToast();
  const { transactions, isLoading, error, loadPeriode, ajouterTransaction, clearError } = useFinanceStore();
  const [filtre, setFiltre] = useState('tout');
  const [form, setForm] = useState(false);

  const charger = useCallback(async () => {
    const { debut, fin } = periodeDates('annee');
    await loadPeriode(debut, fin);
  }, [loadPeriode]);
  useEffect(() => { clearError(); charger(); }, [charger, clearError]);

  const liste = transactions.filter((t) => filtre === 'tout' || t.type === filtre);

  if (isLoading && transactions.length === 0) return <LoadingState label="Chargement du journal…" />;
  if (error) return <ErrorState message="Le journal n'a pas pu être lu." onRetry={() => { clearError(); charger(); }} />;

  return (
    <Content onRefresh={charger} refreshing={isLoading}>
      <Button label="Nouvelle opération" icon="add" onPress={() => setForm(true)} />
      <ChipRow options={FILTRES} value={filtre} onChange={setFiltre} />
      {liste.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Aucune opération" message="Les 50 dernières opérations de l'année s'afficheront ici." />
      ) : (
        <Card>
          {liste.map((t, i) => {
            const rec = t.type === 'recette';
            return (
              <View key={t.id}>
                {i > 0 ? <Divider /> : null}
                <ListItem
                  icon={rec ? 'trending-up' : 'trending-down'} tone={rec ? 'success' : 'danger'}
                  title={t.description} subtitle={`${nomCategorie(t.categorie)} · ${formatDateFR(t.date)}`}
                  right={<Text style={[type.heading, type.numeric, { color: rec ? c.success : c.danger }]}>{rec ? '+' : '−'}{formatNombre(t.montant)}</Text>}
                />
              </View>
            );
          })}
        </Card>
      )}
      <TransactionForm visible={form} onClose={() => setForm(false)} onSave={async (d) => {
        const r = await ajouterTransaction(d);
        if (!r.success) return { error: r.error };
        toast.success('Opération enregistrée.');
        charger();
        return null;
      }} />
    </Content>
  );
}
