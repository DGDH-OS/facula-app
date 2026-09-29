"use client";
import { maakVerslag, type VerslagInput } from "@/lib/ouders/verslag";
import { privacyOuders } from "@/lib/ouders/privacy";
import { Veld } from "./Veld";
import { OuderOutput } from "./OuderOutput";
export function VerslagTab({
  state,
  setState,
}: {
  state: VerslagInput;
  setState: (state: VerslagInput) => void;
}) {
  const output = maakVerslag(state);
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
        <Veld
          label="Vervolg"
          value={state.vervolg}
          onChange={(value) => setState({ ...state, vervolg: value })}
          multiline
        />
      </div>
      <OuderOutput
        titel="Verslag"
        tekst={output}
        privacy={privacyOuders(output)}
        kopieer={() => undefined}
      />
    </section>
  );
}
