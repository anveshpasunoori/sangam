import type { Lang } from "./types";

/** Navigation labels only in this build; content translation comes with the AI gateway (step 12). */
const T = {
  en: { home: "Home", reels: "Reels", create: "Create", comm: "Communities", profile: "Profile", foryou: "For You", friends: "Friends", following: "Following", civic: "Sangam Civic", search: "Search", messages: "Messages", notifications: "Notifications" },
  hi: { home: "होम", reels: "रील्स", create: "बनाएँ", comm: "समुदाय", profile: "प्रोफ़ाइल", foryou: "आपके लिए", friends: "दोस्त", following: "फ़ॉलोइंग", civic: "संगम सिविक", search: "खोजें", messages: "संदेश", notifications: "सूचनाएँ" },
  te: { home: "హోమ్", reels: "రీల్స్", create: "సృష్టించు", comm: "సమూహాలు", profile: "ప్రొఫైల్", foryou: "మీ కోసం", friends: "స్నేహితులు", following: "ఫాలోయింగ్", civic: "సంగం సివిక్", search: "వెతకండి", messages: "సందేశాలు", notifications: "ప్రకటనలు" },
} as const;

export type TKey = keyof (typeof T)["en"];

export const translate = (lang: Lang, k: TKey) => T[lang][k] ?? T.en[k];

export const LANGS: [Lang, string][] = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["te", "తెలుగు"],
];
