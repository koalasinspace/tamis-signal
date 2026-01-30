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
  birthTime: string;
  birthPlace: string;
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
  dnaTrait?: "Warrior" | "Worrier" | "Unknown"; // optional until DNA integration exists
  dailyTruth?: {
    date: string; // "YYYY-MM-DD"
    message: string;
    refreshCount?: number; // how many times refreshed today (max 3)
  };
  journalEntries?: Array<JournalEntry>;
  entropyScore?: number; // 0..100 (higher = more entropy/static)
  pushNotificationsEnabled?: boolean;
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
    subscriptionTier: "Free",
    joinDate: new Date().toISOString(),
  };
}
