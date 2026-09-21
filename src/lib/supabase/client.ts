"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-client voor client components. Gebruikt alleen de publieke
 * NEXT_PUBLIC_-vars (anon key) — respecteert RLS via de sessie in cookies.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
