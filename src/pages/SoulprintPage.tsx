import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, Hash, Activity } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../lib/types";
import { useCosmicAudio, type CosmicPerspective } from "../hooks/useCosmicAudio";
import { generateWeaveReport } from "../lib/soul_weaver";
import { getDeepSoulInfo } from "../lib/librarian";
import { generateWeaveMetrics, type CreativeContextMode } from "../lib/soul_weaver";
import {
  calculateDestinyNumber,
  getTarotArchetype,
  getZodiacSign,
  getPlanetaryRuler,
  getChineseZodiac,
  getChineseElement,
  calculateLifePath,
  getMoonPhase,
  getCelticTree,
} from "../lib/calculators";
import { getPillarIcon, getAttributeSymbol, type PillarType } from "../SoulprintIcons";
import { ESOTERIC_DATA } from "../esotericData";

export default function SoulprintPage() {
  const { currentUser, userData, setUserData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [perspective, setPerspective] = useState<CosmicPerspective>("mystic");
  const [contextMode, setContextMode] = useState<CreativeContextMode>("selection");
  const [ritualStarted, setRitualStarted] = useState(false);
  const [ritualLoading, setRitualLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [narration, setNarration] = useState<string>("");
  const [librarianSnippet, setLibrarianSnippet] = useState<string>("");
  const [librarianLoading, setLibrarianLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    birthday: "",
    birthTime: "",
    birthLocation: "",
    geomancyFigure: "" as string,
    favoriteColor: "",
    favoriteNumber: "",
    monologueStyle: "Verbal" as NonNullable<UserProfile["monologueStyle"]>,
    helixTraits: {
      comtStatus: "Unknown" as NonNullable<NonNullable<UserProfile["helixTraits"]>["comtStatus"]>,
      drd4Status: "Unknown" as NonNullable<NonNullable<UserProfile["helixTraits"]>["drd4Status"]>,
      oxtrStatus: "Unknown" as NonNullable<NonNullable<UserProfile["helixTraits"]>["oxtrStatus"]>,
      bdnfStatus: "Unknown" as NonNullable<NonNullable<UserProfile["helixTraits"]>["bdnfStatus"]>,
      faahStatus: "Unknown" as NonNullable<NonNullable<UserProfile["helixTraits"]>["faahStatus"]>,
    },
  });

  const isEditing = Boolean(userData?.soulprintComplete || (userData?.birthday && userData?.destinyNumber != null));

  const derived = useMemo(() => {
    const birthday = form.birthday;
    const name = form.name;
    const zodiacSign = birthday ? getZodiacSign(birthday) : "";
    const planetaryRuler = birthday ? getPlanetaryRuler(birthday) : "";
    const chineseZodiac = birthday ? getChineseZodiac(birthday) : "";
    const chineseElement = birthday ? getChineseElement(birthday) : "";
    const lifePathNumber = birthday ? calculateLifePath(birthday) : 0;
    const moonPhase = birthday ? getMoonPhase(birthday) : "";
    const celticTree = birthday ? getCelticTree(birthday) : "";
    const destinyNumber = name ? calculateDestinyNumber(name) : 0;
    const tarotArchetype = form.favoriteNumber ? getTarotArchetype(String(form.favoriteNumber)) : "";
    return {
      zodiacSign,
      planetaryRuler,
      chineseZodiac,
      chineseElement,
      lifePathNumber,
      moonPhase,
      celticTree,
      destinyNumber,
      tarotArchetype,
    };
  }, [form.birthday, form.favoriteNumber, form.name]);

  const cosmicAudio = useCosmicAudio({
    perspective,
    planetaryRuler: derived.planetaryRuler || userData?.planetaryRuler,
    zodiacSign: derived.zodiacSign || userData?.zodiacSign,
    destinyNumber: derived.destinyNumber || userData?.destinyNumber,
    lifePathNumber: derived.lifePathNumber || userData?.lifePathNumber,
    comtStatus: form.helixTraits.comtStatus || userData?.helixTraits?.comtStatus,
    monologueStyle: form.monologueStyle || userData?.monologueStyle,
    volume: perspective === "architect" ? 0.1 : 0.12,
    layer: ritualStarted ? step : 0,
    contextMode,
    enableSequencer: ritualStarted,
    onBeat: (e) => {
      const pick = async () => {
        if (!ritualStarted) return;
        const primary = e.pillars[0];
        const mode = e.contextMode;
        const isShadow = mode === "shadow";

        const tryShadowClip = (raw: string) => {
          const text = raw.trim();
          if (!isShadow) return text;
          const lines = text.split("\n");
          const keep = lines.filter((l) => {
            const s = l.toLowerCase();
            return (
              s.includes("shadow") || s.includes("reversed") || s.includes("weakness") ||
              s.includes("pathology") || s.includes("clash") || s.includes("enemy") ||
              s.includes("disson") || s.includes("static")
            );
          });
          return (keep.length ? keep.slice(0, 12).join("\n") : text.slice(0, 600)).trim();
        };

        let pillar: Parameters<typeof getDeepSoulInfo>[0] | null = null;
        let value = "";

        if (primary === "solar") {
          pillar = "PlanetaryRuler";
          value = derived.planetaryRuler || userData?.planetaryRuler || "Sun";
        } else if (primary === "helix") {
          pillar = "Helix";
          value = (form.helixTraits.comtStatus as any) || userData?.helixTraits?.comtStatus || "Unknown";
        } else if (primary === "earth") {
          pillar = "Geomancy";
          value = form.geomancyFigure || (userData as any)?.geomancyFigure || "Carcer";
        } else if (primary === "zodiac") {
          pillar = "ChineseZodiac";
          const combo = [derived.chineseElement, derived.chineseZodiac].filter(Boolean).join(" ");
          value = combo || [userData?.chineseElement, userData?.chineseZodiac].filter(Boolean).join(" ");
        } else if (primary === "monologue") {
          pillar = "InnerMonologue";
          value = form.monologueStyle || userData?.monologueStyle || "Verbal";
        } else if (primary === "quantum") {
          pillar = "TarotArchetype";
          value = derived.tarotArchetype || userData?.tarotArchetype || "The Tower";
        }

        if (!pillar || !value) return;
        setLibrarianLoading(true);
        try {
          const raw = await getDeepSoulInfo(pillar, value);
          if (!raw) return;
          setLibrarianSnippet(tryShadowClip(raw));
        } finally {
          setLibrarianLoading(false);
        }
      };
      pick().catch(() => {});
    },
  });

  useEffect(() => {
    cosmicAudio.setConfig({
      perspective,
      planetaryRuler: derived.planetaryRuler || userData?.planetaryRuler,
      zodiacSign: derived.zodiacSign || userData?.zodiacSign,
      destinyNumber: derived.destinyNumber || userData?.destinyNumber,
      lifePathNumber: derived.lifePathNumber || userData?.lifePathNumber,
      comtStatus: form.helixTraits.comtStatus || userData?.helixTraits?.comtStatus,
      monologueStyle: form.monologueStyle || userData?.monologueStyle,
      volume: perspective === "architect" ? 0.1 : 0.12,
      layer: ritualStarted ? step : 0,
      contextMode,
      enableSequencer: ritualStarted,
    });
  }, [
    cosmicAudio, derived, perspective, ritualStarted, step, userData
  ]);

  const themeValues = useMemo(() => {
    const isShadow = contextMode === "shadow";
    return {
      accent: isShadow ? "#f59e0b" : perspective === "architect" ? "#38bdf8" : "#a855f7",
      bg: isShadow ? "rgba(69, 26, 3, 0.2)" : "rgba(88, 28, 135, 0.1)",
    };
  }, [contextMode, perspective]);

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const buf = cosmicAudio.getTimeDomainData();
      const w = canvas.width;
      const h = canvas.height;

      ctx2d.clearRect(0, 0, w, h);
      ctx2d.fillStyle = "rgba(2,6,23,0.35)";
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.strokeStyle = "rgba(255,255,255,0.05)";
      ctx2d.lineWidth = 1;
      ctx2d.strokeRect(0.5, 0.5, w - 1, h - 1);

      if (!buf || !ritualStarted || !cosmicAudio.isRunning) {
        ctx2d.fillStyle = "rgba(148,163,184,0.4)";
        ctx2d.font = "10px monospace";
        ctx2d.fillText("SIGNAL_DORMANT", 12, h / 2);
        return;
      }

      ctx2d.strokeStyle = themeValues.accent;
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      const slice = w / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * h) / 2;
        const x = i * slice;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [cosmicAudio, ritualStarted, themeValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;
    setLoading(true);
    try {
      const zodiac = getZodiacSign(form.birthday);
      const destiny = calculateDestinyNumber(form.name);
      const archetype = getTarotArchetype(String(form.favoriteNumber));
      const planetaryRuler = getPlanetaryRuler(form.birthday);
      const chineseZodiac = getChineseZodiac(form.birthday);
      const chineseElement = getChineseElement(form.birthday);
      const lifePathNumber = calculateLifePath(form.birthday);
      const moonPhase = getMoonPhase(form.birthday);
      const celticTree = getCelticTree(form.birthday);

      const fullProfile: UserProfile = {
        ...userData,
        name: form.name,
        birthday: form.birthday,
        birthTime: form.birthTime,
        birthLocation: form.birthLocation,
        birthPlace: form.birthLocation,
        geomancyFigure: form.geomancyFigure ? form.geomancyFigure : undefined,
        favoriteColor: form.favoriteColor,
        favoriteNumber: form.favoriteNumber,
        zodiacSign: zodiac,
        destinyNumber: destiny,
        tarotArchetype: archetype,
        planetaryRuler,
        chineseZodiac,
        chineseElement,
        lifePathNumber,
        moonPhase,
        celticTree,
        monologueStyle: form.monologueStyle,
        helixTraits: form.helixTraits,
        soulprintComplete: true,
      };

      await setDoc(doc(db, "users", currentUser.uid), fullProfile);
      setUserData(fullProfile);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const startRitual = async () => {
    setRitualLoading(true);
    try {
      await cosmicAudio.start();
      setRitualStarted(true);
    } finally {
      setRitualLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-slate-950 text-slate-200 font-sans d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden">
      <div className="bg-slate-900 bg-opacity-80 backdrop-blur-md border border-opacity-20 p-4 p-md-5 rounded-3xl w-100 max-w-3xl shadow-lg position-relative z-10 scanline-container">
        
        <header className="text-center mb-5">
          <h1 className="display-6 font-serif text-white mb-1">
            System Tuning
          </h1>
          <p className="text-slate-500 small font-mono">CALIBRATING_FREQUENCY • STEP_{step}_OF_3</p>
        </header>

        <div className="signal-card mb-4 p-0 bg-black bg-opacity-40 border-opacity-10 overflow-hidden">
          <canvas ref={canvasRef} width={720} height={120} className="w-100 h-120" />
          <div className="p-3 d-flex justify-content-between align-items-center bg-slate-950 bg-opacity-50">
            <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>
              {perspective === "architect" ? "ARCHITECT_FILTER" : "MYSTIC_RESONANCE"}
            </div>
            <div className="d-flex gap-2">
              <button onClick={() => setPerspective("mystic")} className={`btn btn-sm font-mono ${perspective === "mystic" ? "text-accent" : "text-slate-600"}`} style={{ fontSize: '9px' }}>MYSTIC</button>
              <button onClick={() => setPerspective("architect")} className={`btn btn-sm font-mono ${perspective === "architect" ? "text-accent" : "text-slate-600"}`} style={{ fontSize: '9px' }}>ARCHITECT</button>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-5">
          <div className="col-12">
            <div className="signal-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>INPUT_ANCHORS</div>
                <div className="small font-mono text-accent" style={{ fontSize: '9px' }}>PHASE_{step}</div>
              </div>

              <form onSubmit={handleSubmit} className="d-grid gap-3">
                {step === 1 && (
                  <>
                    <input required type="text" placeholder="FULL_NAME" className="form-control form-control-sm font-mono" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <div className="row g-2">
                      <div className="col-6"><input required type="date" className="form-control form-control-sm font-mono" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></div>
                      <div className="col-6"><input required type="time" className="form-control form-control-sm font-mono" value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} /></div>
                    </div>
                    <input required type="text" placeholder="BIRTH_LOCATION" className="form-control form-control-sm font-mono" value={form.birthLocation} onChange={(e) => setForm({ ...form, birthLocation: e.target.value })} />
                    <div className="row g-2">
                      <div className="col-6"><input required type="text" placeholder="POWER_COLOR" className="form-control form-control-sm font-mono" value={form.favoriteColor} onChange={(e) => setForm({ ...form, favoriteColor: e.target.value })} /></div>
                      <div className="col-6"><input required type="number" placeholder="POWER_NUMBER" className="form-control form-control-sm font-mono" value={form.favoriteNumber} onChange={(e) => setForm({ ...form, favoriteNumber: e.target.value })} /></div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <select value={form.monologueStyle} onChange={(e) => setForm({ ...form, monologueStyle: e.target.value as any })} className="form-select form-select-sm font-mono">
                    <option value="Verbal">VERBAL_MONOLOGUE</option>
                    <option value="Visual">VISUAL_MONOLOGUE</option>
                    <option value="Musical">MUSICAL_MONOLOGUE</option>
                    <option value="Anendophasic">ANENDOPHASIC</option>
                  </select>
                )}

                {step === 3 && (
                  <div className="d-grid gap-2">
                    <select value={form.helixTraits.comtStatus} onChange={(e) => setForm({ ...form, helixTraits: { ...form.helixTraits, comtStatus: e.target.value as any } })} className="form-select form-select-sm font-mono">
                      <option value="Unknown">COMT_UNKNOWN</option>
                      <option value="Warrior (Met/Met)">WARRIOR_MET</option>
                      <option value="Worrier (Val/Val)">WORRIER_VAL</option>
                    </select>
                    <select value={form.helixTraits.drd4Status} onChange={(e) => setForm({ ...form, helixTraits: { ...form.helixTraits, drd4Status: e.target.value as any } })} className="form-select form-select-sm font-mono">
                      <option value="Unknown">DRD4_UNKNOWN</option>
                      <option value="Seeker (7R+)">SEEKER_7R</option>
                      <option value="Settler (No 7R)">SETTLER_NO_7R</option>
                    </select>
                  </div>
                )}

                <div className="d-flex gap-2 mt-2">
                  {step > 1 && <button type="button" onClick={() => setStep(s => (s-1) as any)} className="btn btn-outline-secondary flex-fill font-mono small py-2">BACK</button>}
                  {step < 3 ? (
                    <button type="button" onClick={() => setStep(s => (s+1) as any)} className="btn btn-primary bg-theme-accent border-0 flex-fill font-mono small py-2">NEXT</button>
                  ) : (
                    <button type="submit" disabled={loading} className="btn btn-primary bg-theme-accent border-0 flex-fill font-mono small py-2">{loading ? "SAVING..." : "SEAL_TUNING"}</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <button onClick={ritualStarted ? cosmicAudio.stop : startRitual} disabled={ritualLoading} className="btn btn-link text-slate-500 font-mono text-decoration-none small">
            {ritualStarted ? "[ TERMINATE_RITUAL ]" : "[ INITIALIZE_RITUAL ]"}
          </button>
        </div>
      </div>
    </div>
  );
}
