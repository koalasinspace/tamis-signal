/** Grimoire: static definitions for esoteric pillars. Look up by key. */
export type GrimoireEntry = { subtitle?: string; description: string };

export type GrimoireCard = { name: string; meaning: string };
export type GrimoireData = Record<string, GrimoireCard[]>;

export const ESOTERIC_DATA: {
  zodiac: Record<string, GrimoireEntry>;
  numerology: Record<string, GrimoireEntry>;
  tarot: Record<string, GrimoireEntry>;
  chineseZodiac: Record<string, GrimoireEntry>;
  chineseElement: Record<string, GrimoireEntry>;
  planetaryRuler: Record<string, GrimoireEntry>;
  moonPhase: Record<string, GrimoireEntry>;
  celticTree: Record<string, GrimoireEntry>;
} = {
  zodiac: {
    Aries: { subtitle: "The Warrior", description: "Ruled by Mars. First sign of the zodiac—raw courage, impulse, and the spark of new beginnings. You lead with fire; your shadow is recklessness. Channel the ram: charge when it serves, pause when it burns." },
    Taurus: { subtitle: "The Builder", description: "Ruled by Venus. Earth fixed. Sensuality, stability, and stubborn devotion. You root in the material world; your shadow is possessiveness. The bull does not yield—choose what is worth holding." },
    Gemini: { subtitle: "The Messenger", description: "Ruled by Mercury. Air mutable. Wit, curiosity, and the dance of duality. You speak many tongues; your shadow is restlessness. Two minds, one soul—integrate instead of scatter." },
    Cancer: { subtitle: "The Nurturer", description: "Ruled by the Moon. Water cardinal. Emotion, home, and the shell that protects. You feel everything; your shadow is clinging. The crab carries home on its back—know when to open the shell." },
    Leo: { subtitle: "The Sovereign", description: "Ruled by the Sun. Fire fixed. Radiance, pride, and creative force. You are meant to shine; your shadow is vanity. The lion rules by warmth, not fear. Lead with heart." },
    Virgo: { subtitle: "The Purifier", description: "Ruled by Mercury. Earth mutable. Discernment, service, and the pursuit of perfection. You refine what is broken; your shadow is criticism. The virgin holds the sheaf—harvest what matters, release the rest." },
    Libra: { subtitle: "The Diplomat", description: "Ruled by Venus. Air cardinal. Balance, beauty, and the scales of justice. You seek harmony; your shadow is indecision. True balance is choice, not avoidance." },
    Scorpio: { subtitle: "The Transformer", description: "Ruled by Mars and Pluto. Water fixed. Depth, power, and rebirth through crisis. You see what others hide; your shadow is obsession. The phoenix rises—let the old die." },
    Sagittarius: { subtitle: "The Seeker", description: "Ruled by Jupiter. Fire mutable. Truth, expansion, and the arrow aimed at the horizon. You quest for meaning; your shadow is dogma. Aim high, but walk the path." },
    Capricorn: { subtitle: "The Mountain", description: "Ruled by Saturn. Earth cardinal. Ambition, structure, and the long climb. You build what lasts; your shadow is coldness. The goat reaches the peak—remember why you climbed." },
    Aquarius: { subtitle: "The Visionary", description: "Ruled by Saturn and Uranus. Air fixed. Innovation, humanity, and detachment from the herd. You see the future; your shadow is aloofness. Water-bearer: pour out what you carry." },
    Pisces: { subtitle: "The Mystic", description: "Ruled by Neptune and Jupiter. Water mutable. Surrender, imagination, and the veil between worlds. You swim in the collective; your shadow is escape. Two fish—one toward spirit, one toward form. Both are real." },
  },
  numerology: {
    "1": { subtitle: "The Pioneer", description: "Leadership, independence, and the spark of creation. You are here to initiate, not follow. Your shadow: arrogance. Stand alone when you must; collaborate when it serves." },
    "2": { subtitle: "The Partner", description: "Cooperation, intuition, and the power of two. You bridge and balance. Your shadow: dependence. Diplomacy is strength; self-erasure is not." },
    "3": { subtitle: "The Creator", description: "Expression, joy, and the triad of mind-body-spirit. You manifest through word and art. Your shadow: scattering. Create with focus; play with purpose." },
    "4": { subtitle: "The Builder", description: "Stability, order, and the four corners of reality. You are the foundation. Your shadow: rigidity. Build strong—then allow the door to open." },
    "5": { subtitle: "The Catalyst", description: "Freedom, change, and the five senses alive. You are the disruptor. Your shadow: restlessness. Move when the road calls; root when the season asks." },
    "6": { subtitle: "The Nurturer", description: "Responsibility, love, and the harmony of home. You hold the circle. Your shadow: martyrdom. Give from overflow, not from emptiness." },
    "7": { subtitle: "The Seeker", description: "Wisdom, solitude, and the quest for truth. You are the hermit and the mystic. Your shadow: isolation. Seek within; return with light." },
    "8": { subtitle: "The Authority", description: "Power, material mastery, and the infinite loop. You manifest in the world. Your shadow: domination. True power serves; it does not crush." },
    "9": { subtitle: "The Completer", description: "Endings, wisdom, and the gift of release. You close cycles. Your shadow: attachment to the past. Finish; then let go." },
    "11": { subtitle: "The Master Intuitive", description: "Higher vision, inspiration, and the bridge between worlds. You carry a double charge of 1—pioneer of the unseen. Your shadow: anxiety and escapism. Ground the lightning; deliver the message." },
    "22": { subtitle: "The Master Builder", description: "The practical visionary. You turn dreams into structures that last. Your shadow: overwhelm. Build in stages; the mountain is moved one stone at a time." },
    "33": { subtitle: "The Master Teacher", description: "Compassion in action, healing, and sacred service. You lift others by example. Your shadow: burnout. You cannot pour from an empty vessel." },
  },
  tarot: {
    "The Fool": { subtitle: "Card 0", description: "Innocence, spontaneity, and the leap into the unknown. The Fool steps off the cliff—not from ignorance, but from trust. Your path begins with one bold move. The shadow: recklessness. Leap with eyes open." },
    "The Magician": { subtitle: "Card I", description: "Will, skill, and the four tools: wand, cup, sword, pentacle. As above, so below—you manifest through focus. Your shadow: manipulation. Use power with integrity." },
    "The High Priestess": { subtitle: "Card II", description: "Intuition, mystery, and what lies behind the veil. She does not speak; she knows. Your shadow: passivity. Listen to the inner voice; then act when called." },
    "The Empress": { subtitle: "Card III", description: "Fertility, abundance, and the body of the earth. Creation in full bloom. Your shadow: indulgence. Nurture—and set boundaries where needed." },
    "The Emperor": { subtitle: "Card IV", description: "Structure, authority, and the throne of order. He builds what lasts. Your shadow: rigidity. Rule with wisdom, not with fear." },
    "The Hierophant": { subtitle: "Card V", description: "Tradition, teaching, and the bridge between human and divine. Keeper of sacred forms. Your shadow: dogma. Honor the path; question when it no longer serves." },
    "The Lovers": { subtitle: "Card VI", description: "Choice, union, and the alignment of values. Two become one through conscious decision. Your shadow: dependency. Love from wholeness, not lack." },
    "The Chariot": { subtitle: "Card VII", description: "Will, victory, and the discipline of opposing forces. You drive the cart. Your shadow: force over flow. Direct energy; do not crush what resists." },
    "Strength": { subtitle: "Card VIII", description: "Courage, gentleness, and the taming of the beast from within. Power without cruelty. Your shadow: denial of the wild. Embrace the animal; guide it with love." },
    "The Hermit": { subtitle: "Card IX", description: "Solitude, inner light, and the search for truth. The lantern illuminates the path. Your shadow: isolation. Withdraw to return with clarity." },
    "Wheel of Fortune": { subtitle: "Card X", description: "Cycles, fate, and the turn of the wheel. Nothing stays still. Your shadow: fatalism. Ride the wheel; steer when you can." },
    "Justice": { subtitle: "Card XI", description: "Truth, balance, and cause and effect. The scales do not lie. Your shadow: self-righteousness. Seek justice; remember mercy." },
    "The Hanged Man": { subtitle: "Card XII", description: "Surrender, perspective shift, and the wisdom of pause. Sometimes the only way forward is to let go. Your shadow: martyrdom. Sacrifice with purpose." },
    "Death": { subtitle: "Card XIII", description: "Transformation, endings, and rebirth. The skeleton clears the way. Your shadow: resistance. What must die will die; make room for the new." },
    "Temperance": { subtitle: "Card XIV", description: "Blending, patience, and the alchemy of opposites. The angel pours between cups. Your shadow: compromise that dilutes. Mix with intention." },
    "The Devil": { subtitle: "Card XV", description: "Bondage, materialism, and the chains we choose. The shadow side of desire. Your shadow: blame. You hold the key; only you can unlock." },
    "The Tower": { subtitle: "Card XVI", description: "Upheaval, revelation, and the fall of false structures. Lightning strikes; the tower crumbles. Your shadow: clinging to ruins. Rebuild on truth." },
    "The Star": { subtitle: "Card XVII", description: "Hope, inspiration, and the light after the storm. She pours water on earth and soul. Your shadow: naive optimism. Hope with eyes open." },
    "The Moon": { subtitle: "Card XVIII", description: "Illusion, the unconscious, and the path through the dark. The moon reflects; it does not explain. Your shadow: paranoia. Trust the journey through the fog." },
    "The Sun": { subtitle: "Card XIX", description: "Vitality, success, and the clarity of day. The child rides in full light. Your shadow: burnout. Even the sun sets; rest is part of radiance." },
    "Judgement": { subtitle: "Card XX", description: "Awakening, reckoning, and the call to rise. The trumpet sounds; the dead rise. Your shadow: self-condemnation. Answer the call; forgive the past." },
    "The World": { subtitle: "Card XXI", description: "Completion, wholeness, and the dance within the wreath. The cycle ends and begins again. Your shadow: complacency. Complete—then begin the next spiral." },
  },
  chineseZodiac: {
    Rat: { description: "Clever, adaptable, and first in the cycle. The Rat finds a way where others see walls. Charm and resourcefulness are your gifts; greed and anxiety your shadows. Use your wit to build, not to hoard." },
    Ox: { description: "Steady, strong, and dependable. The Ox carries the weight of the world without complaint. Endurance and loyalty are your gifts; stubbornness your shadow. Persevere—but know when to rest." },
    Tiger: { description: "Bold, charismatic, and fierce. The Tiger commands attention and takes risks. Courage and passion are your gifts; recklessness your shadow. Lead with heart; pause before the pounce." },
    Rabbit: { description: "Gentle, diplomatic, and intuitive. The Rabbit moves through conflict with grace. Sensitivity and refinement are your gifts; avoidance your shadow. Soft does not mean weak." },
    Dragon: { description: "Charismatic, ambitious, and larger than life. The Dragon brings luck and transformation. Power and vision are your gifts; arrogance your shadow. Fly high—remember the earth." },
    Snake: { description: "Wise, enigmatic, and transformative. The Snake sheds the old and emerges renewed. Depth and intuition are your gifts; secrecy your shadow. Reveal when it serves; protect when it matters." },
    Horse: { description: "Free-spirited, energetic, and independent. The Horse runs toward the horizon. Freedom and passion are your gifts; restlessness your shadow. Run—but know where home is." },
    Goat: { description: "Creative, gentle, and aesthetic. The Goat seeks beauty and peace. Art and empathy are your gifts; passivity your shadow. Create the world you want to live in." },
    Monkey: { description: "Clever, playful, and inventive. The Monkey solves problems with wit. Ingenuity and humor are your gifts; mischief your shadow. Play—but play for the right reasons." },
    Rooster: { description: "Proud, observant, and precise. The Rooster announces the dawn. Honesty and diligence are your gifts; criticality your shadow. Speak the truth with kindness." },
    Dog: { description: "Loyal, honest, and protective. The Dog guards what matters. Fidelity and justice are your gifts; worry your shadow. Protect—but do not imprison." },
    Pig: { description: "Generous, sincere, and devoted to pleasure. The Pig enjoys the feast of life. Abundance and warmth are your gifts; overindulgence your shadow. Give freely; receive with grace." },
  },
  chineseElement: {
    Metal: { description: "Clarity, precision, and the edge that cuts. Metal refines and structures. You value order, truth, and the removal of what does not serve. Your shadow: rigidity. Bend when the blade would break." },
    Water: { description: "Depth, flow, and the power of adaptation. Water shapes to the vessel. You move through obstacles by yielding. Your shadow: overwhelm. Flow—do not flood." },
    Wood: { description: "Growth, expansion, and the push toward light. Wood reaches and spreads. You build, create, and nurture. Your shadow: overextension. Grow roots as deep as your branches." },
    Fire: { description: "Passion, transformation, and radiant energy. Fire consumes and illuminates. You inspire and destroy in turn. Your shadow: burnout. Burn bright—feed the flame with rest." },
    Earth: { description: "Stability, nourishment, and the center. Earth holds and sustains. You are the anchor and the harvest. Your shadow: stagnation. Ground—then allow new growth." },
  },
  planetaryRuler: {
    Sun: { description: "Vitality, identity, and the core self. The Sun rules the day you were born—your essential radiance. You are here to shine and to lead from the heart. Shadow: ego. Serve the light; do not hoard it." },
    Moon: { description: "Emotion, instinct, and the inner tide. The Moon rules your emotional nature and your need for security. You feel deeply and protect what you love. Shadow: mood. Honor the cycle; do not be ruled by it." },
    Mars: { description: "Action, desire, and the will to fight. Mars rules your drive and how you assert yourself. You are built for courage and conquest. Shadow: rage. Channel the warrior; do not become the war." },
    Mercury: { description: "Mind, communication, and the messenger. Mercury rules how you think, speak, and connect. You are the bridge between ideas and people. Shadow: restlessness. Move with purpose." },
    Jupiter: { description: "Expansion, wisdom, and luck. Jupiter rules growth, meaning, and the search for truth. You are here to learn and to teach. Shadow: excess. Expand—but stay rooted." },
    Venus: { description: "Love, beauty, and value. Venus rules your heart, your aesthetics, and what you hold dear. You attract and create harmony. Shadow: indulgence. Love fully; attach wisely." },
    Saturn: { description: "Structure, discipline, and time. Saturn rules limits, responsibility, and the long game. You build what lasts through effort. Shadow: fear. Restrict with purpose; do not imprison." },
  },
  moonPhase: {
    "New Moon": { description: "Beginnings, intention, and the dark before the light. Plant seeds in the invisible. This is your moment to set the course. What do you want to birth?" },
    "Waxing Crescent": { description: "Early growth and the first sliver of light. Take action on what you began at the New Moon. Build momentum; protect the tender shoot." },
    "First Quarter": { description: "Challenge and commitment. The half-moon asks: will you continue? Face obstacles with clarity. This is the test of your intention." },
    "Waxing Gibbous": { description: "Refinement and near-completion. Polish what you have built. Adjust and prepare for the peak. Almost there." },
    "Full Moon": { description: "Illumination, climax, and the full face of the unseen. What was hidden is revealed. Celebrate, release, or confront. The light does not lie." },
    "Waning Gibbous": { description: "Gratitude and sharing. The light begins to release. Give thanks; share what you have learned. Disseminate before the release." },
    "Last Quarter": { description: "Release and forgiveness. Let go of what no longer serves. Clear the old to make space. Surrender is strength." },
    "Waning Crescent": { description: "Rest and surrender. The cycle completes in darkness. Rest, reflect, and prepare for the next New Moon. Endings are also beginnings." },
  },
  celticTree: {
    Birch: { description: "The Pioneer. New beginnings, purification, and the first tree to grow after ice. You clear the way for others. Renew and begin again." },
    Rowan: { description: "The Guardian. Protection, vision, and the bridge between worlds. The rowan guards the threshold. You see what others miss; protect what matters." },
    Ash: { description: "The Connector. The world tree; roots below, branches above. You link realms and people. Integration and wisdom are your gifts." },
    Alder: { description: "The Warrior of Spirit. Courage, oracular power, and the fire that burns in water. You stand where others fear to go. Fight for what is sacred." },
    Willow: { description: "The Intuitive. Moon-ruled, fluid, and attuned to the unseen. You bend; you do not break. Emotion and prophecy flow through you." },
    Hawthorn: { description: "The Protector of the Hedge. Boundaries, faery contact, and the thorn that guards the heart. You defend the liminal. Sharp outside; soft within." },
    Oak: { description: "The Sovereign. Strength, endurance, and the king of the forest. You hold the line. Stability and nobility are your nature." },
    Holly: { description: "The Champion. Battle, protection, and the evergreen that defies winter. You fight for what is right. Courage in the dark." },
    Hazel: { description: "The Wise One. Wisdom, inspiration, and the nuts of knowledge. You carry the spark of Awen. Seek and share truth." },
    Vine: { description: "The Balanced One. Equinox energy; the equal day and night. You seek harmony and the middle path. Balance is your art." },
    Ivy: { description: "The Resilient. Determination, connection, and the climb that never quits. You bind and persist. Endurance through connection." },
    Reed: { description: "The Truth-Seeker. Spears, thatch, and the arrow that flies true. You cut through illusion. Aim for the heart of the matter." },
    Elder: { description: "The Crone and the Gate. Endings, transformation, and the tree of the death-and-rebirth goddess. You close cycles with wisdom. Honor the end." },
  },
};

/** Get description for a pillar. Keys: zodiac sign name, "1"-"9"/"11"/"22"/"33" for numerology, tarot card name, Chinese animal, element, planet, moon phase name, celtic tree name. */
export function getGrimoireEntry(
  type: keyof typeof ESOTERIC_DATA,
  key: string
): GrimoireEntry | undefined {
  const map = ESOTERIC_DATA[type];
  if (!map) return undefined;
  const normalized = key?.trim();
  if (!normalized) return undefined;
  return map[normalized] ?? map[normalized.replace(/^The\s+/i, "")];
}

function mapEntryMapToCards(map: Record<string, GrimoireEntry>): GrimoireCard[] {
  return Object.entries(map).map(([name, v]) => ({
    name,
    meaning: [v.subtitle, v.description].filter(Boolean).join(" — "),
  }));
}

/**
 * GRIMOIRE_DATA: category-based reference dictionary for the Grimoire tab.
 * UI-friendly (arrays of cards) while ESOTERIC_DATA remains key-based for lookups.
 */
export const GRIMOIRE_DATA: GrimoireData = {
  "Zodiac Signs": mapEntryMapToCards(ESOTERIC_DATA.zodiac),
  "Numerology": mapEntryMapToCards(ESOTERIC_DATA.numerology),
  "Tarot Archetypes": mapEntryMapToCards(ESOTERIC_DATA.tarot),
  "Planetary Rulers": mapEntryMapToCards(ESOTERIC_DATA.planetaryRuler),
  "Moon Phases": mapEntryMapToCards(ESOTERIC_DATA.moonPhase),
  "Elements": [
    {
      name: "Fire",
      meaning:
        getGrimoireEntry("chineseElement", "Fire")?.description ??
        "Fire — passion, transformation, the spark that consumes and reveals.",
    },
    {
      name: "Water",
      meaning:
        getGrimoireEntry("chineseElement", "Water")?.description ??
        "Water — emotion, intuition, flow, and the depth beneath the surface.",
    },
    {
      name: "Air",
      meaning:
        "Air — thought, breath, communication, and the invisible currents that move everything.",
    },
    {
      name: "Earth",
      meaning:
        getGrimoireEntry("chineseElement", "Earth")?.description ??
        "Earth — stability, grounding, the body, and the slow work of becoming.",
    },
    {
      name: "Metal",
      meaning:
        getGrimoireEntry("chineseElement", "Metal")?.description ??
        "Metal — clarity, precision, boundaries, and the blade that cuts truth from noise.",
    },
    {
      name: "Wood",
      meaning:
        getGrimoireEntry("chineseElement", "Wood")?.description ??
        "Wood — growth, expansion, roots and branches, the patient push toward light.",
    },
  ],
  "Celtic Trees": mapEntryMapToCards(ESOTERIC_DATA.celticTree),
  // Extra reference layer for the Soulprint Signature color swatch.
  "Power Colors": [
    {
      name: "Red",
      meaning:
        "Red — blood memory, courage, ignition. It teaches action and sacred anger.",
    },
    {
      name: "Orange",
      meaning:
        "Orange — creation, appetite, pleasure. It teaches momentum and embodied joy.",
    },
    {
      name: "Yellow",
      meaning:
        "Yellow — clarity, confidence, solar will. It teaches truth without apology.",
    },
    {
      name: "Green",
      meaning:
        "Green — heart medicine, renewal, growth. It teaches repair and trust.",
    },
    {
      name: "Blue",
      meaning:
        "Blue — voice, calm, honesty. It teaches clean communication.",
    },
    {
      name: "Indigo",
      meaning:
        "Indigo — intuition, pattern-seeing, inner sight. It teaches discernment.",
    },
    {
      name: "Purple",
      meaning:
        "Purple — mysticism, power, ritual. It teaches transmutation.",
    },
    {
      name: "Violet",
      meaning:
        "Violet — crown fire, spiritual refinement. It teaches devotion.",
    },
    {
      name: "Pink",
      meaning:
        "Pink — softness with teeth, self-love, tenderness. It teaches boundaries through care.",
    },
    {
      name: "Teal",
      meaning:
        "Teal — healing, balance, emotional intelligence. It teaches steady restoration.",
    },
    {
      name: "Cyan",
      meaning:
        "Cyan — freshness, openness, clean starts. It teaches release.",
    },
    {
      name: "Emerald",
      meaning:
        "Emerald — sovereignty of the heart, deep renewal. It teaches rooted love.",
    },
  ],
  "Chinese Zodiac": mapEntryMapToCards(ESOTERIC_DATA.chineseZodiac),
};
