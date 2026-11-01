import type { Rng } from "./rng";

/**
 * Real artists' stage names. Generated artist names (and their parts) must never match these.
 * Not a complete list; add to it whenever a playtester spots a clash.
 */
export const REAL_ARTISTS = [
  "wizkid", "davido", "burna boy", "burna", "rema", "tems", "asake", "ayra starr", "ayra", "olamide", "tiwa savage", "yemi alade", "fireboy", "omah lay",
  "ckay", "kizz daniel", "kiss daniel", "adekunle gold", "simi", "falz", "phyno", "flavour", "p-square", "psquare", "2baba", "2face", "dbanj", "don jazzy",
  "seyi vibez", "bnxn", "buju", "ruger", "victony", "joeboy", "mr eazi", "tekno", "zlatan", "naira marley", "portable", "mayorkun", "peruzzi", "patoranking",
  "timaya", "wande coal", "iyanya", "reekado banks", "oxlade", "lojay", "ladipoe", "blaqbonez", "odumodublvck", "shallipopi", "young jonn", "young john",
  "kcee", "chike", "johnny drille", "teni", "niniola", "waje", "sinach", "mercy chinwo", "moses bliss", "cobhams", "ice prince", "jesse jagz", "vector",
  "erigga", "magnito", "small doctor", "spyro", "fave", "ayo maff", "bella shmurda", "mohbad", "zinoleesky", "lil kesh", "dremo", "ycee", "skales",
  "dj cuppy", "cuppy", "spinall", "dj neptune", "sarz", "pheelz", "kel p", "london", "tempoe", "rexxie", "fela", "femi kuti", "seun kuti", "king sunny ade",
  "ebenezer obey", "onyeka onwenu", "lagbaja", "sarkodie", "stonebwoy", "shatta wale", "black sherif", "kidi", "kuami eugene", "king promise",
  "diamond platnumz", "tyla", "uncle waffles", "kabza", "maphorisa", "nasty c", "cassper", "khaid", "boy spyce", "crayon", "magixx", "ayo jay", "harrysong",
  "olakira", "qdot", "terry g", "solidstar", "sound sultan", "black face", "styl plus", "plantashun", "mo hits", "dammy krane", "praiz", "nonso amadi",
  "fola", "llona", "kwesi arthur", "bad boy timz", "bella alubo", "qing madi", "tiwa", "ruby", "mavin", "dmw", "ybnl", "chocolate city", "spaceship",
];

/** Real song titles we want to avoid generating by accident. */
export const REAL_TITLES = ["calm down", "essence", "ye", "fall", "unavailable", "peru", "love nwantiti", "joha", "terminator", "soso", "last last", "rush", "sungba", "ku lo sa", "water", "jaiye", "coming over", "dumebi", "ojuelegba"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** True when a name is (or contains) a real artist's name. */
export function isBlocked(name: string): boolean {
  const n = norm(name);
  const words = name.toLowerCase().split(/\s+/).map(norm);
  return REAL_ARTISTS.some((r) => {
    const rn = norm(r);
    if (n === rn || words.includes(rn)) return true;
    return rn.length >= 5 && n.includes(rn);
  });
}

export const isBlockedTitle = (t: string) => REAL_TITLES.includes(t.toLowerCase());

// Invented stage-name parts from across Nigeria (Igbo, Hausa, Yoruba, Tiv, Edo, Efik, pidgin, English).
const FIRST = [
  "Zaddi", "Kelvo", "Temzy", "Ozi", "Wavy", "Mkay", "Terver", "Mnena", "Ebube", "Nnamdi", "Hauwa", "Zainab", "Ifeoma", "Kachi", "Seun", "Lade", "Osaro",
  "Efe", "Uyai", "Ekom", "Doose", "Aondo", "Nengi", "Tamuno", "Bisola", "Chidera", "Ugo", "Musa", "Yemisi", "Akpan", "Ivase", "Sewuese", "Kunle", "Ebiye",
];
const PREFIX = ["Lil", "Young", "Big", "Prince", "Queen", "Lady", "Baby", "Sir", "Saint", "Don", "Uncle"];
const SUFFIX = ["Vibez", "Gold", "Wave", "XO", "Jnr", "the Great", "Sounds", "Wonder", "Melody", "Fire", "Bliss", "Royale", "Rhymes", "Kush", "Smooth"];
const MONO = ["Kezzi", "Zinto", "Tobeez", "Ayomikun", "Raskid", "Ekene", "Okeke-Wave", "Drizzo", "Kamsi", "Zeezee", "Bolanle", "Ngozi B", "Dapo X", "Wura"];

export function artistName(r: Rng): string {
  for (let i = 0; i < 20; i++) {
    const roll = r.next();
    const name = roll < 0.3 ? `${r.pick(PREFIX)} ${r.pick(FIRST)}` : roll < 0.6 ? `${r.pick(FIRST)} ${r.pick(SUFFIX)}` : roll < 0.8 ? r.pick(MONO) : r.pick(FIRST);
    if (!isBlocked(name)) return name;
  }
  return `Artist ${r.int(100, 999)}`;
}

const T_A = ["Lagos", "Sugar", "Wahala", "Jollof", "Gidi", "Midnight", "Shakara", "Soft", "Sapa", "Enjoyment", "Owambe", "Danfo", "Island", "Mainland", "Money", "Holy", "Balance", "Lekki", "Sunshine", "Pepper", "Gbedu", "Ginger", "Tension", "Harmattan", "Rainy", "Benue", "Agbada", "Suya"];
const T_B = ["Dey Sweet", "Love", "Riddim", "Vibes", "Season", "Gang", "Baby", "Prayer", "Anthem", "Dance", "Blues", "Party", "Motion", "Groove", "Fever", "Story", "Ting", "Nights", "Prayers", "Tonight"];
const T_SOLO = ["Who Send You?", "No Wahala", "Sapa Don Finish", "Body Dey Inside Cloth", "Odogwu Energy", "Small Small", "E Choke", "Japa Song", "Mama Pray For Me", "Gbese No Be Lie", "Shine Your Eye", "Inside Life", "Ginger Me", "Better Days", "Shayo Season", "Na God", "Omo Ologo", "Ten Over Ten", "Kpakpa Dance", "Soft Life"];

export function songTitle(r: Rng): string {
  for (let i = 0; i < 10; i++) {
    const t = r.chance(0.3) ? r.pick(T_SOLO) : `${r.pick(T_A)} ${r.pick(T_B)}`;
    if (!isBlockedTitle(t)) return t;
  }
  return "Untitled Jam";
}

export const RIVAL_LABELS = ["Big Wave Records", "Eko Gold Music", "Jollof Republic", "Third Mainland Music", "Lagoon Boys Ent.", "Arewa Sounds", "Riverside Records", "Indie"];
