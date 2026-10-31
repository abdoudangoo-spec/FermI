// Stockage sécurisé (Keychain iOS / Keystore Android) pour les secrets, ex. clé du contrôleur IoT.
import * as SecureStore from 'expo-secure-store';

const CLE_PI = 'fermi.pi.token';

export async function lireCleControleur() {
  try { return (await SecureStore.getItemAsync(CLE_PI)) || ''; } catch { return ''; }
}

export async function ecrireCleControleur(valeur) {
  try {
    if (!valeur) await SecureStore.deleteItemAsync(CLE_PI);
    else await SecureStore.setItemAsync(CLE_PI, valeur);
    return true;
  } catch { return false; }
}
