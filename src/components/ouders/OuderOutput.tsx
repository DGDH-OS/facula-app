"use client";
import { downloadOudersWord } from "@/lib/ouders/export";
import { privacyOuders } from "@/lib/ouders/privacy";
export function OuderOutput({
  titel,
  onderwerp,
  tekst,
  privacy,
  kopieer,
  mailto,
}: {
  titel: string;
  onderwerp?: string;
  tekst: string;
  privacy: ReturnType<typeof privacyOuders>;
  kopieer: (tekst: string) => void;
  mailto?: string;
}) {
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
        {privacy.blokkeer && (
          <p role="alert" className="mt-4 text-base text-fout">
            Blokkade: {privacy.redenen.join(" en ")}.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={privacy.blokkeer}
            onClick={() => kopieer(onderwerp || tekst)}
            className="min-h-11 rounded-lg bg-marine px-4 py-2 text-base font-semibold text-op-donker"
          >
            Kopieer
          </button>
          <button
            type="button"
            disabled={privacy.blokkeer}
            onClick={() => void downloadOudersWord(titel, tekst)}
            className="min-h-11 rounded-lg bg-marine px-4 py-2 text-base font-semibold text-op-donker"
          >
            Download als Word
          </button>
          {mailto && (
            <a
              className="flex min-h-11 items-center rounded-lg border-2 border-marine"
              aria-label="Open in mailprogramma"
              href={privacy.blokkeer ? undefined : mailto}
            >
              Open in mailprogramma
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
