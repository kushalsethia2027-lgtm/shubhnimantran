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
    period?: string;
    language?: string;
    openOnly?: boolean;
    minRating?: number;
    sort?: string;
    time?: string;
  },
) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayMs = Date.parse(today + "T00:00:00Z");
  const todayDow = new Date(todayMs).getUTCDay();
  const saturday =
    todayDow === 0 ? todayMs - 86400000 : todayMs + ((6 - todayDow + 7) % 7) * 86400000;
  const filtered = scenes.filter((e) => {
    const age = Number(f.age);
    const day = new Date(e.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const dayMs = Date.parse(day + "T00:00:00Z");
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kolkata",
      }).format(new Date(e.starts_at)),
    );
    return (
      (!f.openOnly || (e.confirmed_count < e.capacity && new Date(e.starts_at) > new Date())) &&
      (!f.language || e.language.toLowerCase().includes(f.language.toLowerCase())) &&
      (!f.minRating || (e.rating !== null && e.rating >= f.minRating)) &&
      (!f.period ||
        (f.period === "today"
          ? day === today
          : f.period === "weekend"
            ? dayMs >= saturday && dayMs <= saturday + 86400000
            : dayMs - todayMs < 7 * 86400000)) &&
      (!f.time || (f.time === "day" ? hour >= 6 && hour < 18 : hour >= 18 || hour < 6)) &&
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
  return filtered.sort((a, b) =>
    f.sort === "price"
      ? a.price - b.price
      : f.sort === "popular"
        ? b.confirmed_count - a.confirmed_count
        : f.sort === "rating"
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
