import { useState } from 'react';
import { Screen, Tabs } from '../../src/components/ui';
import Annonces from '../../src/features/marche/Annonces';
import Forum from '../../src/features/marche/Forum';
import Prix from '../../src/features/marche/Prix';

const ONGLETS = [
  { id: 'annonces', label: 'Annonces' },
  { id: 'forum', label: 'Forum' },
  { id: 'prix', label: 'Repères de prix' },
];

export default function Marche() {
  const [tab, setTab] = useState('annonces');
  return (
    <Screen title="Marché" scroll={false} below={<Tabs tabs={ONGLETS} active={tab} onSelect={setTab} />}>
      {tab === 'annonces' ? <Annonces /> : null}
      {tab === 'forum' ? <Forum /> : null}
      {tab === 'prix' ? <Prix /> : null}
    </Screen>
  );
}
