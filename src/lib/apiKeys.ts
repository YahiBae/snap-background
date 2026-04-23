import { AuthUser } from "@/lib/auth";

const API_KEYS_STORE = "snapcut_api_keys_v1";

export type ApiKeyRecord = {
  id: string;
  ownerEmail: string;
  label: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ApiKeysStore = Record<string, ApiKeyRecord[]>;

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

const getStore = () => readJson<ApiKeysStore>(API_KEYS_STORE, {});
const setStore = (store: ApiKeysStore) => writeJson(API_KEYS_STORE, store);

const randomToken = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const listApiKeys = (user: AuthUser) => {
  const email = user.email.toLowerCase();
  return (getStore()[email] ?? []).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const createApiKey = (user: AuthUser, label: string) => {
  const email = user.email.toLowerCase();
  const normalizedLabel = label.trim() || "Default key";
  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    ownerEmail: email,
    label: normalizedLabel,
    key: `sk_live_${randomToken()}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };

  const store = getStore();
  store[email] = [record, ...(store[email] ?? [])].slice(0, 20);
  setStore(store);

  return record;
};

export const revokeApiKey = (user: AuthUser, keyId: string) => {
  const email = user.email.toLowerCase();
  const store = getStore();
  const records = [...(store[email] ?? [])];
  const index = records.findIndex((item) => item.id === keyId);

  if (index < 0) {
    return false;
  }

  records[index] = {
    ...records[index],
    revokedAt: new Date().toISOString(),
  };
  store[email] = records;
  setStore(store);
  return true;
};

export const touchApiKey = (ownerEmail: string, apiKey: string) => {
  const email = ownerEmail.toLowerCase();
  const store = getStore();
  const records = [...(store[email] ?? [])];

  const index = records.findIndex((item) => item.key === apiKey && !item.revokedAt);
  if (index < 0) {
    return null;
  }

  records[index] = {
    ...records[index],
    lastUsedAt: new Date().toISOString(),
  };
  store[email] = records;
  setStore(store);
  return records[index];
};
