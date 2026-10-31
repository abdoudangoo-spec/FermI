import { useState } from 'react';
import { Screen, Tabs } from '../../src/components/ui';
import Tableau from '../../src/features/finance/Tableau';
import Journal from '../../src/features/finance/Journal';
import Fiente from '../../src/features/finance/Fiente';

const ONGLETS = [
  { id: 'tableau', label: 'Tableau de bord' },
  { id: 'journal', label: 'Journal' },
  { id: 'fiente', label: 'Fiente & fumier' },
];

export default function Finance() {
  const [tab, setTab] = useState('tableau');
  return (
    <Screen title="Finance" scroll={false} below={<Tabs tabs={ONGLETS} active={tab} onSelect={setTab} />}>
      {tab === 'tableau' ? <Tableau /> : null}
      {tab === 'journal' ? <Journal /> : null}
      {tab === 'fiente' ? <Fiente /> : null}
    </Screen>
  );
}
