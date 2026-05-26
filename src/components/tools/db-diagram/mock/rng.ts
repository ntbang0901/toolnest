export interface RNG {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  bool(p?: number): boolean;
}

export function createRng(seed: number): RNG {
  let state = seed >>> 0 || 1;
  function nextRaw() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  const next = () => nextRaw() / 0xffffffff;
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    bool(p = 0.5) {
      return next() < p;
    },
  };
}

export function hashSeed(s: string | number): number {
  const str = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const FIRST_NAMES = [
  "Alex", "Sam", "Jamie", "Taylor", "Jordan", "Casey", "Morgan", "Riley",
  "Avery", "Quinn", "Cameron", "Drew", "Skyler", "Reese", "Kai", "Sage",
  "Linh", "Minh", "An", "Bao", "Chi", "Dung", "Giang", "Ha", "Hoang", "Khanh",
];

export const LAST_NAMES = [
  "Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Vo", "Dang", "Bui",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
];

export const STREETS = [
  "Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Lake", "Hill", "Park", "River",
];

export const CITIES = [
  "Hanoi", "Ho Chi Minh", "Da Nang", "Hue", "Singapore", "Tokyo", "Seoul",
  "Bangkok", "Jakarta", "Manila",
];

export const COMPANIES = [
  "Acme", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Wonka", "Hooli",
];

export const DOMAINS = ["example.com", "test.dev", "demo.io", "mail.com"];

export const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
];
