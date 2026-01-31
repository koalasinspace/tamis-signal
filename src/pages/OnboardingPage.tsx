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
    <div className="min-h-screen bg-slate-950 text-purple-50 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />
      <div className="relative z-10 w-full">
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

