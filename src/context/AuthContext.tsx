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
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: FirebaseUser | null) => {
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
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      const minimal = { ...createMinimalProfile(name, email), role: determineRole(email) };
      await setDoc(doc(db, "users", user.uid), minimal);
      setUserData(minimal);
    } catch (error: any) {
      // Handle case where user exists in Auth but not in Firestore (manually deleted)
      if (error?.code === "auth/email-already-in-use") {
        // Try to sign them in instead
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Check if Firestore doc exists
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // User exists in Auth but not Firestore - create the doc
            const minimal = { ...createMinimalProfile(name, email), role: determineRole(email) };
            await setDoc(docRef, minimal);
            setUserData(minimal);
          } else {
            // Doc exists, just update it with the new name if needed
            const existing = docSnap.data() as UserProfile;
            const updated = { ...existing, name, email, role: determineRole(email) };
            await setDoc(docRef, updated, { merge: true });
            setUserData(updated);
          }
        } catch (signInError: any) {
          // If sign-in fails, the password is wrong - throw original error
          throw error;
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = determineRole(userCredential.user.email ?? email);
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), { role }, { merge: true });
      } catch (err: unknown) {
        // ignore
      }
    } catch (error: any) {
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
