import React, { useMemo, useState } from "react";
import type { UserProfile } from "../lib/types";
import { createMinimalProfile } from "../lib/types";
import {
  calculateDestinyNumber,
  calculateLifePath,
  getCelticTree,
  getChineseElement,
  getChineseZodiac,
  getMoonPhase,
  getPlanetaryRuler,
  getTarotArchetype,
  getZodiacSign,
} from "../lib/calculators";
import { generateWeaveReport } from "../lib/soul_weaver";

type Props = {
  /** Seed values (e.g., name/email from auth) */
  initial?: Partial<UserProfile>;
  /**
   * Called after profile is fully assembled and weave report generated.
   * Typical usage: persist profile to Firestore and mark soulprintComplete=true.
   */
  onComplete: (args: { profile: UserProfile; weaveReport: string }) => Promise<void> | void;
};

export default function Onboarding({ initial, onComplete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [personaMode, setPersonaMode] = useState<UserProfile["personaMode"]>(initial?.personaMode ?? "tami");

  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? "");
  const [birthLocation, setBirthLocation] = useState(initial?.birthLocation ?? initial?.birthPlace ?? "");

  const [favoriteColor, setFavoriteColor] = useState(initial?.favoriteColor ?? "");
  const [favoriteNumber, setFavoriteNumber] = useState(initial?.favoriteNumber ?? "");

  const [monologueStyle, setMonologueStyle] = useState<UserProfile["monologueStyle"]>(
    initial?.monologueStyle ?? "Verbal"
  );
  const [geomancyFigure, setGeomancyFigure] = useState(initial?.geomancyFigure ?? "");

  const [comtStatus, setComtStatus] = useState<UserProfile["helixTraits"] extends infer T ? (T extends { comtStatus?: infer C } ? C : string) : string>(
    initial?.helixTraits?.comtStatus ?? "Unknown"
  );
  const [drd4Status, setDrd4Status] = useState<UserProfile["helixTraits"] extends infer T ? (T extends { drd4Status?: infer C } ? C : string) : string>(
    initial?.helixTraits?.drd4Status ?? "Unknown"
  );
  const [oxtrStatus, setOxtrStatus] = useState<UserProfile["helixTraits"] extends infer T ? (T extends { oxtrStatus?: infer C } ? C : string) : string>(
    initial?.helixTraits?.oxtrStatus ?? "Unknown"
  );
  const [bdnfStatus, setBdnfStatus] = useState<UserProfile["helixTraits"] extends infer T ? (T extends { bdnfStatus?: infer C } ? C : string) : string>(
    initial?.helixTraits?.bdnfStatus ?? "Unknown"
  );
  const [faahStatus, setFaahStatus] = useState<UserProfile["helixTraits"] extends infer T ? (T extends { faahStatus?: infer C } ? C : string) : string>(
    initial?.helixTraits?.faahStatus ?? "Unknown"
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const derived = useMemo(() => {
    const zodiacSign = birthday ? getZodiacSign(birthday) : "";
    const planetaryRuler = birthday ? getPlanetaryRuler(birthday) : "";
    const chineseZodiac = birthday ? getChineseZodiac(birthday) : "";
    const chineseElement = birthday ? getChineseElement(birthday) : "";
    const lifePathNumber = birthday ? calculateLifePath(birthday) : 0;
    const destinyNumber = name ? calculateDestinyNumber(name) : 0;
    const tarotArchetype = favoriteNumber ? getTarotArchetype(favoriteNumber) : "";
    const moonPhase = birthday ? getMoonPhase(birthday) : "";
    const celticTree = birthday ? getCelticTree(birthday) : "";
    return {
      zodiacSign,
      planetaryRuler,
      chineseZodiac,
      chineseElement,
      lifePathNumber,
      destinyNumber,
      tarotArchetype,
      moonPhase,
      celticTree,
    };
  }, [birthday, favoriteNumber, name]);

  const canSubmit =
    name.trim().length > 1 &&
    email.trim().length > 3 &&
    birthday.trim().length > 0 &&
    birthTime.trim().length > 0 &&
    birthLocation.trim().length > 0 &&
    favoriteColor.trim().length > 0 &&
    favoriteNumber.trim().length > 0;

  const handleComplete = async () => {
    if (!canSubmit || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const base = createMinimalProfile(name.trim(), email.trim());
      const profile: UserProfile = {
        ...base,
        role: initial?.role ?? base.role,
        personaMode,
        soulprintComplete: true,
        birthday,
        birthTime,
        birthLocation,
        favoriteColor,
        favoriteNumber,
        zodiacSign: derived.zodiacSign || initial?.zodiacSign || "",
        destinyNumber: derived.destinyNumber || initial?.destinyNumber || 0,
        tarotArchetype: derived.tarotArchetype || initial?.tarotArchetype || "",
        planetaryRuler: derived.planetaryRuler || initial?.planetaryRuler,
        chineseZodiac: derived.chineseZodiac || initial?.chineseZodiac,
        chineseElement: derived.chineseElement || initial?.chineseElement,
        lifePathNumber: derived.lifePathNumber || initial?.lifePathNumber,
        moonPhase: derived.moonPhase || initial?.moonPhase,
        celticTree: derived.celticTree || initial?.celticTree,
        monologueStyle,
        geomancyFigure: geomancyFigure.trim() || undefined,
        helixTraits: {
          comtStatus: (comtStatus as any) ?? "Unknown",
          drd4Status: (drd4Status as any) ?? "Unknown",
          oxtrStatus: (oxtrStatus as any) ?? "Unknown",
          bdnfStatus: (bdnfStatus as any) ?? "Unknown",
          faahStatus: (faahStatus as any) ?? "Unknown",
        },
      };

      const weaveReport = await generateWeaveReport(profile);
      await onComplete({ profile, weaveReport });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid max-w-3xl mx-auto p-3">
      {error && (
        <div className="alert alert-danger mb-4 rounded-3 text-red-200 small border-opacity-20 bg-danger bg-opacity-10">
          {error}
        </div>
      )}

      <div className="signal-card scanline-container p-4 p-md-5">
        <header className="mb-5">
          <div className="small font-mono text-slate-500 mb-1" style={{ fontSize: '10px' }}>SYSTEM_INITIALIZATION</div>
          <h2 className="fs-3 font-serif text-white mb-2 text-gradient">Soulprint Intake</h2>
          <p className="small text-slate-400 font-mono mb-0">
            ENTER_ANCHORS • WEAVE_REPORT_PENDING
          </p>
        </header>

        <div className="row g-4">
          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>USER_NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control font-mono small"
              placeholder="Full name"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>EMAIL_RELAY</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control font-mono small"
              placeholder="Email"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>BIRTH_DATE</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="form-control font-mono small"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>BIRTH_TIME</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="form-control font-mono small"
            />
          </div>

          <div className="col-12">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>BIRTH_COORDINATES</label>
            <input
              value={birthLocation}
              onChange={(e) => setBirthLocation(e.target.value)}
              className="form-control font-mono small"
              placeholder="City, Country"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>POWER_COLOR</label>
            <input
              value={favoriteColor}
              onChange={(e) => setFavoriteColor(e.target.value)}
              className="form-control font-mono small"
              placeholder="e.g., Purple"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>POWER_NUMBER</label>
            <input
              value={favoriteNumber}
              onChange={(e) => setFavoriteNumber(e.target.value)}
              className="form-control font-mono small"
              placeholder="e.g., 7"
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>VOICE_MODE</label>
            <select
              value={personaMode ?? "tami"}
              onChange={(e) => setPersonaMode(e.target.value as UserProfile["personaMode"])}
              className="form-select font-mono small"
            >
              <option value="tami">TAMI</option>
              <option value="oracle">ORACLE</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="small font-mono text-slate-500 mb-2" style={{ fontSize: '9px' }}>MONOLOGUE_STYLE</label>
            <select
              value={monologueStyle ?? "Verbal"}
              onChange={(e) => setMonologueStyle(e.target.value as UserProfile["monologueStyle"])}
              className="form-select font-mono small"
            >
              <option value="Verbal">VERBAL</option>
              <option value="Visual">VISUAL</option>
              <option value="Musical">MUSICAL</option>
              <option value="Anendophasic">ANENDOPHASIC</option>
            </select>
          </div>
        </div>

        <div className="mt-5 d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="small font-mono text-slate-500" style={{ fontSize: '10px' }}>
            {canSubmit ? "SIGNAL_STABLE: READY_FOR_WEAVE" : "SIGNAL_FRAGMENTED: INPUT_REQUIRED"}
          </div>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleComplete}
            className="btn btn-primary bg-theme-accent border-0 px-5 py-3 rounded-pill font-mono small text-white shadow-lg"
          >
            {submitting ? "WEAVING..." : "INITIALIZE_SOULPRINT"}
          </button>
        </div>
      </div>
    </div>
  );
}
