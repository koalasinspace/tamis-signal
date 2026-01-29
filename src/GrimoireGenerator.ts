/**
 * Generates a rich, printable HTML manuscript ("Book of Shadows") from a user profile.
 * Used by the Publish feature in the Journal tab.
 */
import type { UserProfile, JournalEntry } from "./lib/types";
import {
  getPlanetaryRuler,
  getChineseZodiac,
  getChineseElement,
  calculateLifePath,
  getMoonPhase,
  getCelticTree,
} from "./lib/calculators";
import { getGrimoireEntry, ESOTERIC_DATA } from "./esotericData";

type GrimoireDataType = keyof typeof ESOTERIC_DATA;

/** Map favoriteColor (lowercase) to hex for print CSS. */
const POWER_COLOR_HEX: Record<string, string> = {
  red: "#b91c1c",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
  amber: "#d97706",
  orange: "#ea580c",
  purple: "#9333ea",
  violet: "#7c3aed",
  pink: "#db2777",
  indigo: "#4f46e5",
  teal: "#0d9488",
  cyan: "#0891b2",
  emerald: "#059669",
};

function getPowerColorHex(colorName: string): string {
  const normalized = (colorName || "").toLowerCase().trim();
  return POWER_COLOR_HEX[normalized] ?? POWER_COLOR_HEX["purple"];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format "YYYY-MM-DD" to "October 12, 2024". */
function formatEntryDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type GrimoirePillar = {
  label: string;
  value: string;
  description?: string;
};

function getSoulprintPillars(user: UserProfile): GrimoirePillar[] {
  const birthday = user.birthday || "";
  const planetaryRuler = user.planetaryRuler ?? (birthday ? getPlanetaryRuler(birthday) : "");
  const chineseZodiac = user.chineseZodiac ?? (birthday ? getChineseZodiac(birthday) : "");
  const chineseElement = user.chineseElement ?? (birthday ? getChineseElement(birthday) : "");
  const lifePath = user.lifePathNumber ?? (birthday ? calculateLifePath(birthday) : 0);
  const moonPhase = user.moonPhase ?? (birthday ? getMoonPhase(birthday) : "");
  const celticTree = user.celticTree ?? (birthday ? getCelticTree(birthday) : "");

  const pillars: GrimoirePillar[] = [
    { label: "Sun Sign", value: user.zodiacSign || "—" },
    { label: "Destiny Number", value: user.destinyNumber ? String(user.destinyNumber) : "—" },
    { label: "Tarot Archetype", value: user.tarotArchetype || "—" },
    { label: "Planetary Ruler", value: planetaryRuler || "—" },
    { label: "Chinese Zodiac", value: chineseZodiac || "—" },
    { label: "Chinese Element", value: chineseElement || "—" },
    { label: "Life Path", value: lifePath ? String(lifePath) : "—" },
    { label: "Moon Phase", value: moonPhase || "—" },
    { label: "Celtic Tree", value: celticTree || "—" },
  ];

  const typeKeyMap: Array<{ type: GrimoireDataType; key: (p: GrimoirePillar) => string }> = [
    { type: "zodiac", key: (p) => p.value },
    { type: "numerology", key: (p) => (p.label === "Destiny Number" ? p.value : "") },
    { type: "tarot", key: (p) => (p.label === "Tarot Archetype" ? p.value : "") },
    { type: "planetaryRuler", key: (p) => (p.label === "Planetary Ruler" ? p.value : "") },
    { type: "chineseZodiac", key: (p) => (p.label === "Chinese Zodiac" ? p.value : "") },
    { type: "chineseElement", key: (p) => (p.label === "Chinese Element" ? p.value : "") },
    { type: "numerology", key: (p) => (p.label === "Life Path" ? p.value : "") },
    { type: "moonPhase", key: (p) => (p.label === "Moon Phase" ? p.value : "") },
    { type: "celticTree", key: (p) => (p.label === "Celtic Tree" ? p.value : "") },
  ];

  return pillars.map((p, i) => {
    const mapper = typeKeyMap[i];
    if (!mapper || p.value === "—") return p;
    const entry = getGrimoireEntry(mapper.type, mapper.key(p));
    return { ...p, description: entry?.description };
  });
}

/**
 * Builds a full HTML document for the Book of Shadows: cover, Spiritual Biography (Soulprint), and journal entries.
 * Themed by user.favoriteColor; print-optimized with page breaks.
 */
export function generateGrimoireHTML(user: UserProfile): string {
  const name = user.name || "Anonymous";
  const hex = getPowerColorHex(user.favoriteColor);
  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const pillars = getSoulprintPillars(user);
  const entries = [...(user.journalEntries ?? [])].reverse();

  const coverSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
      <polygon points="50,5 61,40 97,40 68,62 79,97 50,75 21,97 32,62 3,40 39,40" fill="${hex}" opacity="0.9"/>
    </svg>`;

  const prefaceHtml = pillars
    .map(
      (p) => `
      <li class="pillar-item">
        <strong class="pillar-label">${escapeHtml(p.label)}</strong>
        <span class="pillar-value">${escapeHtml(p.value)}</span>
        ${p.description ? `<p class="pillar-desc">${escapeHtml(p.description)}</p>` : ""}
      </li>`
    )
    .join("");

  const entriesHtml = entries
    .map(
      (e: JournalEntry, i: number) => `
      <article class="journal-entry">
        <time class="entry-date">${escapeHtml(formatEntryDate(e.date))}</time>
        <p class="entry-prompt">${escapeHtml(e.prompt ?? "")}</p>
        <div class="entry-reflection">${escapeHtml((e.entry ?? "").replace(/\n/g, "\n")).replace(/\n/g, "<br>")}</div>
      </article>
      ${i < entries.length - 1 ? '<hr class="entry-sep" />' : ""}`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Book of Shadows — ${escapeHtml(name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --power: ${hex};
      --power-muted: ${hex}99;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'EB Garamond', Georgia, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    h1, h2 { font-family: 'Playfair Display', Georgia, serif; }
    hr { border: none; border-top: 1px solid var(--power-muted); margin: 1.5rem 0; }

    @media print {
      @page { size: letter; margin: 1in; }
      body { margin: 0; padding: 0; background: #fff; }
      .page-break { page-break-after: always; }
      .no-break { page-break-inside: avoid; }
    }

    /* Cover */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      border-bottom: 3px double var(--power);
    }
    .cover h1 {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: #1a1a1a;
    }
    .cover .subtitle {
      font-size: 1.25rem;
      font-style: italic;
      color: #444;
      margin-bottom: 2rem;
    }
    .cover .symbol { margin: 1.5rem 0; }
    .cover .footer {
      margin-top: auto;
      padding-top: 2rem;
      font-size: 0.9rem;
      color: #666;
    }

    /* Preface */
    .preface {
      padding: 2rem 1.5rem;
      max-width: 42rem;
      margin: 0 auto;
    }
    .preface h2 {
      font-size: 1.75rem;
      color: var(--power);
      border-bottom: 2px solid var(--power);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .preface ul { list-style: none; padding: 0; margin: 0; }
    .pillar-item {
      margin-bottom: 1.25rem;
      padding-left: 1rem;
      border-left: 3px solid var(--power-muted);
    }
    .pillar-label { color: var(--power); font-size: 0.95rem; }
    .pillar-value { display: block; font-weight: 600; margin: 0.25rem 0; }
    .pillar-desc { margin: 0.5rem 0 0; font-size: 0.9rem; color: #444; font-style: italic; line-height: 1.5; }

    @media (min-width: 600px) {
      .preface .pillars-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 2rem; }
    }

    /* Entries */
    .entries {
      padding: 2rem 1.5rem;
      max-width: 42rem;
      margin: 0 auto;
    }
    .entries h2 {
      font-size: 1.75rem;
      color: var(--power);
      border-bottom: 2px solid var(--power);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .journal-entry { margin-bottom: 1.5rem; }
    .entry-date {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--power);
      display: block;
      margin-bottom: 0.5rem;
    }
    .entry-prompt {
      font-size: 0.95rem;
      font-style: italic;
      color: #555;
      margin: 0.5rem 0;
      line-height: 1.5;
    }
    .entry-reflection {
      font-size: 1rem;
      white-space: pre-wrap;
      margin-top: 0.75rem;
    }
    .entry-sep { margin: 2rem 0; }
  </style>
</head>
<body>
  <section class="cover page-break no-break">
    <h1>The Book of Shadows</h1>
    <p class="subtitle">Belonging to ${escapeHtml(name)}</p>
    <div class="symbol">${coverSvg}</div>
    <p class="footer">Generated by Tami&rsquo;s Signal · ${escapeHtml(generatedDate)}</p>
  </section>

  <section class="preface page-break no-break">
    <h2>Spiritual Biography</h2>
    <ul class="pillars-grid">${prefaceHtml}</ul>
  </section>

  <section class="entries">
    <h2>Journal Entries</h2>
    ${entriesHtml || "<p class=\"entry-prompt\">No entries yet.</p>"}
  </section>
</body>
</html>`;
}
