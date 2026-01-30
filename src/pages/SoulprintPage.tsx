import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, Hash } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../lib/types";
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

export default function SoulprintPage() {
  const { currentUser, userData, setUserData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  useEffect(() => {
    if (!userData) return;
    setForm((f) => ({
      ...f,
      name: userData.name || f.name,
      birthday: userData.birthday || f.birthday,
      birthTime: userData.birthTime || f.birthTime,
      birthLocation: userData.birthLocation || userData.birthPlace || f.birthLocation,
      geomancyFigure: (userData as any).geomancyFigure || f.geomancyFigure,
      favoriteColor: userData.favoriteColor || f.favoriteColor,
      favoriteNumber: userData.favoriteNumber || f.favoriteNumber,
      monologueStyle: userData.monologueStyle || f.monologueStyle,
      helixTraits: {
        comtStatus: userData.helixTraits?.comtStatus || f.helixTraits.comtStatus,
        drd4Status: userData.helixTraits?.drd4Status || f.helixTraits.drd4Status,
        oxtrStatus: userData.helixTraits?.oxtrStatus || f.helixTraits.oxtrStatus,
        bdnfStatus: userData.helixTraits?.bdnfStatus || f.helixTraits.bdnfStatus,
        faahStatus: userData.helixTraits?.faahStatus || f.helixTraits.faahStatus,
      },
    }));
  }, [
    userData?.name,
    userData?.birthday,
    userData?.birthTime,
    (userData as any)?.birthLocation,
    userData?.birthPlace,
    (userData as any)?.geomancyFigure,
    userData?.favoriteColor,
    userData?.favoriteNumber,
    userData?.monologueStyle,
    userData?.helixTraits,
  ]);

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
        birthPlace: form.birthLocation, // keep legacy in sync
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

  return (
    <div className="min-h-screen bg-slate-950 text-purple-50 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />
      <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-300">
            Tuning Your Soulprint
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-2">
            {isEditing ? "Re-tune your signal" : "Step into the channel — we’ll calibrate your frequency"}
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
          <div>
            Phase <span className="text-slate-200 font-semibold">{step}</span> / 3
          </div>
          <div className="font-mono">
            {step === 1 ? "ANCHOR" : step === 2 ? "INTERFACE" : "HELIX"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="text"
            placeholder="Full Name"
            className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    Birth Date
                  </span>
                  <input
                    required
                    type="date"
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    Birth Time (required)
                  </span>
                  <input
                    required
                    type="time"
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500"
                    value={form.birthTime}
                    onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
                  />
                </div>
              </div>
              <input
                required
                type="text"
                placeholder="Birth Location (City / Country)"
                className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                value={form.birthLocation}
                onChange={(e) => setForm({ ...form, birthLocation: e.target.value })}
              />
              <div className="relative">
                <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                  Geomancy Figure (Optional)
                </span>
                <select
                  value={form.geomancyFigure}
                  onChange={(e) => setForm({ ...form, geomancyFigure: e.target.value })}
                  className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">—</option>
                  <option value="Via">Via</option>
                  <option value="Populus">Populus</option>
                  <option value="Fortuna Major">Fortuna Major</option>
                  <option value="Fortuna Minor">Fortuna Minor</option>
                  <option value="Conjunctio">Conjunctio</option>
                  <option value="Albus">Albus</option>
                  <option value="Puer">Puer</option>
                  <option value="Puella">Puella</option>
                  <option value="Amissio">Amissio</option>
                  <option value="Acquisitio">Acquisitio</option>
                  <option value="Carcer">Carcer</option>
                  <option value="Laetitia">Laetitia</option>
                  <option value="Tristitia">Tristitia</option>
                  <option value="Cauda Draconis">Cauda Draconis</option>
                  <option value="Caput Draconis">Caput Draconis</option>
                  <option value="Rubeus">Rubeus</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Palette size={14} className="absolute left-3 top-3.5 text-slate-500" />
                  <input
                    required
                    type="text"
                    placeholder="Power color"
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 pl-9 text-sm focus:outline-none focus:border-purple-500 text-white"
                    value={form.favoriteColor}
                    onChange={(e) => setForm({ ...form, favoriteColor: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-3.5 text-slate-500" />
                  <input
                    required
                    type="number"
                    placeholder="Power number"
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 pl-9 text-sm focus:outline-none focus:border-purple-500 text-white"
                    value={form.favoriteNumber}
                    onChange={(e) => setForm({ ...form, favoriteNumber: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                We anchor the channel first: time, place, and the two numbers your signal keeps repeating.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="relative">
                <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                  Inner Monologue Style
                </span>
                <select
                  value={form.monologueStyle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      monologueStyle: e.target.value as NonNullable<UserProfile["monologueStyle"]>,
                    })
                  }
                  className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="Verbal">Verbal</option>
                  <option value="Visual">Visual</option>
                  <option value="Anendophasic">Anendophasic</option>
                  <option value="Musical">Musical</option>
                  <option value="Anauralic">Anauralic</option>
                </select>
              </div>
              <p className="text-xs text-slate-500">
                This tells us how your mind transmits information when nobody is listening.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    COMT (Warrior/Worrier)
                  </span>
                  <select
                    value={form.helixTraits.comtStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        helixTraits: { ...form.helixTraits, comtStatus: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Warrior (Met/Met)">Warrior (Met/Met)</option>
                    <option value="Worrier (Val/Val)">Worrier (Val/Val)</option>
                    <option value="Balanced">Balanced</option>
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    DRD4 (Seeker/Settler)
                  </span>
                  <select
                    value={form.helixTraits.drd4Status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        helixTraits: { ...form.helixTraits, drd4Status: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Seeker (7R+)">Seeker (7R+)</option>
                    <option value="Settler (No 7R)">Settler (No 7R)</option>
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    OXTR (Empath/Lone Wolf)
                  </span>
                  <select
                    value={form.helixTraits.oxtrStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        helixTraits: { ...form.helixTraits, oxtrStatus: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Empath (GG)">Empath (GG)</option>
                    <option value="Lone Wolf (AA)">Lone Wolf (AA)</option>
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    BDNF (Plastic/Rigid)
                  </span>
                  <select
                    value={form.helixTraits.bdnfStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        helixTraits: { ...form.helixTraits, bdnfStatus: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Plastic (Val/Val)">Plastic (Val/Val)</option>
                    <option value="Rigid (Met Carrier)">Rigid (Met Carrier)</option>
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-2 text-[10px] bg-slate-950 px-1 text-slate-500">
                    FAAH (Stoic/Sensitive)
                  </span>
                  <select
                    value={form.helixTraits.faahStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        helixTraits: { ...form.helixTraits, faahStatus: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Stoic (A Carrier)">Stoic (A Carrier)</option>
                    <option value="Sensitive (CC)">Sensitive (CC)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Optional for now. This is manual helix entry — the biological layer that colors the signal.
              </p>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 2 ? 1 : 2))}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium py-3 rounded transition-all"
                disabled={loading}
              >
                Back
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded shadow-lg transition-all disabled:opacity-50"
                disabled={
                  loading ||
                  !form.name ||
                  !form.birthday ||
                  !form.birthTime ||
                  !form.birthLocation ||
                  !form.favoriteColor ||
                  !form.favoriteNumber
                }
              >
                Next
              </button>
            ) : (
              <button
                disabled={loading}
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Saving…" : isEditing ? "Update my Soulprint" : "Seal the Tuning"}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
