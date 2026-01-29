import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

// #region agent log
const envCheck = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0,10)}...` : 'undefined',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'undefined',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'undefined',
  allEnvKeys: Object.keys(import.meta.env).filter(k=>k.startsWith('VITE_'))
};
console.error('[FIREBASE DEBUG] Env vars:', envCheck);
fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:7',message:'Env vars check',data:envCheck,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDhhokXIbPeOWiTFoCVWUFKXxPG1qWBAPM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tamis-app-beta.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tamis-app-beta',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tamis-app-beta.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '887201501944',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:887201501944:web:0ac229b93e0841ed8ea10d',
};

// #region agent log
const configCheck = {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0,10)}...` : 'undefined',
  authDomain: firebaseConfig.authDomain || 'undefined',
  projectId: firebaseConfig.projectId || 'undefined',
  hasApiKey: !!firebaseConfig.apiKey,
  usingFallback: !import.meta.env.VITE_FIREBASE_API_KEY
};
console.error('[FIREBASE DEBUG] Config before init:', configCheck);
if (configCheck.usingFallback) {
  console.error('[FIREBASE DEBUG] ⚠️ USING FALLBACK VALUES - Environment variables not set in hosting platform!');
}
fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:18',message:'Firebase config before init',data:configCheck,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

let app;
try {
  app = initializeApp(firebaseConfig);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:25',message:'Firebase init success',data:{appName:app.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firebase.ts:28',message:'Firebase init error',data:{error:error?.message||String(error),code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  throw error;
}

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
