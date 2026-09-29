"use client";
import { useState } from "react";
import { downloadOudersWord } from "@/lib/ouders/export";
import { privacyOuders } from "@/lib/ouders/privacy";
import { buttonClass, buttonSecondaryClass } from "./Veld";

type KopieerStatus = { label: "onderwerp" | "tekst"; ok: boolean } | null;

export function OuderOutput({
  titel,
  onderwerp,
  tekst,
  privacy,
  mailto,
}: {
  titel: string;
  onderwerp?: string;
  tekst: string;
  privacy: ReturnType<typeof privacyOuders>;
  mailto?: string;
}) {
  const [status, setStatus] = useState<KopieerStatus>(null);

  async function kopieer(waarde: string, label: "onderwerp" | "tekst") {
    try {
      await navigator.clipboard.writeText(waarde);
      setStatus({ label, ok: true });
    } catch {
      setStatus({ label, ok: false });
    }
  }

  const statusTekst = status
    ? status.ok
      ? "Gekopieerd"
      : "Kopiëren lukte niet, selecteer de tekst zelf"
    : "";

  return (
    <section className="space-y-4">
      <div className="rounded-xl border-2 border-lijn bg-ivoor p-5">
        <h2 className="font-display text-2xl text-marine">{titel}</h2>
        {onderwerp && (
          <p className="mt-3 text-base">
            <strong>Onderwerp:</strong> {onderwerp}
          </p>
        )}
        <pre className="mt-4 whitespace-pre-wrap font-sans text-base leading-7 text-tekst">
          {tekst}
        </pre>
        <p aria-live="polite" className="mt-4 text-base text-fout">
          {privacy.blokkeer ? `Blokkade: ${privacy.redenen.join(" en ")}.` : ""}
        </p>
        {privacy.waarschuwing && (
          <p className="mt-2 text-base text-tekst-zacht">
            Staat hier een volledige naam? Gebruik liever initialen of &apos;uw
            kind&apos;.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {onderwerp && (
            <button
              type="button"
              disabled={privacy.blokkeer}
              onClick={() => void kopieer(onderwerp, "onderwerp")}
              className={buttonClass}
            >
              Kopieer onderwerp
            </button>
          )}
          <button
            type="button"
            disabled={privacy.blokkeer}
            onClick={() => void kopieer(tekst, "tekst")}
            className={buttonClass}
          >
            Kopieer tekst
          </button>
          <button
            type="button"
            disabled={privacy.blokkeer}
            onClick={() => void downloadOudersWord(titel, tekst)}
            className={buttonClass}
          >
            Download als Word
          </button>
          {mailto &&
            (privacy.blokkeer ? (
              <span aria-disabled="true" className={buttonSecondaryClass}>
                Open in mailprogramma
              </span>
            ) : (
              <a
                className={buttonSecondaryClass}
                aria-label="Open in mailprogramma"
                href={mailto}
              >
                Open in mailprogramma
              </a>
            ))}
          <span aria-live="polite" className="text-base text-tekst-zacht">
            {statusTekst}
          </span>
        </div>
      </div>
    </section>
  );
}
