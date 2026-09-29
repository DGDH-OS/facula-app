import { SchoolBeheerWeergave } from "@/components/school/SchoolBeheerWeergave";
import {
  VOORBEELD_LEDEN,
  VOORBEELD_LIDMAATSCHAP,
  VOORBEELD_SECTIES,
  VOORBEELD_UITNODIGINGEN,
} from "@/lib/dev/voorbeeldgegevens";

/** Het beheerpaneel met verzonnen gegevens. Zie ../layout.tsx. */
export default function VoorbeeldSchool() {
  const totaal = VOORBEELD_LEDEN.reduce(
    (som, lid) => ({
      lessen: som.lessen + lid.lessen,
      toetsen: som.toetsen + lid.toetsen,
      rapporten: som.rapporten + lid.rapporten,
    }),
    { lessen: 0, toetsen: 0, rapporten: 0 }
  );

  return (
    <SchoolBeheerWeergave
      mijnUserId="u-1"
      schoolNaam={VOORBEELD_LIDMAATSCHAP.schoolNaam}
      plan={VOORBEELD_LIDMAATSCHAP.plan}
      pilotTot={VOORBEELD_LIDMAATSCHAP.pilotTot}
      seatLimit={VOORBEELD_LIDMAATSCHAP.seatLimit}
      actieveLeden={VOORBEELD_LEDEN.length}
      plekkenVrij={VOORBEELD_LIDMAATSCHAP.seatLimit - VOORBEELD_LEDEN.length}
      totaal={totaal}
      poolLimiet={null}
      leden={VOORBEELD_LEDEN}
      secties={VOORBEELD_SECTIES}
      uitnodigingen={VOORBEELD_UITNODIGINGEN}
      huisstijl={{
        preset: "eigen",
        accent: "#8F3A16",
        tekst: "#2C2119",
        achtergrond: "#FBF1E8",
        lettertype: "serif",
        afdwingen: true,
        heeftLogo: false,
      }}
    />
  );
}
