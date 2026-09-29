"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";

/**
 * Waar de docent na het inloggen heen gaat.
 *
 * Standaard het startscherm. Kwam hij via een uitnodigingslink, dan staat dat
 * pad in `?volgende=` en gaat hij daar weer naartoe: anders moet hij de link uit
 * zijn mail opnieuw opzoeken.
 *
 * Alleen een pad binnen deze app wordt overgenomen: het moet met één schuine
 * streep beginnen en er mag geen tweede op volgen. Dat sluit `//kwaadwillend.nl`
 * uit, wat een browser als een andere site leest en waarmee een inlogpagina een
 * doorstuurluik naar buiten wordt. Een absolute URL met schema valt af op
 * dezelfde regel.
 */
function volgendePad(): string {
  if (typeof window === "undefined") return "/app";
  const gevraagd = new URLSearchParams(window.location.search).get("volgende");
  if (!gevraagd) return "/app";
  if (!gevraagd.startsWith("/") || gevraagd.startsWith("//")) return "/app";
  return gevraagd;
}

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

    router.push(volgendePad());
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivoor px-6 py-16">
      <div className="w-full max-w-md">
        {/*
          Het logo is ook een link naar de homepage en moet daarom zelf het
          doelformaat van 44px halen; als losse tekstregel was het 34px hoog.
        */}
        <Link href="/" className="inline-flex min-h-14 items-center font-display text-2xl text-marine">
          Facula
        </Link>
        <h1 className="mt-8 font-display text-3xl text-marine">Welkom terug</h1>
        <p className="mt-2 text-base text-tekst-zacht">
          Log in om verder te werken aan je lessen en toetsen.
        </p>

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

          <Field label="Wachtwoord" verplicht>
            {(ids) => (
              <input
                {...ids}
                type="password"
                required
                autoComplete="current-password"
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className={VELD_KLASSEN}
              />
            )}
          </Field>

          <Button type="submit" variant="primary" volleBreedte disabled={bezig}>
            {bezig ? "Bezig met inloggen..." : "Inloggen"}
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
        </form>

        <p className="mt-8 text-base text-tekst-zacht">
          Nog geen account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-marine underline underline-offset-4"
          >
            Account aanmaken
          </Link>
        </p>
      </div>
    </main>
  );
}
