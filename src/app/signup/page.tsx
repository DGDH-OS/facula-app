"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigVereist, setBevestigVereist] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    setBevestigVereist(false);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: wachtwoord,
    });

    if (error) {
      setFout(error.message);
      setBezig(false);
      return;
    }

    // Bij e-mailconfirmatie AAN geeft signUp een user terug zonder actieve
    // sessie totdat de link in de mail bevestigd is. Bij bevestiging UIT
    // (of al bevestigd) is er direct een sessie en kan meteen door naar /app.
    if (data.session) {
      router.push("/app");
      router.refresh();
      return;
    }

    setBevestigVereist(true);
    setBezig(false);
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

        {bevestigVereist ? (
          <div className="mt-8 rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700">
            Check je inbox — we hebben een bevestigingslink gestuurd naar{" "}
            <strong>{email}</strong>. Klik erop om je account te activeren en
            in te loggen.
          </div>
        ) : (
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
                minLength={6}
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-marine)]"
                placeholder="Kies een wachtwoord (min. 6 tekens)"
              />
            </div>
            <button
              type="submit"
              disabled={bezig}
              className="w-full rounded-full bg-[var(--color-marine)] px-6 py-3 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:opacity-60"
            >
              {bezig ? "Bezig…" : "Account aanmaken"}
            </button>

            {fout && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fout}</p>
            )}
          </form>
        )}

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
