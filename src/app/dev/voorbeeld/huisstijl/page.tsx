import { HuisstijlVoorbeeld } from "@/components/huisstijl/HuisstijlVoorbeeld";
import { Button } from "@/components/ui/Button";
import { PRESETS } from "@/lib/huisstijl/themes";

/**
 * Lokale voorvertoning van het huisstijlscherm met verzonnen schoolgegevens.
 * Er wordt geen huisstijl opgehaald of opgeslagen. Zie ../layout.tsx.
 */
export default function VoorbeeldHuisstijl() {
  const kleuren = PRESETS.mihiriban;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-marine">Huisstijl</h1>
      <p className="mt-2 max-w-[70ch] text-base text-tekst">
        Stel dit een keer in. Daarna kun je bij elke les, toets en rapporttekst
        kiezen of je hem in je eigen huisstijl downloadt.
      </p>
      <p className="mt-6 flex items-start gap-2 rounded-xl bg-waarschuwing-vlak px-4 py-3 text-base font-semibold text-waarschuwing-tekst">
        <span aria-hidden>⚠</span>
        <span>
          Sint Jan College gebruikt één huisstijl voor iedereen. Je downloads
          komen in de schoolhuisstijl.
        </span>
      </p>
      <section className="mt-8">
        <h2 className="font-display text-2xl text-marine">Zo ziet het eruit</h2>
        <div className="mt-4">
          <HuisstijlVoorbeeld
            kleuren={kleuren}
            schoolnaam="Sint Jan College"
            logoUrl={null}
            toonLogo={false}
          />
        </div>
      </section>
      <section className="mt-8 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
        <h2 className="font-display text-2xl text-marine">Huisstijl van de school</h2>
        <p className="mt-2 max-w-[70ch] text-base text-tekst-zacht">
          Een beheerder bepaalt kleuren, lettertype en logo. Zo krijgt ieder
          bestand van de sectie dezelfde herkenbare uitstraling.
        </p>
        <div className="mt-5 flex flex-wrap gap-3" aria-label="Kleurstalen">
          {[kleuren.achtergrond, kleuren.accent, kleuren.tekst].map((kleur) => (
            <span
              key={kleur}
              className="h-12 w-20 rounded-lg border-2 border-lijn"
              style={{ backgroundColor: kleur }}
            />
          ))}
        </div>
      </section>
      <div className="mt-8 border-t-2 border-lijn pt-6">
        <Button variant="primary">Huisstijl opslaan</Button>
      </div>
    </div>
  );
}
