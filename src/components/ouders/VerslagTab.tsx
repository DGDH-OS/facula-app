"use client";
import { useEffect, useRef } from "react";
import {
  maakVerslag,
  verslagNaarMail,
  type VerslagInput,
} from "@/lib/ouders/verslag";
import { privacyOuders } from "@/lib/ouders/privacy";
import { Veld, buttonClass, focusRingClass, inputClass } from "./Veld";
import { OuderOutput } from "./OuderOutput";

export function VerslagTab({
  state,
  setState,
  onMailSamenvatting,
}: {
  state: VerslagInput;
  setState: (state: VerslagInput) => void;
  onMailSamenvatting: (samenvatting: {
    observatie: string;
    actie: string;
  }) => void;
}) {
  const output = maakVerslag(state);
  const focusIndexRef = useRef<number | null>(null);
  const eersteVeldRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (focusIndexRef.current === null) return;
    eersteVeldRefs.current[focusIndexRef.current]?.focus();
    focusIndexRef.current = null;
  });

  function updateAfspraak(
    index: number,
    veld: "wie" | "wat" | "wanneer",
    waarde: string,
  ) {
    const afspraken = state.afspraken.map((item, i) =>
      i === index ? { ...item, [veld]: waarde } : item,
    );
    setState({ ...state, afspraken });
  }

  function voegAfspraakToe() {
    focusIndexRef.current = state.afspraken.length;
    setState({
      ...state,
      afspraken: [...state.afspraken, { wie: "", wat: "", wanneer: "" }],
    });
  }

  function verwijderAfspraak(index: number) {
    setState({
      ...state,
      afspraken: state.afspraken.filter((_, i) => i !== index),
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div>
        <Veld
          label="Datum"
          value={state.datum}
          onChange={(value) => setState({ ...state, datum: value })}
        />
        <Veld
          label="Aanwezigen"
          value={state.aanwezigen}
          onChange={(value) => setState({ ...state, aanwezigen: value })}
        />
        <Veld
          label="Besproken"
          value={state.besproken}
          onChange={(value) => setState({ ...state, besproken: value })}
          multiline
        />
        <fieldset className="mt-4 space-y-4">
          <legend className="text-base font-semibold text-marine">
            Afspraken
          </legend>
          {state.afspraken.map((afspraak, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border-2 border-lijn p-3"
            >
              <label className="block text-base font-semibold text-marine">
                {`Wie (afspraak ${index + 1})`}
                <input
                  ref={(el) => {
                    eersteVeldRefs.current[index] = el;
                  }}
                  className={inputClass}
                  value={afspraak.wie}
                  onChange={(event) =>
                    updateAfspraak(index, "wie", event.target.value)
                  }
                />
              </label>
              <label className="block text-base font-semibold text-marine">
                {`Wat (afspraak ${index + 1})`}
                <input
                  className={inputClass}
                  value={afspraak.wat}
                  onChange={(event) =>
                    updateAfspraak(index, "wat", event.target.value)
                  }
                />
              </label>
              <label className="block text-base font-semibold text-marine">
                {`Wanneer (afspraak ${index + 1})`}
                <input
                  className={inputClass}
                  value={afspraak.wanneer}
                  onChange={(event) =>
                    updateAfspraak(index, "wanneer", event.target.value)
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => verwijderAfspraak(index)}
                className={`min-h-11 rounded-lg border-2 border-marine px-4 ${focusRingClass}`}
              >
                Verwijder
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={voegAfspraakToe}
            className={`min-h-11 rounded-lg border-2 border-marine px-4 ${focusRingClass}`}
          >
            Afspraak toevoegen
          </button>
        </fieldset>
        <Veld
          label="Vervolg"
          value={state.vervolg}
          onChange={(value) => setState({ ...state, vervolg: value })}
          multiline
        />
        <button
          type="button"
          onClick={() => onMailSamenvatting(verslagNaarMail(state))}
          className={`mt-4 ${buttonClass}`}
        >
          Mail samenvatting naar ouders
        </button>
      </div>
      <OuderOutput
        titel="Verslag"
        tekst={output}
        privacy={privacyOuders(output)}
      />
    </section>
  );
}
