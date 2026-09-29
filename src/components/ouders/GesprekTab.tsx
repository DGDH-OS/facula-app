"use client";
import { useState } from "react";
import { maakGespreksplanning, type GesprekInput } from "@/lib/ouders/gesprek";
import { privacyOuders } from "@/lib/ouders/privacy";
import { Veld, focusRingClass } from "./Veld";
import { OuderOutput } from "./OuderOutput";

const MAX_STERK = 3;
const MAX_AANDACHT = 2;

function beperkRegels(
  waarde: string,
  max: number,
): { regels: string[]; afgekapt: boolean } {
  const regels = waarde.split("\n");
  if (regels.length <= max) return { regels, afgekapt: false };
  return { regels: regels.slice(0, max), afgekapt: true };
}

export function GesprekTab({
  state,
  setState,
}: {
  state: GesprekInput;
  setState: (state: GesprekInput) => void;
}) {
  const [sterkAfgekapt, setSterkAfgekapt] = useState(false);
  const [aandachtAfgekapt, setAandachtAfgekapt] = useState(false);
  const output = maakGespreksplanning(state);
  const privacy = privacyOuders(output.tekst);

  function updateSterk(waarde: string) {
    const { regels, afgekapt } = beperkRegels(waarde, MAX_STERK);
    setSterkAfgekapt(afgekapt);
    setState({ ...state, sterk: regels });
  }

  function updateAandacht(waarde: string) {
    const { regels, afgekapt } = beperkRegels(waarde, MAX_AANDACHT);
    setAandachtAfgekapt(afgekapt);
    setState({ ...state, aandacht: regels });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
      <div className="print:hidden">
        <Veld
          label="Doel gesprek"
          value={state.doel}
          onChange={(value) => setState({ ...state, doel: value })}
          multiline
        />
        <Veld
          label="Sterke punten"
          value={state.sterk.join("\n")}
          onChange={updateSterk}
          multiline
        />
        {sterkAfgekapt && (
          <p className="text-base text-tekst-zacht">
            Alleen de eerste {MAX_STERK} regels worden gebruikt.
          </p>
        )}
        <Veld
          label="Aandachtspunten"
          value={state.aandacht.join("\n")}
          onChange={updateAandacht}
          multiline
        />
        {aandachtAfgekapt && (
          <p className="text-base text-tekst-zacht">
            Alleen de eerste {MAX_AANDACHT} regels worden gebruikt.
          </p>
        )}
        <Veld
          label="Vraag aan ouder"
          value={state.vraag}
          onChange={(value) => setState({ ...state, vraag: value })}
        />
        <Veld
          label="Voorstel afspraak"
          value={state.afspraak}
          onChange={(value) => setState({ ...state, afspraak: value })}
        />
        <fieldset className="mt-4">
          <legend className="text-base font-semibold text-marine">
            Duur van het gesprek
          </legend>
          <div className="mt-2 flex gap-4">
            {([10, 20] as const).map((minuten) => (
              <label
                key={minuten}
                className="flex min-h-11 items-center gap-2 text-base"
              >
                <input
                  type="radio"
                  name="minuten"
                  className="h-5 w-5"
                  checked={state.minuten === minuten}
                  onChange={() => setState({ ...state, minuten })}
                />
                {minuten} minuten
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          disabled={privacy.blokkeer}
          onClick={() => {
            if (!privacy.blokkeer) window.print();
          }}
          className={[
            "mt-4 min-h-11 rounded-lg border-2 border-marine px-4",
            "disabled:cursor-not-allowed disabled:opacity-50",
            focusRingClass,
          ].join(" ")}
        >
          Print
        </button>
      </div>
      <OuderOutput
        titel="Gespreksplanning"
        tekst={output.tekst}
        privacy={privacy}
      />
    </section>
  );
}
