import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";

/**
 * Voorbeeldschermen met verzonnen gegevens, ALLEEN in ontwikkeling.
 *
 * Waarom dit bestaat: de schermen achter het inloggen zijn niet te
 * fotograferen zonder in te loggen, en inloggen op deze branch zou betekenen
 * dat er een account en gegevens op de echte database komen. Dat mag niet, en
 * het hoeft ook niet: de schermen zijn componenten die hun gegevens als props
 * krijgen, dus ze zijn hier met verzonnen gegevens te tonen. Wat je op een
 * schermafbeelding uit deze map ziet, is hetzelfde component dat een docent
 * straks ziet; alleen de inhoud is bedacht.
 *
 * De afscherming staat hier en niet in een middleware-regel, zodat hij niet
 * per ongeluk weggeconfigureerd kan worden: in een productiebuild bestaat dit
 * pad simpelweg niet.
 *
 * Wat hier NIET gebeurt: er wordt geen sessie nagebootst en geen schrijfactie
 * gedaan. De knoppen op deze schermen doen niets zinvols (hun aanroepen falen
 * zonder sessie), en dat is precies genoeg voor een schermafbeelding.
 */
export default function VoorbeeldLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <AppShell email="voorbeeld@sintjan.nl" heeftSchool isBeheerder>
      <div className="mb-8 rounded-xl border-2 border-waarschuwing-tekst bg-waarschuwing-vlak px-5 py-4">
        <p className="text-base font-semibold text-waarschuwing-tekst">
          Voorbeeldscherm met verzonnen gegevens. Alleen zichtbaar tijdens
          ontwikkelen, niet in productie.
        </p>
      </div>
      {children}
    </AppShell>
  );
}
