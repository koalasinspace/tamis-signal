import type { UserProfile } from "./types";
import PILLARS_MD from "../../context/pillars.md?raw";
import TAMI_PERSONA_MD from "../../context/tami_persona.md?raw";
import ORACLE_PERSONA_MD from "../../context/oracle_persona.md?raw";
import { calculateEntanglement, calculateSoulTone } from "../utils/sonification";

export type EntropyEstimationOptions = {
  /** If true, treat the current interaction as higher-entropy (e.g. crisis keywords). */
  anxietyBoost?: boolean;
};

export function personaDocsFor(mode: UserProfile["personaMode"] | undefined) {
  return (mode ?? "tami") === "oracle" ? ORACLE_PERSONA_MD : TAMI_PERSONA_MD;
}

export function estimateEntropyScore(user: UserProfile, opts?: EntropyEstimationOptions) {
  // 0..100 (higher = more entropy/static). Keep conservative until a real model exists.
  let score = typeof user.entropyScore === "number" ? user.entropyScore : 50;
  const entries = user.journalEntries ?? [];
  if (entries.length === 0) score += 10;
  if (entries.length >= 3) score -= 5;
  if (opts?.anxietyBoost) score += 15;
  return Math.max(0, Math.min(100, score));
}

export function buildSystemInstruction(
  user: UserProfile,
  entropyScore: number,
  opts?: { weaveReport?: string | null }
) {
  const soulTone = calculateSoulTone(user);
  const ent = calculateEntanglement(entropyScore);
  const personaDocs = personaDocsFor(user.personaMode);

  const systemNote = `System Note: User's Frequency is ${soulTone.fCoreHz.toFixed(
    2
  )}Hz. P=${soulTone.pValue.toFixed(2)}. Entanglement is ${Math.round(
    ent.entanglementPercent
  )}% (${ent.label}).`;

  return [
    "SYSTEM INSTRUCTION (read-only):",
    PILLARS_MD.trim(),
    "",
    personaDocs.trim(),
    "",
    systemNote,
    opts?.weaveReport ? `\n${opts.weaveReport.trim()}\n` : "",
    "",
  ].join("\n");
}

export type DerivedPillars = {
  planetaryRuler: string;
  chineseZodiac: string;
  chineseElement: string;
  lifePathNumber: number;
  moonPhase: string;
  celticTree: string;
};

/**
 * Ensures prompt-building has the minimum pillar fields populated consistently.
 * This does NOT write to Firestore; it's only for local prompt context.
 */
export function enrichUserForOracle(
  user: UserProfile,
  derived: DerivedPillars
): UserProfile {
  return {
    ...user,
    planetaryRuler: derived.planetaryRuler,
    chineseZodiac: derived.chineseZodiac,
    chineseElement: derived.chineseElement,
    lifePathNumber: derived.lifePathNumber,
    moonPhase: derived.moonPhase,
    celticTree: derived.celticTree,
    personaMode: user.personaMode ?? "tami",
    dnaTrait: user.dnaTrait ?? "Unknown",
  };
}

