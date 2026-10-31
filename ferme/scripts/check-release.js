// Bloque une publication si la configuration obligatoire est incomplète. Usage : npm run check:release
const requis = [
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'clé API Firebase'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'domaine Auth Firebase'],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'identifiant du projet Firebase'],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'bucket Storage'],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'sender ID'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'app ID'],
  ['EXPO_PUBLIC_SUPPORT_EMAIL', "adresse de contact (obligatoire : droits des utilisateurs, signalements)"],
  ['EXPO_PUBLIC_EDITEUR_NOM', "nom de l'éditeur (obligatoire dans les mentions légales)"],
];
const manquants = requis.filter(([k]) => !process.env[k] || /votre|exemple|xxx/i.test(process.env[k]));
if (manquants.length) {
  console.error('Configuration de publication incomplète :');
  manquants.forEach(([k, d]) => console.error(`  - ${k} : ${d}`));
  process.exit(1);
}
console.log('Configuration de publication OK');
