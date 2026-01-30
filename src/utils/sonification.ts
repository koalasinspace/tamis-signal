import type { UserProfile } from "../lib/types";

export type PersonaMode = "tami" | "oracle";

export type SoulTone = {
  /** Fundamental frequency derived from Planetary Ruler (day of birth). */
  fCoreHz: number;
  /** Personality coefficient derived from Chinese Element. */
  pValue: number;
  /** Envelope derived from DNA trait. */
  envelope: {
    attackSeconds: number;
    decaySeconds: number;
    sustainLevel: number; // 0..1
    releaseSeconds: number;
    label: "Fast Attack, Short Decay" | "Slow Attack, Infinite Sustain" | "Neutral";
  };
  /** Convenience: which pillar inputs were used. */
  pillars: {
    planetaryRuler: string;
    chineseElement: string;
    dnaTrait: string;
  };
};

export type EntanglementSettings = {
  /** 0..100 where 100 = clear signal (low entropy). */
  entanglementPercent: number;
  /** Human label for UI/system note. */
  label: "Clear Signal" | "Interference" | "Static";
  /** 0..1 where 1 = maximum bit-crush/static. */
  bitCrushAmount: number;
  /** Cutoff frequency (Hz) for a high-pass filter (higher = more distant). */
  filterCutoffHz: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeKey(s: string | undefined | null) {
  return (s ?? "").toString().trim().toLowerCase();
}

function planetToHz(planetaryRulerRaw: string): number {
  const p = normalizeKey(planetaryRulerRaw);
  if (p === "sun") return 126.22;
  if (p === "moon") return 210.42;
  if (p === "mars") return 144.72;
  if (p === "mercury") return 141.27;
  if (p === "jupiter") return 183.58;
  if (p === "venus") return 221.23;
  if (p === "saturn") return 147.85;
  // Default to Sun if unknown to keep audio stable.
  return 126.22;
}

function elementToP(chineseElementRaw: string): number {
  const e = normalizeKey(chineseElementRaw);
  if (e === "metal") return 2.0;
  if (e === "wood") return 0.8;
  if (e === "water") return 1.2;
  if (e === "fire") return 0.5;
  if (e === "earth") return 1.5;
  // Neutral-ish default (between Earth and Water).
  return 1.3;
}

function dnaToEnvelope(dnaTraitRaw: string | undefined): SoulTone["envelope"] {
  const d = normalizeKey(dnaTraitRaw);
  if (d === "warrior") {
    return {
      attackSeconds: 0.01,
      decaySeconds: 0.18,
      sustainLevel: 0.2,
      releaseSeconds: 0.25,
      label: "Fast Attack, Short Decay",
    };
  }
  if (d === "worrier") {
    return {
      attackSeconds: 1.2,
      decaySeconds: 0.0,
      sustainLevel: 1.0,
      releaseSeconds: 2.0,
      label: "Slow Attack, Infinite Sustain",
    };
  }
  return {
    attackSeconds: 0.2,
    decaySeconds: 0.2,
    sustainLevel: 0.7,
    releaseSeconds: 0.6,
    label: "Neutral",
  };
}

/**
 * Maps the user's Soulprint pillars to the exact resonance constants defined in `context/pillars.md`.
 */
export function calculateSoulTone(userProfile: UserProfile): SoulTone {
  const planetaryRuler = userProfile.planetaryRuler || "Sun";
  const chineseElement = userProfile.chineseElement || "Earth";
  const dnaTrait = userProfile.dnaTrait || "Unknown";

  const fCoreHz = planetToHz(planetaryRuler);
  const pValue = elementToP(chineseElement);
  const envelope = dnaToEnvelope(dnaTrait);

  return {
    fCoreHz,
    pValue,
    envelope,
    pillars: {
      planetaryRuler,
      chineseElement,
      dnaTrait,
    },
  };
}

/**
 * State Mirroring law: higher entropy => more crushing + more distant (high-pass cutoff rises).
 *
 * `entropyScore` is expected in 0..100 where 100 is highest entropy (most lost/static).
 */
export function calculateEntanglement(entropyScore: number): EntanglementSettings {
  const entropy = clamp(Number.isFinite(entropyScore) ? entropyScore : 50, 0, 100);
  const entanglementPercent = clamp(100 - entropy, 0, 100);

  const label: EntanglementSettings["label"] =
    entanglementPercent >= 70 ? "Clear Signal" : entanglementPercent >= 40 ? "Interference" : "Static";

  // Bitcrush increases with entropy.
  const bitCrushAmount = clamp(entropy / 100, 0, 1);

  // High-pass cutoff rises with entropy to feel more "distant".
  // Keep within musically sane range for background noise.
  const filterCutoffHz = clamp(60 + entropy * 18, 60, 2400);

  return {
    entanglementPercent,
    label,
    bitCrushAmount,
    filterCutoffHz,
  };
}

