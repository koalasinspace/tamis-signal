import React from "react";
import {
  Flame,
  Leaf,
  Copy,
  Moon,
  Sun,
  Sparkles,
  Scale,
  Bug,
  Target,
  Mountain,
  Droplets,
  Fish,
  Globe,
  MessageCircle,
  Heart,
  Circle,
  TreePine,
  Palette,
  MapPin,
  Hash,
} from "lucide-react";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const ZODIAC_ICONS: Record<string, LucideIcon> = {
  Aries: Flame,
  Taurus: Leaf,
  Gemini: Copy,
  Cancer: Moon,
  Leo: Sun,
  Virgo: Sparkles,
  Libra: Scale,
  Scorpio: Bug,
  Sagittarius: Target,
  Capricorn: Mountain,
  Aquarius: Droplets,
  Pisces: Fish,
};

const PLANET_ICONS: Record<string, LucideIcon> = {
  Sun,
  Moon,
  Mars: Flame,
  Mercury: MessageCircle,
  Jupiter: Globe,
  Venus: Heart,
  Saturn: Circle,
};

const CHINESE_ZODIAC_ICONS: Record<string, LucideIcon> = {
  Rat: Bug,
  Ox: Circle,
  Tiger: Flame,
  Rabbit: Leaf,
  Dragon: Flame,
  Snake: Bug,
  Horse: Target,
  Goat: Leaf,
  Monkey: Copy,
  Rooster: Sun,
  Dog: Heart,
  Pig: Circle,
};

const CELTIC_TREE_ICONS: Record<string, LucideIcon> = {
  Birch: TreePine,
  Rowan: Leaf,
  Ash: TreePine,
  Alder: TreePine,
  Willow: Leaf,
  Hawthorn: Leaf,
  Oak: TreePine,
  Holly: Leaf,
  Hazel: Leaf,
  Vine: Leaf,
  Ivy: Leaf,
  Reed: Leaf,
  Elder: TreePine,
};

const MOON_PHASE_ICONS: Record<string, LucideIcon> = {
  "New Moon": Moon,
  "Waxing Crescent": Moon,
  "First Quarter": Moon,
  "Waxing Gibbous": Moon,
  "Full Moon": Moon,
  "Waning Gibbous": Moon,
  "Last Quarter": Moon,
  "Waning Crescent": Moon,
};

export function getZodiacIcon(sign: string): LucideIcon {
  return ZODIAC_ICONS[sign] ?? Sparkles;
}

export function getPlanetIcon(planet: string): LucideIcon {
  return PLANET_ICONS[planet] ?? Globe;
}

export function getChineseZodiacIcon(animal: string): LucideIcon {
  return CHINESE_ZODIAC_ICONS[animal] ?? Circle;
}

export function getCelticTreeIcon(tree: string): LucideIcon {
  return CELTIC_TREE_ICONS[tree] ?? TreePine;
}

export function getMoonPhaseIcon(phase: string): LucideIcon {
  return MOON_PHASE_ICONS[phase] ?? Moon;
}
