export const categories = [
  {
    id: "dance",
    name: "Naach Meri Jaan",
    sub: "Music, dance & karaoke",
    icon: "✳",
    color: "#c83962",
    ticket: "AAJ KI MEHFIL",
  },
  {
    id: "games",
    name: "Khel Khel Mein",
    sub: "Games & trivia",
    icon: "⚄",
    color: "#425a45",
    ticket: "GAME KI SHAAM",
  },
  {
    id: "food",
    name: "Daawat Hai!",
    sub: "Food & conversations",
    icon: "◒",
    color: "#b64d2c",
    ticket: "AAIYE, BAITHIYE",
  },
  {
    id: "art",
    name: "Rang Jamao",
    sub: "Art & making",
    icon: "✿",
    color: "#675093",
    ticket: "THODA RANG HO JAAYE",
  },
  {
    id: "outdoors",
    name: "Chalo Niklein",
    sub: "Outdoors & exploring",
    icon: "↗",
    color: "#486b4a",
    ticket: "CHALO, CHALEIN",
  },
  {
    id: "social",
    name: "Hello Ji!",
    sub: "New faces & easy conversations",
    icon: "☻",
    color: "#b24c69",
    ticket: "MIL BAITHTE HAIN",
  },
] as const;
export type Category = (typeof categories)[number]["id"];
export type Scene = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: Category;
  city: string;
  neighbourhood: string;
  starts_at: string;
  ends_at: string;
  price: number;
  capacity: number;
  min_age: number;
  max_age: number | null;
  food: string;
  drinks: string;
  includes: string;
  extra_costs: string;
  bring: string;
  rules: string;
  cancellation: string;
  atmosphere: string;
  language: string;
  accessibility: string;
  solo: boolean;
  alcohol_free: boolean;
  lat: number;
  lng: number;
  status: string;
  revision: number;
  host_name: string;
  confirmed_count: number;
  host_events: number;
  rating: number | null;
  review_count: number;
  sample?: boolean;
};
export type Booking = {
  id: string;
  event_id: string;
  user_id: string;
  status: "requested" | "awaiting_payment" | "confirmed" | "checked_in" | "cancelled" | "declined";
  created_at: string;
  guest_name: string;
  checkin_code: string | null;
};
export type Review = {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  guest_name: string;
  host_reply: string | null;
};
export const categoryFor = (id: string) => categories.find((c) => c.id === id) ?? categories[5];
export function inr(value: number) {
  return value === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
}
export const when = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
function future(day: number, hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + day);
  d.setUTCHours(hour - 5, 30, 0, 0);
  return d.toISOString();
}
export const sampleScenes: Scene[] = [
  [
    "a",
    "Bollywood, but make it karaoke.",
    "dance",
    "Cyber Hub",
    699,
    24,
    19,
    "Riya",
    "High energy",
    28.495,
    77.089,
    "A host-led singalong for people who know every chorus. Expect friendly introductions, team songs and a very enthusiastic finale.",
  ],
  [
    "b",
    "Your move. New friends.",
    "games",
    "Sector 29",
    499,
    16,
    8,
    "Kabir",
    "Playful",
    28.468,
    77.062,
    "Discover a new board game with a welcoming table. The host explains the rules and helps everyone find their first game. Beginners very welcome.",
  ],
  [
    "c",
    "Good food. Better company.",
    "food",
    "Golf Course Road",
    899,
    12,
    6,
    "Meera",
    "Conversational",
    28.449,
    77.103,
    "A relaxed supper-club concept with shared dishes and conversation prompts. Come curious, hungry and ready to meet someone new.",
  ],
  [
    "d",
    "A little colour outside the lines.",
    "art",
    "DLF Phase 4",
    799,
    14,
    7,
    "Aarav",
    "Relaxed",
    28.462,
    77.084,
    "An easy afternoon of painting and conversation. Follow a guided exercise, then make something of your own. All skill levels welcome.",
  ],
  [
    "e",
    "A Sunday worth stepping out for.",
    "outdoors",
    "Aravalli Biodiversity Park",
    0,
    20,
    11,
    "Sana",
    "Relaxed",
    28.481,
    77.115,
    "An easy daytime walking-social concept. Meet at a public starting point, walk at a conversational pace and take a break together.",
  ],
  [
    "f",
    "New in town? Hello ji.",
    "social",
    "Sushant Lok",
    399,
    18,
    9,
    "Dev",
    "Conversational",
    28.458,
    77.075,
    "A small hosted social for people finding their feet in the city. Light introductions and conversation games help everyone join in.",
  ],
].map((r, i) => ({
  id: `sample-${r[0]}`,
  host_id: `sample-host-${i}`,
  title: r[1] as string,
  category: r[2] as Category,
  neighbourhood: r[3] as string,
  price: r[4] as number,
  capacity: r[5] as number,
  confirmed_count: r[6] as number,
  host_name: r[7] as string,
  atmosphere: r[8] as string,
  lat: r[9] as number,
  lng: r[10] as number,
  description: r[11] as string,
  city: "Gurgaon",
  starts_at: future(i + 2, 18),
  ends_at: future(i + 2, 21),
  min_age: 18,
  max_age: null,
  food: i === 2 ? "Shared vegetarian dinner" : i === 4 ? "Not included" : "Light vegetarian snacks",
  drinks: i === 4 ? "Bring your own water" : "One soft drink and drinking water",
  includes:
    i === 3
      ? "Basic painting materials"
      : i === 1
        ? "Hosted games and equipment"
        : "Hosted introductions and activity",
  extra_costs: "Personal purchases are extra",
  bring:
    i === 4 ? "Water, comfortable shoes and sun protection" : "Yourself and a little curiosity",
  rules: "Adults 18+ only. Respect personal boundaries. Ask before taking photos.",
  cancellation:
    "Example policy: cancellation at least 48 hours before the event. Real hosts must publish their own clear terms.",
  accessibility: "Example only; check the actual venue with the host",
  language: "English & Hindi",
  solo: true,
  alcohol_free: true,
  status: "published",
  revision: 1,
  host_events: 0,
  rating: null,
  review_count: 0,
  sample: true,
}));
export function filterScenes(
  scenes: Scene[],
  f: {
    search: string;
    category: string;
    area: string;
    price: number;
    age: string;
    date: string;
    vibe: string;
    solo: boolean;
    sober: boolean;
  },
) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return scenes.filter((e) => {
    const age = Number(f.age);
    const day = new Date(e.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return (
      e.status === "published" &&
      (!f.search ||
        `${e.title} ${e.neighbourhood} ${e.description} ${e.host_name}`
          .toLowerCase()
          .includes(f.search.toLowerCase())) &&
      (!f.category || e.category === f.category) &&
      (!f.area || e.city === f.area) &&
      e.price <= f.price &&
      (!f.age || (age >= e.min_age && (!e.max_age || age <= e.max_age))) &&
      (!f.date || day === f.date) &&
      day >= today &&
      (!f.vibe || e.atmosphere === f.vibe) &&
      (!f.solo || e.solo) &&
      (!f.sober || e.alcohol_free)
    );
  });
}
