"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { ErrorNotice, SuccessNotice } from "@/components/ui/Notice";

/**
 * Het aanvraagformulier voor een schoollicentie of pilot.
 *
 * Twee verplichte velden meer dan we zouden willen (school, naam, e-mail),
 * omdat we zonder die drie niet terug kunnen bellen. Al het andere is
 * optioneel, inclusief het aantal docenten: wie dat nog niet weet moet door
 * kunnen. Dat is precies het verschil tussen een formulier dat een teamleider
 * tussen twee lessen invult en een formulier dat hij morgen wel doet.
 *
 * Er wordt geen mail verstuurd. De aanvraag komt in facula.school_aanvragen en
 * wordt daar opgepakt; het scherm zegt dat ook, zodat niemand op een
 * bevestigingsmail zit te wachten die niet komt.
 */

const MAX_BERICHT = 2000;

type Velden = {
  schoolnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  aantalDocenten: string;
  bericht: string;
};

const LEEG: Velden = {
  schoolnaam: "",
  contactpersoon: "",
  email: "",
  telefoon: "",
  aantalDocenten: "",
  bericht: "",
};

type FoutVeld = "schoolnaam" | "contactpersoon" | "email" | "aantalDocenten";

export function SchoolAanvraagFormulier() {
  const [velden, setVelden] = useState<Velden>(LEEG);
  const [fouten, setFouten] = useState<Partial<Record<FoutVeld, string>>>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [verstuurd, setVerstuurd] = useState(false);
  // Houdt een tweede klik tegen: state komt pas ná de renderronde terug.
  const loopt = useRef(false);

  const schoolRef = useRef<HTMLInputElement>(null);
  const naamRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const aantalRef = useRef<HTMLInputElement>(null);

  function zet<K extends keyof Velden>(veld: K, waarde: string) {
    setVelden((huidig) => ({ ...huidig, [veld]: waarde }));
  }

  /**
   * Dezelfde grenzen als de route en de migratie, met Nederlandse zinnen die
   * zeggen wat er moet gebeuren. De server blijft beslissen; dit scheelt de
   * bezoeker een ronde.
   */
  function valideer(): Partial<Record<FoutVeld, string>> {
    const nieuw: Partial<Record<FoutVeld, string>> = {};
    if (velden.schoolnaam.trim().length < 2) {
      nieuw.schoolnaam = "Vul de naam van je school in.";
    }
    if (velden.contactpersoon.trim().length < 2) {
      nieuw.contactpersoon = "Vul je naam in.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(velden.email.trim())) {
      nieuw.email = "Vul een e-mailadres in waarop we je kunnen bereiken.";
    }
    const aantal = velden.aantalDocenten.trim();
    if (aantal) {
      const getal = Number(aantal);
      if (!Number.isInteger(getal) || getal < 1 || getal > 5000) {
        nieuw.aantalDocenten = "Vul een aantal tussen 1 en 5000 in, of laat het leeg.";
      }
    }
    return nieuw;
  }

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    const nieuw = valideer();
    setFouten(nieuw);

    const eersteFout = (
      ["schoolnaam", "contactpersoon", "email", "aantalDocenten"] as FoutVeld[]
    ).find((veld) => nieuw[veld]);
    if (eersteFout) {
      const doelen: Record<FoutVeld, HTMLInputElement | null> = {
        schoolnaam: schoolRef.current,
        contactpersoon: naamRef.current,
        email: emailRef.current,
        aantalDocenten: aantalRef.current,
      };
      doelen[eersteFout]?.focus();
      return;
    }

    if (loopt.current) return;
    loopt.current = true;
    setBezig(true);
    setFout(null);

    try {
      const response = await fetch("/api/school-aanvragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolnaam: velden.schoolnaam.trim(),
          contactpersoon: velden.contactpersoon.trim(),
          email: velden.email.trim(),
          telefoon: velden.telefoon.trim(),
          aantalDocenten: velden.aantalDocenten.trim(),
          bericht: velden.bericht.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Versturen lukte niet.");
      }

      setVerstuurd(true);
      setVelden(LEEG);
    } catch (err) {
      console.error("Schoolaanvraag versturen mislukt", err);
      setFout(
        err instanceof Error
          ? err.message
          : "Versturen lukte niet. Probeer het later opnieuw."
      );
    } finally {
      loopt.current = false;
      setBezig(false);
    }
  }

  if (verstuurd) {
    return (
      <SuccessNotice
        melding="Je aanvraag staat bij ons. We nemen binnen twee werkdagen contact op met een voorstel voor een pilot. Er komt geen automatische bevestigingsmail."
        actie={
          <Button variant="secondary" onClick={() => setVerstuurd(false)}>
            Nog een aanvraag doen
          </Button>
        }
      />
    );
  }

  return (
    <form
      onSubmit={verstuur}
      className="space-y-6 rounded-2xl border-2 border-lijn bg-ivoor p-6 sm:p-8"
    >
      <Field label="Naam van je school" verplicht fout={fouten.schoolnaam}>
        {(ids) => (
          <input
            {...ids}
            ref={schoolRef}
            type="text"
            autoComplete="organization"
            maxLength={200}
            value={velden.schoolnaam}
            onChange={(e) => zet("schoolnaam", e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <Field label="Je naam" verplicht fout={fouten.contactpersoon}>
        {(ids) => (
          <input
            {...ids}
            ref={naamRef}
            type="text"
            autoComplete="name"
            maxLength={120}
            value={velden.contactpersoon}
            onChange={(e) => zet("contactpersoon", e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <Field
        label="E-mailadres"
        verplicht
        hulptekst="Hier sturen we het voorstel naartoe."
        fout={fouten.email}
      >
        {(ids) => (
          <input
            {...ids}
            ref={emailRef}
            type="email"
            autoComplete="email"
            maxLength={200}
            value={velden.email}
            onChange={(e) => zet("email", e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <Field label="Telefoonnummer" hulptekst="Mag je leeg laten.">
        {(ids) => (
          <input
            {...ids}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={velden.telefoon}
            onChange={(e) => zet("telefoon", e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <Field
        label="Voor hoeveel docenten ongeveer?"
        hulptekst="Weet je het nog niet? Laat het leeg."
        fout={fouten.aantalDocenten}
      >
        {(ids) => (
          <input
            {...ids}
            ref={aantalRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={velden.aantalDocenten}
            onChange={(e) => zet("aantalDocenten", e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <Field
        label="Waar wil je het over hebben?"
        hulptekst="Bijvoorbeeld welke sectie wil beginnen, of welke vragen jullie ICT-afdeling heeft."
      >
        {(ids) => (
          <textarea
            {...ids}
            rows={5}
            maxLength={MAX_BERICHT}
            value={velden.bericht}
            onChange={(e) => zet("bericht", e.target.value)}
            className={VELD_KLASSEN + " leading-relaxed"}
          />
        )}
      </Field>

      {fout && <ErrorNotice melding={fout} />}

      <Button type="submit" variant="primary" volleBreedte disabled={bezig}>
        {bezig ? "Bezig met versturen..." : "Schoollicentie aanvragen"}
      </Button>

      <p className="text-base text-tekst-zacht">
        We gebruiken deze gegevens alleen om contact met je op te nemen over
        Facula. Geen nieuwsbrief, geen doorverkoop.
      </p>
    </form>
  );
}
