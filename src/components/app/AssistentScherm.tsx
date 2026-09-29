"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  voerAssistentUit,
  voerBevestigdeActieUit,
  WORKFLOWS,
  workflowById,
} from "@/lib/agent";
import type {
  AssistentActie,
  AssistentKlaar,
  WorkflowId,
} from "@/lib/agent/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader, Section } from "@/components/ui/PageHeader";

type Stap = "kies" | "formulier" | "voorstel" | "gebruikt";

function veldMeta(
  workflowId: WorkflowId,
  id: string,
  waarde: string,
): { label: string; keuze: string } {
  const workflow = workflowById(workflowId);
  const veld = workflow?.velden.find((v) => v.id === id);
  const keuze = veld?.keuzes.find((k) => k.waarde === waarde);
  return {
    label: veld?.label ?? id,
    keuze: keuze?.label ?? waarde,
  };
}

export function AssistentScherm() {
  const [stap, setStap] = useState<Stap>("kies");
  const [workflowId, setWorkflowId] = useState<WorkflowId | null>(null);
  const [velden, setVelden] = useState<Record<string, string>>({});
  const [voorstel, setVoorstel] = useState<AssistentKlaar | null>(null);
  const [actie, setActie] = useState<AssistentActie | null>(null);
  const [fout, setFout] = useState("");
  const [status, setStatus] = useState("");
  const [kopie, setKopie] = useState("");

  const workflow = workflowById(workflowId);

  function opnieuw() {
    setStap("kies");
    setWorkflowId(null);
    setVelden({});
    setVoorstel(null);
    setActie(null);
    setFout("");
    setKopie("");
    setStatus("Opnieuw begonnen. Er is nog niets gebeurd.");
  }

  function kiesModule(id: WorkflowId) {
    setWorkflowId(id);
    setVelden({});
    setVoorstel(null);
    setActie(null);
    setFout("");
    setKopie("");
    setStap("formulier");
    setStatus("Module gekozen. Kies de vaste opties. Nog niets gebeurd.");
  }

  function bekijkVoorstel(e: FormEvent) {
    e.preventDefault();
    if (!workflowId) return;
    const uit = voerAssistentUit(workflowId, velden);
    if (uit.soort === "klaar") {
      setVoorstel(uit);
      setActie(null);
      setFout("");
      setStap("voorstel");
      setStatus("Voorstel klaar om te bekijken. Er is nog niets gebeurd.");
      return;
    }
    setFout(uit.melding);
    setStatus(uit.melding);
  }

  function gebruikVoorstel() {
    if (!voorstel) return;
    const uit = voerBevestigdeActieUit(voorstel, true);
    if (uit.soort !== "actie") {
      setFout(uit.melding);
      setStatus(uit.melding);
      return;
    }
    setActie(uit);
    setStap("gebruikt");
    setStatus(
      "Voorstel in gebruik. Je kunt de checklist kopiëren of de module openen.",
    );
  }

  async function kopieerChecklist() {
    if (!actie) return;
    const tekst = actie.checklist.map((regel) => `- ${regel}`).join("\n");
    try {
      await navigator.clipboard.writeText(tekst);
      setKopie("Checklist gekopieerd.");
      setStatus("Checklist gekopieerd.");
    } catch {
      setKopie("Kopiëren lukte niet. Selecteer de tekst zelf.");
      setStatus("Kopiëren lukte niet. Selecteer de tekst zelf.");
    }
  }

  return (
    <div>
      <PageHeader
        titel="Assistent"
        uitleg={
          "Kies een bestaande module. Daarna alleen vaste keuzes, " +
          "geen vrije tekst. Je kunt hier geen namen, e-mailadressen " +
          "of leerlingteksten invullen. Geen chatbot en geen beoordelaar."
        }
      />

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {WORKFLOWS.map((w) => {
          const actief = workflowId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              aria-pressed={actief}
              onClick={() => kiesModule(w.id)}
              className={
                "min-h-14 rounded-2xl border-2 px-4 py-3 text-left " +
                "transition-colors duration-200 " +
                "focus-visible:outline-none focus-visible:ring-2 " +
                "focus-visible:ring-marine " +
                (actief
                  ? "border-marine bg-ivoor-deep"
                  : "border-lijn bg-ivoor hover:border-marine")
              }
            >
              <span className="block font-display text-lg text-marine">
                {w.titel}
                {actief && (
                  <span className="ml-2 font-sans text-base" aria-hidden>
                    ✓
                  </span>
                )}
              </span>
              <span className="mt-1 block text-base text-tekst-zacht">
                {w.korteUitleg}
              </span>
            </button>
          );
        })}
      </div>

      {stap === "formulier" && workflow && (
        <div className="mt-8">
          <FormCard onSubmit={bekijkVoorstel}>
            <h2 className="font-display text-xl text-marine">
              {workflow.titel}
            </h2>
            <p className="text-base text-tekst-zacht">
              {workflow.velden.length
                ? "Kies de vaste opties. Daarna bekijk je het voorstel."
                : "Geen extra keuzes. Bekijk het voorstel; er gebeurt nog niets."}
            </p>
            {workflow.privacyWaarschuwing && (
              <p className="rounded-xl border-2 border-lijn bg-ivoor-deep p-4 text-base text-tekst">
                {workflow.privacyWaarschuwing}
              </p>
            )}

            {workflow.velden.map((veld) => (
              <ChoiceCards
                key={veld.id}
                legend={veld.label}
                hulptekst={veld.hulp}
                keuzes={[...veld.keuzes]}
                waarde={velden[veld.id] ?? ""}
                onChange={(waarde) =>
                  setVelden((huidig) => ({ ...huidig, [veld.id]: waarde }))
                }
                kolommen={veld.id === "leerjaar" ? 3 : 2}
              />
            ))}

            {fout && (
              <p className="text-base text-fout" role="alert">
                {fout}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Bekijk voorstel</Button>
              <Button type="button" variant="ghost" onClick={opnieuw}>
                Opnieuw
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {stap === "voorstel" && voorstel && (
        <div className="mt-8">
          <Section
            titel="Voorstel"
            uitleg="Controleer dit voorstel. Er is nog niets gebeurd."
          >
            <dl className="space-y-2 text-base text-tekst">
              <div>
                <dt className="font-semibold text-marine">Module</dt>
                <dd>{voorstel.titel}</dd>
              </div>
              {Object.entries(voorstel.ingevuldeVelden).map(([id, waarde]) => {
                const meta = veldMeta(voorstel.workflowId, id, waarde);
                return (
                  <div key={id}>
                    <dt className="font-semibold text-marine">{meta.label}</dt>
                    <dd>{meta.keuze}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-base text-tekst">{voorstel.samenvatting}</p>
            <ol className="list-decimal space-y-2 pl-5 text-base text-tekst">
              {voorstel.checklist.map((regel) => (
                <li key={regel}>{regel}</li>
              ))}
            </ol>
            {voorstel.waarschuwingen.map((w) => (
              <p key={w} className="text-base text-tekst-zacht">
                {w}
              </p>
            ))}
            <p className="rounded-xl border-2 border-lijn bg-ivoor-deep p-4 text-base text-tekst">
              Er is nog niets gebeurd.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={gebruikVoorstel}>
                Gebruik voorstel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStap("formulier");
                  setActie(null);
                  setStatus("Terug naar de keuzes. Er is nog niets gebeurd.");
                }}
              >
                Terug
              </Button>
              <Button type="button" variant="ghost" onClick={opnieuw}>
                Opnieuw
              </Button>
            </div>
          </Section>
        </div>
      )}

      {stap === "gebruikt" && actie && (
        <div className="mt-8">
          <Section
            titel="Voorstel in gebruik"
            uitleg="Lokale, omkeerbare stap. Niets is verstuurd of opgeslagen."
          >
            <ol className="list-decimal space-y-2 pl-5 text-base text-tekst">
              {actie.checklist.map((regel) => (
                <li key={regel}>{regel}</li>
              ))}
            </ol>
            {kopie && (
              <p className="text-base text-tekst" role="status">
                {kopie}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void kopieerChecklist()}>
                Kopieer checklist
              </Button>
              <ButtonLink href={actie.href}>{actie.label}</ButtonLink>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStap("voorstel");
                  setActie(null);
                  setKopie("");
                  setStatus("Terug naar het voorstel. Niets is verstuurd.");
                }}
              >
                Terug
              </Button>
              <Button type="button" variant="ghost" onClick={opnieuw}>
                Opnieuw
              </Button>
            </div>
          </Section>
        </div>
      )}

      <p className="mt-8 text-base text-tekst-zacht">
        Wat dit scherm niet doet, staat op{" "}
        <Link
          href="/ai"
          className="font-semibold text-marine underline underline-offset-4"
        >
          AI in Facula
        </Link>
        .
      </p>
    </div>
  );
}
