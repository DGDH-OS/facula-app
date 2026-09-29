"use client";
import { maakGespreksplanning, type GesprekInput } from "@/lib/ouders/gesprek";
import { privacyOuders } from "@/lib/ouders/privacy";
import { Veld } from "./Veld";
import { OuderOutput } from "./OuderOutput";
export function GesprekTab({
  state,
  setState,
}: {
  state: GesprekInput;
  setState: (state: GesprekInput) => void;
}) {
  const output = maakGespreksplanning(state);
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div>
        <Veld
          label="Doel gesprek"
          value={state.doel}
          onChange={(value) => setState({ ...state, doel: value })}
          multiline
        />
        <Veld
          label="Sterke punten"
          value={state.sterk.join("\n")}
          onChange={(value) => setState({ ...state, sterk: value.split("\n") })}
          multiline
        />
        <Veld
          label="Aandachtspunten"
          value={state.aandacht.join("\n")}
          onChange={(value) =>
            setState({ ...state, aandacht: value.split("\n") })
          }
          multiline
        />
      </div>
      <OuderOutput
        titel="Gespreksplanning"
        tekst={output.tekst}
        privacy={privacyOuders(output.tekst)}
        kopieer={() => undefined}
      />
    </section>
  );
}
