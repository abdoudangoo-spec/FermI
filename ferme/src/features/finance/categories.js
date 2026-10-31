import { CATEGORIES_DEPENSES, CATEGORIES_RECETTES } from '../../constants/especes';

export const nomCategorie = (id) => [...CATEGORIES_DEPENSES, ...CATEGORIES_RECETTES].find((c) => c.id === id)?.nom || id;
export const optionsCategories = (type) => (type === 'recette' ? CATEGORIES_RECETTES : CATEGORIES_DEPENSES).map((c) => ({ value: c.id, label: c.nom }));
export const categorieValide = (type, id) => optionsCategories(type).some((o) => o.value === id);
