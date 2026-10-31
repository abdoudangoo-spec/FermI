export const PAYS = [
  { value: 'senegal', label: 'Sénégal', indicatif: '+221' },
  { value: 'mali', label: 'Mali', indicatif: '+223' },
  { value: 'burkina', label: 'Burkina Faso', indicatif: '+226' },
  { value: 'niger', label: 'Niger', indicatif: '+227' },
  { value: 'guinee', label: 'Guinée', indicatif: '+224' },
  { value: 'cote_ivoire', label: "Côte d'Ivoire", indicatif: '+225' },
  { value: 'ghana', label: 'Ghana', indicatif: '+233' },
  { value: 'nigeria', label: 'Nigeria', indicatif: '+234' },
  { value: 'cameroun', label: 'Cameroun', indicatif: '+237' },
  { value: 'togo', label: 'Togo', indicatif: '+228' },
  { value: 'benin', label: 'Bénin', indicatif: '+229' },
  { value: 'gambie', label: 'Gambie', indicatif: '+220' },
  { value: 'mauritanie', label: 'Mauritanie', indicatif: '+222' },
  { value: 'tchad', label: 'Tchad', indicatif: '+235' },
  { value: 'kenya', label: 'Kenya', indicatif: '+254' },
  { value: 'ethiopie', label: 'Éthiopie', indicatif: '+251' },
  { value: 'rwanda', label: 'Rwanda', indicatif: '+250' },
  { value: 'maroc', label: 'Maroc', indicatif: '+212' },
  { value: 'autre', label: 'Autre pays', indicatif: '' },
];
export const INDICATIFS = PAYS.filter((p) => p.indicatif).map((p) => ({ value: p.indicatif, label: `${p.label} (${p.indicatif})` }));
export const labelPays = (v) => PAYS.find((p) => p.value === v)?.label || 'Non renseigné';
