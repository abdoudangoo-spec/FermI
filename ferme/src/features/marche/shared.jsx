import { View, Text } from 'react-native';
import { Sheet, ListItem } from '../../components/ui';

export const CATEGORIES_MARCHE = [
  { value: 'animaux_vivants', label: 'Animaux vivants', icon: 'paw-outline' },
  { value: 'oeufs', label: 'Œufs', icon: 'egg-outline' },
  { value: 'lait', label: 'Lait', icon: 'water-outline' },
  { value: 'viande', label: 'Viande', icon: 'restaurant-outline' },
  { value: 'fiente', label: 'Fiente et fumier', icon: 'leaf-outline' },
  { value: 'aliment', label: 'Aliment du bétail', icon: 'nutrition-outline' },
  { value: 'materiel', label: 'Matériel', icon: 'construct-outline' },
  { value: 'intrants', label: 'Vaccins et médicaments', icon: 'medkit-outline' },
];

export const CATEGORIES_FORUM = [
  { value: 'sante', label: 'Santé animale' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'batiment', label: 'Construction' },
  { value: 'prix', label: 'Prix du marché' },
  { value: 'conseil', label: 'Conseils généraux' },
  { value: 'urgence', label: 'Urgence sanitaire' },
];

export const MOTIFS_SIGNALEMENT = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'inapproprie', label: 'Contenu inapproprié' },
  { value: 'arnaque', label: 'Arnaque ou fraude suspectée' },
  { value: 'illegal', label: 'Contenu illégal ou animal protégé' },
  { value: 'autre', label: 'Autre raison' },
];

export const iconeCategorie = (v) => CATEGORIES_MARCHE.find((c) => c.value === v)?.icon || 'pricetag-outline';
export const libelle = (liste, v) => liste.find((c) => c.value === v)?.label || v;

/** Horodatage Firestore (Timestamp) → millisecondes ; null tant que le serveur n'a pas répondu. */
export function millis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

/** Feuille d'actions (signaler, bloquer, supprimer…). */
export function MenuActions({ visible, onClose, title = 'Actions', actions }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View>
        {actions.map((a) => (
          <ListItem key={a.label} icon={a.icon} title={a.label} destructive={a.destructive}
            onPress={() => { onClose(); a.onPress(); }} />
        ))}
        {actions.length === 0 ? <Text>Aucune action disponible.</Text> : null}
      </View>
    </Sheet>
  );
}
