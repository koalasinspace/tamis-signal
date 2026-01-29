export const calculateDestinyNumber = (name: string): number => {
  const map: { [key: string]: number } = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 1, k: 2, l: 3,
    m: 4, n: 5, o: 6, p: 7, q: 8, r: 9, s: 1, t: 2, u: 3, v: 4, w: 5, x: 6,
    y: 7, z: 8,
  };
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, "");
  let sum = 0;
  for (let char of cleanName) sum += map[char] || 0;
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = sum.toString().split("").reduce((acc, curr) => acc + parseInt(curr), 0);
  }
  return sum;
};

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];

export const getTarotArchetype = (numStr: string): string => {
  const num = parseInt(numStr);
  if (isNaN(num)) return "The Fool";
  return MAJOR_ARCANA[num % 22];
};

export const getZodiacSign = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 1 && day <= 19) || (month === 12 && day >= 22)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  return "Unknown";
};

const PLANETS_BY_DAY: Record<number, string> = {
  0: "Sun",
  1: "Moon",
  2: "Mars",
  3: "Mercury",
  4: "Jupiter",
  5: "Venus",
  6: "Saturn",
};

export const getPlanetaryRuler = (dateString: string): string => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  return PLANETS_BY_DAY[dayOfWeek] ?? "Unknown";
};

const CHINESE_ZODIAC = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
];

export const getChineseZodiac = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const idx = (year - 4) % 12;
  return CHINESE_ZODIAC[idx < 0 ? idx + 12 : idx] ?? "Unknown";
};

export const getChineseElement = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const lastDigit = year % 10;
  if (lastDigit === 0 || lastDigit === 1) return "Metal";
  if (lastDigit === 2 || lastDigit === 3) return "Water";
  if (lastDigit === 4 || lastDigit === 5) return "Wood";
  if (lastDigit === 6 || lastDigit === 7) return "Fire";
  if (lastDigit === 8 || lastDigit === 9) return "Earth";
  return "Unknown";
};

export const calculateLifePath = (dateString: string): number => {
  const digits = dateString.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += parseInt(digits[i], 10);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").reduce((acc, curr) => acc + parseInt(curr, 10), 0);
  }
  return sum;
};

const LUNAR_CYCLE_DAYS = 29.53;
const REF_NEW_MOON_MS = new Date(1970, 0, 7).getTime();

export const getMoonPhase = (dateString: string): string => {
  const date = new Date(dateString);
  const ms = date.getTime();
  const daysSince = (ms - REF_NEW_MOON_MS) / (24 * 60 * 60 * 1000);
  const phaseInCycle = ((daysSince % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const t = phaseInCycle / LUNAR_CYCLE_DAYS;
  if (t < 0.0625) return "New Moon";
  if (t < 0.1875) return "Waxing Crescent";
  if (t < 0.3125) return "First Quarter";
  if (t < 0.4375) return "Waxing Gibbous";
  if (t < 0.5625) return "Full Moon";
  if (t < 0.6875) return "Waning Gibbous";
  if (t < 0.8125) return "Last Quarter";
  if (t < 0.9375) return "Waning Crescent";
  return "New Moon";
};

function celticTreeFor(month: number, day: number): string {
  if ((month === 12 && day >= 24) || (month === 1 && day <= 20)) return "Birch";
  if ((month === 1 && day >= 21) || (month === 2 && day <= 17)) return "Rowan";
  if ((month === 2 && day >= 18) || (month === 3 && day <= 17)) return "Ash";
  if ((month === 3 && day >= 18) || (month === 4 && day <= 14)) return "Alder";
  if ((month === 4 && day >= 15) || (month === 5 && day <= 12)) return "Willow";
  if ((month === 5 && day >= 13) || (month === 6 && day <= 9)) return "Hawthorn";
  if ((month === 6 && day >= 10) || (month === 7 && day <= 7)) return "Oak";
  if ((month === 7 && day >= 8) || (month === 8 && day <= 4)) return "Holly";
  if ((month === 8 && day >= 5) || (month === 9 && day <= 1)) return "Hazel";
  if (month === 9 && day >= 2 && day <= 29) return "Vine";
  if ((month === 9 && day >= 30) || (month === 10 && day <= 27)) return "Ivy";
  if ((month === 10 && day >= 28) || (month === 11 && day <= 24)) return "Reed";
  if ((month === 11 && day >= 25) || (month === 12 && day <= 23)) return "Elder";
  return "Unknown";
}

export const getCelticTree = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return celticTreeFor(month, day);
};
