export type KnowledgePillar =
  | "ChineseZodiac"
  | "ChineseElement"
  | "CelticTree"
  | "TarotArchetype"
  | "PlanetaryRuler"
  | "MoonPhase"
  | "DestinyNumber"
  | "InnerMonologue"
  | "Helix"
  | "Geomancy";

type BankKey =
  | "animal_bank.md"
  | "elemental_bank.md"
  | "forest_bank.md"
  | "tarot_bank.md"
  | "planetary_bank.md"
  | "lunar_bank.md"
  | "destiny_bank.md"
  | "inner_monologue_bank.md"
  | "helix_bank.md"
  | "location_bank.md";

const BANK_BY_PILLAR: Record<KnowledgePillar, BankKey> = {
  ChineseZodiac: "animal_bank.md",
  ChineseElement: "elemental_bank.md",
  CelticTree: "forest_bank.md",
  TarotArchetype: "tarot_bank.md",
  PlanetaryRuler: "planetary_bank.md",
  MoonPhase: "lunar_bank.md",
  DestinyNumber: "destiny_bank.md",
  InnerMonologue: "inner_monologue_bank.md",
  Helix: "helix_bank.md",
  Geomancy: "location_bank.md",
};

// Vite will turn this into async chunked loaders.
const BANK_LOADERS = import.meta.glob("../../context/knowledge_banks/*.md", {
  query: "?raw",
  import: "default",
});

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function findHeadingBlock(
  content: string,
  headingRegex: RegExp
): { block: string; headingLine: string } | null {
  const lines = content.split("\n");

  let startIdx = -1;
  let startLevel = 0;
  let headingLine = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(headingRegex);
    if (m) {
      startIdx = i;
      // infer level by count of leading hashes (if present)
      const hashMatch = line.match(/^(#{1,6})\s+/);
      startLevel = hashMatch ? hashMatch[1].length : 0;
      headingLine = line;
      break;
    }
  }

  if (startIdx < 0) return null;

  let endIdx = lines.length;
  if (startLevel > 0) {
    const nextHeading = new RegExp(`^#{${startLevel}}\\s+`);
    for (let j = startIdx + 1; j < lines.length; j++) {
      if (nextHeading.test(lines[j])) {
        endIdx = j;
        break;
      }
    }
  } else {
    // If no hash headings, fall back to fixed window.
    endIdx = Math.min(lines.length, startIdx + 60);
  }

  const block = lines.slice(startIdx, endIdx).join("\n").trim();
  return { block, headingLine };
}

function extractChineseZodiacElementVariant(
  content: string,
  value: string
): string | null {
  // Expect "Wood Rat", "Fire Pig", etc.
  const v = normalize(value);
  const parts = v.split(" ");
  if (parts.length < 2) return null;
  const element = parts[0];
  const animal = parts.slice(1).join(" ");

  // Find the animal's section heading: "### X. The Rat (...)" (case-insensitive).
  const animalHeadingRe = new RegExp(`^###\\s+\\d+\\.\\s+The\\s+${escapeRegExp(animal)}\\b`, "i");
  const animalBlock = findHeadingBlock(content, animalHeadingRe);
  if (!animalBlock) return null;

  const blockText = animalBlock.block;

  // Pull the exact element-variant bullet if present.
  const variantRe = new RegExp(`^-\\s+\\*\\*${escapeRegExp(element)}\\s+${escapeRegExp(animal)}\\b`, "im");
  const variantMatch = blockText.match(variantRe);

  // Also include Secret Animal paragraph (always present in these sections).
  const secretRe = /\*\*The "Secret".*?\*\*:[\s\S]*?(?=\n\*\*Fortune Indicators\*\*|\n###\s+\d+\.|\n##\s+Part|\s*$)/i;
  const secretMatch = blockText.match(secretRe);

  const fixedRe = /- \*\*Fixed Element\*\*:[^\n]+/i;
  const archetypeRe = /- \*\*Archetype\*\*:[^\n]+/i;
  const hoursRe = /- \*\*Hours\*\*:[^\n]+/i;

  const fixed = blockText.match(fixedRe)?.[0];
  const archetype = blockText.match(archetypeRe)?.[0];
  const hours = blockText.match(hoursRe)?.[0];

  const partsOut: string[] = [];
  partsOut.push(`### ${v} (Extracted)`);
  partsOut.push(`Source: ${animalBlock.headingLine}`);
  if (archetype) partsOut.push(archetype);
  if (fixed) partsOut.push(fixed);
  if (hours) partsOut.push(hours);
  partsOut.push("");

  if (variantMatch) {
    // Find the full bullet line.
    const bulletLine = blockText
      .split("\n")
      .find((l) => variantRe.test(l.trim()));
    if (bulletLine) {
      partsOut.push("**Elemental Variant:**");
      partsOut.push(bulletLine.trim());
      partsOut.push("");
    }
  }

  if (secretMatch) {
    partsOut.push(secretMatch[0].trim());
  }

  return partsOut.join("\n").trim();
}

function normalizeMonologueValue(value: string) {
  // Enum uses adjectives; the bank uses nouns.
  const v = normalize(value).toLowerCase();
  if (v === "anendophasic") return "Anendophasia";
  if (v === "anauralic") return "Anauralia";
  return value;
}

async function loadBank(bank: BankKey): Promise<string> {
  const key = `../../context/knowledge_banks/${bank}`;
  const loader = BANK_LOADERS[key];
  if (!loader) {
    throw new Error(`Knowledge bank not found: ${bank}`);
  }
  const raw = (await loader()) as string;
  return raw;
}

/**
 * Fetches a relevant excerpt from `context/knowledge_banks/*` for a given pillar+value.
 *
 * Constraint: returns ONLY the relevant block, not the whole file.
 */
export async function getDeepSoulInfo(
  pillar: KnowledgePillar,
  value: string
): Promise<string | null> {
  const bank = BANK_BY_PILLAR[pillar];
  const content = await loadBank(bank);
  const v = normalize(value);
  if (!v) return null;

  // Special case: "Wood Rat" lives inside the Rat section.
  if (pillar === "ChineseZodiac") {
    const extracted = extractChineseZodiacElementVariant(content, v);
    if (extracted) return extracted;
  }

  const searchValue =
    pillar === "InnerMonologue" ? normalizeMonologueValue(v) : v;

  // Prefer hash headings (##/###/####) that contain the value.
  const headingRe = new RegExp(
    `^(#{2,4})\\s+.*\\b${escapeRegExp(searchValue)}\\b.*$`,
    "im"
  );
  const headingBlock = findHeadingBlock(content, headingRe);
  if (headingBlock) return headingBlock.block;

  // Next: match numbered "### 1. Birch ..." or "### The Rat" style headings.
  const looseHeadingRe = new RegExp(
    `^###\\s+.*\\b${escapeRegExp(searchValue)}\\b.*$`,
    "im"
  );
  const looseBlock = findHeadingBlock(content, looseHeadingRe);
  if (looseBlock) return looseBlock.block;

  // Last resort: match bold section labels like "**5.1 Anendophasia: ...**"
  const boldRe = new RegExp(`^\\*\\*.*\\b${escapeRegExp(searchValue)}\\b.*\\*\\*$`, "im");
  const boldBlock = findHeadingBlock(content, boldRe);
  if (boldBlock) return boldBlock.block;

  return null;
}

