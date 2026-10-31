// Messages d'erreur lisibles en français — jamais de détail technique affiché à l'utilisateur.
const AUTH = {
  'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/weak-password': 'Mot de passe trop faible.',
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/missing-password': 'Entrez votre mot de passe.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre accès à internet.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/requires-recent-login': 'Par sécurité, reconnectez-vous puis réessayez.',
  'auth/operation-not-allowed': "Ce mode de connexion n'est pas disponible pour le moment.",
  'auth/invalid-phone-number': "Numéro invalide. Vérifiez le pays et le numéro.",
  'auth/missing-phone-number': 'Numéro de téléphone manquant.',
  'auth/quota-exceeded': 'Trop de SMS envoyés. Réessayez plus tard.',
  'auth/session-expired': 'Session expirée. Demandez un nouveau code.',
  'auth/invalid-verification-code': 'Code incorrect. Vérifiez et réessayez.',
  'auth/code-expired': 'Code expiré. Demandez un nouveau SMS.',
  'auth/captcha-check-failed': 'Vérification anti-robot échouée. Réessayez.',
  'auth/credential-already-in-use': 'Ce numéro est déjà associé à un autre compte.',
};

export function messageErreur(e, defaut = "Une erreur est survenue. Réessayez dans un instant.") {
  const code = e?.code || '';
  if (AUTH[code]) return AUTH[code];
  if (code === 'permission-denied' || code === 'storage/unauthorized') return "Action non autorisée. Vérifiez que votre adresse email est confirmée.";
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'storage/retry-limit-exceeded' || /network|fetch/i.test(e?.message || '')) {
    return 'Connexion impossible. Vérifiez votre accès à internet.';
  }
  if (code === 'resource-exhausted') return 'Service momentanément saturé. Réessayez plus tard.';
  return defaut;
}

export const estErreurIdentifiants = (e) => ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(e?.code);
