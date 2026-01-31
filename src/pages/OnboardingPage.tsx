import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../lib/types";
import Onboarding from "../components/Onboarding";

export default function OnboardingPage() {
  const { currentUser, userData, setUserData } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return <Navigate to="/login" replace />;

  const seed: Partial<UserProfile> = {
    name: userData?.name ?? currentUser.displayName ?? "",
    email: userData?.email ?? currentUser.email ?? "",
    role: userData?.role ?? "user",
    personaMode: userData?.personaMode ?? "tami",
    subscriptionTier: userData?.subscriptionTier ?? "Free",
    joinDate: userData?.joinDate ?? new Date().toISOString(),
  };

  return (
    <div className="min-vh-100 bg-slate-950 text-slate-100 font-sans d-flex align-items-center justify-content-center p-4 position-relative overflow-hidden">
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'radial-gradient(circle at top, rgba(147, 51, 234, 0.15), transparent)' }} />
      <div className="position-relative z-10 w-100">
        <Onboarding
          initial={seed}
          onComplete={async ({ profile, weaveReport }) => {
            // Persist complete profile
            const withWeave: UserProfile = { ...profile, weaveReportLatest: weaveReport };
            await setDoc(doc(db, "users", currentUser.uid), withWeave, { merge: true });
            setUserData(withWeave);
            // Send user into the altar / editor after intake
            navigate("/soulprint", { replace: true });
          }}
        />
      </div>
    </div>
  );
}

