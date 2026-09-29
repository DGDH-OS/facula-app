import { SectieWeergave } from "@/components/school/SectieWeergave";
import {
  VOORBEELD_DEELBAAR,
  VOORBEELD_DELINGEN,
  VOORBEELD_LIDMAATSCHAP,
} from "@/lib/dev/voorbeeldgegevens";

/** De sectiebibliotheek met verzonnen gegevens. Zie ../layout.tsx. */
export default function VoorbeeldSectie() {
  return (
    <SectieWeergave
      sectieNaam={VOORBEELD_LIDMAATSCHAP.sectieNaam ?? "Maatschappijleer"}
      rol="sectievoorzitter"
      delingen={VOORBEELD_DELINGEN}
      eigenItems={VOORBEELD_DEELBAAR}
    />
  );
}
