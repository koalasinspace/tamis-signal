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

      // Critical requirement: weave report must be generated during completion.
      const weaveReport = await generateWeaveReport(profile);
      await onComplete({ profile, weaveReport });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-purple-500/20 bg-slate-950/60 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">Onboarding</div>
            <h2 className="mt-1 text-xl font-serif text-white">Soulprint Intake</h2>
            <p className="mt-1 text-sm text-slate-400">
              Enter anchors. We’ll compute the derived pillars and weave a signal report.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="Email"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Birthday</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Birth Time</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Birth Location</label>
            <input
              value={birthLocation}
              onChange={(e) => setBirthLocation(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="City, Country"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Favorite Color</label>
            <input
              value={favoriteColor}
              onChange={(e) => setFavoriteColor(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="e.g., Purple"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Favorite Number</label>
            <input
              value={favoriteNumber}
              onChange={(e) => setFavoriteNumber(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="e.g., 7"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Persona Mode</label>
            <select
              value={personaMode ?? "tami"}
              onChange={(e) => setPersonaMode(e.target.value as UserProfile["personaMode"])}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
            >
              <option value="tami">Tami</option>
              <option value="oracle">Oracle</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Inner Monologue</label>
            <select
              value={monologueStyle ?? "Verbal"}
              onChange={(e) => setMonologueStyle(e.target.value as UserProfile["monologueStyle"])}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
            >
              <option value="Verbal">Verbal</option>
              <option value="Visual">Visual</option>
              <option value="Musical">Musical</option>
              <option value="Anendophasic">Anendophasic</option>
              <option value="Anauralic">Anauralic</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">
              Geomancy Figure (optional manual override)
            </label>
            <input
              value={geomancyFigure}
              onChange={(e) => setGeomancyFigure(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/60"
              placeholder="e.g., Carcer"
            />
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Helix Traits (optional manual)
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500">COMT</label>
                <select
                  value={comtStatus as any}
                  onChange={(e) => setComtStatus(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Warrior (Met/Met)">Warrior (Met/Met)</option>
                  <option value="Worrier (Val/Val)">Worrier (Val/Val)</option>
                  <option value="Balanced">Balanced</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500">DRD4</label>
                <select
                  value={drd4Status as any}
                  onChange={(e) => setDrd4Status(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Seeker (7R+)">Seeker (7R+)</option>
                  <option value="Settler (No 7R)">Settler (No 7R)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500">OXTR</label>
                <select
                  value={oxtrStatus as any}
                  onChange={(e) => setOxtrStatus(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Empath (GG)">Empath (GG)</option>
                  <option value="Lone Wolf (AA)">Lone Wolf (AA)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500">BDNF</label>
                <select
                  value={bdnfStatus as any}
                  onChange={(e) => setBdnfStatus(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Plastic (Val/Val)">Plastic (Val/Val)</option>
                  <option value="Rigid (Met Carrier)">Rigid (Met Carrier)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500">FAAH</label>
                <select
                  value={faahStatus as any}
                  onChange={(e) => setFaahStatus(e.target.value as any)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Stoic (A Carrier)">Stoic (A Carrier)</option>
                  <option value="Sensitive (CC)">Sensitive (CC)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Derived Pillars (preview)
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Zodiac</div>
              <div className="text-slate-200">{derived.zodiacSign || "—"}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Planetary Ruler</div>
              <div className="text-slate-200">{derived.planetaryRuler || "—"}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Chinese</div>
              <div className="text-slate-200">
                {[derived.chineseElement, derived.chineseZodiac].filter(Boolean).join(" ") || "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Life Path</div>
              <div className="text-slate-200">{derived.lifePathNumber || "—"}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Destiny</div>
              <div className="text-slate-200">{derived.destinyNumber || "—"}</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="text-slate-500 text-[10px] uppercase">Tarot</div>
              <div className="text-slate-200">{derived.tarotArchetype || "—"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500">
            {canSubmit ? "Ready to weave." : "Fill the required anchors to continue."}
          </div>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleComplete}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Weaving…" : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

