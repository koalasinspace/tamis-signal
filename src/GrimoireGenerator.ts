/**
 * High-fidelity Grimoire generator (print-ready).
 * Requirements:
 * - Virtual leather cover (SVG turbulence + diffuse lighting)
 * - Destiny-number polygon + zodiac unicode sigil (Eye of the Signal)
 * - Gold leaf (or Mercury/Silver for Water) stamped typography
 * - Table of Contents + monthly chapters (reducer-based grouping)
 * - Strict page breaks for physical-print cleanliness
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
import { getGrimoireEntry } from "./esotericData";

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

const ZODIAC_UNICODE: Record<string, string> = {
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

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

function getPowerColorHex(colorName: string): string {
  const normalized = (colorName || "").toLowerCase().trim();
  return POWER_COLOR_HEX[normalized] ?? POWER_COLOR_HEX.purple;
}

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function formatEntryDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function polygonPoints(sides: number, r: number, cx: number, cy: number, rotation: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const a = rotation + i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

function resolveSoulprint(user: UserProfile) {
  const birthday = user.birthday || "";
  const planetaryRuler = user.planetaryRuler ?? (birthday ? getPlanetaryRuler(birthday) : "");
  const chineseZodiac = user.chineseZodiac ?? (birthday ? getChineseZodiac(birthday) : "");
  const chineseElement = user.chineseElement ?? (birthday ? getChineseElement(birthday) : "");
  const lifePath = user.lifePathNumber ?? (birthday ? calculateLifePath(birthday) : 0);
  const moonPhase = user.moonPhase ?? (birthday ? getMoonPhase(birthday) : "");
  const celticTree = user.celticTree ?? (birthday ? getCelticTree(birthday) : "");
  return {
    zodiac: user.zodiacSign || "",
    zodiacGlyph: ZODIAC_UNICODE[user.zodiacSign] ?? "",
    destiny: user.destinyNumber || 0,
    tarot: user.tarotArchetype || "",
    planetaryRuler,
    chineseZodiac,
    chineseElement,
    lifePath,
    moonPhase,
    celticTree,
  };
}

type Chapter = {
  key: string; // YYYY-MM
  label: string; // MONTH YYYY
  entries: JournalEntry[];
  count: number;
};

function groupEntriesByMonthYear(entries: JournalEntry[]): Chapter[] {
  const grouped = entries.reduce<Record<string, Chapter>>((acc, e) => {
    const d = new Date((e.date || "") + "T12:00:00");
    const year = isNaN(d.getTime()) ? "0000" : String(d.getFullYear());
    const monthIndex = isNaN(d.getTime()) ? 0 : d.getMonth();
    const month = String(monthIndex + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    const label = `${MONTHS[monthIndex] ?? "JANUARY"} ${year}`;
    if (!acc[key]) acc[key] = { key, label, entries: [], count: 0 };
    acc[key].entries.push(e);
    acc[key].count += 1;
    return acc;
  }, {});

  const chapters = Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  chapters.forEach((c) => c.entries.sort((a, b) => (a.date || "").localeCompare(b.date || "")));
  return chapters;
}

function coverBackgroundSvg(opts: { seed: number; element: string }): string {
  // Leather-like: turbulence + diffuse lighting. Optional heat distortion for Fire.
  const baseFreq = (0.9 + opts.seed * 1.6).toFixed(2);
  const seedInt = Math.floor(opts.seed * 999);
  const heat = opts.element === "Fire";
  return `
  <svg class="leather" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="leatherTexture" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="4" seed="${seedInt}" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
        <feDiffuseLighting in="mono" lighting-color="#2a2a2a" surfaceScale="2.2" result="light">
          <feDistantLight azimuth="225" elevation="35"/>
        </feDiffuseLighting>
        <feComposite in="light" in2="mono" operator="in" result="grain"/>
        <feBlend in="SourceGraphic" in2="grain" mode="overlay"/>
      </filter>

      ${heat ? `
      <filter id="heatDistort" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="${seedInt + 7}" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="18" xChannelSelector="R" yChannelSelector="G"/>
      </filter>` : ""}
    </defs>

    <rect width="1000" height="1400" fill="#07070b" filter="url(#leatherTexture)"/>
  </svg>`;
}

function eyeOfSignalSigilSvg(opts: {
  destiny: number;
  zodiacGlyph: string;
  secondary: string;
  seed: number;
  element: string;
}): string {
  const sides = Math.max(3, Math.min(12, Number.isFinite(opts.destiny) ? opts.destiny : 3));
  const rotation = opts.seed * Math.PI * 2;
  const outer = polygonPoints(sides, 140, 200, 200, rotation);
  const inner = polygonPoints(Math.max(3, Math.floor(sides * 0.75)), 86, 200, 200, -rotation * 0.6);
  const heat = opts.element === "Fire";

  return `
  <svg class="sigil" width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="sigilGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${opts.secondary}" stop-opacity="0.95"/>
        <stop offset="70%" stop-color="${opts.secondary}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${opts.secondary}" stop-opacity="0"/>
      </radialGradient>
      <filter id="sigilSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${opts.element === "Water" ? 2.8 : 1.3}" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <g ${heat ? 'filter="url(#heatDistort)"' : ""}>
      <circle cx="200" cy="200" r="160" fill="url(#sigilGlow)" opacity="0.75"/>
      <g filter="url(#sigilSoftGlow)" opacity="0.92">
        <polygon points="${outer}" fill="none" stroke="${opts.secondary}" stroke-width="2.2" opacity="0.95"/>
        <polygon points="${inner}" fill="none" stroke="#f8fafc" stroke-width="1.4" opacity="0.35"/>
        <ellipse cx="200" cy="210" rx="78" ry="42" fill="none" stroke="#f8fafc" stroke-width="1.2" opacity="0.55"/>
        <ellipse cx="200" cy="210" rx="42" ry="22" fill="none" stroke="${opts.secondary}" stroke-width="1.6" opacity="0.75"/>
        <circle cx="200" cy="210" r="10" fill="${opts.secondary}" opacity="0.85"/>
        <circle cx="200" cy="210" r="4" fill="#05060c" opacity="0.9"/>
        ${opts.zodiacGlyph ? `<text x="200" y="214" text-anchor="middle" dominant-baseline="middle"
          font-family="Cinzel, serif" font-size="40" fill="#f8fafc" opacity="0.85">${escapeHtml(opts.zodiacGlyph)}</text>` : ""}
      </g>
    </g>
  </svg>`;
}

export function generateGrimoireHTML(user: UserProfile): string {
  const name = user.name || "Anonymous";
  const secondary = getPowerColorHex(user.favoriteColor);
  const s = resolveSoulprint(user);
  const element = s.chineseElement || (user.birthday ? getChineseElement(user.birthday) : "");
  const seed = hash01(`${user.name}|${user.birthday}|${user.zodiacSign}|${user.destinyNumber}`);

  // Water -> Mercury/Silver leaf, otherwise gold/brass.
  const leafMode = element === "Water" ? "silver" : "gold";

  const generatedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const entries = [...(user.journalEntries ?? [])].reverse();
  const chapters = groupEntriesByMonthYear(entries);

  const tocHtml = chapters
    .map((c) => {
      return `
        <div class="toc-row">
          <div class="toc-chapter">${escapeHtml(c.label)}</div>
          <div class="toc-dots"></div>
          <div class="toc-count">${c.count} reflection${c.count === 1 ? "" : "s"}</div>
        </div>`;
    })
    .join("");

  const summaryRows: Array<{ label: string; value: string; type: Parameters<typeof getGrimoireEntry>[0]; key: string }> = [
    { label: "Sun Sign", value: s.zodiac || "—", type: "zodiac", key: s.zodiac },
    { label: "Destiny Number", value: s.destiny ? String(s.destiny) : "—", type: "numerology", key: String(s.destiny) },
    { label: "Tarot Archetype", value: s.tarot || "—", type: "tarot", key: s.tarot },
    { label: "Planetary Ruler", value: s.planetaryRuler || "—", type: "planetaryRuler", key: s.planetaryRuler },
    { label: "Moon Phase", value: s.moonPhase || "—", type: "moonPhase", key: s.moonPhase },
    { label: "Chinese Element", value: s.chineseElement || "—", type: "chineseElement", key: s.chineseElement },
    { label: "Chinese Zodiac", value: s.chineseZodiac || "—", type: "chineseZodiac", key: s.chineseZodiac },
    { label: "Life Path", value: s.lifePath ? String(s.lifePath) : "—", type: "numerology", key: String(s.lifePath) },
    { label: "Celtic Tree", value: s.celticTree || "—", type: "celticTree", key: s.celticTree },
  ];

  const prefaceHtml = summaryRows
    .map((row) => {
      const desc = row.value !== "—" ? getGrimoireEntry(row.type, row.key)?.description : undefined;
      return `
        <div class="pill">
          <div class="pill-k">${escapeHtml(row.label)}</div>
          <div class="pill-v">${escapeHtml(row.value)}</div>
          ${desc ? `<div class="pill-d">${escapeHtml(desc)}</div>` : ""}
        </div>`;
    })
    .join("");

  const chaptersHtml = chapters
    .map((c) => {
      const entriesHtml = c.entries
        .map((e) => {
          const prompt = escapeHtml(e.prompt ?? "");
          const reflection = escapeHtml((e.entry ?? "").replace(/\n/g, "\n")).replace(/\n/g, "<br>");
          return `
            <article class="entry">
              <div class="entry-date">${escapeHtml(formatEntryDate(e.date))}</div>
              <div class="truth-block">
                <div class="truth-label">TRUTH</div>
                <div class="truth-text">${prompt}</div>
              </div>
              <div class="entry-body">${reflection}</div>
            </article>
            <div class="entry-sep"></div>
          `;
        })
        .join("");

      return `
        <section class="page content-page page-break">
          <div class="chapter-head">
            <div class="chapter-title">${escapeHtml(c.label)}</div>
            <div class="chapter-sub">Chapter of reflections · ${c.count}</div>
          </div>
          <div class="rule"></div>
          ${entriesHtml || `<div class="subtle">No entries in this chapter.</div>`}
        </section>
      `;
    })
    .join("");

  const cover = `
    <section class="page cover page-break">
      <div class="cover-bleed">
        ${coverBackgroundSvg({ seed, element })}
        <div class="cover-ink"></div>
      </div>

      <div class="cover-inner">
        <div class="cover-top">
          <div class="cover-title leaf-text">The Book of Shadows</div>
          <div class="cover-sub">Generated by Tami’s Signal · ${escapeHtml(generatedDate)}</div>
        </div>

        <div class="cover-center">
          <div class="sigil-wrap">
            ${eyeOfSignalSigilSvg({ destiny: s.destiny || 3, zodiacGlyph: s.zodiacGlyph, secondary, seed, element })}
          </div>
        </div>

        <div class="cover-name leaf-text">${escapeHtml(name)}</div>
      </div>
    </section>
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Grimoire — ${escapeHtml(name)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
      :root{
        --secondary: ${secondary};
        --leafMode: ${leafMode};
        --leafGold1: #f7e7a1;
        --leafGold2: #caa24d;
        --leafGold3: #7a5519;
        --leafSilver1: #f5f7ff;
        --leafSilver2: #b7c0d1;
        --leafSilver3: #6b7486;
        --paper: #fbfbf7;
        --ink: #14161d;
      }

      *{ box-sizing: border-box; }
      body{
        margin:0;
        padding:0;
        font-family: 'EB Garamond', Georgia, serif;
        color: var(--ink);
        background: var(--paper);
      }

      /* Full bleed print (cover should hit edge). */
      @page { size: letter; margin: 0; }
      @media print {
        .page { page-break-after: always; }
        .page-break { page-break-after: always; }
      }

      .page{ width: 8.5in; height: 11in; }
      .content-page{
        padding: 1in;
        background: var(--paper);
      }

      /* --- COVER --- */
      .cover{
        position: relative;
        overflow: hidden;
        background: #05060c;
      }
      .cover-bleed{ position:absolute; inset:0; }
      .leather{ position:absolute; inset:0; width:100%; height:100%; }
      .cover-ink{
        position:absolute; inset:0;
        background:
          radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--secondary) 18%, transparent) 0%, transparent 55%),
          radial-gradient(circle at 50% 95%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.9) 65%);
        mix-blend-mode: screen;
        opacity: 0.7;
      }
      .cover-inner{
        position: relative;
        height: 100%;
        padding: 0.9in 0.85in;
        display:flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        color: #f8fafc;
      }
      .cover-title{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.1em;
        text-transform: uppercase;
        font-size: 26pt;
      }
      .cover-sub{
        margin-top: 0.3rem;
        font-size: 10pt;
        opacity: 0.85;
      }
      .sigil-wrap{
        width: 420px;
        max-width: 90%;
        display:grid;
        place-items:center;
      }
      .sigil{
        filter: drop-shadow(0 0 22px color-mix(in srgb, var(--secondary) 70%, transparent));
      }
      .cover-name{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.06em;
        font-size: 24pt;
      }

      /* Gold leaf / mercury leaf (Water) */
      .leaf-text{
        background: linear-gradient(90deg,
          ${leafMode === "silver" ? "var(--leafSilver1), var(--leafSilver2), var(--leafSilver1), var(--leafSilver3)" : "var(--leafGold1), var(--leafGold2), var(--leafGold1), var(--leafGold3)"}
        );
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        filter: drop-shadow(1px 1px 0px #4d3308);
      }

      /* --- PREFACE + TOC --- */
      .h1{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.08em;
        text-transform: uppercase;
        font-size: 18pt;
        margin: 0 0 0.25rem;
      }
      .subtle{
        margin: 0.25rem 0 1rem;
        color:#3b4150;
        font-style: italic;
      }
      .rule{
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--secondary), transparent);
        margin: 0.75rem 0 1.25rem;
      }
      .grid{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem 1.25rem;
      }
      .pill{
        padding-left: 0.65rem;
        border-left: 3px solid color-mix(in srgb, var(--secondary) 55%, #000 45%);
      }
      .pill-k{
        font-family:'Cinzel', serif;
        font-size: 9pt;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity:0.75;
      }
      .pill-v{
        font-size: 12pt;
        font-weight: 600;
        margin-top: 0.15rem;
      }
      .pill-d{
        margin-top: 0.25rem;
        font-size: 10pt;
        color:#3b4150;
        line-height: 1.5;
        font-style: italic;
      }

      .toc{
        margin-top: 0.25rem;
      }
      .toc-row{
        display:flex;
        align-items: baseline;
        gap: 0.5rem;
        margin: 0.35rem 0;
      }
      .toc-chapter{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.06em;
        text-transform: uppercase;
        font-size: 11pt;
        white-space: nowrap;
      }
      .toc-dots{
        flex: 1;
        border-bottom: 1px dotted rgba(20,22,29,0.35);
        transform: translateY(-2px);
      }
      .toc-count{
        font-size: 11pt;
        color:#3b4150;
        white-space: nowrap;
      }

      /* --- CHAPTERS / ENTRIES --- */
      .chapter-head{
        text-align: center;
        margin-top: 0.25in;
      }
      .chapter-title{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.12em;
        text-transform: uppercase;
        font-size: 20pt;
      }
      .chapter-sub{
        margin-top: 0.25rem;
        color:#3b4150;
        font-style: italic;
      }
      .entry{
        margin: 0 0 1.1rem;
        page-break-inside: avoid;
      }
      .entry-date{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.06em;
        text-transform: uppercase;
        font-size: 10pt;
        color: color-mix(in srgb, var(--secondary) 75%, #000 25%);
        margin-bottom: 0.35rem;
      }
      .truth-block{
        border: 1px solid ${leafMode === "silver" ? "var(--leafSilver2)" : "var(--leafGold2)"};
        border-left: 4px solid ${leafMode === "silver" ? "var(--leafSilver3)" : "var(--leafGold3)"};
        padding: 0.55rem 0.7rem;
        border-radius: 10px;
        background: linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01));
        margin-bottom: 0.6rem;
      }
      .truth-label{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.14em;
        text-transform: uppercase;
        font-size: 9pt;
        opacity:0.75;
        margin-bottom: 0.25rem;
      }
      .truth-text{
        font-style: italic;
        color:#2d3342;
        line-height: 1.55;
      }
      .entry-body{
        font-size: 12pt;
        line-height: 1.75;
      }
      .entry-sep{
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(20,22,29,0.22), transparent);
        margin: 1rem 0 1.1rem;
      }

      @media (max-width: 650px){
        .page{ width: 100vw; height: 100vh; }
        .grid{ grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    ${cover}

    <section class="page content-page page-break">
      <div class="h1">Preface</div>
      <div class="subtle">A Soulprint Summary, bound in ink.</div>
      <div class="rule"></div>
      <div class="grid">${prefaceHtml}</div>
    </section>

    <section class="page content-page page-break">
      <div class="h1">Table of Contents</div>
      <div class="subtle">Chapters by month.</div>
      <div class="rule"></div>
      <div class="toc">${tocHtml || `<div class="subtle">No chapters yet.</div>`}</div>
    </section>

    ${chaptersHtml || `
      <section class="page content-page page-break">
        <div class="h1">Journal</div>
        <div class="subtle">No reflections yet.</div>
      </section>`}
  </body>
</html>`;
}

