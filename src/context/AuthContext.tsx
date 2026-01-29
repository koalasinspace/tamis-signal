import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { UserProfile } from "../lib/types";
import { createMinimalProfile } from "../lib/types";

function determineRole(email: string | null | undefined): UserProfile["role"] {
  const normalized = (email || "").trim().toLowerCase();
  if (normalized === "tyler@dierks.email") return "admin";
  if (normalized === "tami@hawleymail.com") return "owner";
  return "user";
}

type AuthContextValue = {
  currentUser: FirebaseUser | null;
  userData: UserProfile | null;
  loading: boolean;
  setUserData: (d: UserProfile | null) => void;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:40',message:'Setting up auth listener',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: FirebaseUser | null) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:43',message:'Auth state changed',data:{hasUser:!!user,userId:user?.uid?.substring(0,8)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setCurrentUser(user);
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const desiredRole = determineRole(user.email);
            const currentRole = (data as any).role as UserProfile["role"] | undefined;
            if (!currentRole || currentRole !== desiredRole) {
              try {
                await setDoc(doc(db, "users", user.uid), { role: desiredRole }, { merge: true });
                setUserData({ ...data, role: desiredRole });
              } catch (err: unknown) {
                // fall back to whatever we have
                setUserData(data);
              }
            } else {
              setUserData(data);
            }
          }
          else setUserData(null);
        } else {
          setUserData(null);
        }
        setLoading(false);
      },
      (error: any) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:67',message:'Auth error in listener',data:{error:error?.message||String(error),code:error?.code,apiKeyError:error?.message?.includes('api-key')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await sendEmailVerification(user);
    const minimal = { ...createMinimalProfile(name, email), role: determineRole(email) };
    await setDoc(doc(db, "users", user.uid), minimal);
    setUserData(minimal);
  };

  const signIn = async (email: string, password: string) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:80',message:'SignIn attempt',data:{email:email.substring(0,10)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = determineRole(userCredential.user.email ?? email);
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), { role }, { merge: true });
      } catch (err: unknown) {
        // ignore
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:88',message:'SignIn error',data:{error:error?.message||String(error),code:error?.code,apiKeyError:error?.message?.includes('api-key')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  };

  const logOut = () => signOut(auth);

  const resendVerification = async () => {
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
    }
  };

  const value: AuthContextValue = {
    currentUser,
    userData,
    loading,
    setUserData,
    signUp,
    signIn,
    logOut,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
