"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  controleerCoachPii,
  matchCoachVraag,
  zoekUrls,
} from "@/lib/coach/matcher";
import { KENNISBANK } from "@/lib/coach/kennisbank";
import {
  maakWeekplan,
  WERKDRUK_TAKEN,
  type WerkdrukTaak,
} from "@/lib/coach/werkdruk";

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  "/app/reports/new": [
    "Hoe schrijf ik een werkpunt?",
    "Hoe bereid ik een oudergesprek voor?",
    "Hoe breng ik een lastige boodschap?",
  ],
  "/app/lessons/new": [
    "Hoe bouw ik een les op?",
    "Hoe differentieer ik in drie niveaus?",
    "Wat is directe instructie?",
  ],
};
const fallback =
  "Ik vond nog geen passende tip in mijn vaste kennis. Probeer je vraag met andere woorden, of zoek verder op een officiële onderwijswebsite.";
type Bericht = {
  vraag: string;
  antwoord: string;
  entryId?: string;
  relatedIds: string[];
};

export function ZoekVerder({ vraag }: { vraag: string }) {
  return (
    <div className="mt-3 rounded-xl bg-neutraal-vlak p-3">
      <p className="text-base font-semibold text-tekst">
        Zoek verder (externe links)
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {zoekUrls(vraag).map((url) => (
          <a
            key={url}
            target="_blank"
            rel="noopener"
            href={url}
            className="min-h-11 text-base font-semibold text-marine underline"
          >
            {new URL(url).hostname} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

export function CoachBericht({
  bericht,
  onRelated,
}: {
  bericht: Bericht;
  onRelated: (vraag: string) => void;
}) {
  const entry = bericht.entryId
    ? KENNISBANK.find((item) => item.id === bericht.entryId)
    : undefined;
  const related = bericht.relatedIds
    .map((id) => KENNISBANK.find((item) => item.id === id))
    .filter(Boolean);
  return (
    <div className="space-y-2">
      <div className="ml-8 rounded-2xl rounded-br-sm bg-marine p-4 text-base text-op-donker">
        {bericht.vraag}
      </div>
      <div className="mr-4 rounded-2xl rounded-bl-sm border-2 border-lijn bg-ivoor-deep p-4 text-lg leading-8 text-tekst">
        <p>{bericht.antwoord}</p>
        {entry?.acties?.map((actie) => (
          <Link
            key={actie.href}
            href={actie.href}
            className="mt-3 block font-semibold text-marine underline"
          >
            {actie.label} →
          </Link>
        ))}
        {entry?.bronnen && (
          <div className="mt-4 border-t border-lijn pt-3 text-base leading-6">
            <p className="font-semibold">Bronnen</p>
            {entry.bronnen.map((bron) => (
              <a
                key={bron.url}
                href={bron.url}
                target="_blank"
                rel="noopener"
                className="mr-3 inline-block text-marine underline"
              >
                {bron.titel} ↗
              </a>
            ))}
          </div>
        )}
        {!entry && <ZoekVerder vraag={bericht.vraag} />}
      </div>
      {related.length > 0 && (
        <div className="ml-2">
          <p className="text-base font-semibold text-tekst-zacht">
            Misschien bedoel je ook
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {related.map(
              (item) =>
                item && (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onRelated(item.vragen[0])}
                    className="min-h-11 rounded-full border-2 border-marine px-4 text-left text-base text-marine hover:bg-marine hover:text-op-donker"
                  >
                    {item.vragen[0]}
                  </button>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WerkdrukCheck() {
  const [checked, setChecked] = useState<WerkdrukTaak[]>([]);
  const [plan, setPlan] = useState<string[]>([]);
  return (
    <div className="mt-7 border-t-2 border-lijn pt-6">
      <h2 className="font-display text-2xl text-marine">Werkdruk-check</h2>
      <p className="mt-1 text-base text-tekst-zacht">
        Welke taken staan deze week op je lijst?
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {WERKDRUK_TAKEN.map((taak) => (
          <label
            key={taak}
            className="flex min-h-11 items-center gap-3 text-base"
          >
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={checked.includes(taak)}
              onChange={() =>
                setChecked((old) =>
                  old.includes(taak)
                    ? old.filter((item) => item !== taak)
                    : [...old, taak],
                )
              }
            />
            {taak}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPlan(maakWeekplan(checked))}
        className="mt-4 min-h-12 rounded-full bg-marine px-5 text-base font-semibold text-op-donker"
      >
        Maak mijn weekplan
      </button>
      {plan.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-tekst">
          {plan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoachContent({
  onClose,
  embedded = false,
}: {
  onClose?: () => void;
  embedded?: boolean;
}) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [vraag, setVraag] = useState("");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [pii, setPii] = useState<string | null>(null);
  useEffect(() => {
    if (embedded || onClose) inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
      if (event.key !== "Tab" || !panelRef.current) return;
      const elements = [
        ...panelRef.current.querySelectorAll<HTMLElement>("button,a,input"),
      ].filter((item) => !item.hasAttribute("disabled"));
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [embedded, onClose]);
  function stelVraag(text = vraag) {
    const question = text.trim();
    if (!question) return;
    const piiResult = controleerCoachPii(question);
    if (piiResult.bevatPii) {
      setPii(
        `Deel hier geen ${piiResult.reden}. Ik bewaar je bericht niet. Gebruik alleen een algemene omschrijving.`,
      );
      setVraag("");
      return;
    }
    const result = matchCoachVraag(question);
    setBerichten((old) => [
      ...old,
      {
        vraag: question,
        antwoord: result.entry?.antwoord ?? fallback,
        entryId: result.entry?.id,
        relatedIds: result.related.map((item) => item.id),
      },
    ]);
    setVraag("");
    setPii(null);
  }
  const suggestions = PAGE_SUGGESTIONS[pathname] ?? [
    "Hoe schrijf ik een rapporttekst?",
    "Hoe maak ik een toetsmatrijs?",
    "Hoe verlaag ik mijn werkdruk?",
  ];
  return (
    <div
      ref={panelRef}
      className={
        embedded
          ? "w-full"
          : "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto border-l-2 border-lijn bg-ivoor p-5 shadow-2xl sm:p-8"
      }
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="coach-titel"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tekst-zacht">
            Docentencoach
          </p>
          <h1 id="coach-titel" className="font-display text-3xl text-marine">
            Vraag de coach
          </h1>
        </div>
        {onClose && (
          <button
            className="min-h-11 min-w-11 rounded-lg text-2xl text-marine hover:bg-neutraal-vlak"
            aria-label="Sluit coach"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-3 rounded-xl bg-neutraal-vlak p-4 text-base text-tekst">
        De coach geeft tips op basis van vaste kennis. Jij beslist.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => stelVraag(suggestion)}
            className="min-h-11 rounded-full border-2 border-marine px-4 text-left text-base text-marine hover:bg-marine hover:text-op-donker"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4" aria-live="polite">
        {berichten.map((bericht, index) => (
          <CoachBericht
            key={`${bericht.vraag}-${index}`}
            bericht={bericht}
            onRelated={stelVraag}
          />
        ))}
      </div>
      {pii && (
        <p
          role="alert"
          className="mt-4 rounded-xl border-2 border-rood bg-ivoor-deep p-4 text-base text-rood"
        >
          {pii}
        </p>
      )}
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          stelVraag();
        }}
      >
        <label className="sr-only" htmlFor="coach-vraag">
          Je vraag
        </label>
        <input
          ref={inputRef}
          id="coach-vraag"
          value={vraag}
          onChange={(event) => setVraag(event.target.value)}
          placeholder="Bijvoorbeeld: hoe maak ik een toets?"
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-lijn bg-ivoor-deep px-4 text-base text-tekst focus:border-marine focus:outline-none"
        />
        <button className="min-h-14 rounded-xl bg-marine px-5 text-base font-semibold text-op-donker hover:bg-marine-deep">
          Stuur
        </button>
      </form>
      <WerkdrukCheck />
      {berichten.length > 0 && (
        <div className="mt-7 border-t-2 border-lijn pt-6">
          <ZoekVerder vraag={berichten.at(-1)?.vraag ?? ""} />
        </div>
      )}
    </div>
  );
}

export function CoachPage() {
  return <CoachContent embedded />;
}
export function CoachFloating() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (pathname === "/app/coach") return null;
  if (
    typeof pathname === "string" &&
    pathname.startsWith("/app/assistent")
  ) {
    return null;
  }
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <>
      <button
        ref={trigger}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 min-h-14 rounded-full bg-marine px-5 text-base font-semibold text-op-donker shadow-lg hover:bg-marine-deep"
      >
        Vraag de coach
      </button>
      {open && (
        <>
          <div
            aria-label="Sluit coachpaneel"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 bg-marine/30"
            onClick={close}
          />
          <CoachContent onClose={close} />
        </>
      )}
    </>
  );
}
