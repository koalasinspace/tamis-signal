export interface JournalEntry {
  id?: string; // optional for backward compatibility with existing Firestore data
  date: string;
  prompt: string;
  entry: string;
}

export interface UserProfile {
  name: string;
  email: string;
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
  dailyTruth?: {
    date: string; // "YYYY-MM-DD"
    message: string;
  };
  journalEntries?: Array<JournalEntry>;
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
    subscriptionTier: "Free",
    joinDate: new Date().toISOString(),
  };
}
