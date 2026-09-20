"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setMockUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [naam, setNaam] = useState("Mihiriban Burgaz");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMockUser({ naam: naam || "Docent", email: email || "docent@school.nl" });
    router.push("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-ivoor)] px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl text-[var(--color-marine)]">
          Facula
        </Link>
        <h1 className="mt-8 font-display text-3xl text-[var(--color-marine)]">
          Begin met Facula
        </h1>
        <p className="mt-2 text-sm text-[var(--color-inkt)]/70">
          Maak een gratis account en genereer je eerste les binnen enkele
          minuten. Geen betaalgegevens nodig.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Naam
            </label>
            <input
              type="text"
              required
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-marine)]"
              placeholder="Voor- en achternaam"
            />
          </div>
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
              placeholder="Kies een wachtwoord"
            />
          </div>
          <button
            type="submit"
            disabled={bezig}
            className="w-full rounded-full bg-[var(--color-marine)] px-6 py-3 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:opacity-60"
          >
            Account aanmaken
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--color-inkt)]/50">
          Demo-omgeving: er wordt niets extern opgeslagen. Je gegevens blijven
          lokaal in je browser.
        </p>

        <p className="mt-8 text-sm text-[var(--color-inkt)]/70">
          Al een account?{" "}
          <Link href="/login" className="font-medium text-[var(--color-marine)] underline underline-offset-4">
            Inloggen
          </Link>
        </p>
      </div>
    </main>
  );
}
