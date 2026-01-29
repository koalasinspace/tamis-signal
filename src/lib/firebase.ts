import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDhhokXIbPeOWiTFoCVWUFKXxPG1qWBAPM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tamis-app-beta.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tamis-app-beta',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tamis-app-beta.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '887201501944',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:887201501944:web:0ac229b93e0841ed8ea10d',
};

let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  throw error;
}

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
