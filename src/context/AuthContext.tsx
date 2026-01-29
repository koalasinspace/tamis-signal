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

// #region agent log
const __agentLog = (p: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
}) => {
  fetch("http://127.0.0.1:7242/ingest/e6210c2a-f7f1-4292-a851-ae35264b57ce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: p.runId ?? "pre-fix",
      hypothesisId: p.hypothesisId,
      location: p.location,
      message: p.message,
      data: p.data ?? {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

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
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) {
        __agentLog({
          hypothesisId: "H-auth-email",
          location: "AuthContext.tsx:onAuthStateChanged",
          message: "auth state user present",
          data: { emailPresent: !!user.email },
        });
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const desiredRole = determineRole(user.email);
          const currentRole = (data as any).role as UserProfile["role"] | undefined;
          __agentLog({
            hypothesisId: "H-role-source",
            location: "AuthContext.tsx:onAuthStateChanged",
            message: "role evaluation (doc vs desired)",
            data: {
              docExists: true,
              currentRole: currentRole ?? "missing",
              desiredRole,
              willUpdate: !currentRole || currentRole !== desiredRole,
            },
          });
          if (!currentRole || currentRole !== desiredRole) {
            try {
              await setDoc(doc(db, "users", user.uid), { role: desiredRole }, { merge: true });
              __agentLog({
                hypothesisId: "H-firestore-write",
                location: "AuthContext.tsx:onAuthStateChanged",
                message: "role merge write succeeded",
                data: { desiredRole },
              });
              setUserData({ ...data, role: desiredRole });
            } catch (err: unknown) {
              __agentLog({
                hypothesisId: "H-firestore-write",
                location: "AuthContext.tsx:onAuthStateChanged",
                message: "role merge write FAILED",
                data: { desiredRole, error: err instanceof Error ? err.message : String(err) },
              });
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
    });
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const role = determineRole(userCredential.user.email ?? email);
    __agentLog({
      hypothesisId: "H-auth-email",
      location: "AuthContext.tsx:signIn",
      message: "signIn determined role",
      data: { role },
    });
    try {
      await setDoc(doc(db, "users", userCredential.user.uid), { role }, { merge: true });
      __agentLog({
        hypothesisId: "H-firestore-write",
        location: "AuthContext.tsx:signIn",
        message: "signIn role merge succeeded",
        data: { role },
      });
    } catch (err: unknown) {
      __agentLog({
        hypothesisId: "H-firestore-write",
        location: "AuthContext.tsx:signIn",
        message: "signIn role merge FAILED",
        data: { role, error: err instanceof Error ? err.message : String(err) },
      });
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
