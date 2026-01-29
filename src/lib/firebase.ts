import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7EZB6IAX6a2JOoxB6dxBC6MQIXbAV5Pw",
  authDomain: "tamis-app-beta.firebaseapp.com",
  projectId: "tamis-app-beta",
  storageBucket: "tamis-app-beta.firebasestorage.app",
  messagingSenderId: "887201501944",
  appId: "1:887201501944:web:0ac229b93e0841ed8ea10d",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
