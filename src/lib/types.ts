export interface JournalEntry {
  id?: string; // optional for backward compatibility with existing Firestore data
  date: string;
  prompt: string;
  entry: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: "user" | "dev" | "admin" | "owner"; // roles come from server-side custom claims
  personaMode?: "tami" | "oracle"; // which persona voice to use for generative features
  soulprintComplete?: boolean;
  birthday: string;
  /** Required for Rising Sign / Secret Animal (HH:MM). */
  birthTime: string;
  /**
   * Required for Geomancy/Nature. City/Country string.
   * Backward compatible with older `birthPlace` field.
   */
  birthLocation: string;
  /**
   * Legacy field kept for backward compatibility with existing Firestore docs.
   * Prefer `birthLocation`.
   */
  birthPlace?: string;
  zodiacSign: string;
  favoriteColor: string;
  favoriteNumber: string;
  destinyNumber: number;
  tarotArchetype: string;
  planetaryRuler?: string;
  chineseZodiac?: string;
  chineseElement?: string;
  lifePathNumber?: number;
  moonPhase?: string;
  celticTree?: string;
  monologueStyle?: "Verbal" | "Visual" | "Anendophasic" | "Musical" | "Anauralic";
  /**
   * Optional manual entry for now (DNA integration later).
   * These values are used for inference (sonification + weave checks).
   */
  helixTraits?: {
    comtStatus?: "Warrior (Met/Met)" | "Worrier (Val/Val)" | "Balanced" | "Unknown";
    drd4Status?: "Seeker (7R+)" | "Settler (No 7R)" | "Unknown";
    oxtrStatus?: "Empath (GG)" | "Lone Wolf (AA)" | "Unknown";
    bdnfStatus?: "Plastic (Val/Val)" | "Rigid (Met Carrier)" | "Unknown";
    faahStatus?: "Stoic (A Carrier)" | "Sensitive (CC)" | "Unknown";
  };
  /**
   * Optional manual entry for Geomancy until a real location→figure mapping exists.
   * Used by the Weaver laws (e.g., Carcer).
   */
  geomancyFigure?: string;
  /**
   * Legacy field kept for backward compatibility with earlier sonification prototype.
   * Prefer `helixTraits.comtStatus`.
   */
  dnaTrait?: "Warrior" | "Worrier" | "Unknown";
  dailyTruth?: {
    date: string; // "YYYY-MM-DD"
    message: string;
    refreshCount?: number; // how many times refreshed today (max 3)
  };
  journalEntries?: Array<JournalEntry>;
  entropyScore?: number; // 0..100 (higher = more entropy/static)
  pushNotificationsEnabled?: boolean;
  /** Latest deterministic weave report output (cached for UI + prompts). */
  weaveReportLatest?: string;
  subscriptionTier: "Free" | "Premium";
  joinDate: string;
}

export function createMinimalProfile(
  name: string,
  email: string
): UserProfile {
  return {
    name,
    email,
    role: "user",
    personaMode: "tami",
    soulprintComplete: false,
    birthday: "",
    birthTime: "",
    birthLocation: "",
    birthPlace: "",
    zodiacSign: "",
    favoriteColor: "",
    favoriteNumber: "",
    destinyNumber: 0,
    tarotArchetype: "",
    planetaryRuler: "",
    chineseZodiac: "",
    chineseElement: "",
    lifePathNumber: 0,
    moonPhase: "",
    celticTree: "",
    dnaTrait: "Unknown",
    monologueStyle: "Verbal",
    helixTraits: {
      comtStatus: "Unknown",
      drd4Status: "Unknown",
      oxtrStatus: "Unknown",
      bdnfStatus: "Unknown",
      faahStatus: "Unknown",
    },
    subscriptionTier: "Free",
    joinDate: new Date().toISOString(),
  };
}
