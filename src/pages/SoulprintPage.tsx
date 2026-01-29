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
  const [form, setForm] = useState({
    name: "",
    birthday: "",
    birthTime: "",
    birthPlace: "",
    favoriteColor: "",
    favoriteNumber: "",
  });

  const isEditing = Boolean(userData?.soulprintComplete || (userData?.birthday && userData?.destinyNumber != null));

  useEffect(() => {
    if (!userData) return;
    setForm((f) => ({
      ...f,
      name: userData.name || f.name,
      birthday: userData.birthday || f.birthday,
      birthTime: userData.birthTime || f.birthTime,
      birthPlace: userData.birthPlace || f.birthPlace,
      favoriteColor: userData.favoriteColor || f.favoriteColor,
      favoriteNumber: userData.favoriteNumber || f.favoriteNumber,
    }));
  }, [userData?.name, userData?.birthday, userData?.birthTime, userData?.birthPlace, userData?.favoriteColor, userData?.favoriteNumber]);

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
        birthPlace: form.birthPlace,
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
            Your Soulprint
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-2">
            {isEditing ? "Update your details" : "Add your details so we can personalize your experience"}
          </p>
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
                Time (optional)
              </span>
              <input
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
            placeholder="Birth City / Place"
            className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
            value={form.birthPlace}
            onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Palette size={14} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                required
                type="text"
                placeholder="Favourite colour"
                className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 pl-9 text-sm focus:outline-none focus:border-purple-500 text-white"
                value={form.favoriteColor}
                onChange={(e) =>
                  setForm({ ...form, favoriteColor: e.target.value })
                }
              />
            </div>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                required
                type="number"
                placeholder="Favourite number"
                className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 pl-9 text-sm focus:outline-none focus:border-purple-500 text-white"
                value={form.favoriteNumber}
                onChange={(e) =>
                  setForm({ ...form, favoriteNumber: e.target.value })
                }
              />
            </div>
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded shadow-lg transition-all mt-4 disabled:opacity-50"
          >
            {loading ? "Saving…" : isEditing ? "Update my Soulprint" : "Save my Soulprint"}
          </button>
        </form>
      </div>
    </div>
  );
}
