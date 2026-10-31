// ═══════════════════════════════════════════════════════════
//  src/utils/images.js — Choix, compression et envoi de photos
//  La recompression JPEG supprime les métadonnées EXIF (position GPS incluse).
// ═══════════════════════════════════════════════════════════
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const TAILLE_MAX_OCTETS = 1.5 * 1024 * 1024;

async function ouvrirPicker(source) {
  const options = { mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1], exif: false };
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return { erreur: "Autorisez l'appareil photo dans les réglages du téléphone." };
    return ImagePicker.launchCameraAsync(options);
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { erreur: "Autorisez l'accès aux photos dans les réglages du téléphone." };
  return ImagePicker.launchImageLibraryAsync(options);
}

async function compresser(uri, largeur) {
  const res = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: largeur } }], {
    compress: 0.7, format: ImageManipulator.SaveFormat.JPEG,
  });
  return res.uri;
}

/** Choisit une photo, la compresse et l'envoie. dossier : 'avatars' | 'annonces'. */
export async function choisirEtEnvoyerPhoto({ uid, source = 'galerie', dossier, largeur }) {
  try {
    const result = await ouvrirPicker(source);
    if (result.erreur) return { erreur: result.erreur };
    if (result.canceled || !result.assets?.length) return { annule: true };
    const uri = await compresser(result.assets[0].uri, largeur || (dossier === 'avatars' ? 512 : 1080));
    const blob = await (await fetch(uri)).blob();
    if (blob.size > TAILLE_MAX_OCTETS) return { erreur: 'Photo trop lourde. Choisissez une image plus petite.' };
    const chemin = dossier === 'avatars' ? `avatars/${uid}.jpg` : `annonces/${uid}/${Date.now()}.jpg`;
    const r = ref(storage, chemin);
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    return { url: await getDownloadURL(r), chemin };
  } catch {
    return { erreur: "Impossible d'envoyer la photo. Vérifiez votre connexion et réessayez." };
  }
}
