import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useFinanceStore } from '../../store/financeStore';
import { useAppStore } from '../../store/appStore';
import { genererRapportPDF } from '../../engine/finance';
import { Content, ChipRow, Card, Section, Stat, Button, Row, ProgressBar } from '../../components/ui';
import { ErrorState, EmptyState, LoadingState } from '../../components/states';
import { useToast } from '../../components/feedback';
import TransactionForm from './TransactionForm';
import { nomCategorie } from './categories';
import { formatNombre, formatSigne } from '../../utils/format';
import { periodeDates, formatDateFR } from '../../utils/dates';
import { useTheme, space, type } from '../../theme';

const PERIODES = [{ id: 'mois', label: 'Ce mois' }, { id: 'trimestre', label: '3 mois' }, { id: 'annee', label: 'Année' }];

function Repartition({ titre, lignes, total, tone }) {
  const { c } = useTheme();
  if (!lignes || lignes.length === 0) return null;
  return (
    <>
      <Section title={titre} />
      <Card>
        {lignes.map((l, i) => (
          <View key={l.categorie} style={{ marginTop: i > 0 ? space.md : 0 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[type.body, { color: c.text }]}>{nomCategorie(l.categorie)}</Text>
              <Text style={[type.body, type.numeric, { color: c.text, fontWeight: '600' }]}>{formatNombre(l.total)} FCFA</Text>
            </Row>
            <View style={{ marginTop: 6 }}><ProgressBar value={l.total} max={total || 1} tone={tone} /></View>
          </View>
        ))}
      </Card>
    </>
  );
}

export default function Tableau() {
  const { c } = useTheme();
  const toast = useToast();
  const config = useAppStore((s) => s.config);
  const { totauxMois, depCat, recCat, isLoading, error, loadPeriode, ajouterTransaction, clearError } = useFinanceStore();
  const [periode, setPeriode] = useState('mois');
  const [form, setForm] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [premier, setPremier] = useState(true);

  const charger = useCallback(async () => {
    const { debut, fin } = periodeDates(periode);
    await loadPeriode(debut, fin);
    setPremier(false);
  }, [periode, loadPeriode]);

  useEffect(() => { clearError(); charger(); }, [charger, clearError]);

  const exporter = async () => {
    setPdf(true);
    try {
      const { debut, fin } = periodeDates(periode);
      const r = await genererRapportPDF(config?.nom || 'Ma ferme', debut, fin);
      if (!r.shared) toast.info('Rapport créé, mais le partage n’est pas disponible sur cet appareil.');
    } catch (e) {
      toast.error(e.message || 'Impossible de générer le rapport.');
    } finally { setPdf(false); }
  };

  if (premier && isLoading) return <LoadingState label="Calcul des totaux…" />;
  if (error) return <ErrorState message="Les données financières n'ont pas pu être lues." onRetry={() => { clearError(); charger(); }} />;

  const { debut, fin } = periodeDates(periode);
  const vide = totauxMois.depenses === 0 && totauxMois.recettes === 0;
  const save = async (data) => {
    const r = await ajouterTransaction(data);
    if (!r.success) return { error: r.error };
    toast.success('Opération enregistrée.');
    charger();
    return null;
  };

  return (
    <Content onRefresh={charger} refreshing={isLoading}>
      <ChipRow options={PERIODES} value={periode} onChange={setPeriode} />
      <Card>
        <Text style={[type.caption, { color: c.textMuted }]}>{formatDateFR(debut)} – {formatDateFR(fin)}</Text>
        <Row gap={space.lg} style={{ marginTop: space.md }}>
          <Stat label="Dépenses" value={formatNombre(totauxMois.depenses)} unit="FCFA" tone="danger" />
          <Stat label="Recettes" value={formatNombre(totauxMois.recettes)} unit="FCFA" tone="success" />
        </Row>
        <View style={{ marginTop: space.lg }}>
          <Row gap={space.lg}>
            <Stat label="Résultat" value={formatSigne(totauxMois.benefice)} unit="FCFA" tone={totauxMois.benefice >= 0 ? 'success' : 'danger'} />
            <Stat label="Rendement" value={`${formatNombre(totauxMois.roi_pct, 1)} %`} />
          </Row>
        </View>
      </Card>

      <Row gap={space.sm}>
        <Button label="Ajouter" icon="add" onPress={() => setForm(true)} style={{ flex: 1 }} />
        <Button label="Rapport PDF" icon="document-text-outline" variant="secondary" onPress={exporter} loading={pdf} disabled={vide} style={{ flex: 1 }} />
      </Row>

      {vide ? (
        <EmptyState icon="wallet-outline" title="Aucune opération sur cette période" message="Enregistrez vos dépenses et vos ventes pour suivre votre résultat." actionLabel="Ajouter une opération" onAction={() => setForm(true)} />
      ) : (
        <>
          <Repartition titre="Dépenses par catégorie" lignes={depCat} total={totauxMois.depenses} tone="danger" />
          <Repartition titre="Recettes par catégorie" lignes={recCat} total={totauxMois.recettes} tone="success" />
        </>
      )}
      <TransactionForm visible={form} onClose={() => setForm(false)} onSave={save} />
    </Content>
  );
}
