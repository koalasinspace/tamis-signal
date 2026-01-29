/**
 * Soulprint Icon Atlas: pillar headers (Lucide) and attribute symbols (Unicode/emoji).
 * Use for the Soulprint dashboard hero + grid.
 */
import React from "react";
import {
  Hash,
  Footprints,
  Star,
  BookOpen,
  Scroll,
  Globe,
  Moon,
  Flame,
  Trees,
} from "lucide-react";

export type PillarType =
  | "destinyNumber"
  | "lifePath"
  | "zodiac"
  | "tarot"
  | "chineseZodiac"
  | "planetaryRuler"
  | "moonPhase"
  | "chineseElement"
  | "celticTree";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const PILLAR_ICONS: Record<PillarType, LucideIcon> = {
  destinyNumber: Hash,
  lifePath: Footprints,
  zodiac: Star,
  tarot: BookOpen,
  chineseZodiac: Scroll,
  planetaryRuler: Globe,
  moonPhase: Moon,
  chineseElement: Flame,
  celticTree: Trees,
};

/** Zodiac: Aries ♈ … Pisces ♓ */
const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

/** Planets: Sun ☉, Moon ☽, Mars ♂, Mercury ☿, Jupiter ♃, Venus ♀, Saturn ♄ */
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mars: "♂",
  Mercury: "☿",
  Jupiter: "♃",
  Venus: "♀",
  Saturn: "♄",
};

/** Moon phases: New 🌑 … Waning Crescent 🌘 */
const MOON_PHASE_SYMBOLS: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

/** Elements: Fire 🜂, Water 🜄, Air 🜁, Earth 🜃, Metal ⚔️, Wood 🌲 */
const ELEMENT_SYMBOLS: Record<string, string> = {
  Fire: "🜂",
  Water: "🜄",
  Air: "🜁",
  Earth: "🜃",
  Metal: "⚔️",
  Wood: "🌲",
};

/** Celtic: generic tree 🌳 for all */
const CELTIC_SYMBOL = "🌳";

/** Returns the Lucide icon component for a pillar type. */
export function getPillarIcon(pillar: PillarType): LucideIcon {
  return PILLAR_ICONS[pillar] ?? Star;
}

/** Returns the Unicode/emoji symbol for an attribute value. type is the grimoire pillar type; value is the display value (e.g. "Aries", "Mars"). */
export function getAttributeSymbol(
  type: "zodiac" | "planetaryRuler" | "moonPhase" | "chineseElement" | "celticTree",
  value: string
): string {
  const v = (value || "").trim();
  if (!v) return "";
  switch (type) {
    case "zodiac":
      return ZODIAC_SYMBOLS[v] ?? "";
    case "planetaryRuler":
      return PLANET_SYMBOLS[v] ?? "";
    case "moonPhase":
      return MOON_PHASE_SYMBOLS[v] ?? "";
    case "chineseElement":
      return ELEMENT_SYMBOLS[v] ?? "";
    case "celticTree":
      return CELTIC_SYMBOL;
    default:
      return "";
  }
}

/** All zodiac symbols for reference. */
export const ZODIAC_SYMBOLS_MAP = ZODIAC_SYMBOLS;
/** All planet symbols for reference. */
export const PLANET_SYMBOLS_MAP = PLANET_SYMBOLS;
/** All moon phase symbols for reference. */
export const MOON_PHASE_SYMBOLS_MAP = MOON_PHASE_SYMBOLS;
/** All element symbols for reference. */
export const ELEMENT_SYMBOLS_MAP = ELEMENT_SYMBOLS;
