type WesternElement = "Fire" | "Earth" | "Air" | "Water" | "Unknown";

/**
 * Shared constants (source: `context/pillars.md`).
 * These are used across sonification + physics matrices; keep them stable/deterministic.
 */
export const PLANETARY_HZ: Record<string, number> = {
  Sun: 126.22,
  Moon: 210.42,
  Mars: 144.72,
  Mercury: 141.27,
  Jupiter: 183.58,
  Venus: 221.23,
  Saturn: 147.85,
};

export const CHINESE_ELEMENT_P: Record<string, number> = {
  Metal: 2.0,
  Wood: 0.8,
  Water: 1.2,
  Fire: 0.5,
  Earth: 1.5,
};

const LETTER_MAP: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 1, k: 2, l: 3,
  m: 4, n: 5, o: 6, p: 7, q: 8, r: 9, s: 1, t: 2, u: 3, v: 4, w: 5, x: 6,
  y: 7, z: 8,
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

function reduceNumerology(n: number): number {
  let x = Math.abs(Math.trunc(n));
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x)
      .split("")
      .reduce((acc, d) => acc + Number.parseInt(d, 10), 0);
  }
  return x;
}

function sumNameLetters(name: string, filter: "all" | "vowels" | "consonants"): number {
  const clean = (name || "").toLowerCase().replace(/[^a-z]/g, "");
  let sum = 0;
  for (const ch of clean) {
    const isVowel = VOWELS.has(ch);
    if (filter === "vowels" && !isVowel) continue;
    if (filter === "consonants" && isVowel) continue;
    sum += LETTER_MAP[ch] ?? 0;
  }
  return sum;
}

/** Destiny / Expression number (Pythagorean). Preserves master numbers 11/22/33. */
export const calculateDestinyNumber = (name: string): number =>
  reduceNumerology(sumNameLetters(name, "all"));

/** Soul Urge / Heart's Desire (vowels). */
export const calculateSoulUrgeNumber = (name: string): number =>
  reduceNumerology(sumNameLetters(name, "vowels"));

/** Personality number (consonants). */
export const calculatePersonalityNumber = (name: string): number =>
  reduceNumerology(sumNameLetters(name, "consonants"));

export function getKarmicDebtNumber(n: number): 13 | 14 | 16 | 19 | null {
  const x = Math.abs(Math.trunc(n));
  if (x === 13 || x === 14 || x === 16 || x === 19) return x;
  return null;
}

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];

export const getTarotArchetype = (numStr: string): string => {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return "The Fool";
  // Explicitly map 22 to the final major arcana rather than wrapping to 0.
  if (num === 22) return "The World";
  const idx = ((num % 22) + 22) % 22;
  return MAJOR_ARCANA[idx] ?? "The Fool";
};

export const getZodiacSign = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 1 && day <= 19) || (month === 12 && day >= 22)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  return "Unknown";
};

export const getWesternElement = (
  zodiacSign: string
): WesternElement => {
  const z = (zodiacSign || "").trim().toLowerCase();
  if (["aries", "leo", "sagittarius"].includes(z)) return "Fire";
  if (["taurus", "virgo", "capricorn"].includes(z)) return "Earth";
  if (["gemini", "libra", "aquarius"].includes(z)) return "Air";
  if (["cancer", "scorpio", "pisces"].includes(z)) return "Water";
  return "Unknown";
};

const PLANETS_BY_DAY: Record<number, string> = {
  0: "Sun",
  1: "Moon",
  2: "Mars",
  3: "Mercury",
  4: "Jupiter",
  5: "Venus",
  6: "Saturn",
};

export const getPlanetaryRuler = (dateString: string): string => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  return PLANETS_BY_DAY[dayOfWeek] ?? "Unknown";
};

const CHINESE_ZODIAC = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
];

type YinYang = "Yin" | "Yang";
type StemName = "Jia" | "Yi" | "Bing" | "Ding" | "Wu" | "Ji" | "Geng" | "Xin" | "Ren" | "Gui";
type BranchName = "Zi" | "Chou" | "Yin" | "Mao" | "Chen" | "Si" | "Wu" | "Wei" | "Shen" | "You" | "Xu" | "Hai";

const HEAVENLY_STEMS: Array<{ name: StemName; element: keyof typeof CHINESE_ELEMENT_P; yinYang: YinYang }> = [
  { name: "Jia", element: "Wood", yinYang: "Yang" },
  { name: "Yi", element: "Wood", yinYang: "Yin" },
  { name: "Bing", element: "Fire", yinYang: "Yang" },
  { name: "Ding", element: "Fire", yinYang: "Yin" },
  { name: "Wu", element: "Earth", yinYang: "Yang" },
  { name: "Ji", element: "Earth", yinYang: "Yin" },
  { name: "Geng", element: "Metal", yinYang: "Yang" },
  { name: "Xin", element: "Metal", yinYang: "Yin" },
  { name: "Ren", element: "Water", yinYang: "Yang" },
  { name: "Gui", element: "Water", yinYang: "Yin" },
];

const EARTHLY_BRANCHES: Array<{ name: BranchName; animal: string }> = [
  { name: "Zi", animal: "Rat" },
  { name: "Chou", animal: "Ox" },
  { name: "Yin", animal: "Tiger" },
  { name: "Mao", animal: "Rabbit" },
  { name: "Chen", animal: "Dragon" },
  { name: "Si", animal: "Snake" },
  { name: "Wu", animal: "Horse" },
  { name: "Wei", animal: "Goat" },
  { name: "Shen", animal: "Monkey" },
  { name: "You", animal: "Rooster" },
  { name: "Xu", animal: "Dog" },
  { name: "Hai", animal: "Pig" },
];

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function isBeforeLiChun(date: Date) {
  // Deterministic project rule (source: `animal_bank.md`): Chinese year boundary is Feb 4 (Li Chun).
  const month = date.getMonth() + 1; // 1..12
  const day = date.getDate();
  return month < 2 || (month === 2 && day < 4);
}

function getChineseYearForDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  return isBeforeLiChun(date) ? year - 1 : year;
}

export type SexagenaryYear = {
  stem: StemName;
  branch: BranchName;
  element: keyof typeof CHINESE_ELEMENT_P;
  yinYang: YinYang;
  animal: string;
};

/**
 * Sexagenary year (Ganzhi), anchored so that 1984 is Jia-Zi (Wood Rat).
 * Deterministic mapping (source: `animal_bank.md`).
 */
export function getSexagenaryYear(dateString: string): SexagenaryYear {
  const year = getChineseYearForDate(dateString);
  const idx = mod(year - 1984, 60);
  const stem = HEAVENLY_STEMS[mod(idx, 10)];
  const branch = EARTHLY_BRANCHES[mod(idx, 12)];
  return {
    stem: stem.name,
    branch: branch.name,
    element: stem.element,
    yinYang: stem.yinYang,
    animal: branch.animal,
  };
}

export const getChineseZodiac = (dateString: string): string =>
  getSexagenaryYear(dateString).animal ?? "Unknown";

export const getChineseElement = (dateString: string): string => {
  return getSexagenaryYear(dateString).element ?? "Unknown";
};

export const calculateLifePathLegacy = (dateString: string): number => {
  const digits = (dateString || "").replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += parseInt(digits[i]!, 10);
  return reduceNumerology(sum);
};

function reduceDigitsString(digits: string) {
  let sum = 0;
  for (const ch of digits) sum += Number.parseInt(ch, 10);
  return reduceNumerology(sum);
}

/**
 * Life Path (Period/Vertical method; source: `karmic_bank.md`).
 * Month reduced + Day reduced + Year reduced, then reduced again.
 */
export const calculateLifePath = (dateString: string): number => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  const m = reduceDigitsString(String(month));
  const d = reduceDigitsString(String(day));
  const y = reduceDigitsString(String(year));

  return reduceNumerology(m + d + y);
};

/** Birth hour pillar "Secret Animal" (source: `animal_bank.md`). */
export function getSecretAnimal(birthTimeHHMM: string): string | null {
  const raw = (birthTimeHHMM || "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const hh = Number.parseInt(m[1]!, 10);
  const mm = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const minutes = hh * 60 + mm;

  // Ranges are half-open [start, end) except Rat which wraps midnight.
  const inRange = (start: number, end: number) =>
    start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;

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

const LUNAR_CYCLE_DAYS = 29.53;
const REF_NEW_MOON_MS = new Date(1970, 0, 7).getTime();

export const getMoonPhase = (dateString: string): string => {
  const date = new Date(dateString);
  const ms = date.getTime();
  const daysSince = (ms - REF_NEW_MOON_MS) / (24 * 60 * 60 * 1000);
  const phaseInCycle = ((daysSince % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const t = phaseInCycle / LUNAR_CYCLE_DAYS;
  // Knowledge-bank-aligned boundaries: 8 phases of 45° each (source: `lunar_bank.md`).
  if (t < 0.125) return "New Moon";
  if (t < 0.25) return "Waxing Crescent";
  if (t < 0.375) return "First Quarter";
  if (t < 0.5) return "Waxing Gibbous";
  if (t < 0.625) return "Full Moon";
  if (t < 0.75) return "Waning Gibbous";
  if (t < 0.875) return "Last Quarter";
  return "Waning Crescent";
};

export function getMoonPhaseMeta(dateString: string): {
  phase: string;
  phaseIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  archetypeHint: string;
} {
  const phase = getMoonPhase(dateString);
  const map: Record<string, { i: number; hint: string }> = {
    "New Moon": { i: 0, hint: "The Cosmic Seed — initiation and pure potential." },
    "Waxing Crescent": { i: 1, hint: "The Sprout — resistance and mobilization." },
    "First Quarter": { i: 2, hint: "The Warrior-Builder — crisis in action and construction." },
    "Waxing Gibbous": { i: 3, hint: "The Perfectionist — refinement and pressure to optimize." },
    "Full Moon": { i: 4, hint: "The Illuminator — culmination, objectivity, relationship." },
    "Waning Gibbous": { i: 5, hint: "The Teacher — dissemination and sharing the harvest." },
    "Last Quarter": { i: 6, hint: "The Deconstructionist — crisis in consciousness and reorientation." },
    "Waning Crescent": { i: 7, hint: "The Prophet — closure, distillation, transition." },
  };
  const entry = map[phase] ?? map["New Moon"]!;
  return {
    phase,
    phaseIndex: entry.i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    archetypeHint: entry.hint,
  };
}

function celticTreeFor(month: number, day: number): string {
  // Nameless Day: Mistletoe (source: `forest_bank.md`)
  if (month === 12 && day === 23) return "Mistletoe";
  if ((month === 12 && day >= 24) || (month === 1 && day <= 20)) return "Birch";
  if ((month === 1 && day >= 21) || (month === 2 && day <= 17)) return "Rowan";
  if ((month === 2 && day >= 18) || (month === 3 && day <= 17)) return "Ash";
  if ((month === 3 && day >= 18) || (month === 4 && day <= 14)) return "Alder";
  if ((month === 4 && day >= 15) || (month === 5 && day <= 12)) return "Willow";
  if ((month === 5 && day >= 13) || (month === 6 && day <= 9)) return "Hawthorn";
  if ((month === 6 && day >= 10) || (month === 7 && day <= 7)) return "Oak";
  if ((month === 7 && day >= 8) || (month === 8 && day <= 4)) return "Holly";
  if ((month === 8 && day >= 5) || (month === 9 && day <= 1)) return "Hazel";
  if (month === 9 && day >= 2 && day <= 29) return "Vine";
  if ((month === 9 && day >= 30) || (month === 10 && day <= 27)) return "Ivy";
  if ((month === 10 && day >= 28) || (month === 11 && day <= 24)) return "Reed";
  if ((month === 11 && day >= 25) || (month === 12 && day <= 23)) return "Elder";
  return "Unknown";
}

export const getCelticTree = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return celticTreeFor(month, day);
};

type DecanIndex = 1 | 2 | 3;
export type ZodiacDecan = { sign: string; decanIndex: DecanIndex; decanRuler: string };

const DECANS: Record<string, Array<{ start: string; end: string; ruler: string }>> = {
  Aries: [
    { start: "03-21", end: "03-30", ruler: "Mars" },
    { start: "03-31", end: "04-09", ruler: "Sun" },
    { start: "04-10", end: "04-19", ruler: "Jupiter" },
  ],
  Taurus: [
    { start: "04-21", end: "04-30", ruler: "Venus" },
    { start: "05-01", end: "05-10", ruler: "Mercury" },
    { start: "05-11", end: "05-20", ruler: "Saturn" },
  ],
  Gemini: [
    { start: "05-21", end: "05-31", ruler: "Mercury" },
    { start: "06-01", end: "06-10", ruler: "Venus" },
    { start: "06-11", end: "06-20", ruler: "Uranus" },
  ],
  Cancer: [
    { start: "06-21", end: "07-01", ruler: "Moon" },
    { start: "07-02", end: "07-12", ruler: "Pluto" },
    { start: "07-13", end: "07-22", ruler: "Neptune" },
  ],
  Leo: [
    { start: "07-23", end: "08-01", ruler: "Sun" },
    { start: "08-02", end: "08-12", ruler: "Jupiter" },
    { start: "08-13", end: "08-22", ruler: "Mars" },
  ],
  Virgo: [
    { start: "08-23", end: "09-02", ruler: "Mercury" },
    { start: "09-03", end: "09-12", ruler: "Saturn" },
    { start: "09-13", end: "09-22", ruler: "Venus" },
  ],
  Libra: [
    { start: "09-23", end: "10-02", ruler: "Venus" },
    { start: "10-03", end: "10-12", ruler: "Saturn/Uranus" },
    { start: "10-13", end: "10-22", ruler: "Mercury" },
  ],
  Scorpio: [
    { start: "10-23", end: "11-01", ruler: "Pluto/Mars" },
    { start: "11-02", end: "11-12", ruler: "Neptune" },
    { start: "11-13", end: "11-21", ruler: "Moon" },
  ],
  Sagittarius: [
    { start: "11-22", end: "12-02", ruler: "Jupiter" },
    { start: "12-03", end: "12-12", ruler: "Mars" },
    { start: "12-13", end: "12-21", ruler: "Sun" },
  ],
  Capricorn: [
    { start: "12-22", end: "12-31", ruler: "Saturn" },
    { start: "01-01", end: "01-10", ruler: "Venus" },
    { start: "01-11", end: "01-19", ruler: "Mercury" },
  ],
  Aquarius: [
    { start: "01-20", end: "01-29", ruler: "Uranus/Saturn" },
    { start: "01-30", end: "02-08", ruler: "Mercury" },
    { start: "02-09", end: "02-18", ruler: "Venus" },
  ],
  Pisces: [
    { start: "02-19", end: "02-29", ruler: "Neptune" },
    { start: "03-01", end: "03-10", ruler: "Moon" },
    { start: "03-11", end: "03-20", ruler: "Pluto" },
  ],
};

function mmdd(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}-${d}`;
}

function mmddInRange(x: string, start: string, end: string) {
  // Works because MM-DD compares lexicographically.
  return start <= end ? x >= start && x <= end : x >= start || x <= end;
}

export function getZodiacDecan(dateString: string): ZodiacDecan | null {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const sign = getZodiacSign(dateString);
  const ranges = DECANS[sign];
  if (!ranges) return null;
  const x = mmdd(date);
  const idx = ranges.findIndex((r) => mmddInRange(x, r.start, r.end));
  const pick = idx >= 0 ? idx : 0;
  return {
    sign,
    decanIndex: (pick + 1) as DecanIndex,
    decanRuler: ranges[pick]!.ruler,
  };
}
