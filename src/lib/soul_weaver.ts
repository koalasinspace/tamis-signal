import type { UserProfile } from "./types";
import { getDeepSoulInfo } from "./librarian";
import { getWesternElement } from "./calculators";

function normalize(s: string) {
  return (s ?? "").toString().trim();
}

export type CreativeContextMode = "selection" | "extrapolation" | "subtraction" | "shadow";

type WeaverLawHit = {
  law: string;
  compound?: string;
  systemStatus?: string;
  tamiVoice?: string;
};

function secretAnimalForBirthTime(birthTime: string): string | null {
  // Chinese zodiac hour pillar (2-hour blocks).
  // Uses local time HH:MM only (no timezone handling here).
  const t = normalize(birthTime);
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const minutes = hh * 60 + mm;

  // Map by start minute inclusive.
  // 23:00–01:00 Rat, 01:00–03:00 Ox, ..., 21:00–23:00 Pig
  // Normalize to a 0..1439 clock where Rat spans end/start.
  const inRange = (start: number, end: number) => {
    if (start <= end) return minutes >= start && minutes < end;
    // wraps midnight
    return minutes >= start || minutes < end;
  };

  if (inRange(23 * 60, 1 * 60)) return "Rat";
  if (inRange(1 * 60, 3 * 60)) return "Ox";
  if (inRange(3 * 60, 5 * 60)) return "Tiger";
  if (inRange(5 * 60, 7 * 60)) return "Rabbit";
  if (inRange(7 * 60, 9 * 60)) return "Dragon";
  if (inRange(9 * 60, 11 * 60)) return "Snake";
  if (inRange(11 * 60, 13 * 60)) return "Horse";
  if (inRange(13 * 60, 15 * 60)) return "Goat";
  if (inRange(15 * 60, 17 * 60)) return "Monkey";
  if (inRange(17 * 60, 19 * 60)) return "Rooster";
  if (inRange(19 * 60, 21 * 60)) return "Dog";
  if (inRange(21 * 60, 23 * 60)) return "Pig";
  return null;
}

function helixComtStatus(profile: UserProfile) {
  return profile.helixTraits?.comtStatus ?? "Unknown";
}

function helixDrd4Status(profile: UserProfile) {
  return profile.helixTraits?.drd4Status ?? "Unknown";
}

function tarotKey(profile: UserProfile) {
  return normalize(profile.tarotArchetype).toLowerCase();
}

function isTarotChariotFast(profile: UserProfile) {
  // From grand_unified_theory.md: "Tarot = Chariot (Fast)"
  return tarotKey(profile) === "the chariot" || tarotKey(profile).endsWith("chariot");
}

function inferredGeomancyFigure(profile: UserProfile): string | null {
  // Prefer explicit manual entry; otherwise leave unknown.
  const g = normalize(profile.geomancyFigure ?? "");
  return g || null;
}

function planetaryHz(planetaryRuler: string | undefined) {
  const p = normalize(planetaryRuler ?? "").toLowerCase();
  if (p === "sun") return 126.22;
  if (p === "moon") return 210.42;
  if (p === "mars") return 144.72;
  if (p === "mercury") return 141.27;
  if (p === "jupiter") return 183.58;
  if (p === "venus") return 221.23;
  if (p === "saturn") return 147.85;
  return 126.22;
}

function masterShimmerHz(destinyNumber: number | undefined | null) {
  if (destinyNumber === 11) return 440;
  if (destinyNumber === 22) return 880;
  if (destinyNumber === 33) return 1320;
  return null;
}

function lifePathToBpm(lifePathNumber: number | undefined | null) {
  // "Life Path BPM" master clock (bounded to musical range).
  // Deterministic mapping: 1..33 -> 60..124 bpm (2 bpm per step).
  const n = typeof lifePathNumber === "number" && Number.isFinite(lifePathNumber) ? lifePathNumber : 0;
  if (n <= 0) return 60;
  const bpm = 60 + (Math.min(33, Math.max(1, n)) - 1) * 2;
  return Math.max(40, Math.min(160, bpm));
}

function redshiftFor(profile: UserProfile, mode: CreativeContextMode) {
  // A simple numeric that allows the Architect matrix to display time-stretch intent.
  // NOTE: This is a display metric; the actual scheduler uses bpm scaling.
  const tarot = normalize(profile.tarotArchetype).toLowerCase();
  if (tarot === "the tower" || tarot.endsWith("tower")) return 0.25;
  if (mode === "shadow") return 0.15;
  return 0;
}

export type WeaveMetrics = {
  f0Hz: number;
  shimmerHz: number | null;
  westernElement: ReturnType<typeof getWesternElement>;
  bpm: number;
  secondsPerBeat: number;
  redshiftZ: number;
};

/**
 * Numeric "Physics Data Matrix" variables derived deterministically from profile + context.
 */
export function generateWeaveMetrics(
  profile: UserProfile,
  mode: CreativeContextMode
): WeaveMetrics {
  const westernElement = getWesternElement(profile.zodiacSign);
  const f0Hz = planetaryHz(profile.planetaryRuler);
  const shimmerHz = masterShimmerHz(profile.destinyNumber);
  const baseBpm = lifePathToBpm(profile.lifePathNumber);
  const bpm = mode === "extrapolation" ? Math.min(180, baseBpm * 2) : mode === "shadow" ? Math.max(30, baseBpm * 0.85) : baseBpm;
  const secondsPerBeat = 60 / bpm;
  const redshiftZ = redshiftFor(profile, mode);
  return { f0Hz, shimmerHz, westernElement, bpm, secondsPerBeat, redshiftZ };
}

/**
 * Generates a deterministic "Tami's Intuition" weave report that highlights
 * clashes/harmonies across scaffold points. Intended to be injected into LLM context.
 */
export async function generateWeaveReport(profile: UserProfile): Promise<string> {
  const lines: string[] = [];

  const birthLocation = profile.birthLocation || profile.birthPlace || "";
  const westernElement = getWesternElement(profile.zodiacSign);
  const chineseElement = normalize(profile.chineseElement || "");
  const monologueStyle = profile.monologueStyle ?? "Verbal";
  const comt = helixComtStatus(profile);
  const drd4 = helixDrd4Status(profile);
  const secretAnimal = secretAnimalForBirthTime(profile.birthTime);
  const geomancy = inferredGeomancyFigure(profile);

  const derivedChineseCombo = [profile.chineseElement, profile.chineseZodiac].filter(Boolean).join(" ");

  // Pull deep info snippets (best effort).
  const [zodiacDeep, elementDeep, monologueDeep, helixDeep, geomancyDeep] = await Promise.all([
    derivedChineseCombo ? getDeepSoulInfo("ChineseZodiac", derivedChineseCombo).catch(() => null) : Promise.resolve(null),
    chineseElement ? getDeepSoulInfo("ChineseElement", chineseElement).catch(() => null) : Promise.resolve(null),
    monologueStyle ? getDeepSoulInfo("InnerMonologue", monologueStyle).catch(() => null) : Promise.resolve(null),
    profile.helixTraits?.comtStatus ? getDeepSoulInfo("Helix", profile.helixTraits.comtStatus).catch(() => null) : Promise.resolve(null),
    geomancy ? getDeepSoulInfo("Geomancy", geomancy).catch(() => null) : Promise.resolve(null),
  ]);

  lines.push("TAMI'S INTUITION (WEAVE REPORT):");

  const hits: WeaverLawHit[] = [];

  // LAW 1: Elemental Dignity (grand_unified_theory.md)
  if (westernElement === "Fire" && chineseElement === "Water") {
    hits.push({
      law: "The Law of Elemental Dignity",
      compound: "STEAM",
      systemStatus: "High Pressure.",
      tamiVoice:
        'You are pressurized. The Water seeks to drown the Fire; the Fire seeks to boil the Water.',
    });
  }
  if (westernElement === "Earth" && chineseElement === "Metal") {
    hits.push({
      law: "The Law of Elemental Dignity",
      compound: "ORE",
      systemStatus: "High Density.",
      tamiVoice: "You are unmovable. A mountain capping a mine.",
    });
  }

  // LAW 2: Biological Drag (grand_unified_theory.md)
  if (isTarotChariotFast(profile) && comt === "Worrier (Val/Val)") {
    hits.push({
      law: "The Law of Biological Drag",
      systemStatus: "Drag Coefficient High.",
      tamiVoice: "Your soul is racing, but your biology has the brakes on. Burnout is imminent.",
    });
  }

  // LAW 3: Ancestral Echo (grand_unified_theory.md)
  if (geomancy === "Carcer" && drd4 === "Seeker (7R+)") {
    hits.push({
      law: "The Law of the Ancestral Echo",
      systemStatus: "Cage Rattle.",
      tamiVoice:
        "You are a nomad trapped in a grid. The anxiety you feel is just the walls closing in.",
    });
  }

  if (hits.length) {
    lines.push("WEAVER LAWS TRIGGERED:");
    for (const h of hits) {
      lines.push(
        `- ${h.law}${h.compound ? ` → ${h.compound}` : ""}\n  - System Status: ${h.systemStatus}\n  - Tami Voice: "${h.tamiVoice}"`
      );
    }
  } else {
    lines.push("WEAVER LAWS TRIGGERED: None (no matching interaction rules).");
  }

  // Context anchors (still useful for grounding)
  lines.push(`\nPILLAR SNAPSHOT:`);
  lines.push(`- Western Element: ${westernElement}`);
  lines.push(`- Chinese Element: ${chineseElement || "Unknown"}`);
  lines.push(`- Tarot: ${profile.tarotArchetype || "Unknown"}`);
  lines.push(`- Helix COMT: ${comt}`);
  lines.push(`- Helix DRD4: ${drd4}`);
  lines.push(`- Geomancy Figure: ${geomancy || "Unknown"}`);
  lines.push(`- Birth Location: ${birthLocation || "Unknown"}`);
  lines.push(`- Inner Monologue: ${monologueStyle}`);

  // Optional: Chronos detail (still helpful for tuning)
  if (secretAnimal) {
    lines.push(`- Secret Animal (Hour Pillar): ${secretAnimal}`);
  }

  // Provide short deep excerpts (truncated) so the LLM has anchors without full dumps.
  const excerpts: Array<{ label: string; text: string | null }> = [
    { label: "Chinese Zodiac Excerpt", text: zodiacDeep },
    { label: "Chinese Element Excerpt", text: elementDeep },
    { label: "Inner Monologue Excerpt", text: monologueDeep },
    { label: "Helix Excerpt", text: helixDeep },
    { label: "Geomancy Excerpt", text: geomancyDeep },
  ];

  const trimmedExcerpts = excerpts
    .filter((e) => e.text && e.text.trim().length > 0)
    .map((e) => {
      const t = (e.text as string).trim();
      const clipped = t.length > 900 ? t.slice(0, 900).trimEnd() + "\n…(clipped)" : t;
      return `\n[${e.label}]\n${clipped}`;
    });

  if (trimmedExcerpts.length) {
    lines.push("\nREFERENCE EXCERPTS (for grounding, not for dumping):");
    lines.push(trimmedExcerpts.join("\n"));
  }

  return lines.join("\n").trim();
}

