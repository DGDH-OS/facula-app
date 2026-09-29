import { StartScherm } from "@/components/app/StartScherm";
import {
  VOORBEELD_LIDMAATSCHAP,
  VOORBEELD_RECENT,
  VOORBEELD_VERBRUIK,
} from "@/lib/dev/voorbeeldgegevens";

/** Het startscherm met verzonnen gegevens. Zie ../layout.tsx. */
export default function VoorbeeldStart() {
  return (
    <StartScherm
      voornaam="marieke"
      recent={VOORBEELD_RECENT}
      verbruik={VOORBEELD_VERBRUIK}
      lidmaatschap={VOORBEELD_LIDMAATSCHAP}
    />
  );
}
