import { FormSheet } from '../../components/FormSheet';
import { optionsCategories, categorieValide } from './categories';
import { todayStr } from '../../utils/dates';

export default function TransactionForm({ visible, onClose, onSave, typeInitial = 'depense' }) {
  return (
    <FormSheet
      visible={visible} onClose={onClose} title="Nouvelle opération" submitLabel="Enregistrer"
      initial={{ type: typeInitial, categorie: '' }}
      fields={[
        { name: 'type', label: 'Type', type: 'select', options: [{ value: 'depense', label: 'Dépense' }, { value: 'recette', label: 'Recette' }], default: typeInitial },
        { name: 'categorie', label: 'Catégorie', type: 'select', required: true, options: (v) => optionsCategories(v.type), default: '' },
        { name: 'montant', label: 'Montant (FCFA)', type: 'number', required: true, positive: true, max: 1e9 },
        { name: 'description', label: 'Description', type: 'text', required: true, maxLen: 120, placeholder: 'Ex. Sacs d\'aliment ponte' },
        { name: 'date', label: 'Date', type: 'date', required: true, futur: false, default: todayStr },
      ]}
      check={(v) => (categorieValide(v.type, v.categorie) ? {} : { categorie: 'Choisissez une catégorie.' })}
      onSubmit={(v) => onSave({
        type: v.type, categorie: v.categorie, montant: v.montant, description: v.description, date: v.date, devise: 'FCFA',
      })}
    />
  );
}
