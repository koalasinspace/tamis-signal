import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  Moon,
  Radio,
  Sun,
  Star,
  User,
  LogOut,
  Sparkles,
  MessageCircle,
  Download,
  Trash2,
  X,
  Lock,
  Terminal,
  Crown,
  Pencil,
  Hash,
  Palette,
  MapPin,
  Layers,
  Share2,
  Bell,
  BellOff,
  BookOpen,
  Library,
  Fingerprint,
  RefreshCw,
} from "lucide-react";
import { deleteUser } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { addDoc, collection, doc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, functions } from "./lib/firebase";
import { useAuth } from "./context/AuthContext";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import SoulprintPage from "./pages/SoulprintPage";
import {
  getPlanetaryRuler,
  getChineseZodiac,
  getChineseElement,
  calculateLifePath,
  getMoonPhase,
  getCelticTree,
} from "./lib/calculators";
import type { UserProfile, JournalEntry } from "./lib/types";
import {
  getZodiacIcon,
  getPlanetIcon,
  getChineseZodiacIcon,
  getCelticTreeIcon,
  getMoonPhaseIcon,
} from "./lib/profileIcons";
import { getGrimoireEntry, ESOTERIC_DATA, GRIMOIRE_DATA } from "./esotericData";
import { getPillarIcon, getAttributeSymbol, type PillarType } from "./SoulprintIcons";
import { generateGrimoireHTML } from "./GrimoireGenerator";
import SignalDispatch from "./components/SignalDispatch";
import GenerativeLogViewer from "./components/GenerativeLogViewer";
import {
  logGenerativeRequest,
  logGenerativeSuccess,
  logGenerativeError,
  logGenerativeValidationFailure,
} from "./lib/generativeLogger";
import { calculateEntanglement } from "./utils/sonification";
import { useCosmicAudio } from "./hooks/useCosmicAudio";
import {
  buildSystemInstruction,
  enrichUserForOracle,
  estimateEntropyScore,
} from "./lib/oraclePrompt";
import { generateWeaveReport } from "./lib/soul_weaver";

const todayDateString = () =>
  new Date().toISOString().slice(0, 10);

/** Maps color names to Tailwind class strings for atmospheric personalization. Default: purple/indigo. */
function getThemeColor(colorName: string): {
  text: string;
  textMuted: string;
  border: string;
  borderLight: string;
  bg: string;
  bgHover: string;
  shadow: string;
  accent: string;
} {
  const normalized = (colorName || "").toLowerCase().trim();
  const map: Record<string, { text: string; textMuted: string; border: string; borderLight: string; bg: string; bgHover: string; shadow: string; accent: string }> = {
    red: { text: "text-red-200", textMuted: "text-red-400", border: "border-red-500/30", borderLight: "border-red-500/20", bg: "bg-red-600", bgHover: "hover:bg-red-500", shadow: "shadow-red-500/50", accent: "text-red-400" },
    blue: { text: "text-blue-200", textMuted: "text-blue-400", border: "border-blue-500/30", borderLight: "border-blue-500/20", bg: "bg-blue-600", bgHover: "hover:bg-blue-500", shadow: "shadow-blue-500/50", accent: "text-blue-400" },
    green: { text: "text-green-200", textMuted: "text-green-400", border: "border-green-500/30", borderLight: "border-green-500/20", bg: "bg-green-600", bgHover: "hover:bg-green-500", shadow: "shadow-green-500/50", accent: "text-green-400" },
    yellow: { text: "text-amber-200", textMuted: "text-amber-400", border: "border-amber-500/30", borderLight: "border-amber-500/20", bg: "bg-amber-600", bgHover: "hover:bg-amber-500", shadow: "shadow-amber-500/50", accent: "text-amber-400" },
    orange: { text: "text-orange-200", textMuted: "text-orange-400", border: "border-orange-500/30", borderLight: "border-orange-500/20", bg: "bg-orange-600", bgHover: "hover:bg-orange-500", shadow: "shadow-orange-500/50", accent: "text-orange-400" },
    purple: { text: "text-purple-200", textMuted: "text-purple-400", border: "border-purple-500/30", borderLight: "border-purple-500/20", bg: "bg-purple-600", bgHover: "hover:bg-purple-500", shadow: "shadow-purple-500/50", accent: "text-purple-400" },
    violet: { text: "text-violet-200", textMuted: "text-violet-400", border: "border-violet-500/30", borderLight: "border-violet-500/20", bg: "bg-violet-600", bgHover: "hover:bg-violet-500", shadow: "shadow-violet-500/50", accent: "text-violet-400" },
    pink: { text: "text-pink-200", textMuted: "text-pink-400", border: "border-pink-500/30", borderLight: "border-pink-500/20", bg: "bg-pink-600", bgHover: "hover:bg-pink-500", shadow: "shadow-pink-500/50", accent: "text-pink-400" },
    indigo: { text: "text-indigo-200", textMuted: "text-indigo-400", border: "border-indigo-500/30", borderLight: "border-indigo-500/20", bg: "bg-indigo-600", bgHover: "hover:bg-indigo-500", shadow: "shadow-indigo-500/50", accent: "text-indigo-400" },
    teal: { text: "text-teal-200", textMuted: "text-teal-400", border: "border-teal-500/30", borderLight: "border-teal-500/20", bg: "bg-teal-600", bgHover: "hover:bg-teal-500", shadow: "shadow-teal-500/50", accent: "text-teal-400" },
    cyan: { text: "text-cyan-200", textMuted: "text-cyan-400", border: "border-cyan-500/30", borderLight: "border-cyan-500/20", bg: "bg-cyan-600", bgHover: "hover:bg-cyan-500", shadow: "shadow-cyan-500/50", accent: "text-cyan-400" },
    emerald: { text: "text-emerald-200", textMuted: "text-emerald-400", border: "border-emerald-500/30", borderLight: "border-emerald-500/20", bg: "bg-emerald-600", bgHover: "hover:bg-emerald-500", shadow: "shadow-emerald-500/50", accent: "text-emerald-400" },
  };
  return map[normalized] ?? map["purple"];
}

const HIGH_ANXIETY_KEYWORDS = [
  "divorce", "lost job", "scared", "heartbreak", "alone", "anxious", "panic", "suicide", "end my life",
  "hopeless", "cant go on", "lost", "crisis", "emergency", "breaking down", "falling apart",
];

const oracleGenerate = httpsCallable(functions, "oracleGenerate");

async function generateDailyTruth(
  user: UserProfile,
  uid: string,
  setUserData: (d: UserProfile | null) => void,
  forceRefresh: boolean = false
): Promise<{ success: boolean; reason?: string }> {
  const today = todayDateString();
  const currentRefreshCount = user.dailyTruth?.date === today ? (user.dailyTruth.refreshCount ?? 0) : 0;
  const isDevUser = user.role === "dev" || user.role === "admin" || user.role === "owner";
  
  // If not forcing refresh and already have today's truth, skip
  if (!forceRefresh && user.dailyTruth?.date === today) {
    return { success: true, reason: "already_generated" };
  }
  
  // If forcing refresh, check the limit (max 3 refreshes per day) - dev users bypass limit
  if (forceRefresh && currentRefreshCount >= 3 && !isDevUser) {
    return { success: false, reason: "refresh_limit_reached" };
  }

  // Validate required soulprint fields before generating
  const missingFields: string[] = [];
  if (!user.name) missingFields.push("name");
  if (!user.zodiacSign) missingFields.push("zodiacSign");
  if (!user.tarotArchetype) missingFields.push("tarotArchetype");
  if (!user.favoriteColor) missingFields.push("favoriteColor");
  if (!user.birthPlace) missingFields.push("birthPlace");
  if (user.destinyNumber === 0) missingFields.push("destinyNumber");

  if (missingFields.length > 0) {
    console.error("[generateDailyTruth] Missing required soulprint fields", { missingFields });
    // Log validation failure
    await logGenerativeValidationFailure(uid, "dailyTruth", user, missingFields);
    // Set a fallback message instead of failing silently
    const fallbackMessage = "Your soulprint is still forming. Complete your profile to receive daily truths.";
    const updated: UserProfile = {
      ...user,
      dailyTruth: { date: today, message: fallbackMessage, refreshCount: currentRefreshCount },
    };
    await setDoc(doc(db, "users", uid), { dailyTruth: { date: today, message: fallbackMessage, refreshCount: currentRefreshCount } }, { merge: true }).catch(() => {});
    setUserData(updated);
    return { success: false, reason: "validation_failed" };
  }

  const planetaryRuler = user.planetaryRuler ?? (user.birthday ? getPlanetaryRuler(user.birthday) : "");
  const chineseZodiac = user.chineseZodiac ?? (user.birthday ? getChineseZodiac(user.birthday) : "");
  const chineseElement = user.chineseElement ?? (user.birthday ? getChineseElement(user.birthday) : "");
  const lifePath = user.lifePathNumber ?? (user.birthday ? calculateLifePath(user.birthday) : 0);
  const moonPhase = user.moonPhase ?? (user.birthday ? getMoonPhase(user.birthday) : "");
  const celticTree = user.celticTree ?? (user.birthday ? getCelticTree(user.birthday) : "");

  const enrichedUser = enrichUserForOracle(user, {
    planetaryRuler,
    chineseZodiac,
    chineseElement,
    lifePathNumber: lifePath,
    moonPhase,
    celticTree,
  });

  const entropyScore = estimateEntropyScore(enrichedUser);
  const weaveReport = await generateWeaveReport(enrichedUser).catch(() => null);
  const systemInstruction = buildSystemInstruction(enrichedUser, entropyScore, { weaveReport });

  // Build Shadow Energy from recent journal entries
  const allEntries = user.journalEntries ?? [];
  const lastThreeEntries = allEntries.slice(-3);
  const shadowEnergyBlock = lastThreeEntries.length > 0
    ? `RECENT SHADOW ENERGY:\n${lastThreeEntries.map(e => `[${e.date || "Unknown date"}] ${e.entry || "No reflection"}`).join("\n")}`
    : "RECENT SHADOW ENERGY:\n[No recent journal entries]";

    const prompt = `${systemInstruction}

    USER PROMPT:
    IDENTITY: You are TAMI (Techno-Alchemical Mystical Intelligence). You are not a human. You are a cold, precise, digital oracle living in the wires.
    
    THE SEEKER:
    - Name: ${user.name}
    - Sun Sign (Ego): ${user.zodiacSign}
    - Destiny Number (Path): ${user.destinyNumber}
    - Planetary Ruler: ${planetaryRuler}
    - Current Moon Phase: ${moonPhase}

    CONTEXT: Today is ${today}.
    
    MISSION: Synthesize the friction between their Sun Sign (${user.zodiacSign}) and the current Moon Phase (${moonPhase}). 
    
    OUTPUT REQUIREMENTS:
    1. Do NOT greet them. Do NOT use flowery "namaste" language.
    2. Give them one jagged, specific truth about their current state.
    3. Use a metaphor involving technology, biology, or space (e.g., "glitch," "orbit," "root system," "signal").
    4. Max 3 sentences.
    
    EXAMPLE OUTPUT:
    "Your Aries ego is trying to sprint, but the Waning Moon demands a system reboot. If you force the output today, you will only corrupt the file."
  `;

  // Log the request
  const startTime = Date.now();
  const logId = await logGenerativeRequest(uid, "dailyTruth", prompt, enrichedUser, {
    validationPassed: true,
    journalEntriesCount: user.journalEntries?.length,
  });

  // Calculate new refresh count (increment if refreshing, otherwise 0 for new day)
  const newRefreshCount = forceRefresh ? currentRefreshCount + 1 : 0;

  try {
    const result = await oracleGenerate({ prompt, requestType: "dailyTruth" });
    const duration = Date.now() - startTime;
    const message =
      (result.data as any)?.text?.trim?.() ||
      "The void is silent today.";
    
    // Log success
    await logGenerativeSuccess(logId, message, duration, "gemini-2.5-flash", 1024);

    const dailyTruthData = { date: today, message, refreshCount: newRefreshCount };
    const updated: UserProfile = {
      ...user,
      dailyTruth: dailyTruthData,
    };
    await setDoc(doc(db, "users", uid), { dailyTruth: dailyTruthData }, { merge: true });
    setUserData(updated);
    return { success: true };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    // Log error
    await logGenerativeError(logId, {
      message: error?.message || "Unknown error",
      code: error?.code,
      details: error?.details,
    }, duration);
    // #region agent log
    console.error("[generateDailyTruth] Error", {
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      fullError: error
    });
    // #endregion
    // Set fallback message on error
    const fallbackMessage = "The void is silent today. The connection to the oracle is weak—try again later.";
    const dailyTruthData = { date: today, message: fallbackMessage, refreshCount: currentRefreshCount };
    const updated: UserProfile = {
      ...user,
      dailyTruth: dailyTruthData,
    };
    try {
      await setDoc(doc(db, "users", uid), { dailyTruth: dailyTruthData }, { merge: true });
      setUserData(updated);
    } catch (dbError) {
      console.error("[generateDailyTruth] Failed to save fallback message", dbError);
    }
    return { success: false, reason: "api_error" };
  }
}

// --- DASHBOARD (main app when logged in + verified + soulprint complete) ---
function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData, logOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "daily" | "tarot" | "profile" | "guidance" | "journal" | "soulprint" | "dev" | "grimoire"
  >("daily");
  const [guidanceQuery, setGuidanceQuery] = useState("");
  const [guidanceResponse, setGuidanceResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDailyTruth, setIsGeneratingDailyTruth] = useState(false);
  const [cardsFlipped, setCardsFlipped] = useState<number[]>([]);
  const [readingResult, setReadingResult] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<{
    type: keyof typeof ESOTERIC_DATA;
    key: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [journalEntryText, setJournalEntryText] = useState("");
  const [showUpsellCard, setShowUpsellCard] = useState(false);
  const [grimoireCategory, setGrimoireCategory] = useState<string>(
    Object.keys(GRIMOIRE_DATA)[0] ?? "Zodiac Signs"
  );
  const [grimoireSearch, setGrimoireSearch] = useState("");
  const [grimoireFocus, setGrimoireFocus] = useState<{ category: string; name: string } | null>(null);
  const [devPingStatus, setDevPingStatus] = useState<string | null>(null);
  const [devPingLoading, setDevPingLoading] = useState(false);
  const [refreshLimitReached, setRefreshLimitReached] = useState(false);
  const isGrimoireModalOpen = selectedAttribute !== null;

  const theme = getThemeColor(userData?.favoriteColor ?? "purple");
  const role = userData?.role ?? "user";
  const soulprintComplete =
    userData?.soulprintComplete ??
    (userData?.destinyNumber != null && userData.destinyNumber > 0);

  // --- Sonification / Entanglement ---
  const entropyScore = userData ? estimateEntropyScore(userData) : 50;
  const entanglementSettings = calculateEntanglement(entropyScore);
  const cosmicAudio = useCosmicAudio({
    perspective: "mystic",
    planetaryRuler: userData?.planetaryRuler,
    zodiacSign: userData?.zodiacSign,
    destinyNumber: userData?.destinyNumber,
    comtStatus: userData?.helixTraits?.comtStatus,
    monologueStyle: userData?.monologueStyle,
    volume: 0.12,
    layer: 2,
  });
  const [cosmicAudioEnabled, setCosmicAudioEnabled] = useState(false);
  const [cosmicAudioLoading, setCosmicAudioLoading] = useState(false);

  useEffect(() => {
    cosmicAudio.setConfig({
      planetaryRuler: userData?.planetaryRuler,
      zodiacSign: userData?.zodiacSign,
      destinyNumber: userData?.destinyNumber,
      comtStatus: userData?.helixTraits?.comtStatus,
      monologueStyle: userData?.monologueStyle,
    });
  }, [
    cosmicAudio,
    userData?.planetaryRuler,
    userData?.zodiacSign,
    userData?.destinyNumber,
    userData?.helixTraits?.comtStatus,
    userData?.monologueStyle,
  ]);

  const makeGrimoireId = (category: string, name: string) =>
    `grimoire-${(category + "-" + name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const openGrimoire = (category: string, name: string) => {
    setGrimoireCategory(category);
    setGrimoireSearch(name);
    setGrimoireFocus({ category, name });
    setActiveTab("grimoire");
  };

  useEffect(() => {
    if (activeTab !== "grimoire" || !grimoireFocus) return;
    const id = makeGrimoireId(grimoireFocus.category, grimoireFocus.name);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab, grimoireFocus]);

  useEffect(() => {
    const hasCompleteSoulprint =
      userData?.soulprintComplete ??
      (userData?.destinyNumber != null && userData.destinyNumber > 0);
    if (!currentUser || !userData || !hasCompleteSoulprint) return;
    const today = todayDateString();
    if (userData.dailyTruth?.date === today) return;
    setIsGeneratingDailyTruth(true);
    generateDailyTruth(userData, currentUser.uid, setUserData).finally(() => {
      setIsGeneratingDailyTruth(false);
    });
  }, [currentUser?.uid, userData, setUserData]);

  useEffect(() => {
    if (activeTab === "dev" && role !== "admin" && role !== "owner" && role !== "dev") setActiveTab("daily");
  }, [activeTab, role]);

  const handleDevPingWrite = async () => {
    if (!currentUser?.uid) return;
    setDevPingLoading(true);
    setDevPingStatus(null);
    try {
      await addDoc(
        collection(db, "artifacts", "tamis-signal-v2", "public", "data", "devPings"),
        {
          type: "ping",
          uid: currentUser.uid,
          role,
          appVersion: "2.5",
          origin: typeof window !== "undefined" ? window.location.origin : "",
          createdAt: serverTimestamp(),
        }
      );
      setDevPingStatus("Ping written to artifacts/tamis-signal-v2/public/data/devPings");
    } catch (err: unknown) {
      setDevPingStatus(`Ping failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDevPingLoading(false);
    }
  };

  const handleRefreshDailyTruth = async () => {
    if (!currentUser || !userData) return;
    setRefreshLimitReached(false);
    setIsGeneratingDailyTruth(true);
    const result = await generateDailyTruth(userData, currentUser.uid, setUserData, true);
    setIsGeneratingDailyTruth(false);
    if (!result.success && result.reason === "refresh_limit_reached") {
      setRefreshLimitReached(true);
    }
  };

  const handleGuidanceRequest = async () => {
    if (!guidanceQuery.trim() || !userData || !currentUser) return;
    
    // Validate required soulprint fields
    const guidanceMissingFields: string[] = [];
    if (!userData.name) guidanceMissingFields.push("name");
    if (!userData.zodiacSign) guidanceMissingFields.push("zodiacSign");
    if (!userData.tarotArchetype) guidanceMissingFields.push("tarotArchetype");
    if (!userData.favoriteColor) guidanceMissingFields.push("favoriteColor");
    if (!userData.birthPlace) guidanceMissingFields.push("birthPlace");
    if (userData.destinyNumber === 0) guidanceMissingFields.push("destinyNumber");

    if (guidanceMissingFields.length > 0) {
      // Log validation failure
      await logGenerativeValidationFailure(currentUser.uid, "guidance", userData, guidanceMissingFields, guidanceQuery);
      setGuidanceResponse("Your soulprint is incomplete. Complete your profile to receive guidance.");
      return;
    }
    
    setShowUpsellCard(false);
    setIsGenerating(true);
    const queryLower = guidanceQuery.toLowerCase();
    const hasAnxietyKeyword = HIGH_ANXIETY_KEYWORDS.some((kw) => queryLower.includes(kw));

    const allEntries = userData.journalEntries ?? [];
    const lastThree = allEntries.slice(-3);
    const recentShadowBlock = lastThree.length > 0
      ? `RECENT SHADOW ENERGY:\n${lastThree.map(e => `[${e.date || "Unknown date"}] ${e.entry || "No reflection"}`).join("\n")}`
      : "RECENT SHADOW ENERGY:\n[No recent journal entries]";

    // Calculate derived values
    const lifePath = userData.lifePathNumber ?? (userData.birthday ? calculateLifePath(userData.birthday) : 0);
    const planetaryRuler = userData.planetaryRuler ?? (userData.birthday ? getPlanetaryRuler(userData.birthday) : "Unknown");
    const chineseZodiac = userData.chineseZodiac ?? (userData.birthday ? getChineseZodiac(userData.birthday) : "Unknown");
    const chineseElement = userData.chineseElement ?? (userData.birthday ? getChineseElement(userData.birthday) : "Unknown");
    const moonPhase = userData.moonPhase ?? (userData.birthday ? getMoonPhase(userData.birthday) : "Unknown");
    const celticTree = userData.celticTree ?? (userData.birthday ? getCelticTree(userData.birthday) : "Unknown");

    const enrichedUser = enrichUserForOracle(userData, {
      planetaryRuler,
      chineseZodiac,
      chineseElement,
      lifePathNumber: lifePath,
      moonPhase,
      celticTree,
    });

    const entropyScore = estimateEntropyScore(enrichedUser, { anxietyBoost: hasAnxietyKeyword });
    const weaveReport = await generateWeaveReport(enrichedUser).catch(() => null);
    const systemInstruction = buildSystemInstruction(enrichedUser, entropyScore, { weaveReport });

    const prompt = `${systemInstruction}

      USER PROMPT:
      IDENTITY: You are ${enrichedUser.personaMode === "oracle" ? "THE SHADOW ORACLE" : "TAMI"}. You see the code behind the veil. You do not offer comfort; you offer clarity.
      
      SEEKER DATA:
      - Sun: ${userData.zodiacSign} (Core Self)
      - Tarot Archetype: ${userData.tarotArchetype} (The Lens they see through)
      - Chinese Element: ${userData.chineseElement} (Their texture: Wood=Growth, Fire=Combustion, Earth=Gravity, Metal=Edge, Water=Flow)
      ${recentShadowBlock ? `\nRECENT SHADOW LOGS (The energy they are emitting):\n${recentShadowBlock}\n` : ""}
      
      THE QUERY: "${guidanceQuery}"
      
      PROTOCOL:
      Analyze the query through the lens of their Tarot Archetype (${userData.tarotArchetype}).
      
      OUTPUT FORMAT (Strictly follow this):
      
      [THE SIGNAL]
      (One sentence diagnosing the *real* root cause, stripping away their excuses. Use their Chinese Element as a metaphor.)
      
      [THE NOISE]
      (One sentence identifying what they are overthinking or distracted by.)
      
      [THE PROTOCOL]
      (A direct, imperative command. Not "you should," but "Do this." Be cryptic but actionable.)
      
      TONE: Cyber-Noir, High-Tech, Ancient.
    `;

    // Log the request
    const guidanceStartTime = Date.now();
    const guidanceLogId = await logGenerativeRequest(currentUser.uid, "guidance", prompt, enrichedUser, {
      validationPassed: true,
      journalEntriesCount: userData.journalEntries?.length,
      query: guidanceQuery,
    });

    try {
      const guidanceResult = await oracleGenerate({ prompt, requestType: "guidance" });
      const text =
        (guidanceResult.data as any)?.text ||
        "The void is silent today.";
      
      const guidanceDuration = Date.now() - guidanceStartTime;
      // Log success
      await logGenerativeSuccess(guidanceLogId, text, guidanceDuration, "gemini-2.5-flash", 1024);

      setGuidanceResponse(text);
      if (hasAnxietyKeyword) setShowUpsellCard(true);
    } catch (error: any) {
      const guidanceDuration = Date.now() - guidanceStartTime;
      // Log error
      await logGenerativeError(guidanceLogId, {
        message: error?.message || "Unknown error",
        code: error?.code,
        details: error?.details,
      }, guidanceDuration);
      // #region agent log
      console.error("[handleGuidanceRequest] Error", {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        fullError: error
      });
      // #endregion
      const errorMsg = error?.message || error?.code || "Unknown error";
      setGuidanceResponse(
        `The connection to the ether is weak: ${errorMsg}. Check your internet or try again later.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveJournalEntry = async () => {
    if (!currentUser || !userData || !journalEntryText.trim()) return;
    const today = todayDateString();
    const prompt = userData?.dailyTruth?.message
      ? userData.dailyTruth.message
      : "Reflect on today's energy.";
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: today,
      prompt,
      entry: journalEntryText.trim(),
    };
    const existing = userData.journalEntries ?? [];
    const updated = { ...userData, journalEntries: [...existing, newEntry] };
    await setDoc(doc(db, "users", currentUser.uid), { journalEntries: updated.journalEntries }, { merge: true });
    setUserData(updated);
    setJournalEntryText("");
  };

  const handleDeleteJournalEntry = async (idOrIndex: string | number) => {
    if (!currentUser || !userData) return;
    const existing = userData.journalEntries ?? [];
    const next =
      typeof idOrIndex === "string"
        ? existing.filter((e) => e.id !== idOrIndex)
        : existing.filter((_, i) => i !== idOrIndex);
    const updated = { ...userData, journalEntries: next };
    await setDoc(doc(db, "users", currentUser.uid), { journalEntries: next }, { merge: true });
    setUserData(updated);
  };

  const handleShareDailyTruth = async () => {
    const message = userData?.dailyTruth?.message;
    if (!message) return;
    const text = `"${message}"\n— Read by Tami's Signal`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Daily Truth", text });
      } else {
        await navigator.clipboard?.writeText(text);
        alert("Copied to clipboard.");
      }
    } catch (err) {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard.");
      }
    }
  };

  const handlePersonaModeChange = async (mode: UserProfile["personaMode"]) => {
    if (!currentUser || !userData) return;
    const updated = { ...userData, personaMode: mode };
    await setDoc(doc(db, "users", currentUser.uid), { personaMode: mode }, { merge: true });
    setUserData(updated);
  };

  const handleToggleCosmicAudio = async () => {
    if (cosmicAudioEnabled) {
      cosmicAudio.stop();
      setCosmicAudioEnabled(false);
      return;
    }
    setCosmicAudioLoading(true);
    try {
      await cosmicAudio.start();
      setCosmicAudioEnabled(true);
    } finally {
      setCosmicAudioLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!currentUser || !userData) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const updated = { ...userData, pushNotificationsEnabled: true };
        await setDoc(doc(db, "users", currentUser.uid), { pushNotificationsEnabled: true }, { merge: true });
        setUserData(updated);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (
      confirm(
        "Are you sure? This action is permanent and complies with CT 'Right to Delete' laws."
      )
    ) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid));
        await deleteUser(currentUser);
      } catch (err: unknown) {
        alert("Error deleting account: " + (err instanceof Error ? err.message : ""));
      }
    }
  };

  const handleCardFlip = (index: number) => {
    if (cardsFlipped.includes(index)) return;
    const newFlipped = [...cardsFlipped, index];
    setCardsFlipped(newFlipped);
    if (newFlipped.length === 3) {
      setTimeout(() => {
        setReadingResult(
          `The cards align with your archetype, The ${userData?.tarotArchetype}. They reveal: 1. The blockage, 2. The action, 3. The outcome. Look inward.`
        );
      }, 1000);
    }
  };

  const downloadData = () => {
    if (!userData) return;
    const exportData = { ...userData, journalEntries: userData.journalEntries ?? [] };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "my_soul_data.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePublish = () => {
    if (!userData) return;
    const html = generateGrimoireHTML(userData);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 md:pb-0 md:pl-20">
      {isGrimoireModalOpen && selectedAttribute && (
        <GrimoireModal
          selectedAttribute={selectedAttribute}
          onClose={() => setSelectedAttribute(null)}
        />
      )}
      <div className={`md:hidden flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b ${theme.borderLight} sticky top-0 z-40`}>
        <h1 className={`font-serif text-xl ${theme.text}`}>Tami&apos;s Signal</h1>
        <div className={`text-xs font-mono ${theme.textMuted}`}>
          Path {userData?.destinyNumber} • {userData?.zodiacSign}
        </div>
      </div>

      <nav className={`fixed md:left-0 md:top-0 md:h-full md:w-20 md:flex-col bottom-0 w-full h-16 bg-slate-900 border-t md:border-t-0 md:border-r ${theme.borderLight} flex items-center justify-around md:justify-start md:pt-8 z-50`}>
        <div className={`hidden md:block mb-8 ${theme.accent} animate-pulse`}>
          <Radio size={32} />
        </div>
        <NavButton
          active={activeTab === "daily"}
          onClick={() => setActiveTab("daily")}
          icon={<Sparkles size={24} />}
          label="Daily"
        />
        <NavButton
          active={activeTab === "guidance"}
          onClick={() => setActiveTab("guidance")}
          icon={<MessageCircle size={24} />}
          label="Guide"
        />
        <NavButton
          active={activeTab === "tarot"}
          onClick={() => setActiveTab("tarot")}
          icon={<Lock size={24} />}
          label="Tarot"
        />
        <NavButton
          active={activeTab === "journal"}
          onClick={() => setActiveTab("journal")}
          icon={<BookOpen size={24} />}
          label="Journal"
        />
        <NavButton
          active={activeTab === "grimoire"}
          onClick={() => setActiveTab("grimoire")}
          icon={<Library size={24} />}
          label="Grimoire"
        />
        <NavButton
          active={activeTab === "soulprint"}
          onClick={() => setActiveTab("soulprint")}
          icon={<Fingerprint size={24} />}
          label="Soulprint"
        />
        {(role === "admin" || role === "owner") && (
          <NavButton
            active={activeTab === "dev"}
            onClick={() => setActiveTab("dev")}
            icon={<Terminal size={24} />}
            label="Dev"
          />
        )}
        <NavButton
          active={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          icon={<User size={24} />}
          label="Profile"
        />
      </nav>

      <main className="max-w-2xl mx-auto p-6 pt-8">
        {activeTab === "daily" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6">
              <h2 className="text-3xl font-serif text-white mb-2">
                Daily Truth
              </h2>
              <div className="flex gap-2 text-xs">
                <span className={`bg-slate-800/60 px-2 py-1 rounded border ${theme.borderLight}`}>
                  <span className={theme.accent}>Destiny #{userData?.destinyNumber}</span>
                </span>
                <span className="bg-slate-800/60 px-2 py-1 rounded border border-slate-600">
                  <span className="text-slate-400">Archetype: {userData?.tarotArchetype}</span>
                </span>
              </div>
            </header>
            <div className={`bg-gradient-to-br from-slate-900 to-slate-950 border ${theme.border} p-8 rounded-2xl shadow-2xl relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 p-4 opacity-5 ${theme.accent}`}>
                <Sun size={120} />
              </div>
              <div className="relative z-10">
                <div className={`flex items-center justify-between gap-2 mb-4 ${theme.textMuted} text-xs font-bold uppercase tracking-widest`}>
                  <span className="flex items-center gap-2"><Star size={12} /> {new Date().toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const today = todayDateString();
                      const refreshCount = userData?.dailyTruth?.date === today ? (userData.dailyTruth.refreshCount ?? 0) : 0;
                      const isDevUser = role === "admin" || role === "owner";
                      const canRefresh = isDevUser || refreshCount < 3;
                      return (
                        <button
                          type="button"
                          onClick={handleRefreshDailyTruth}
                          disabled={!canRefresh || isGeneratingDailyTruth}
                          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                            canRefresh && !isGeneratingDailyTruth
                              ? "hover:bg-slate-700/50"
                              : "opacity-40 cursor-not-allowed"
                          }`}
                          title={isDevUser ? "Unlimited refreshes (dev)" : canRefresh ? `Refresh (${3 - refreshCount} left today)` : "Daily limit reached"}
                        >
                          <RefreshCw size={18} className={isGeneratingDailyTruth ? "animate-spin" : ""} />
                          <span className="text-[10px] font-mono">{isDevUser ? "∞" : 3 - refreshCount}</span>
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={handleShareDailyTruth}
                      className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                      title="Share"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
                {isGeneratingDailyTruth ? (
                  <p className={`text-lg ${theme.textMuted} italic`}>
                    Regenerating…
                  </p>
                ) : (
                  <p className="text-xl md:text-2xl font-serif leading-relaxed text-slate-50">
                    "{userData?.dailyTruth?.message ?? ""}"
                  </p>
                )}
                {refreshLimitReached && (
                  <p className="mt-2 text-xs text-amber-400/80 font-mono">
                    You&apos;ve reached your daily refresh limit. Return tomorrow for a new truth.
                  </p>
                )}
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                    Soulprint Signature (data used)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userData?.zodiacSign && (
                      <button
                        type="button"
                        onClick={() => openGrimoire("Zodiac Signs", userData.zodiacSign)}
                        className={`px-2 py-1 rounded-full border ${theme.borderLight} bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-1`}
                        title="Zodiac Sign"
                      >
                        <span className={theme.accent}>{getAttributeSymbol("zodiac", userData.zodiacSign)}</span>
                        <span className="text-slate-300">{userData.zodiacSign}</span>
                      </button>
                    )}
                    {userData?.destinyNumber != null && userData.destinyNumber > 0 && (
                      <button
                        type="button"
                        onClick={() => openGrimoire("Numerology", String(userData.destinyNumber))}
                        className={`px-2 py-1 rounded-full border ${theme.borderLight} bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-1`}
                        title="Destiny Number"
                      >
                        <span className={theme.accent}>#{userData.destinyNumber}</span>
                        <span className="text-slate-300">Destiny</span>
                      </button>
                    )}
                    {userData?.birthday && (
                      <button
                        type="button"
                        onClick={() => openGrimoire("Planetary Rulers", userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday))}
                        className={`px-2 py-1 rounded-full border ${theme.borderLight} bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-1`}
                        title="Planetary Ruler"
                      >
                        <span className={theme.accent}>{getAttributeSymbol("planetaryRuler", userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday))}</span>
                        <span className="text-slate-300">{userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday)}</span>
                      </button>
                    )}
                    {userData?.birthday && (
                      <button
                        type="button"
                        onClick={() => openGrimoire("Moon Phases", userData.moonPhase ?? getMoonPhase(userData.birthday))}
                        className={`px-2 py-1 rounded-full border ${theme.borderLight} bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-1`}
                        title="Moon Phase"
                      >
                        <span className={theme.accent}>{getAttributeSymbol("moonPhase", userData.moonPhase ?? getMoonPhase(userData.birthday))}</span>
                        <span className="text-slate-300">{userData.moonPhase ?? getMoonPhase(userData.birthday)}</span>
                      </button>
                    )}
                    {userData?.favoriteColor && (
                      <button
                        type="button"
                        onClick={() => openGrimoire("Power Colors", userData.favoriteColor.charAt(0).toUpperCase() + userData.favoriteColor.slice(1))}
                        className={`px-2 py-1 rounded-full border ${theme.borderLight} bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-xs flex items-center gap-2`}
                        title="Power Color"
                      >
                        <span className="inline-block w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: userData.favoriteColor }} />
                        <span className="text-slate-300">{userData.favoriteColor}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`mt-6 p-6 rounded-2xl border ${theme.borderLight} bg-slate-900/50`}>
              <h3 className={`text-sm font-serif font-medium ${theme.text} mb-2`}>Shadow Journal</h3>
              {userData?.dailyTruth?.message ? (
                <blockquote className={`mb-4 pl-4 border-l-2 ${theme.borderLight} italic text-slate-400 text-sm leading-relaxed`}>
                  &ldquo;{userData.dailyTruth.message}&rdquo;
                </blockquote>
              ) : (
                <p className="text-slate-500 text-xs mb-4">Reflect on today&apos;s energy.</p>
              )}
              <textarea
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-slate-600 min-h-[100px] resize-y"
                placeholder="What does this stir in you?"
                value={journalEntryText}
                onChange={(e) => setJournalEntryText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveJournalEntry}
                disabled={!journalEntryText.trim()}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white ${theme.bg} ${theme.bgHover} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Save Entry
              </button>
            </div>
          </div>
        )}

        {activeTab === "guidance" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8">
              <h2 className="text-3xl font-serif text-white mb-2">
                Ask the Void
              </h2>
              <p className="text-slate-400 text-sm">
                Your Soulprint is active. Answers will be tailored to your
                Numerology and Place of Birth.
              </p>
            </header>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 mb-6 focus-within:border-purple-500/50 transition-colors">
              <textarea
                className="w-full bg-transparent p-4 text-lg text-white focus:outline-none min-h-[120px] resize-none placeholder-slate-600"
                placeholder="What is holding me back?"
                value={guidanceQuery}
                onChange={(e) => setGuidanceQuery(e.target.value)}
              />
              <div className="flex justify-end px-4 pb-2">
                <button
                  onClick={handleGuidanceRequest}
                  disabled={isGenerating || !guidanceQuery}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    isGenerating ? "bg-slate-800 text-slate-500" : `text-white ${theme.bg} ${theme.bgHover}`
                  }`}
                >
                  {isGenerating ? "Consulting Soulprint…" : "Ask"}
                </button>
              </div>
            </div>
            {guidanceResponse && (
              <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-indigo-200 font-serif text-lg mb-2 flex items-center gap-2">
                  <Sparkles size={16} /> Guidance
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {guidanceResponse}
                </p>
              </div>
            )}
            {showUpsellCard && (
              <div className="mt-6 p-6 rounded-2xl border-2 border-amber-600/50 bg-amber-950/20 animate-in zoom-in-95 duration-300">
                <p className="text-amber-200 font-medium mb-2">This is heavy energy. Don&apos;t navigate it alone.</p>
                <p className="text-slate-400 text-sm mb-4">Consider reaching out to a trusted friend, therapist, or guide who can hold space for you.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "tarot" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8">
              <h2 className="text-3xl font-serif text-white mb-2">
                Tarot Room
              </h2>
            </header>
            <div className="grid grid-cols-3 gap-2 h-48 mb-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  onClick={() => handleCardFlip(idx)}
                  className={`relative w-full h-full rounded-lg cursor-pointer bg-indigo-900 border border-indigo-500/30 flex items-center justify-center transition-all ${
                    cardsFlipped.includes(idx)
                      ? "bg-slate-100 border-white"
                      : ""
                  }`}
                >
                  {cardsFlipped.includes(idx) ? (
                    <span className="text-black font-bold text-xs p-1 text-center">
                      Card {idx + 1}
                    </span>
                  ) : (
                    <Sparkles className="text-indigo-400/50" />
                  )}
                </div>
              ))}
            </div>
            {readingResult && (
              <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/20 text-slate-300 text-sm">
                {readingResult}
              </div>
            )}
          </div>
        )}

        {activeTab === "journal" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-3xl font-serif text-white mb-2">
                  The Mirror
                </h2>
                <p className="text-slate-500 text-sm">
                  Your Shadow Journal history. Reflect, then release.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublish}
                className={`px-4 py-2 rounded-xl border ${theme.borderLight} ${theme.bg} ${theme.text} text-sm font-medium hover:opacity-90 transition-opacity`}
              >
                Generate My Grimoire
              </button>
            </header>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {((userData?.journalEntries ?? []).length === 0) ? (
                <div className={`p-6 rounded-2xl border ${theme.borderLight} bg-slate-900/50 text-center text-slate-500 text-sm`}>
                  No entries yet. Write from the Daily tab to fill the mirror.
                </div>
              ) : (
                [...(userData?.journalEntries ?? [])].reverse().map((entry, idx) => {
                  const list = userData?.journalEntries ?? [];
                  const originalIndex = list.length - 1 - idx;
                  const displayId = entry.id ?? `legacy-${originalIndex}`;
                  const deleteKey = entry.id ?? originalIndex;
                  return (
                    <div
                      key={displayId}
                      className={`p-5 rounded-2xl border ${theme.borderLight} bg-slate-900/80 shadow-lg`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <time className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                          {entry.date}
                        </time>
                        <button
                          type="button"
                          onClick={() => handleDeleteJournalEntry(deleteKey)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-slate-400 text-xs italic mb-2">{entry.prompt}</p>
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{entry.entry}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "grimoire" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6">
              <h2 className="text-3xl font-serif text-white mb-2">Grimoire</h2>
              <p className="text-slate-500 text-sm">
                Ancient reference. Search a term, or tap a category.
              </p>
            </header>

            <div className="mb-4 flex flex-wrap gap-2">
              {Object.keys(GRIMOIRE_DATA).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setGrimoireCategory(cat);
                    setGrimoireSearch("");
                    setGrimoireFocus(null);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                    grimoireCategory === cat
                      ? `${theme.bg} text-white border-transparent`
                      : `bg-slate-900/50 text-slate-300 ${theme.borderLight} hover:bg-slate-800/60`
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className={`mb-4 p-2 rounded-2xl border ${theme.borderLight} bg-slate-900/50`}>
              <input
                value={grimoireSearch}
                onChange={(e) => setGrimoireSearch(e.target.value)}
                placeholder="Search definitions…"
                className="w-full bg-transparent p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              {(GRIMOIRE_DATA[grimoireCategory] ?? [])
                .filter((item) => {
                  const q = grimoireSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    item.name.toLowerCase().includes(q) ||
                    item.meaning.toLowerCase().includes(q)
                  );
                })
                .map((item) => {
                  const id = makeGrimoireId(grimoireCategory, item.name);
                  const isFocused =
                    grimoireFocus?.category === grimoireCategory &&
                    grimoireFocus?.name.toLowerCase() === item.name.toLowerCase();
                  return (
                    <div
                      key={id}
                      id={id}
                      className={`p-5 rounded-2xl border bg-slate-900/80 ${
                        isFocused ? theme.border : theme.borderLight
                      }`}
                    >
                      <h3 className={`font-serif text-lg ${theme.text}`}>{item.name}</h3>
                      <p className="text-slate-300 text-sm leading-relaxed mt-2">
                        {item.meaning}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "dev" && (role === "admin" || role === "owner") && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6">
              <h2 className="text-3xl font-serif text-white mb-2">
                Dev Dashboard
              </h2>
              <p className="text-slate-500 text-sm">
                Signal Dispatch
              </p>
            </header>
            <div className="mb-4 p-6 rounded-2xl border border-[#533483]/30 bg-[#0f0f1a]/70 backdrop-blur shadow-lg shadow-purple-900/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg text-[#e2e8f0]">Dev Toolkit</h3>
                  <p className="text-xs font-mono text-[#e2e8f0]/60 mt-1">
                    Session + paths + quick copies
                  </p>
                </div>
                <div className="text-xs font-mono text-[#d946ef]">Admin</div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40">
                  <div className="text-xs font-mono text-[#e2e8f0]/60 mb-2">SESSION</div>
                  <div className="text-sm text-[#e2e8f0]">
                    UID: <span className="font-mono">{currentUser?.uid ? `${currentUser.uid.slice(0, 8)}…` : "—"}</span>
                  </div>
                  <div className="text-sm text-[#e2e8f0] mt-1">
                    Role: <span className="font-mono text-[#a855f7]">{role}</span>
                  </div>
                  <div className="text-sm text-[#e2e8f0] mt-1">
                    Verified: <span className="font-mono">{currentUser?.emailVerified ? "true" : "false"}</span>
                  </div>
                  <div className="text-sm text-[#e2e8f0] mt-1">
                    Soulprint: <span className="font-mono">{soulprintComplete ? "complete" : "incomplete"}</span>
                  </div>
                  <div className="text-sm text-[#e2e8f0] mt-1">
                    Journal entries: <span className="font-mono">{(userData?.journalEntries ?? []).length}</span>
                  </div>
                  <div className="text-sm text-[#e2e8f0] mt-1">
                    Daily truth: <span className="font-mono">{userData?.dailyTruth?.date ?? "—"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40">
                  <div className="text-xs font-mono text-[#e2e8f0]/60 mb-2">PATHS</div>
                  <div className="text-[12px] font-mono text-[#e2e8f0]/80 break-all">
                    users/{currentUser?.uid ?? "UID"}
                  </div>
                  <div className="text-[12px] font-mono text-[#e2e8f0]/80 break-all mt-1">
                    artifacts/tamis-signal-v2/public/data/mail
                  </div>
                  <div className="text-[12px] font-mono text-[#e2e8f0]/80 break-all mt-1">
                    artifacts/tamis-signal-v2/public/data/devPings
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => currentUser?.uid && navigator.clipboard?.writeText(currentUser.uid)}
                  disabled={!currentUser?.uid}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy UID
                </button>
                <button
                  type="button"
                  onClick={() => currentUser?.uid && navigator.clipboard?.writeText(`users/${currentUser.uid}`)}
                  disabled={!currentUser?.uid}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy User Doc Path
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText("artifacts/tamis-signal-v2/public/data/mail")}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors"
                >
                  Copy Mail Path
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(typeof window !== "undefined" ? window.location.origin : "")}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors"
                >
                  Copy Origin
                </button>
                <button
                  type="button"
                  onClick={() => userData && navigator.clipboard?.writeText(JSON.stringify(userData, null, 2))}
                  disabled={!userData}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy userData JSON
                </button>
                <button
                  type="button"
                  onClick={handleDevPingWrite}
                  disabled={!currentUser?.uid || devPingLoading}
                  className="px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {devPingLoading ? "Writing Ping…" : "Ping Write Test"}
                </button>
              </div>

              {devPingStatus && (
                <div className="mt-3 p-3 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40 text-sm text-[#e2e8f0]">
                  <span className="font-mono text-[#e2e8f0]/70">Ping:</span>{" "}
                  <span className="font-mono">{devPingStatus}</span>
                </div>
              )}
            </div>
            <SignalDispatch />
            <GenerativeLogViewer />
          </div>
        )}

        {activeTab === "soulprint" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6">
              <h2 className="text-3xl font-serif text-white mb-2">
                Soulprint
              </h2>
              <p className="text-slate-500 text-sm">
                Your cosmic signature. Tap any card to open the Grimoire.
              </p>
            </header>
            {/* Hero: Big Three — Sun Sign, Destiny Number, Tarot Archetype */}
            <div className={`rounded-2xl border-2 p-6 mb-6 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl ${theme.border} ${theme.bg} bg-opacity-20`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() =>
                    userData?.zodiacSign &&
                    setSelectedAttribute({
                      type: "zodiac",
                      key: userData.zodiacSign,
                      title: userData.zodiacSign,
                    })
                  }
                  className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity text-left"
                >
                  <span className={`text-4xl flex-shrink-0 ${theme.accent}`} aria-hidden>
                    {getAttributeSymbol("zodiac", userData?.zodiacSign ?? "")}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Sun Sign
                    </div>
                    <div className={`text-xl font-serif font-medium ${theme.text}`}>
                      {userData?.zodiacSign}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    userData?.destinyNumber != null &&
                    setSelectedAttribute({
                      type: "numerology",
                      key: String(userData.destinyNumber),
                      title: `Destiny Number ${userData.destinyNumber}`,
                    })
                  }
                  className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity text-left"
                >
                  <span className={`text-4xl flex-shrink-0 ${theme.accent}`} aria-hidden>
                    #
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Destiny Number
                    </div>
                    <div className={`text-xl font-serif font-medium ${theme.text}`}>
                      {userData?.destinyNumber}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    userData?.tarotArchetype &&
                    setSelectedAttribute({
                      type: "tarot",
                      key: userData.tarotArchetype,
                      title: userData.tarotArchetype,
                    })
                  }
                  className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-90 transition-opacity text-left"
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                    {React.createElement(getPillarIcon("tarot"), { size: 28, className: theme.accent })}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Tarot Archetype
                    </div>
                    <div className={`text-xl font-serif font-medium ${theme.text} truncate`}>
                      {userData?.tarotArchetype}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2x3 Grid: Life Path, Chinese Zodiac, Planetary Ruler, Moon Phase, Chinese Element, Celtic Tree */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {userData?.birthday && (
                <>
                  <SoulprintCard
                    theme={theme}
                    pillar="lifePath"
                    label="Life Path"
                    value={String(userData.lifePathNumber ?? calculateLifePath(userData.birthday))}
                    symbol={String(userData.lifePathNumber ?? calculateLifePath(userData.birthday))}
                    grimoire={{
                      type: "numerology",
                      key: String(userData.lifePathNumber ?? calculateLifePath(userData.birthday)),
                      title: `Life Path ${userData.lifePathNumber ?? calculateLifePath(userData.birthday)}`,
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                  <SoulprintCard
                    theme={theme}
                    pillar="chineseZodiac"
                    label="Chinese Zodiac"
                    value={[userData.chineseElement ?? getChineseElement(userData.birthday), userData.chineseZodiac ?? getChineseZodiac(userData.birthday)].filter(Boolean).join(" ")}
                    symbol=""
                    grimoire={{
                      type: "chineseZodiac",
                      key: userData.chineseZodiac ?? getChineseZodiac(userData.birthday),
                      title: userData.chineseZodiac ?? getChineseZodiac(userData.birthday),
                      subtitle: (userData.chineseElement ?? getChineseElement(userData.birthday)) + " Element",
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                  <SoulprintCard
                    theme={theme}
                    pillar="planetaryRuler"
                    label="Planetary Ruler"
                    value={userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday)}
                    symbol={getAttributeSymbol("planetaryRuler", userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday))}
                    grimoire={{
                      type: "planetaryRuler",
                      key: userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday),
                      title: userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday),
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                  <SoulprintCard
                    theme={theme}
                    pillar="moonPhase"
                    label="Moon Phase"
                    value={userData.moonPhase ?? getMoonPhase(userData.birthday)}
                    symbol={getAttributeSymbol("moonPhase", userData.moonPhase ?? getMoonPhase(userData.birthday))}
                    grimoire={{
                      type: "moonPhase",
                      key: userData.moonPhase ?? getMoonPhase(userData.birthday),
                      title: userData.moonPhase ?? getMoonPhase(userData.birthday),
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                  <SoulprintCard
                    theme={theme}
                    pillar="chineseElement"
                    label="Chinese Element"
                    value={userData.chineseElement ?? getChineseElement(userData.birthday)}
                    symbol={getAttributeSymbol("chineseElement", userData.chineseElement ?? getChineseElement(userData.birthday))}
                    grimoire={{
                      type: "chineseElement",
                      key: userData.chineseElement ?? getChineseElement(userData.birthday),
                      title: userData.chineseElement ?? getChineseElement(userData.birthday),
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                  <SoulprintCard
                    theme={theme}
                    pillar="celticTree"
                    label="Celtic Tree"
                    value={userData.celticTree ?? getCelticTree(userData.birthday)}
                    symbol={getAttributeSymbol("celticTree", "")}
                    grimoire={{
                      type: "celticTree",
                      key: userData.celticTree ?? getCelticTree(userData.birthday),
                      title: userData.celticTree ?? getCelticTree(userData.birthday),
                    }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-3xl font-serif text-white">
                Soul Profile
              </h2>
              <button
                onClick={() => navigate("/soulprint")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${theme.bg} ${theme.bgHover}`}
              >
                <Pencil size={16} />
                Edit profile
              </button>
            </header>
            <div className={`bg-slate-900/80 rounded-2xl p-6 mb-6 border ${theme.borderLight}`}>
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-700">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-serif text-white shadow-lg ${theme.bg} ${theme.shadow}`}>
                  {userData?.name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-bold text-lg">
                      {userData?.name}
                    </h3>
                    {role === "owner" && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${theme.borderLight} ${theme.text}`}>
                        <Crown size={14} className={theme.accent} />
                        THE BOSS
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">
                    Joined {new Date(userData?.joinDate || "").toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {userData?.zodiacSign && (
                  <ProfilePillar
                    label="Zodiac"
                    value={userData.zodiacSign}
                    Icon={getZodiacIcon(userData.zodiacSign)}
                    grimoire={{ type: "zodiac", key: userData.zodiacSign, title: userData.zodiacSign }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                )}
                {userData?.destinyNumber != null && userData.destinyNumber > 0 && (
                  <ProfilePillar
                    label="Destiny Number"
                    value={String(userData.destinyNumber)}
                    Icon={Hash}
                    grimoire={{ type: "numerology", key: String(userData.destinyNumber), title: `Destiny Number ${userData.destinyNumber}` }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                )}
                {userData?.tarotArchetype && (
                  <ProfilePillar
                    label="Tarot Archetype"
                    value={userData.tarotArchetype}
                    Icon={Layers}
                    grimoire={{ type: "tarot", key: userData.tarotArchetype, title: userData.tarotArchetype }}
                    onGrimoireClick={setSelectedAttribute}
                  />
                )}
                {userData?.favoriteColor && (
                  <ProfilePillar
                    label="Power Color"
                    value={userData.favoriteColor}
                    Icon={Palette}
                  />
                )}
                {userData?.birthPlace && (
                  <ProfilePillar
                    label="Birthplace Spirit"
                    value={userData.birthPlace}
                    Icon={MapPin}
                    span={2}
                  />
                )}
                {userData?.birthday && (
                  <>
                    <ProfilePillar
                      label="Planetary Ruler"
                      value={userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday)}
                      Icon={getPlanetIcon(userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday))}
                      grimoire={{
                        type: "planetaryRuler",
                        key: userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday),
                        title: userData.planetaryRuler ?? getPlanetaryRuler(userData.birthday),
                      }}
                      onGrimoireClick={setSelectedAttribute}
                    />
                    <ProfilePillar
                      label="Chinese Zodiac"
                      value={(() => {
                        const el = userData.chineseElement ?? getChineseElement(userData.birthday);
                        const an = userData.chineseZodiac ?? getChineseZodiac(userData.birthday);
                        return [el, an].filter(Boolean).join(" ");
                      })()}
                      Icon={getChineseZodiacIcon(userData.chineseZodiac ?? getChineseZodiac(userData.birthday))}
                      grimoire={{
                        type: "chineseZodiac",
                        key: userData.chineseZodiac ?? getChineseZodiac(userData.birthday),
                        title: userData.chineseZodiac ?? getChineseZodiac(userData.birthday),
                        subtitle: (userData.chineseElement ?? getChineseElement(userData.birthday)) + " Element",
                      }}
                      onGrimoireClick={setSelectedAttribute}
                    />
                    <ProfilePillar
                      label="Life Path"
                      value={String(userData.lifePathNumber ?? calculateLifePath(userData.birthday))}
                      Icon={Hash}
                      grimoire={{
                        type: "numerology",
                        key: String(userData.lifePathNumber ?? calculateLifePath(userData.birthday)),
                        title: `Life Path ${userData.lifePathNumber ?? calculateLifePath(userData.birthday)}`,
                      }}
                      onGrimoireClick={setSelectedAttribute}
                    />
                    <ProfilePillar
                      label="Moon Phase"
                      value={userData.moonPhase ?? getMoonPhase(userData.birthday)}
                      Icon={getMoonPhaseIcon(userData.moonPhase ?? getMoonPhase(userData.birthday))}
                      grimoire={{
                        type: "moonPhase",
                        key: userData.moonPhase ?? getMoonPhase(userData.birthday),
                        title: userData.moonPhase ?? getMoonPhase(userData.birthday),
                      }}
                      onGrimoireClick={setSelectedAttribute}
                    />
                    <ProfilePillar
                      label="Celtic Tree"
                      value={userData.celticTree ?? getCelticTree(userData.birthday)}
                      Icon={getCelticTreeIcon(userData.celticTree ?? getCelticTree(userData.birthday))}
                      grimoire={{
                        type: "celticTree",
                        key: userData.celticTree ?? getCelticTree(userData.birthday),
                        title: userData.celticTree ?? getCelticTree(userData.birthday),
                      }}
                      onGrimoireClick={setSelectedAttribute}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg border ${theme.borderLight} bg-slate-900/50`}>
                <div className="flex items-center gap-3 text-slate-300">
                  {userData?.pushNotificationsEnabled ? <Bell size={18} className={theme.accent} /> : <BellOff size={18} />}
                  <span>Tami&apos;s Signal</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={!!userData?.pushNotificationsEnabled}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${theme.bg} ${theme.bgHover} disabled:opacity-50 disabled:cursor-default`}
                >
                  {userData?.pushNotificationsEnabled ? "Enabled" : "Enable Tami's Signal"}
                </button>
              </div>
              <div className={`p-3 rounded-lg border ${theme.borderLight} bg-slate-900/50`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-slate-300">
                    <div className="text-sm font-medium text-white">Persona Mode</div>
                    <div className="text-xs text-slate-400">Choose who speaks through the Signal.</div>
                  </div>
                  <select
                    value={userData?.personaMode ?? "tami"}
                    onChange={(e) => handlePersonaModeChange(e.target.value as UserProfile["personaMode"])}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="tami">Tami</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${theme.borderLight} bg-slate-900/50`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-slate-300">
                    <div className="text-sm font-medium text-white">Cosmic Audio (Universe Drone)</div>
                    <div className="text-xs text-slate-400">
                      Entanglement: {Math.round(entanglementSettings.entanglementPercent)}% ({entanglementSettings.label})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleCosmicAudio}
                    disabled={cosmicAudioLoading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${theme.bg} ${theme.bgHover} disabled:opacity-50`}
                  >
                    {cosmicAudioEnabled ? "Stop" : cosmicAudioLoading ? "Starting..." : "Start"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Audio requires a user gesture to start. If it&apos;s too loud, reduce system volume.
                </p>
              </div>
              <button
                onClick={downloadData}
                className="w-full flex items-center justify-between p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 text-slate-300">
                  <Download size={18} />
                  <span>Download Data (JSON)</span>
                </div>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-between p-3 bg-slate-900 border border-red-900/30 hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 text-red-400">
                  <Trash2 size={18} />
                  <span>Delete Account</span>
                </div>
              </button>
              <button
                onClick={() => logOut()}
                className="w-full p-4 text-slate-500 hover:text-white flex justify-center items-center gap-2"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function GrimoireModal({
  selectedAttribute,
  onClose,
}: {
  selectedAttribute: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string };
  onClose: () => void;
}) {
  const entry = getGrimoireEntry(selectedAttribute.type, selectedAttribute.key);
  const elementKey =
    selectedAttribute.type === "chineseZodiac" && selectedAttribute.subtitle
      ? selectedAttribute.subtitle.replace(/\s+Element$/i, "")
      : null;
  const elementEntry = elementKey ? getGrimoireEntry("chineseElement", elementKey) : undefined;
  const subtitle = entry?.subtitle ?? selectedAttribute.subtitle;
  const description = entry?.description ?? "No entry found in the grimoire for this path.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-950 border-2 border-amber-900/50 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl shadow-amber-950/30">
        <div className="border-b border-amber-800/40 bg-slate-900/90 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-serif text-amber-100">{selectedAttribute.title}</h3>
            {subtitle && (
              <p className="text-sm text-amber-200/80 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] text-slate-300 text-sm leading-relaxed space-y-4">
          <p>{description}</p>
          {elementEntry?.description && (
            <div className="pt-3 border-t border-slate-700">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-200/80 mb-1">
                As {selectedAttribute.subtitle}
              </p>
              <p>{elementEntry.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SoulprintCard({
  theme,
  pillar,
  label,
  value,
  symbol,
  grimoire,
  onGrimoireClick,
}: {
  theme: ReturnType<typeof getThemeColor>;
  pillar: PillarType;
  label: string;
  value: string;
  symbol: string;
  grimoire: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string };
  onGrimoireClick: (g: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string }) => void;
}) {
  const Icon = getPillarIcon(pillar);
  return (
    <button
      type="button"
      onClick={() => onGrimoireClick(grimoire)}
      className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${theme.borderLight} bg-slate-900/80 hover:bg-slate-800/80 transition-colors text-center min-h-[120px]`}
    >
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${theme.bg} ${theme.text} bg-opacity-30 border ${theme.borderLight}`}>
        {symbol ? (
          <span className={`text-4xl ${theme.accent}`} aria-hidden>{symbol}</span>
        ) : (
          <Icon size={24} className={theme.accent} />
        )}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
      <div className={`font-serif font-medium ${theme.text} truncate w-full`} title={value}>{value}</div>
    </button>
  );
}

function ProfilePillar({
  label,
  value,
  Icon,
  span = 1,
  grimoire,
  onGrimoireClick,
}: {
  label: string;
  value: string;
  Icon: React.ElementType;
  span?: 1 | 2;
  grimoire?: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string };
  onGrimoireClick?: (g: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string }) => void;
}) {
  const content = (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-300">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-purple-100 font-medium truncate" title={value}>
          {value}
        </div>
      </div>
    </>
  );

  const className = `flex items-start gap-3 p-4 bg-slate-950/80 rounded-xl border border-slate-700/80 hover:border-purple-500/30 transition-colors ${
    span === 2 ? "col-span-2 sm:col-span-2" : ""
  }`;

  if (grimoire && onGrimoireClick) {
    return (
      <button
        type="button"
        onClick={() => onGrimoireClick(grimoire)}
        className={className + " cursor-pointer w-full"}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

const NavButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`md:w-full md:px-0 md:py-4 md:hover:bg-purple-900/10 flex flex-col items-center gap-1 transition-colors ${
      active ? "text-purple-400" : "text-slate-500 hover:text-slate-300"
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
    {active && (
      <div className="md:absolute md:left-0 md:h-full md:w-1 md:bg-purple-500 hidden md:block" />
    )}
  </button>
);

// --- ROUTING & REDIRECTS ---
export default function App() {
  const { currentUser, userData, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set a timeout to prevent infinite loading if Firestore fails
  useEffect(() => {
    if (currentUser && !userData && !loading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
    if (userData) setLoadingTimeout(false);
  }, [currentUser, userData, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-purple-400">
        Loading Soul Data…
      </div>
    );
  }

  const isVerified = currentUser?.emailVerified ?? false;

  // Wait for userData to load (but not forever - timeout after 3s)
  // Only wait if user is logged in and verified
  if (currentUser && isVerified && !userData && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-purple-400">
        Loading Soul Data…
      </div>
    );
  }
  
  const soulprintComplete =
    userData?.soulprintComplete ??
    (userData?.destinyNumber != null && userData.destinyNumber > 0);

  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/login"
        element={
          currentUser ? (
            !isVerified ? (
              <Navigate to="/verify-email" replace />
            ) : soulprintComplete ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/soulprint" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/verify-email"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : isVerified ? (
            <Navigate to={soulprintComplete ? "/" : "/soulprint"} replace />
          ) : (
            <VerifyEmailPage />
          )
        }
      />
      <Route
        path="/soulprint"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : !isVerified ? (
            <Navigate to="/verify-email" replace />
          ) : (
            <SoulprintPage />
          )
        }
      />
      <Route
        path="/"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : !isVerified ? (
            <Navigate to="/verify-email" replace />
          ) : !soulprintComplete ? (
            <Navigate to="/soulprint" replace />
          ) : (
            <Dashboard />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
