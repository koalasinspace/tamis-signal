/**
 * Fully generative "Publish Journal" engine.
 * - Unique, CSS+SVG generated cover per-user (no static images).
 * - Print-optimized: full-bleed cover, then book-styled pages.
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
  // Simple deterministic hash -> [0, 1)
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function getElement(user: UserProfile): string {
  if (user.chineseElement) return user.chineseElement;
  return user.birthday ? getChineseElement(user.birthday) : "";
}

function polygonPoints(sides: number, r: number, cx = 0, cy = 0, rotation = 0): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const a = rotation + i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return pts.join(" ");
}

function sigilSvg(opts: { destiny: number; powerHex: string; element: string; seed: number }): string {
  const d = opts.destiny || 0;
  const sidesRaw = Number.isFinite(d) ? d : 0;
  const sides = Math.max(3, Math.min(12, sidesRaw || 3));
  const rotation = opts.seed * Math.PI * 2;
  const blur = opts.element === "Water" ? 1.8 : opts.element === "Fire" ? 0.6 : 1.0;
  const strokeWidth = opts.element === "Metal" ? 2.2 : 1.6;

  const outer = polygonPoints(sides, 120, 150, 150, rotation);
  const inner = polygonPoints(Math.max(3, Math.floor(sides * 0.75)), 70, 150, 150, -rotation * 0.6);
  const ring = polygonPoints(sides, 95, 150, 150, rotation + 0.2);

  return `
  <svg class="sigil" width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="sigilGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${blur}" result="b"/>
        <feColorMatrix in="b" type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 18 -7" result="g"/>
        <feMerge>
          <feMergeNode in="g"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <radialGradient id="eyeGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${opts.powerHex}" stop-opacity="1"/>
        <stop offset="70%" stop-color="${opts.powerHex}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${opts.powerHex}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <g filter="url(#sigilGlow)" opacity="0.95">
      <polygon points="${outer}" fill="none" stroke="${opts.powerHex}" stroke-width="${strokeWidth}" opacity="0.9"/>
      <polygon points="${ring}" fill="none" stroke="${opts.powerHex}" stroke-width="${strokeWidth * 0.8}" opacity="0.55" stroke-dasharray="6 10"/>
      <polygon points="${inner}" fill="none" stroke="#f8fafc" stroke-width="${strokeWidth * 0.65}" opacity="0.35"/>
      <circle cx="150" cy="150" r="32" fill="none" stroke="${opts.powerHex}" stroke-width="${strokeWidth * 0.9}" opacity="0.65"/>
      <circle cx="150" cy="150" r="18" fill="url(#eyeGlow)" opacity="0.85"/>
      <circle cx="150" cy="150" r="4.5" fill="#0b1020" opacity="0.9"/>
    </g>
  </svg>`;
}

function coverNoiseSvg(seed: number): string {
  const baseFreq = (0.8 + seed * 1.2).toFixed(2);
  const octaves = 3 + Math.floor(seed * 3);
  return `
  <svg class="noise" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <filter id="turbulence">
      <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="${octaves}" stitchTiles="stitch" seed="${Math.floor(seed * 999)}"/>
      <feColorMatrix type="matrix"
        values="0 0 0 0 0
                0 0 0 0 0
                0 0 0 0 0
                0 0 0 0.9 0" />
    </filter>
    <rect width="100" height="100" filter="url(#turbulence)" opacity="0.22"/>
  </svg>`;
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

export function generateGrimoireHTML(user: UserProfile): string {
  const name = user.name || "Anonymous";
  const powerHex = getPowerColorHex(user.favoriteColor);
  const element = getElement(user);
  const seed = hash01(`${user.name}|${user.birthday}|${user.zodiacSign}|${user.destinyNumber}`);

  const glowStrength =
    element === "Fire" ? 1.25 : element === "Water" ? 0.95 : element === "Metal" ? 0.9 : 1.05;
  const sigilBackdropBlur = element === "Water" ? 8 : element === "Fire" ? 2 : 5;

  const generatedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const s = resolveSoulprint(user);
  const entries = [...(user.journalEntries ?? [])].reverse();

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

  const summaryHtml = summaryRows
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

  const entriesHtml = entries
    .map((e: JournalEntry, i) => {
      const prompt = escapeHtml(e.prompt ?? "");
      const reflection = escapeHtml((e.entry ?? "").replace(/\n/g, "\n")).replace(/\n/g, "<br>");
      return `
        <article class="entry">
          <div class="entry-date">${escapeHtml(formatEntryDate(e.date))}</div>
          <div class="entry-prompt">${prompt}</div>
          <div class="entry-body">${reflection}</div>
        </article>
        ${i < entries.length - 1 ? `<div class="sep"></div>` : ""}`;
    })
    .join("");

  const cover = `
    <section class="page cover page-break">
      <div class="cover-bg"></div>
      ${coverNoiseSvg(seed)}
      <div class="cover-inner">
        <div class="cover-top">
          <div class="cover-title">The Book of Shadows</div>
          <div class="cover-sub">Generated by Tami’s Signal · ${escapeHtml(generatedDate)}</div>
        </div>

        <div class="cover-center">
          <div class="sigil-wrap">
            <div class="sigil-backdrop"></div>
            ${sigilSvg({ destiny: s.destiny || 3, powerHex, element, seed })}
          </div>
          <div class="cover-meta">
            <span class="meta-chip">${escapeHtml(s.zodiac || "")}</span>
            <span class="meta-chip">Destiny ${escapeHtml(String(s.destiny || ""))}</span>
            <span class="meta-chip">${escapeHtml(element || "")}</span>
          </div>
        </div>

        <div class="cover-name">${escapeHtml(name)}</div>
      </div>
    </section>`;

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
        --power: ${powerHex};
        --glow: ${glowStrength};
        --sigilBlur: ${sigilBackdropBlur}px;
      }
      *{ box-sizing: border-box; }
      body{
        margin:0;
        padding:0;
        color:#0b1020;
        background:#fff;
        font-family:'EB Garamond', Georgia, serif;
      }

      @page { size: letter; margin: 0; }
      @media print {
        .page-break{ page-break-after: always; }
      }

      .page{ width: 100%; }
      .content-page{
        padding: 1in;
        min-height: 11in;
      }

      /* --- COVER (full-bleed) --- */
      .cover{
        position: relative;
        height: 11in;
        width: 8.5in;
        max-width: 100vw;
        overflow: hidden;
        background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--power) 35%, #0b1020 65%) 0%, #050713 50%, #02030a 100%);
      }
      .cover-bg{
        position:absolute; inset:0;
        background:
          radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--power) 45%, #0b1020 55%) 0%, rgba(2,3,10,0.2) 55%, rgba(2,3,10,0.95) 100%);
        filter: saturate(1.1);
      }
      .noise{
        position:absolute; inset:0;
        mix-blend-mode: overlay;
        pointer-events:none;
      }
      .cover-inner{
        position: relative;
        height: 100%;
        padding: 0.85in 0.75in 0.9in;
        display:flex;
        flex-direction: column;
        justify-content: space-between;
        color: #f8fafc;
      }
      .cover-title{
        font-family: 'Cinzel', serif;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 26pt;
        text-align: center;
      }
      .cover-sub{
        text-align:center;
        font-size: 10pt;
        opacity: 0.85;
        margin-top: 0.25rem;
      }
      .cover-center{
        display:flex;
        flex-direction: column;
        align-items:center;
        gap: 0.9rem;
      }
      .sigil-wrap{
        position: relative;
        width: 300px;
        height: 300px;
        display:grid;
        place-items:center;
      }
      .sigil-backdrop{
        position:absolute;
        inset: 12%;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--power) 35%, transparent) 0%, transparent 70%);
        filter: blur(var(--sigilBlur));
        opacity: calc(0.7 * var(--glow));
      }
      .sigil{
        filter: drop-shadow(0 0 calc(18px * var(--glow)) color-mix(in srgb, var(--power) 70%, transparent));
      }
      .meta-chip{
        display:inline-block;
        font-size: 9pt;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        border: 1px solid rgba(248,250,252,0.18);
        background: rgba(2,3,10,0.25);
        backdrop-filter: blur(8px);
        margin: 0 0.25rem;
      }
      .cover-name{
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 24pt;
        text-align: center;
        letter-spacing: 0.04em;
        background: linear-gradient(90deg, #f8fafc, color-mix(in srgb, var(--power) 55%, #f8fafc 45%), #f8fafc);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        text-shadow: 0 0 26px rgba(0,0,0,0.55);
      }

      /* --- SUMMARY + ENTRIES (book pages) --- */
      .h1{
        font-family:'Cinzel', serif;
        font-weight:700;
        letter-spacing:0.06em;
        text-transform: uppercase;
        font-size: 18pt;
        margin: 0 0 0.75rem;
        color:#0b1020;
      }
      .subtle{
        color:#334155;
        font-style: italic;
        margin: 0 0 1rem;
      }
      .rule{
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--power), transparent);
        margin: 0.75rem 0 1.25rem;
      }
      .grid{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.7rem 1rem;
      }
      .pill{
        border-left: 3px solid color-mix(in srgb, var(--power) 60%, #0b1020 40%);
        padding-left: 0.6rem;
      }
      .pill-k{
        font-family:'Cinzel', serif;
        font-size: 9pt;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color:#0b1020;
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
        color:#334155;
        line-height: 1.45;
      }
      .entries-title{
        margin-top: 1.5rem;
      }
      .entry{
        margin: 0 0 1.2rem;
      }
      .entry-date{
        font-family:'Cinzel', serif;
        font-weight: 700;
        color: color-mix(in srgb, var(--power) 70%, #0b1020 30%);
        margin-bottom: 0.25rem;
      }
      .entry-prompt{
        font-style: italic;
        color:#475569;
        margin-bottom: 0.5rem;
      }
      .entry-body{
        font-size: 12pt;
        color:#0b1020;
        line-height: 1.7;
      }
      .sep{
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(2,6,23,0.22), transparent);
        margin: 1.1rem 0 1.2rem;
      }

      @media (max-width: 650px){
        .grid{ grid-template-columns: 1fr; }
        .cover{ width: 100vw; height: 100vh; }
      }
    </style>
  </head>
  <body>
    ${cover}

    <section class="page content-page page-break">
      <div class="h1">Soulprint Summary</div>
      <div class="subtle">A stitched portrait of your active pillars.</div>
      <div class="rule"></div>
      <div class="grid">${summaryHtml}</div>
    </section>

    <section class="page content-page">
      <div class="h1 entries-title">Journal Entries</div>
      <div class="rule"></div>
      ${entriesHtml || `<div class="subtle">No entries yet.</div>`}
    </section>
  </body>
</html>`;
}
