import type { UserProfile } from "./types";
import { getDeepSoulInfo } from "./librarian";

function normalize(s: string) {
  return (s ?? "").toString().trim();
}

function westernElementForZodiac(zodiacSign: string): "Fire" | "Earth" | "Air" | "Water" | "Unknown" {
  const z = normalize(zodiacSign).toLowerCase();
  if (["aries", "leo", "sagittarius"].includes(z)) return "Fire";
  if (["taurus", "virgo", "capricorn"].includes(z)) return "Earth";
  if (["gemini", "libra", "aquarius"].includes(z)) return "Air";
  if (["cancer", "scorpio", "pisces"].includes(z)) return "Water";
  return "Unknown";
}

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

function helixComtClass(profile: UserProfile): "Warrior" | "Worrier" | "Balanced" | "Unknown" {
  const c = profile.helixTraits?.comtStatus ?? "Unknown";
  if (c.startsWith("Warrior")) return "Warrior";
  if (c.startsWith("Worrier")) return "Worrier";
  if (c === "Balanced") return "Balanced";
  // legacy fallback
  if (profile.dnaTrait === "Warrior") return "Warrior";
  if (profile.dnaTrait === "Worrier") return "Worrier";
  return "Unknown";
}

function locationSignalHint(birthLocation: string): { key: string; note: string } {
  const loc = normalize(birthLocation).toLowerCase();
  if (!loc) return { key: "Genius Loci", note: "Location is blank; reading defaults to the Spirit of Place." };
  if (loc.includes("island") || loc.includes("coast") || loc.includes("ocean") || loc.includes("sea")) {
    return { key: "Genius Loci", note: "Born near water: the place-memory is tidal and reflective." };
  }
  if (loc.includes("mountain") || loc.includes("alps") || loc.includes("hill")) {
    return { key: "Cardinal Directions", note: "Born in elevation: the place-memory is vertical and uncompromising." };
  }
  if (loc.includes("desert") || loc.includes("dune")) {
    return { key: "Location Magic", note: "Born in dryness: the place-memory is sparse, precise, and unforgiving." };
  }
  if (loc.includes("forest") || loc.includes("woods") || loc.includes("jungle")) {
    return { key: "Genius Loci", note: "Born in dense green: the place-memory is layered and alive." };
  }
  if (loc.includes("city") || loc.includes("nyc") || loc.includes("london") || loc.includes("tokyo")) {
    return { key: "The Binary Soul of the Earth", note: "Born in heavy infrastructure: the place-memory is engineered and loud." };
  }
  return { key: "Genius Loci", note: "Birthplace treated as Genius Loci (spirit-of-place) context." };
}

/**
 * Generates a deterministic "Tami's Intuition" weave report that highlights
 * clashes/harmonies across scaffold points. Intended to be injected into LLM context.
 */
export async function generateWeaveReport(profile: UserProfile): Promise<string> {
  const lines: string[] = [];

  const birthLocation = profile.birthLocation || profile.birthPlace || "";
  const westernElement = westernElementForZodiac(profile.zodiacSign);
  const chineseElement = normalize(profile.chineseElement || "");
  const monologueStyle = profile.monologueStyle ?? "Verbal";
  const comt = helixComtClass(profile);
  const secretAnimal = secretAnimalForBirthTime(profile.birthTime);

  const derivedChineseCombo = [profile.chineseElement, profile.chineseZodiac].filter(Boolean).join(" ");

  // Pull deep info snippets (best effort).
  const [zodiacDeep, elementDeep, monologueDeep, helixDeep, geomancyDeep] = await Promise.all([
    derivedChineseCombo ? getDeepSoulInfo("ChineseZodiac", derivedChineseCombo).catch(() => null) : Promise.resolve(null),
    chineseElement ? getDeepSoulInfo("ChineseElement", chineseElement).catch(() => null) : Promise.resolve(null),
    monologueStyle ? getDeepSoulInfo("InnerMonologue", monologueStyle).catch(() => null) : Promise.resolve(null),
    profile.helixTraits?.comtStatus ? getDeepSoulInfo("Helix", profile.helixTraits.comtStatus).catch(() => null) : Promise.resolve(null),
    getDeepSoulInfo("Geomancy", locationSignalHint(birthLocation).key).catch(() => null),
  ]);

  lines.push("TAMI'S INTUITION (WEAVE REPORT):");

  // 1) Ancestral Echo (Helix vs. Geomancy)
  const locHint = locationSignalHint(birthLocation);
  if (comt === "Warrior") {
    lines.push(
      `- Ancestral Echo: Your COMT pattern leans Warrior. ${locHint.note} This can read as a body that wants action inside a place that stores memory.`
    );
  } else if (comt === "Worrier") {
    lines.push(
      `- Ancestral Echo: Your COMT pattern leans Worrier. ${locHint.note} This can read as a nervous system that keeps scanning the room the earth already remembers.`
    );
  } else if (comt === "Balanced") {
    lines.push(
      `- Ancestral Echo: Your COMT pattern reads Balanced. ${locHint.note} You can tune without overcorrecting—when you let the place speak first.`
    );
  } else {
    lines.push(
      `- Ancestral Echo: Helix trait unknown. ${locHint.note} (Manual helix entry will sharpen this read.)`
    );
  }

  // 2) Elemental Wound (Chinese Element vs Western Element)
  if (westernElement !== "Unknown" && chineseElement) {
    const overlap = ["Fire", "Water", "Earth"].includes(westernElement) && ["Fire", "Water", "Earth"].includes(chineseElement);
    if (overlap && westernElement.toLowerCase() !== chineseElement.toLowerCase()) {
      lines.push(
        `- Elemental Wound: Western ${westernElement} vs Wu Xing ${chineseElement}. This is a split between how you burn and how you metabolize change.`
      );
    } else if (westernElement.toLowerCase() === chineseElement.toLowerCase()) {
      lines.push(
        `- Elemental Harmony: Western ${westernElement} matches Wu Xing ${chineseElement}. The surface and the engine agree—less noise, more lock.`
      );
    } else {
      lines.push(
        `- Elemental Wound: Western ${westernElement} vs Wu Xing ${chineseElement}. These systems don't map cleanly; we treat this as a translation layer, not a contradiction.`
      );
    }
  } else {
    lines.push(`- Elemental Wound: Missing element signals (zodiac or Chinese element).`);
  }

  // 3) Chronos Glitch (Birth Time / Secret Animal vs Monologue)
  if (secretAnimal) {
    if (monologueStyle === "Anendophasic" || monologueStyle === "Anauralic") {
      lines.push(
        `- Chronos Glitch: Secret ${secretAnimal} hour, but your inner channel is ${monologueStyle}. Time wants to speak; your mind prefers silence. That mismatch creates phantom static.`
      );
    } else {
      lines.push(
        `- Chronos Glitch: Secret ${secretAnimal} hour + ${monologueStyle} inner style. Your timing and your thought-form are in communication (watch what happens at night).`
      );
    }
  } else {
    lines.push(`- Chronos Glitch: Birth time missing/invalid; Secret Animal can't be tuned yet.`);
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

