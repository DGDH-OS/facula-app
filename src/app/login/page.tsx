"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });

    if (error) {
      setFout(
        error.message === "Invalid login credentials"
          ? "E-mailadres of wachtwoord onjuist."
          : error.message
      );
      setBezig(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-ivoor)] px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl text-[var(--color-marine)]">
          Facula
        </Link>
        <h1 className="mt-8 font-display text-3xl text-[var(--color-marine)]">
          Welkom terug
        </h1>
        <p className="mt-2 text-sm text-[var(--color-inkt)]/70">
          Log in om verder te werken aan je lessen en toetsen.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              E-mailadres
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-marine)]"
              placeholder="jij@school.nl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Wachtwoord
            </label>
            <input
              type="password"
              required
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-marine)]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={bezig}
            className="w-full rounded-full bg-[var(--color-marine)] px-6 py-3 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:opacity-60"
          >
            {bezig ? "Bezig…" : "Inloggen"}
          </button>

          {fout && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fout}</p>
          )}
        </form>

        <p className="mt-8 text-sm text-[var(--color-inkt)]/70">
          Nog geen account?{" "}
          <Link href="/signup" className="font-medium text-[var(--color-marine)] underline underline-offset-4">
            Account aanmaken
          </Link>
        </p>
      </div>
    </main>
  );
}
