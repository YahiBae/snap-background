import { AuthUser } from "@/lib/auth";

const QUOTA_KEY = "snapcut_usage_v1";
const API_USAGE_KEY = "snapcut_api_usage_v1";

export type UsageStats = {
  day: string;
  usedToday: number;
  dailyLimit: number;
  totalProcessed: number;
  averageSeconds: number;
};

type UsageEntry = {
  day: string;
  count: number;
  durationsMs: number[];
};

type UserUsageStore = Record<string, UsageEntry[]>;

type ApiUsageEvent = {
  id: string;
  keyId: string;
  endpoint: string;
  status: number;
  createdAt: string;
};

const planLimit = (email: string) => (email.endsWith("@snapcut.pro") ? 500 : 5);

const getDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const getStore = () => readJson<UserUsageStore>(QUOTA_KEY, {});

const setStore = (store: UserUsageStore) => {
  writeJson(QUOTA_KEY, store);
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

export const getUsageStats = (user: AuthUser): UsageStats => {
  const email = user.email.toLowerCase();
  const day = getDayKey();
  const dailyLimit = planLimit(email);
  const records = getStore()[email] ?? [];
  const today = records.find((entry) => entry.day === day);

  const totalProcessed = records.reduce((acc, entry) => acc + entry.count, 0);
  const allDurations = records.flatMap((entry) => entry.durationsMs);

  return {
    day,
    usedToday: today?.count ?? 0,
    dailyLimit,
    totalProcessed,
    averageSeconds: allDurations.length > 0 ? sum(allDurations) / allDurations.length / 1000 : 0,
  };
};

export const canProcessImages = (user: AuthUser, count = 1) => {
  const stats = getUsageStats(user);
  return stats.usedToday + count <= stats.dailyLimit;
};

export const recordImageProcessed = (user: AuthUser, durationMs: number) => {
  const email = user.email.toLowerCase();
  const day = getDayKey();
  const store = getStore();
  const current = [...(store[email] ?? [])];

  const todayIndex = current.findIndex((entry) => entry.day === day);
  if (todayIndex >= 0) {
    const prev = current[todayIndex];
    current[todayIndex] = {
      ...prev,
      count: prev.count + 1,
      durationsMs: [...prev.durationsMs, Math.max(0, Math.round(durationMs))].slice(-200),
    };
  } else {
    current.push({ day, count: 1, durationsMs: [Math.max(0, Math.round(durationMs))] });
  }

  store[email] = current.slice(-60);
  setStore(store);
};

export const recordApiUsage = (event: Omit<ApiUsageEvent, "id" | "createdAt">) => {
  const events = readJson<ApiUsageEvent[]>(API_USAGE_KEY, []);
  events.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  });
  writeJson(API_USAGE_KEY, events.slice(0, 300));
};

export const getApiUsageByKey = () => {
  const events = readJson<ApiUsageEvent[]>(API_USAGE_KEY, []);
  const totals: Record<string, number> = {};

  events.forEach((entry) => {
    totals[entry.keyId] = (totals[entry.keyId] ?? 0) + 1;
  });

  return totals;
};

export const getRecentApiUsage = (limit = 30) => readJson<ApiUsageEvent[]>(API_USAGE_KEY, []).slice(0, limit);
