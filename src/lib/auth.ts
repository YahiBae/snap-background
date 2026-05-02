const USERS_KEY = "snapcut_users_v2";
const SESSION_KEY = "snapcut_session_v2";
const RESET_KEY = "snapcut_password_reset_v1";
const AUTH_EVENT = "snapcut-auth-changed";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AuthUser = {
  name: string;
  email: string;
};

type StoredUser = AuthUser & {
  salt: string;
  passwordHash: string;
  createdAt: string;
};

type SessionRecord = {
  token: string;
  user: AuthUser;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type ResetRecord = {
  email: string;
  expiresAt: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
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

const emitAuthEvent = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const AUTH_CHANGED_EVENT = AUTH_EVENT;

const getUsers = () => readJson<StoredUser[]>(USERS_KEY, []);

const passwordEncoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const randomBase64 = (size = 16) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
};

const hashPassword = async (password: string, saltBase64: string) => {
  const passwordBytes = passwordEncoder.encode(password);
  const saltBytes = fromBase64(saltBase64);
  const keyMaterial = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: 120_000,
    },
    keyMaterial,
    256
  );

  return toBase64(new Uint8Array(bits));
};

const buildSession = (user: AuthUser): SessionRecord => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  return {
    token: randomBase64(24),
    user,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

export const getCurrentSession = () => {
  const session = readJson<SessionRecord | null>(SESSION_KEY, null);
  if (!session) {
    return null;
  }

  const now = Date.now();
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || now > expiresAt) {
    logoutUser();
    return null;
  }

  const refreshed: SessionRecord = {
    ...session,
    lastSeenAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };

  writeJson(SESSION_KEY, refreshed);
  return refreshed;
};

export const getCurrentUser = () => getCurrentSession()?.user ?? null;

const validatePassword = (password: string) => {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include letters and numbers.";
  }

  return null;
};

export const registerUser = async (name: string, email: string, password: string) => {
  const trimmedName = name.trim();
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!trimmedName || !normalizedEmail || !trimmedPassword) {
    return { ok: false, message: "Please fill in all fields." };
  }

  const passwordError = validatePassword(trimmedPassword);
  if (passwordError) {
    return { ok: false, message: passwordError };
  }

  const users = getUsers();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    return { ok: false, message: "An account with that email already exists." };
  }

  const salt = randomBase64();
  const passwordHash = await hashPassword(trimmedPassword, salt);
  const newUser: StoredUser = {
    name: trimmedName,
    email: normalizedEmail,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const nextUsers = [...users, newUser];
  writeJson(USERS_KEY, nextUsers);

  const session = buildSession({ name: newUser.name, email: newUser.email });
  writeJson(SESSION_KEY, session);
  emitAuthEvent();

  return { ok: true, user: session.user };
};

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    return { ok: false, message: "Please enter your email and password." };
  }

  const users = getUsers();
  const user = users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }

  const attemptedHash = await hashPassword(trimmedPassword, user.salt);
  if (attemptedHash !== user.passwordHash) {
    return { ok: false, message: "Invalid email or password." };
  }

  const session = buildSession({ name: user.name, email: user.email });
  writeJson(SESSION_KEY, session);
  emitAuthEvent();

  return { ok: true, user: session.user };
};

export const requestPasswordReset = (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const user = getUsers().find((entry) => entry.email === normalizedEmail);

  if (!user) {
    return { ok: true, message: "If an account exists, a reset link was sent." };
  }

  const requests = readJson<Record<string, ResetRecord>>(RESET_KEY, {});
  requests[normalizedEmail] = {
    email: normalizedEmail,
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  };
  writeJson(RESET_KEY, requests);

  return { ok: true, message: "Reset requested. Use the new password form to continue." };
};

export const resetPassword = async (email: string, newPassword: string) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = newPassword.trim();
  const passwordError = validatePassword(trimmedPassword);

  if (passwordError) {
    return { ok: false, message: passwordError };
  }

  const requests = readJson<Record<string, ResetRecord>>(RESET_KEY, {});
  const resetRequest = requests[normalizedEmail];

  if (!resetRequest || Date.now() > new Date(resetRequest.expiresAt).getTime()) {
    return { ok: false, message: "Reset request expired. Request another reset." };
  }

  const users = getUsers();
  const userIndex = users.findIndex((entry) => entry.email === normalizedEmail);

  if (userIndex < 0) {
    return { ok: false, message: "Account not found." };
  }

  const salt = randomBase64();
  const passwordHash = await hashPassword(trimmedPassword, salt);
  users[userIndex] = {
    ...users[userIndex],
    salt,
    passwordHash,
  };

  writeJson(USERS_KEY, users);
  delete requests[normalizedEmail];
  writeJson(RESET_KEY, requests);

  return { ok: true };
};

export const logoutUser = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  emitAuthEvent();
};
