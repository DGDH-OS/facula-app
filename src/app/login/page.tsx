"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setMockUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mihiriban@voorbeeldschool.nl");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    // Mock-auth: geen echte backend, alleen lokale state.
    const naam = email.split("@")[0];
    setMockUser({
      naam: naam.charAt(0).toUpperCase() + naam.slice(1),
      email,
    });
    router.push("/app");
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
            Inloggen
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--color-inkt)]/50">
          Demo-omgeving: elk e-mailadres en wachtwoord werkt. Er wordt niets
          extern opgeslagen of geverifieerd.
        </p>

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
