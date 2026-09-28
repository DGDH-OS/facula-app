"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";

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
    <main className="flex min-h-screen items-center justify-center bg-ivoor px-6 py-16">
      <div className="w-full max-w-md">
        {/* Zie /login: het logo is een link en moet zelf 44px hoog zijn. */}
        <Link href="/" className="inline-flex min-h-14 items-center font-display text-2xl text-marine">
          Facula
        </Link>
        <h1 className="mt-8 font-display text-3xl text-marine">Begin met Facula</h1>
        <p className="mt-2 text-base text-tekst-zacht">
          Maak een gratis account en genereer je eerste les binnen enkele
          minuten. Geen betaalgegevens nodig.
        </p>

        {bevestigVereist ? (
          <div
            aria-live="polite"
            className="mt-8 rounded-lg border-2 border-succes-tekst bg-succes-vlak px-4 py-4 text-base text-succes-tekst"
          >
            Check je inbox: we hebben een bevestigingslink gestuurd naar{" "}
            <strong>{email}</strong>. Klik erop om je account te activeren en
            in te loggen.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Field label="E-mailadres" verplicht>
              {(ids) => (
                <input
                  {...ids}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={VELD_KLASSEN}
                />
              )}
            </Field>

            <Field label="Wachtwoord" hulptekst="Minimaal 6 tekens." verplicht>
              {(ids) => (
                <input
                  {...ids}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  className={VELD_KLASSEN}
                />
              )}
            </Field>

            <Button type="submit" variant="primary" volleBreedte disabled={bezig}>
              {bezig ? "Bezig met aanmaken..." : "Account aanmaken"}
            </Button>

            {fout && (
              <p
                aria-live="polite"
                className="flex gap-2 rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
              >
                <span aria-hidden>✕</span>
                <span>{fout}</span>
              </p>
            )}

            <p className="text-base text-tekst-zacht">
              Door een account aan te maken ga je akkoord met de{" "}
              <Link href="/voorwaarden" className="font-semibold text-marine underline underline-offset-4">
                voorwaarden
              </Link>{" "}
              en de{" "}
              <Link href="/privacy" className="font-semibold text-marine underline underline-offset-4">
                privacyverklaring
              </Link>
              .
            </p>
          </form>
        )}

        <p className="mt-8 text-base text-tekst-zacht">
          Al een account?{" "}
          <Link href="/login" className="font-semibold text-marine underline underline-offset-4">
            Inloggen
          </Link>
        </p>
      </div>
    </main>
  );
}
