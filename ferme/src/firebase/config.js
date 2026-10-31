// ═══════════════════════════════════════════════════════════
//  src/firebase/config.js — Initialisation Firebase
//  Les identifiants viennent des variables EXPO_PUBLIC_* (voir .env.example).
//  Une clé Firebase côté client n'est pas un secret : la protection des
//  données repose sur firestore.rules / storage.rules (à déployer).
// ═══════════════════════════════════════════════════════════
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// eslint-disable-next-line import/named
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Accès littéral obligatoire : Expo remplace process.env.EXPO_PUBLIC_* à la compilation.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const manquants = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
export const firebaseConfigure = manquants.length === 0;
if (!firebaseConfigure) logger.warn(`[Firebase] Variables manquantes : ${manquants.join(', ')}`);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
