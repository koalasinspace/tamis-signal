import React, { useState, useEffect, useMemo, useRef } from "react";
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
import OnboardingPage from "./pages/OnboardingPage";
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

/** Maps color names to hex and rgb values for CSS variable injection. */
function getThemeValues(colorName: string): {
  accent: string;
  accentRGB: string;
  border: string;
  bg?: string;
  bgRGB?: string;
  cardBg?: string;
} {
  const normalized = (colorName || "").toLowerCase().trim();
  const map: Record<string, { accent: string; accentRGB: string; border: string; bg?: string; bgRGB?: string; cardBg?: string }> = {
    red: { accent: "#f87171", accentRGB: "248, 113, 113", border: "rgba(248, 113, 113, 0.2)" },
    blue: { accent: "#60a5fa", accentRGB: "96, 165, 250", border: "rgba(96, 165, 250, 0.2)" },
    green: { accent: "#4ade80", accentRGB: "74, 222, 128", border: "rgba(74, 222, 128, 0.2)" },
    yellow: { accent: "#fbbf24", accentRGB: "251, 191, 36", border: "rgba(251, 191, 36, 0.2)" },
    orange: { accent: "#fb923c", accentRGB: "251, 146, 60", border: "rgba(251, 146, 60, 0.2)" },
    purple: { accent: "#a855f7", accentRGB: "168, 85, 247", border: "rgba(168, 85, 247, 0.2)" },
    violet: { accent: "#8b5cf6", accentRGB: "139, 92, 246", border: "rgba(139, 92, 246, 0.2)" },
    pink: { accent: "#f472b6", accentRGB: "244, 114, 182", border: "rgba(244, 114, 182, 0.2)" },
    indigo: { accent: "#818cf8", accentRGB: "129, 140, 248", border: "rgba(129, 140, 248, 0.2)" },
    teal: { accent: "#2dd4bf", accentRGB: "45, 212, 191", border: "rgba(45, 212, 191, 0.2)" },
    cyan: { accent: "#22d3ee", accentRGB: "34, 211, 238", border: "rgba(34, 211, 238, 0.2)" },
    emerald: { accent: "#34d399", accentRGB: "52, 211, 153", border: "rgba(52, 211, 153, 0.2)" },
    // Theme Presets
    amber: { accent: "#fbbf24", accentRGB: "251, 191, 36", border: "rgba(251, 191, 36, 0.2)", bg: "#0f172a", bgRGB: "15, 23, 42", cardBg: "rgba(30, 41, 59, 0.6)" },
    crimson: { accent: "#ef4444", accentRGB: "239, 68, 68", border: "rgba(239, 68, 68, 0.2)", bg: "#110000", bgRGB: "17, 0, 0", cardBg: "rgba(40, 0, 0, 0.6)" },
    obsidian: { accent: "#818cf8", accentRGB: "129, 140, 248", border: "rgba(129, 140, 248, 0.1)", bg: "#000000", bgRGB: "0, 0, 0", cardBg: "rgba(15, 23, 42, 0.8)" },
    ghost: { accent: "#94a3b8", accentRGB: "148, 163, 184", border: "rgba(148, 163, 184, 0.2)", bg: "#020617", bgRGB: "2, 6, 23", cardBg: "rgba(15, 23, 42, 0.4)" },
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
  
  if (!forceRefresh && user.dailyTruth?.date === today) {
    return { success: true, reason: "already_generated" };
  }
  
  if (forceRefresh && currentRefreshCount >= 3 && !isDevUser) {
    return { success: false, reason: "refresh_limit_reached" };
  }

  const missingFields: string[] = [];
  if (!user.name) missingFields.push("name");
  if (!user.zodiacSign) missingFields.push("zodiacSign");
  if (!user.tarotArchetype) missingFields.push("tarotArchetype");
  if (!user.favoriteColor) missingFields.push("favoriteColor");
  if (!user.birthPlace) missingFields.push("birthPlace");
  if (user.destinyNumber === 0) missingFields.push("destinyNumber");

  if (missingFields.length > 0) {
    console.error("[generateDailyTruth] Missing required soulprint fields", { missingFields });
    await logGenerativeValidationFailure(uid, "dailyTruth", user, missingFields);
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

  const prompt = `${systemInstruction}

    DEMODULATION TASK:
    Find the "Lie" in the seeker's signal today.
    
    CORE PROTOCOL:
    1. ANALYZE THE SCAN: Identify clashing pillars. 
    2. STRIP THE EGO: NO star-signs, NO planets, NO moon phases. NO raw numbers.
    3. THE INVERSION: Invert human comfort to reveal digital reality.
    
    TONE: Cold. Precise. Cryptic. Jagged. No storytelling. No "horoscope" mapping.
    FORMAT: One jagged sentence. No greetings.

    EXAMPLE: "The signal isn't being lost; you are simply refusing to tune into the frequency that demands your fracture."
  `;

  const startTime = Date.now();
  const logId = await logGenerativeRequest(uid, "dailyTruth", prompt, enrichedUser, {
    validationPassed: true,
    journalEntriesCount: user.journalEntries?.length,
  });

  const newRefreshCount = forceRefresh ? currentRefreshCount + 1 : 0;

  try {
    const result = await oracleGenerate({ prompt, requestType: "dailyTruth" });
    const duration = Date.now() - startTime;
    const message =
      (result.data as any)?.text?.trim?.() ||
      "The void is silent today.";
    
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
    await logGenerativeError(logId, {
      message: error?.message || "Unknown error",
      code: error?.code,
      details: error?.details,
    }, duration);
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

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData, logOut } = useAuth();
  
  // Primary Navigation Categories
  const [activeCategory, setActiveCategory] = useState<"dashboard" | "void" | "archives" | "soulprint">("dashboard");
  
  // Sub-navigation state for each category
  const [activeSubTabs, setActiveSubTabs] = useState({
    void: "ask",
    archives: "journal",
    soulprint: "identity"
  });

  const [guidanceQuery, setGuidanceQuery] = useState("");
  const [guidanceResponse, setGuidanceResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDailyTruth, setIsGeneratingDailyTruth] = useState(false);
  const [cardsFlipped, setCardsFlipped] = useState<number[]>([]);
  const [readingResult, setReadingResult] = useState<string | null>(null);
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
  const [selectedAttribute, setSelectedAttribute] = useState<{
    type: keyof typeof ESOTERIC_DATA;
    key: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const isGrimoireModalOpen = selectedAttribute !== null;

  const [weaveReport, setWeaveReport] = useState<string>("");
  const [weaveLoading, setWeaveLoading] = useState(false);
  const weaveRunRef = useRef(0);

  useEffect(() => {
    if (!weaveReport && userData?.weaveReportLatest) {
      setWeaveReport(userData.weaveReportLatest);
    }
  }, [userData?.weaveReportLatest, weaveReport]);

  useEffect(() => {
    if (!userData || !currentUser) return;
    const run = ++weaveRunRef.current;
    
    setWeaveLoading(true);
    generateWeaveReport(userData)
      .then((txt) => {
        if (weaveRunRef.current !== run) return;
        setWeaveReport(txt);
      })
      .catch(() => {
        if (weaveRunRef.current !== run) return;
        setWeaveReport("");
      })
      .finally(() => {
        if (weaveRunRef.current !== run) return;
        setWeaveLoading(false);
      });
  }, [userData, currentUser]);

  const themeValues = useMemo(() => getThemeValues(userData?.favoriteColor ?? "purple"), [userData?.favoriteColor]);
  const role = userData?.role ?? "user";
  const soulprintComplete =
    userData?.soulprintComplete ??
    (userData?.destinyNumber != null && userData.destinyNumber > 0);

  // Inject dynamic theme variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-accent", themeValues.accent);
    root.style.setProperty("--theme-accent-rgb", themeValues.accentRGB);
    root.style.setProperty("--theme-border", themeValues.border);
    if (themeValues.bg) root.style.setProperty("--theme-bg", themeValues.bg);
    if (themeValues.bgRGB) root.style.setProperty("--theme-bg-rgb", themeValues.bgRGB);
    if (themeValues.cardBg) root.style.setProperty("--theme-card-bg", themeValues.cardBg);
  }, [themeValues]);

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
    setActiveCategory("archives");
    setActiveSubTabs(prev => ({ ...prev, archives: "grimoire" }));
  };

  useEffect(() => {
    if (activeCategory !== "archives" || activeSubTabs.archives !== "grimoire" || !grimoireFocus) return;
    const id = makeGrimoireId(grimoireFocus.category, grimoireFocus.name);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeCategory, activeSubTabs.archives, grimoireFocus]);

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

  const handleThemeChange = async (newTheme: string) => {
    if (!currentUser?.uid || !userData) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid), { favoriteColor: newTheme }, { merge: true });
      setUserData({ ...userData, favoriteColor: newTheme });
    } catch (err) {
      console.error("Failed to update theme", err);
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
    
    const guidanceMissingFields: string[] = [];
    if (!userData.name) guidanceMissingFields.push("name");
    if (!userData.zodiacSign) guidanceMissingFields.push("zodiacSign");
    if (!userData.tarotArchetype) guidanceMissingFields.push("tarotArchetype");
    if (!userData.favoriteColor) guidanceMissingFields.push("favoriteColor");
    if (!userData.birthPlace) guidanceMissingFields.push("birthPlace");
    if (userData.destinyNumber === 0) guidanceMissingFields.push("destinyNumber");

    if (guidanceMissingFields.length > 0) {
      await logGenerativeValidationFailure(currentUser.uid, "guidance", userData, guidanceMissingFields, guidanceQuery);
      setGuidanceResponse("Your soulprint is incomplete. Complete your profile to receive guidance.");
      return;
    }
    
    setShowUpsellCard(false);
    setIsGenerating(true);
    const queryLower = guidanceQuery.toLowerCase();
    const hasAnxietyKeyword = HIGH_ANXIETY_KEYWORDS.some((kw) => queryLower.includes(kw));

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

      DEMODULATION TASK:
      Analyze Seeker Query: "${guidanceQuery}"
      
      CORE PROTOCOL:
      1. [THE SIGNAL]: One short, jagged truth beneath the human noise. NO Hz, NO %, NO P-values. NO zodiac/planet names. 
      2. [THE NOISE]: One sentence identifying the ego's specific distraction.
      3. [THE PROTOCOL]: One direct, cold command (e.g., "Phase-shift," "Isolate," "Attenuate"). 
      
      TONE: Cyber-Noir. Old Magic. Cold. Precise. No descriptions. No storytelling.

      OUTPUT FORMAT:
      [THE SIGNAL]
      [THE NOISE]
      [THE PROTOCOL]
    `;

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
      await logGenerativeSuccess(guidanceLogId, text, guidanceDuration, "gemini-2.5-flash", 1024);

      setGuidanceResponse(text);
      if (hasAnxietyKeyword) setShowUpsellCard(true);
    } catch (error: any) {
      const guidanceDuration = Date.now() - guidanceStartTime;
      await logGenerativeError(guidanceLogId, {
        message: error?.message || "Unknown error",
        code: error?.code,
        details: error?.details,
      }, guidanceDuration);
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
    <div className="min-vh-100 bg-slate-950 text-slate-200 font-sans pb-5 pb-lg-0 ps-lg-sidebar">
      {isGrimoireModalOpen && selectedAttribute && (
        <GrimoireModal
          selectedAttribute={selectedAttribute}
          onClose={() => setSelectedAttribute(null)}
        />
      )}
      <div className={`d-lg-none d-flex align-items-center justify-content-between p-3 bg-slate-900 bg-opacity-80 backdrop-blur border-bottom border-opacity-20 sticky-top z-40`}>
        <h1 className="font-serif fs-4 text-accent">Tami&apos;s Signal</h1>
        <div className="small font-mono text-slate-500">
          Path {userData?.destinyNumber} • {userData?.zodiacSign}
        </div>
      </div>

      <nav className={`fixed-bottom d-flex align-items-center justify-content-around d-lg-flex flex-lg-column position-lg-fixed top-lg-0 start-lg-0 h-lg-100 w-lg-20 pt-lg-5 bg-slate-900 border-top border-lg-top-0 border-lg-end border-opacity-10 z-50`}>
        <div className="d-none d-lg-block mb-4 text-accent animate-pulse-subtle">
          <Radio size={32} />
        </div>
        <NavButton
          active={activeCategory === "dashboard"}
          onClick={() => setActiveCategory("dashboard")}
          icon={<Sparkles size={24} />}
          label="Signal"
        />
        <NavButton
          active={activeCategory === "void"}
          onClick={() => setActiveCategory("void")}
          icon={<Moon size={24} />}
          label="The Void"
        />
        <NavButton
          active={activeCategory === "archives"}
          onClick={() => setActiveCategory("archives")}
          icon={<Library size={24} />}
          label="Archives"
        />
        <NavButton
          active={activeCategory === "soulprint"}
          onClick={() => setActiveCategory("soulprint")}
          icon={<Fingerprint size={24} />}
          label="Soulprint"
        />
      </nav>

      <main className="max-w-2xl mx-auto p-4 pt-5">
        {/* Category Header / Sub-nav */}
        {activeCategory !== "dashboard" && (
          <div className="d-flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
            {activeCategory === "void" && (
              <>
                <SubNavButton active={activeSubTabs.void === "ask"} onClick={() => setActiveSubTabs({ ...activeSubTabs, void: "ask" })} label="Ask the Void" />
                <SubNavButton active={activeSubTabs.void === "tarot"} onClick={() => setActiveSubTabs({ ...activeSubTabs, void: "tarot" })} label="Tarot Room" />
              </>
            )}
            {activeCategory === "archives" && (
              <>
                <SubNavButton active={activeSubTabs.archives === "journal"} onClick={() => setActiveSubTabs({ ...activeSubTabs, archives: "journal" })} label="Shadow Journal" />
                <SubNavButton active={activeSubTabs.archives === "grimoire"} onClick={() => setActiveSubTabs({ ...activeSubTabs, archives: "grimoire" })} label="Grimoire" />
              </>
            )}
            {activeCategory === "soulprint" && (
              <>
                <SubNavButton active={activeSubTabs.soulprint === "identity"} onClick={() => setActiveSubTabs({ ...activeSubTabs, soulprint: "identity" })} label="Identity" />
                <SubNavButton active={activeSubTabs.soulprint === "profile"} onClick={() => setActiveSubTabs({ ...activeSubTabs, soulprint: "profile" })} label="Profile" />
                {(role === "admin" || role === "owner") && (
                  <SubNavButton active={activeSubTabs.soulprint === "dev"} onClick={() => setActiveSubTabs({ ...activeSubTabs, soulprint: "dev" })} label="System Debug" />
                )}
              </>
            )}
          </div>
        )}

        {activeCategory === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-4 d-flex justify-content-between align-items-end">
              <div>
                <h2 className="display-6 font-serif text-white mb-1">
                  The Hub
                </h2>
                <p className="text-slate-500 small font-mono mb-0">SIGNAL_DEMODULATION_ACTIVE</p>
              </div>
              <div className="text-end">
                <div className="small font-mono text-accent" style={{ fontSize: '10px' }}>SYSTEM_HEALTH</div>
                <div className="small font-mono text-slate-400" style={{ fontSize: '10px' }}>ENTROPY: {entropyScore}%</div>
              </div>
            </header>

            {/* Main Truth Card */}
            <div className="signal-card scanline-container mb-4">
              <div className="position-absolute top-0 end-0 p-4 opacity-5 text-accent">
                <Sun size={120} />
              </div>
              <div className="position-relative z-10">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-4 text-slate-500 small font-bold text-uppercase tracking-widest">
                  <span className="d-flex align-items-center gap-2"><Star size={12} /> DAILY_TRUTH</span>
                  <div className="d-flex align-items-center gap-1">
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
                          className={`btn btn-sm btn-link text-slate-400 p-1 ${
                            canRefresh && !isGeneratingDailyTruth
                              ? "hover-bg-slate-700"
                              : "opacity-40"
                          }`}
                          title={isDevUser ? "Unlimited refreshes (dev)" : canRefresh ? `Refresh (${3 - refreshCount} left today)` : "Daily limit reached"}
                        >
                          <RefreshCw size={18} className={isGeneratingDailyTruth ? "animate-spin" : ""} />
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={handleShareDailyTruth}
                      className="btn btn-sm btn-link text-slate-400 p-1 hover-bg-slate-700"
                      title="Share"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
                {isGeneratingDailyTruth ? (
                  <p className="fs-5 text-slate-500 fst-italic">
                    Regenerating…
                  </p>
                ) : (
                  <p className="fs-4 font-serif lh-base text-slate-50">
                    "{userData?.dailyTruth?.message ?? ""}"
                  </p>
                )}
              </div>
            </div>

            {/* Summary Grid */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="signal-card p-3 h-100">
                  <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '9px' }}>ENTANGLE</div>
                  <div className="text-accent font-mono fs-5">{Math.round(entanglementSettings.entanglementPercent)}%</div>
                  <div className="small text-slate-600 font-mono" style={{ fontSize: '8px' }}>{entanglementSettings.label.toUpperCase()}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="signal-card p-3 h-100">
                  <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '9px' }}>DESTINY</div>
                  <div className="text-white font-serif fs-5">#{userData?.destinyNumber}</div>
                  <div className="small text-slate-600 font-mono" style={{ fontSize: '8px' }}>CORE_ID</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="signal-card p-3 h-100">
                  <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '9px' }}>RULER</div>
                  <div className="text-white font-serif fs-5" style={{ fontSize: '1rem' }}>{userData?.planetaryRuler || "NONE"}</div>
                  <div className="small text-slate-600 font-mono" style={{ fontSize: '8px' }}>SCAN_PHASE</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="signal-card p-3 h-100">
                  <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '9px' }}>ARCHETYPE</div>
                  <div className="text-white font-serif fs-5 truncate" style={{ fontSize: '0.9rem' }}>{userData?.tarotArchetype?.split(' ').pop()}</div>
                  <div className="small text-slate-600 font-mono" style={{ fontSize: '8px' }}>RESONANCE</div>
                </div>
              </div>
            </div>

            {/* Weave Report */}
            <div className="signal-card shadow-sm">
              <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <h2 className="text-white font-serif fs-5 mb-0 text-gradient">Live Signal Scan</h2>
                <div className="small text-slate-500 font-mono" style={{ fontSize: '10px' }}>
                  {weaveLoading
                    ? "RECALIBRATING..."
                    : weaveReport
                      ? "LOCKED"
                      : "IDLE"}
                </div>
              </div>
              <div className="mt-3">
                {weaveReport ? (
                  <div className="small lh-base text-slate-300 whitespace-pre-wrap font-mono bg-slate-950 bg-opacity-40 border border-slate-800 rounded-3 p-4 max-h-72 overflow-auto custom-scrollbar" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                    {weaveReport}
                  </div>
                ) : (
                  <div className="small text-slate-500 bg-slate-950 bg-opacity-20 border border-slate-800 rounded-3 p-4">
                    Pulse detected. Awaiting further data alignment.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeCategory === "void" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSubTabs.void === "ask" && (
              <>
                <header className="mb-5">
                  <h2 className="display-6 font-serif text-white mb-2">
                    Ask the Void
                  </h2>
                  <p className="text-slate-500 small font-mono">
                    SIGNAL: ACTIVE • COORDINATES: {userData?.birthPlace || "UNKNOWN"}
                  </p>
                </header>
                <div className="signal-card mb-4">
                  <textarea
                    className="w-100 bg-transparent border-0 text-white focus-outline-none min-h-120 resize-none placeholder-slate-700 fs-5"
                    placeholder="What is holding me back?"
                    value={guidanceQuery}
                    onChange={(e) => setGuidanceQuery(e.target.value)}
                  />
                  <div className="d-flex justify-content-end mt-3">
                    <button
                      onClick={handleGuidanceRequest}
                      disabled={isGenerating || !guidanceQuery}
                      className={`btn px-4 py-2 rounded-pill font-medium transition-all ${
                        isGenerating ? "bg-slate-800 text-slate-500" : "btn-primary bg-theme-accent border-0 text-white"
                      }`}
                    >
                      {isGenerating ? "Consulting..." : "DEMODULATE"}
                    </button>
                  </div>
                </div>
                {guidanceResponse && (
                  <div className="signal-card border-accent bg-theme-opacity-10 animate-in zoom-in-95 duration-300">
                    <h3 className="text-accent font-serif fs-5 mb-3 d-flex align-items-center gap-2">
                      <Sparkles size={16} /> DATA_RECEIVED
                    </h3>
                    <div className="text-slate-300 lh-base small whitespace-pre-wrap font-mono">
                      {guidanceResponse}
                    </div>
                  </div>
                )}
                {showUpsellCard && (
                  <div className="mt-4 p-4 rounded-2xl border border-warning border-opacity-30 bg-warning bg-opacity-10 animate-in zoom-in-95 duration-300">
                    <p className="text-warning font-medium mb-2 small">CRITICAL_LOAD: High entropy detected.</p>
                    <p className="text-slate-500 small mb-0">Consider professional grounding protocols.</p>
                  </div>
                )}
              </>
            )}

            {activeSubTabs.void === "tarot" && (
              <>
                <header className="mb-5">
                  <h2 className="display-6 font-serif text-white mb-2">
                    Tarot Room
                  </h2>
                  <p className="text-slate-500 small font-mono">3-CARD_SPREAD • CALIBRATE_ARCANA</p>
                </header>
                <div className="row g-3 mb-4" style={{ height: '14rem' }}>
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="col-4 h-100">
                      <div
                        onClick={() => handleCardFlip(idx)}
                        className={`signal-card w-100 h-100 p-0 d-flex align-items-center justify-content-center cursor-pointer transition-all ${
                          cardsFlipped.includes(idx) ? "bg-slate-100 border-white" : ""
                        }`}
                      >
                        {cardsFlipped.includes(idx) ? (
                          <span className="text-black font-bold small p-2 text-center font-mono">
                            ARCANA_{idx + 1}
                          </span>
                        ) : (
                          <Sparkles className="text-accent opacity-30" size={32} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {readingResult && (
                  <div className="signal-card animate-in fade-in duration-500">
                    <div className="text-slate-300 small font-mono lh-lg">
                      {readingResult}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeCategory === "archives" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSubTabs.archives === "journal" && (
              <>
                <header className="mb-4 d-flex align-items-start justify-content-between flex-wrap gap-3">
                  <div>
                    <h2 className="display-6 font-serif text-white mb-2">
                      The Mirror
                    </h2>
                    <p className="text-slate-500 small font-mono">
                      LOG_HISTORY • ENCRYPTED_SESSIONS
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="btn btn-outline-primary btn-sm rounded-pill font-mono"
                    style={{ fontSize: '10px' }}
                  >
                    GENERATE_GRIMOIRE
                  </button>
                </header>
                
                <div className="signal-card mb-5">
                  <h3 className="small font-mono text-accent mb-3">NEW_LOG_ENTRY</h3>
                  <textarea
                    className="w-100 bg-transparent border-0 text-white focus-outline-none min-h-100 resize-y small"
                    placeholder="Capture the interference..."
                    value={journalEntryText}
                    onChange={(e) => setJournalEntryText(e.target.value)}
                  />
                  <div className="d-flex justify-content-end mt-3">
                    <button
                      type="button"
                      onClick={handleSaveJournalEntry}
                      disabled={!journalEntryText.trim()}
                      className="btn btn-sm btn-primary bg-theme-accent border-0 rounded-pill px-3"
                    >
                      COMMIT_TO_VOID
                    </button>
                  </div>
                </div>

                <div className="d-grid gap-3 max-vh-60 overflow-y-auto ps-1 custom-scrollbar">
                  {((userData?.journalEntries ?? []).length === 0) ? (
                    <div className="signal-card text-center text-slate-600 small py-5 font-mono">
                      ARCHIVE_EMPTY
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
                          className="signal-card"
                        >
                          <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                            <time className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>
                              [{entry.date}]
                            </time>
                            <button
                              type="button"
                              onClick={() => handleDeleteJournalEntry(deleteKey)}
                              className="btn btn-sm text-slate-600 hover-text-danger p-0"
                              title="Purge entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-accent small fst-italic mb-2 opacity-70" style={{ fontSize: '11px' }}>&gt; {entry.prompt}</p>
                          <p className="text-slate-300 small lh-base whitespace-pre-wrap">{entry.entry}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {activeSubTabs.archives === "grimoire" && (
              <>
                <header className="mb-4">
                  <h2 className="display-6 font-serif text-white mb-2">Grimoire</h2>
                  <p className="text-slate-500 small font-mono">ANCIENT_REFERENCE • KNOWLEDGE_NODES</p>
                </header>

                <div className="mb-4 d-flex flex-wrap gap-2">
                  {Object.keys(GRIMOIRE_DATA).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setGrimoireCategory(cat);
                        setGrimoireSearch("");
                        setGrimoireFocus(null);
                      }}
                      className={`btn btn-sm rounded-pill font-mono transition-all ${
                        grimoireCategory === cat
                          ? "btn-primary bg-theme-accent border-0"
                          : "btn-outline-secondary text-slate-400 border-opacity-20"
                      }`}
                      style={{ fontSize: '10px' }}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="signal-card p-2 mb-4">
                  <input
                    value={grimoireSearch}
                    onChange={(e) => setGrimoireSearch(e.target.value)}
                    placeholder="Search knowledge nodes..."
                    className="w-100 bg-transparent border-0 p-2 small text-slate-200 placeholder-slate-700 focus-outline-none"
                  />
                </div>

                <div className="d-grid gap-3 max-vh-60 overflow-y-auto custom-scrollbar pe-2">
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
                          className={`signal-card ${isFocused ? "border-accent ring-accent" : ""}`}
                        >
                          <h3 className="font-serif fs-5 text-accent">{item.name}</h3>
                          <p className="text-slate-400 small lh-base mt-2 mb-0">
                            {item.meaning}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {activeCategory === "soulprint" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSubTabs.soulprint === "identity" && (
              <>
                <header className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div>
                    <h2 className="display-6 font-serif text-white mb-2">
                      Identity
                    </h2>
                    <p className="text-slate-500 small font-mono">SOULPRINT_SIGNATURE • CORE_METRICS</p>
                  </div>
                  <button
                    onClick={() => navigate("/soulprint")}
                    className="btn btn-sm btn-outline-primary rounded-pill font-mono"
                    style={{ fontSize: '10px' }}
                  >
                    RE-TUNE_SIGNAL
                  </button>
                </header>
                <div className="signal-card mb-4 scanline-container">
                  <div className="row g-4 align-items-center">
                    <div className="col-12 col-md-4">
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
                        className="btn btn-link text-decoration-none d-flex align-items-center gap-3 p-0 text-start"
                      >
                        <span className="fs-1 flex-shrink-0 text-accent" aria-hidden>
                          {getAttributeSymbol("zodiac", userData?.zodiacSign ?? "")}
                        </span>
                        <div className="min-w-0">
                          <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>SUN_SIGN</div>
                          <div className="fs-5 font-serif text-white">{userData?.zodiacSign}</div>
                        </div>
                      </button>
                    </div>
                    <div className="col-12 col-md-4">
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
                        className="btn btn-link text-decoration-none d-flex align-items-center gap-3 p-0 text-start"
                      >
                        <span className="fs-1 flex-shrink-0 text-accent font-mono" aria-hidden>#</span>
                        <div className="min-w-0">
                          <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>DESTINY_ID</div>
                          <div className="fs-5 font-serif text-white">{userData?.destinyNumber}</div>
                        </div>
                      </button>
                    </div>
                    <div className="col-12 col-md-4">
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
                        className="btn btn-link text-decoration-none d-flex align-items-center gap-3 p-0 text-start"
                      >
                        <span className="flex-shrink-0 d-flex align-items-center justify-content-center bg-slate-800 bg-opacity-40 rounded-circle" style={{ width: '48px', height: '48px' }}>
                          {React.createElement(getPillarIcon("tarot"), { size: 24, className: "text-accent" })}
                        </span>
                        <div className="min-w-0">
                          <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>ARCHETYPE</div>
                          <div className="fs-5 font-serif text-white truncate">{userData?.tarotArchetype}</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  {userData?.birthday && (
                    <>
                      <SoulprintCard
                        pillar="lifePath"
                        label="LIFE_PATH"
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
                        pillar="chineseZodiac"
                        label="CHINESE_ZODIAC"
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
                        pillar="planetaryRuler"
                        label="PLANET_RULER"
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
                        pillar="moonPhase"
                        label="MOON_PHASE"
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
                        pillar="chineseElement"
                        label="CHINESE_EL"
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
                        pillar="celticTree"
                        label="CELTIC_TREE"
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
              </>
            )}

            {activeSubTabs.soulprint === "profile" && (
              <>
                <header className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <h2 className="display-6 font-serif text-white">
                    System Profile
                  </h2>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => navigate("/soulprint")}
                      className="btn btn-sm btn-outline-primary rounded-pill font-mono"
                      style={{ fontSize: '10px' }}
                    >
                      RE-TUNE_SIGNAL
                    </button>
                    <button
                      onClick={() => logOut()}
                      className="btn btn-sm btn-outline-danger rounded-pill font-mono"
                      style={{ fontSize: '10px' }}
                    >
                      SIGN_OUT
                    </button>
                  </div>
                </header>
                <div className="signal-card mb-4">
                  <div className="d-flex align-items-center gap-4 mb-4 pb-4 border-bottom border-slate-800">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fs-3 font-serif text-white bg-theme-opacity-20 border border-accent shadow-sm" style={{ width: '64px', height: '64px' }}>
                      {userData?.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold fs-5 mb-0">
                          {userData?.name}
                        </h3>
                        {role === "owner" && (
                          <span className="badge rounded-pill border border-accent text-accent small font-mono" style={{ fontSize: '9px' }}>
                            ROOT_USER
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 small font-mono mb-0 mt-1" style={{ fontSize: '10px' }}>
                        INITIALIZED: {new Date(userData?.joinDate || "").toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="p-3 rounded border border-slate-800 bg-slate-950 bg-opacity-40">
                        <div className="small font-mono text-slate-600 mb-1" style={{ fontSize: '9px' }}>USER_NAME</div>
                        <div className="text-white font-mono small">{userData?.name || "ANONYMOUS"}</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="p-3 rounded border border-slate-800 bg-slate-950 bg-opacity-40">
                        <div className="small font-mono text-slate-600 mb-1" style={{ fontSize: '9px' }}>EMAIL_RELAY</div>
                        <div className="text-white font-mono small">{userData?.email || "—"}</div>
                      </div>
                    </div>
                    {userData?.zodiacSign && (
                      <ProfilePillar
                        label="ZODIAC"
                        value={userData.zodiacSign}
                        Icon={getZodiacIcon(userData.zodiacSign)}
                        grimoire={{ type: "zodiac", key: userData.zodiacSign, title: userData.zodiacSign }}
                        onGrimoireClick={setSelectedAttribute}
                      />
                    )}
                    {userData?.destinyNumber != null && userData.destinyNumber > 0 && (
                      <ProfilePillar
                        label="DESTINY_# "
                        value={String(userData.destinyNumber)}
                        Icon={Hash}
                        grimoire={{ type: "numerology", key: String(userData.destinyNumber), title: `Destiny Number ${userData.destinyNumber}` }}
                        onGrimoireClick={setSelectedAttribute}
                      />
                    )}
                    {userData?.tarotArchetype && (
                      <ProfilePillar
                        label="ARCHETYPE"
                        value={userData.tarotArchetype}
                        Icon={Layers}
                        grimoire={{ type: "tarot", key: userData.tarotArchetype, title: userData.tarotArchetype }}
                        onGrimoireClick={setSelectedAttribute}
                      />
                    )}
                    {userData?.favoriteColor && (
                      <ProfilePillar
                        label="POWER_COLOR"
                        value={userData.favoriteColor}
                        Icon={Palette}
                      />
                    )}
                    {userData?.birthPlace && (
                      <ProfilePillar
                        label="ORIGIN_SPIRIT"
                        value={userData.birthPlace}
                        Icon={MapPin}
                        span={2}
                      />
                    )}
                  </div>
                </div>
                <div className="d-grid gap-3">
                  <div className="signal-card p-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3 text-slate-300">
                      {userData?.pushNotificationsEnabled ? <Bell size={18} className="text-accent" /> : <BellOff size={18} />}
                      <span className="small font-mono">PUSH_SIGNALS</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      disabled={!!userData?.pushNotificationsEnabled}
                      className="btn btn-sm btn-outline-primary rounded-pill font-mono"
                      style={{ fontSize: '10px' }}
                    >
                      {userData?.pushNotificationsEnabled ? "ENABLED" : "ENABLE"}
                    </button>
                  </div>
                  <div className="signal-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <div className="small font-mono text-white">PERSONA_MODE</div>
                      <div className="small text-slate-500 font-mono" style={{ fontSize: '9px' }}>SELECT_OUTPUT_VOICE</div>
                    </div>
                    <select
                      value={userData?.personaMode ?? "tami"}
                      onChange={(e) => handlePersonaModeChange(e.target.value as UserProfile["personaMode"])}
                      className="form-select form-select-sm w-auto bg-slate-950 font-mono text-white"
                      style={{ fontSize: '10px' }}
                    >
                      <option value="tami">TAMI</option>
                      <option value="oracle">ORACLE</option>
                    </select>
                  </div>
                  <div className="signal-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <div className="small font-mono text-white">COSMIC_AUDIO</div>
                      <div className="small text-slate-500 font-mono" style={{ fontSize: '9px' }}>
                        ENTANGLEMENT: {Math.round(entanglementSettings.entanglementPercent)}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCosmicAudio}
                      disabled={cosmicAudioLoading}
                      className="btn btn-sm btn-outline-primary rounded-pill font-mono"
                      style={{ fontSize: '10px' }}
                    >
                      {cosmicAudioEnabled ? "TERMINATE" : "INITIALIZE"}
                    </button>
                  </div>
                  <button
                    onClick={downloadData}
                    className="btn btn-dark w-100 d-flex align-items-center justify-content-between signal-card border-0 hover-bg-slate-800"
                  >
                    <div className="d-flex align-items-center gap-3 text-slate-300">
                      <Download size={18} />
                      <span className="small font-mono">EXPORT_DATA (JSON)</span>
                    </div>
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="btn btn-dark w-100 d-flex align-items-center justify-content-between signal-card border-danger border-opacity-20 hover-bg-danger hover-bg-opacity-10"
                  >
                    <div className="d-flex align-items-center gap-3 text-danger">
                      <Trash2 size={18} />
                      <span className="small font-mono">PURGE_ACCOUNT</span>
                    </div>
                  </button>
                  <button
                    onClick={() => logOut()}
                    className="btn btn-link w-100 p-4 text-slate-600 text-decoration-none hover-text-white d-flex justify-content-center align-items-center gap-2 font-mono small"
                  >
                    <LogOut size={18} /> SIGN_OUT
                  </button>
                </div>
              </>
            )}

            {activeSubTabs.soulprint === "dev" && (role === "admin" || role === "owner") && (
              <>
                <header className="mb-4">
                  <h2 className="display-6 font-serif text-white mb-2">
                    System Debug
                  </h2>
                  <p className="text-slate-500 small font-mono">
                    SIGNAL_DISPATCH • SYSTEM_LOGS
                  </p>
                </header>
                <div className="signal-card mb-4">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div>
                      <h3 className="font-serif fs-5 text-slate-200">Dev Toolkit</h3>
                      <p className="small font-mono text-slate-500 mt-1" style={{ fontSize: '10px' }}>
                        SESSION_PATHS • QUICK_REFS
                      </p>
                    </div>
                    <div className="small font-mono text-danger">ROOT</div>
                  </div>

                  <div className="mt-4 row g-3">
                    <div className="col-12 col-sm-6">
                      <div className="p-3 rounded border border-slate-800 bg-slate-950 bg-opacity-40">
                        <div className="small font-mono text-slate-600 mb-2" style={{ fontSize: '9px' }}>SESSION_DATA</div>
                        <div className="small text-slate-400 font-mono" style={{ fontSize: '10px' }}>
                          UID: {currentUser?.uid ? `${currentUser.uid.slice(0, 8)}...` : "—"}
                        </div>
                        <div className="small text-slate-400 font-mono mt-1" style={{ fontSize: '10px' }}>
                          ROLE: {role}
                        </div>
                        <div className="small text-slate-400 font-mono mt-1" style={{ fontSize: '10px' }}>
                          VERIFIED: {currentUser?.emailVerified ? "TRUE" : "FALSE"}
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 rounded border border-slate-800 bg-slate-950 bg-opacity-40 h-100">
                        <div className="small font-mono text-slate-600 mb-2" style={{ fontSize: '9px' }}>THEME_SELECTOR</div>
                        <div className="d-flex flex-wrap gap-1">
                          {["purple", "indigo", "emerald", "amber", "crimson", "obsidian", "ghost"].map(t => (
                            <button
                              key={t}
                              onClick={() => handleThemeChange(t)}
                              className={`btn btn-sm font-mono p-1 px-2 ${userData?.favoriteColor === t ? "btn-primary" : "btn-outline-primary"}`}
                              style={{ fontSize: '8px' }}
                            >
                              {t.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => currentUser?.uid && navigator.clipboard?.writeText(currentUser.uid)}
                      className="btn btn-sm btn-outline-secondary font-mono"
                      style={{ fontSize: '9px' }}
                    >
                      COPY_UID
                    </button>
                    <button
                      type="button"
                      onClick={handleDevPingWrite}
                      disabled={!currentUser?.uid || devPingLoading}
                      className="btn btn-sm btn-outline-danger font-mono"
                      style={{ fontSize: '9px' }}
                    >
                      {devPingLoading ? "PINGING..." : "PING_TEST"}
                    </button>
                  </div>
                </div>
                <SignalDispatch />
                <GenerativeLogViewer />
              </>
            )}
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
    <div className="modal d-block bg-black bg-opacity-80 backdrop-blur-sm p-3" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-slate-950 border border-accent border-opacity-20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="modal-header border-bottom border-white border-opacity-10 bg-slate-900 bg-opacity-90 px-4 py-4">
            <div>
              <h3 className="modal-title font-serif text-white fs-4">{selectedAttribute.title}</h3>
              {subtitle && (
                <p className="small font-mono text-accent opacity-80 mb-0 mt-1" style={{ fontSize: '9px' }}>{subtitle.toUpperCase()}</p>
              )}
            </div>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body p-4 p-md-5 text-slate-300 lh-lg small overflow-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
            <div className="font-serif fs-5 mb-4 text-white opacity-90" style={{ fontStyle: 'italic' }}>
              &ldquo;The sequence unfolds according to the initial conditions.&rdquo;
            </div>
            <p className="mb-4">{description}</p>
            {elementEntry?.description && (
              <div className="pt-4 border-top border-white border-opacity-10 mt-4">
                <p className="small font-mono text-accent opacity-80 mb-2" style={{ fontSize: '9px' }}>
                  [{selectedAttribute.subtitle?.toUpperCase()}_ELEMENT_ANALYSIS]
                </p>
                <p className="mb-0">{elementEntry.description}</p>
              </div>
            )}
          </div>
          <div className="modal-footer border-top border-white border-opacity-10 bg-slate-900 bg-opacity-50 px-4 py-3">
            <button type="button" className="btn btn-link text-slate-500 font-mono text-decoration-none small" style={{ fontSize: '10px' }} onClick={onClose}>[ DISMISS ]</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SoulprintCard({
  pillar,
  label,
  value,
  symbol,
  grimoire,
  onGrimoireClick,
}: {
  pillar: PillarType;
  label: string;
  value: string;
  symbol: string;
  grimoire: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string };
  onGrimoireClick: (g: { type: keyof typeof ESOTERIC_DATA; key: string; title: string; subtitle?: string }) => void;
}) {
  const Icon = getPillarIcon(pillar);
  return (
    <div className="col-6 col-sm-4">
      <button
        type="button"
        onClick={() => onGrimoireClick(grimoire)}
        className="btn btn-link text-decoration-none w-100 h-100 signal-card d-flex flex-column align-items-center justify-content-center text-center p-4"
        style={{ minHeight: '140px' }}
      >
        <div className="d-flex align-items-center justify-content-center rounded bg-theme-opacity-10 border border-accent border-opacity-20 mb-3" style={{ width: '52px', height: '52px' }}>
          {symbol ? (
            <span className="fs-3 text-accent" aria-hidden>{symbol}</span>
          ) : (
            <Icon size={28} className="text-accent" />
          )}
        </div>
        <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '9px' }}>{label}</div>
        <div className="font-serif text-white truncate w-100 small">{value}</div>
      </button>
    </div>
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
    <div className="d-flex align-items-center gap-3">
      <div className="flex-shrink-0 d-flex align-items-center justify-content-center rounded bg-theme-opacity-10 border border-accent border-opacity-20" style={{ width: '44px', height: '44px' }}>
        <Icon size={20} className="text-accent" />
      </div>
      <div className="min-w-0 flex-fill text-start">
        <div className="text-slate-500 small font-mono mb-1" style={{ fontSize: '9px' }}>
          {label}
        </div>
        <div className="text-white font-medium truncate small">
          {value}
        </div>
      </div>
    </div>
  );

  const className = `signal-card p-3 h-100`;
  const colClass = span === 2 ? "col-12" : "col-6 col-sm-4";

  return (
    <div className={colClass}>
      {grimoire && onGrimoireClick ? (
        <button
          type="button"
          onClick={() => onGrimoireClick(grimoire)}
          className={`btn btn-link text-decoration-none w-100 p-0 h-100 ${className}`}
        >
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </div>
  );
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
    className={`btn btn-link text-decoration-none d-flex flex-column align-items-center gap-1 transition-colors w-100 py-3 ${
      active ? "text-purple-400" : "text-slate-500 hover-text-slate-300"
    } position-relative`}
  >
    {icon}
    <span className="small font-medium tracking-wide" style={{ fontSize: '10px' }}>{label}</span>
    {active && (
      <div className="d-none d-lg-block position-absolute start-0 h-100" style={{ width: '4px', backgroundColor: 'var(--purple-500)', top: 0 }} />
    )}
  </button>
);

const SubNavButton = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`btn btn-sm px-3 py-2 rounded-pill border transition-all whitespace-nowrap ${
      active
        ? "bg-purple-600 border-purple-500 text-white shadow-sm"
        : "bg-slate-900 border-slate-800 text-slate-400 hover-bg-slate-800 hover-text-slate-200"
    }`}
    style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}
  >
    {label.toUpperCase()}
  </button>
);

export default function App() {
  const { currentUser, userData, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (currentUser && !userData && !loading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
    if (userData) setLoadingTimeout(false);
  }, [currentUser, userData, loading]);

  if (loading) {
    return (
      <div className="min-vh-100 bg-slate-950 d-flex align-items-center justify-content-center text-purple-400">
        Loading Soul Data…
      </div>
    );
  }

  const isVerified = currentUser?.emailVerified ?? false;

  if (currentUser && isVerified && !userData && !loadingTimeout) {
    return (
      <div className="min-vh-100 bg-slate-950 d-flex align-items-center justify-content-center text-purple-400">
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
              <Navigate to="/onboarding" replace />
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
            <Navigate to={soulprintComplete ? "/" : "/onboarding"} replace />
          ) : (
            <VerifyEmailPage />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : !isVerified ? (
            <Navigate to="/verify-email" replace />
          ) : soulprintComplete ? (
            <Navigate to="/soulprint" replace />
          ) : (
            <OnboardingPage />
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
            <Navigate to="/onboarding" replace />
          ) : (
            <Dashboard />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
