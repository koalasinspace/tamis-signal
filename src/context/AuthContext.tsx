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
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../lib/firebase";
import type { UserProfile } from "../lib/types";
import { createMinimalProfile } from "../lib/types";

/**
 * Gets user role from Firebase Auth custom claims (set server-side).
 * If no role claim exists, calls ensureUserRole to set it (for migration).
 * Custom claims are set by the beforeUserCreated Cloud Function for new users.
 */
async function getRoleFromToken(user: FirebaseUser): Promise<UserProfile["role"]> {
  try {
    // Check current token for role claim
    let tokenResult = await user.getIdTokenResult(false);
    let role = tokenResult.claims.role as UserProfile["role"] | undefined;
    
    // If no role in claims, call ensureUserRole to set it (migration for existing users)
    if (!role) {
      try {
        const ensureUserRole = httpsCallable<unknown, { role: string; wasSet: boolean }>(functions, "ensureUserRole");
        const result = await ensureUserRole({});
        if (result.data.wasSet) {
          // Role was just set, force token refresh to get new claims
          tokenResult = await user.getIdTokenResult(true);
          role = tokenResult.claims.role as UserProfile["role"] | undefined;
        } else {
          role = result.data.role as UserProfile["role"];
        }
      } catch (ensureError) {
        console.error("[AuthContext] Failed to ensure role:", ensureError);
        // Fall back to user role
        role = "user";
      }
    }
    
    return role || "user";
  } catch (error) {
    console.error("[AuthContext] Failed to get role from token:", error);
    return "user";
  }
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
          try {
            // Get role from Firebase Auth custom claims (server-enforced)
            const role = await getRoleFromToken(user);
            
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              // Always use the role from custom claims (server-side truth)
              setUserData({ ...data, role });
            } else {
              setUserData(null);
            }
          } catch (firestoreError) {
            console.error("[AuthContext] Failed to load user data from Firestore", firestoreError);
            // Set userData to null so routing can proceed (user will be sent to soulprint page)
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
        setLoading(false);
      },
      (error: any) => {
        console.error("[AuthContext] Auth state change error", error);
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
      
      // Role is set server-side by onUserCreate Cloud Function
      // Wait a moment for the trigger to complete, then get the role
      await new Promise(resolve => setTimeout(resolve, 1000));
      const role = await getRoleFromToken(user);
      
      const minimal = { ...createMinimalProfile(name, email), role };
      await setDoc(doc(db, "users", user.uid), minimal);
      setUserData(minimal);
    } catch (error: any) {
      // Handle case where user exists in Auth but not in Firestore (manually deleted)
      if (error?.code === "auth/email-already-in-use") {
        // Try to sign them in instead
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Get role from custom claims (server-side)
          const role = await getRoleFromToken(user);
          
          // Check if Firestore doc exists
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // User exists in Auth but not Firestore - create the doc
            const minimal = { ...createMinimalProfile(name, email), role };
            await setDoc(docRef, minimal);
            setUserData(minimal);
          } else {
            // Doc exists, update with role from server
            const existing = docSnap.data() as UserProfile;
            setUserData({ ...existing, role });
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
      // Role is read from custom claims during onAuthStateChanged
      // No need to write role here - it's managed server-side
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
