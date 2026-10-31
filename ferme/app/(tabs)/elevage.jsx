import { useState } from 'react';
import { Screen, Tabs } from '../../src/components/ui';
import Volailles from '../../src/features/elevage/Volailles';
import Ruminants from '../../src/features/elevage/Ruminants';
import Surveillance from '../../src/features/elevage/Surveillance';

const ONGLETS = [
  { id: 'volailles', label: 'Volailles' },
  { id: 'ruminants', label: 'Ruminants' },
  { id: 'capteurs', label: 'Capteurs' },
];

export default function Elevage() {
  const [tab, setTab] = useState('volailles');
  return (
    <Screen title="Élevage" scroll={false} below={<Tabs tabs={ONGLETS} active={tab} onSelect={setTab} />}>
      {tab === 'volailles' ? <Volailles /> : null}
      {tab === 'ruminants' ? <Ruminants /> : null}
      {tab === 'capteurs' ? <Surveillance /> : null}
    </Screen>
  );
}
