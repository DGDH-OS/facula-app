"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { voerAssistentUit, WORKFLOWS, workflowById, type WorkflowId } from "@/lib/agent";
import type { AssistentUitkomst } from "@/lib/agent/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { FormCard } from "@/components/ui/FormCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AssistentScherm() {
  const [vraag, setVraag] = useState("");
  const [workflowId, setWorkflowId] = useState<WorkflowId | null>(null);
  const [velden, setVelden] = useState<Record<string, string>>({});
  const [uitkomst, setUitkomst] = useState<AssistentUitkomst | null>(null);

  function zetVeld(id: string, waarde: string) {
    setVelden((huidig) => ({ ...huidig, [id]: waarde }));
  }

  function startVanKaart(id: WorkflowId) {
    setWorkflowId(id);
    setVelden({});
    setUitkomst(voerAssistentUit("", {}, id));
  }

  function handleVraag(e: FormEvent) {
    e.preventDefault();
    const resultaat = voerAssistentUit(vraag);
    if (resultaat.soort === "klaar" || resultaat.soort === "vragen") {
      setWorkflowId(resultaat.workflowId);
      setVelden({});
    } else if (resultaat.soort === "kiezen") {
      setWorkflowId(null);
    }
    setUitkomst(resultaat);
  }

  function handleVelden(e: FormEvent) {
    e.preventDefault();
    if (!workflowId) return;
    setUitkomst(voerAssistentUit(vraag, velden, workflowId));
  }

  function reset() {
    setVraag("");
    setWorkflowId(null);
    setVelden({});
    setUitkomst(null);
  }

  const workflow = workflowId ? workflowById(workflowId) : null;
  const vragen = uitkomst?.soort === "vragen" ? uitkomst : null;
  const klaar = uitkomst?.soort === "klaar" ? uitkomst : null;
  const geweigerd = uitkomst?.soort === "geweigerd" ? uitkomst : null;
  const kiezen = uitkomst?.soort === "kiezen" ? uitkomst : null;

  return (
    <div>
      <PageHeader
        titel="Facula Assistent"
        uitleg="Kies wat je wilt maken. De Assistent is een routeerhulp, geen chatbot en geen beoordelaar. Hij verzint geen velden en slaat geen leerlingnamen op."
      />

      <div className="mt-4">
        <StatusBadge
          label="Jij blijft eindverantwoordelijk"
          tone="warning"
          uitleg="Elke volgende stap open je zelf in de bestaande module en lees je na."
        />
      </div>

      <p className="mt-4 max-w-[62ch] text-base text-tekst">
        Geen namen, e-mailadressen, telefoonnummers, cijfers of diagnoses in dit scherm.{" "}
        <Link href="/ai" className="font-semibold text-marine underline underline-offset-4">
          Hoe Facula met AI omgaat
        </Link>
        .
      </p>

      <h2 className="mt-10 font-display text-2xl text-marine">Kies een module</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {WORKFLOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => startVanKaart(w.id)}
            className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-left transition-colors duration-200 ${
              workflowId === w.id
                ? "border-marine bg-marine text-op-donker"
                : "border-lijn bg-ivoor-deep text-tekst hover:bg-neutraal-vlak"
            }`}
          >
            <span className="block font-display text-lg">{w.titel}</span>
            <span className={`mt-1 block text-base ${workflowId === w.id ? "text-op-donker" : "text-tekst-zacht"}`}>
              {w.korteUitleg}
            </span>
          </button>
        ))}
      </div>

      <FormCard onSubmit={handleVraag} className="mt-8">
        <Field
          label="Of typ wat je wilt maken"
          hulptekst="Bijvoorbeeld: maak een les, plan de toetsweek. Geen leerlingnamen."
        >
          {(ids) => (
            <textarea
              {...ids}
              name="vraag"
              rows={3}
              maxLength={500}
              value={vraag}
              onChange={(e) => setVraag(e.target.value)}
              className={VELD_KLASSEN}
            />
          )}
        </Field>
        <Button type="submit" variant="secondary">
          Herken verzoek
        </Button>
      </FormCard>

      {geweigerd && (
        <div className="mt-8 rounded-2xl border-2 border-lijn bg-waarschuwing-vlak p-6" role="alert">
          <p className="font-display text-xl text-waarschuwing-tekst">Niet in Facula</p>
          <p className="mt-2 text-base text-tekst">{geweigerd.melding}</p>
        </div>
      )}

      {kiezen && (
        <div className="mt-8 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
          <p className="font-display text-xl text-marine">{kiezen.melding}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {kiezen.kandidaten.map((id) => {
              const w = workflowById(id);
              return (
                <Button key={id} type="button" variant="secondary" onClick={() => startVanKaart(id)}>
                  {w.titel}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {workflow && vragen && (
        <div className="mt-8">
          <h2 className="font-display text-2xl text-marine">{workflow.titel}</h2>
          <p className="mt-2 text-base text-tekst">{vragen.melding}</p>
          {workflow.privacyWaarschuwing && (
            <p className="mt-2 text-base text-tekst">{workflow.privacyWaarschuwing}</p>
          )}
          <FormCard onSubmit={handleVelden} className="mt-4">
            {workflow.velden.map((veld) =>
              veld.soort === "keuze" ? (
                <ChoiceCards
                  key={veld.id}
                  legend={veld.label}
                  hulptekst={veld.hulp}
                  waarde={velden[veld.id] ?? ""}
                  keuzes={[...(veld.keuzes ?? [])]}
                  onChange={(waarde) => zetVeld(veld.id, waarde)}
                />
              ) : (
                <Field key={veld.id} label={veld.label} hulptekst={veld.hulp} verplicht={veld.verplicht}>
                  {(ids) =>
                    veld.soort === "getal" ? (
                      <input
                        {...ids}
                        name={veld.id}
                        type="number"
                        min={veld.min}
                        max={veld.max}
                        required={veld.verplicht}
                        value={velden[veld.id] ?? ""}
                        onChange={(e) => zetVeld(veld.id, e.target.value)}
                        className={VELD_KLASSEN}
                      />
                    ) : (
                      <textarea
                        {...ids}
                        name={veld.id}
                        rows={3}
                        maxLength={veld.maxLengte}
                        required={veld.verplicht}
                        value={velden[veld.id] ?? ""}
                        onChange={(e) => zetVeld(veld.id, e.target.value)}
                        className={VELD_KLASSEN}
                      />
                    )
                  }
                </Field>
              ),
            )}
            <Button type="submit" variant="primary">
              Maak checklist
            </Button>
          </FormCard>
        </div>
      )}

      {klaar && (
        <div className="mt-8 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
          <h2 className="font-display text-2xl text-marine">{klaar.titel}</h2>
          <p className="mt-2 text-base text-tekst">{klaar.samenvatting}</p>
          <ol className="mt-4 list-decimal space-y-2 ps-5 text-base text-tekst">
            {klaar.checklist.map((stap) => (
              <li key={stap}>{stap}</li>
            ))}
          </ol>
          <ul className="mt-4 space-y-1 text-base text-tekst-zacht">
            {klaar.waarschuwingen.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={klaar.volgendeStap.href} variant="primary">
              {klaar.volgendeStap.label}
            </ButtonLink>
            <Button type="button" variant="secondary" onClick={reset}>
              Opnieuw
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
