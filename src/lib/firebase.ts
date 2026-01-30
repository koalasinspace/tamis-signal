import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

// Firebase configuration - all values must come from environment variables
// No hardcoded fallbacks to prevent accidental key exposure in source control
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Runtime validation - fail fast if config is missing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase configuration missing. Ensure VITE_FIREBASE_* environment variables are set.'
  );
}

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
