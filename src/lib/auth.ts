"use client";

const USER_KEY = "facula_user";

export interface MockUser {
  naam: string;
  email: string;
}

export function getMockUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

export function setMockUser(user: MockUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearMockUser() {
  window.localStorage.removeItem(USER_KEY);
}
