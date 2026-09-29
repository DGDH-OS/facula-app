import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExportDataButton, DeleteAccountSection } from "@/components/ui/AccountActions";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/PageHeader";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titel="Account"
        uitleg="Je inloggegevens, je huisstijl en wat je met je gegevens kunt doen."
      />

      <div className="mt-8 space-y-6">
        <Section titel="Je gegevens">
          <p className="text-base text-tekst">{user?.email}</p>
        </Section>

        <Section
          titel="Je huisstijl"
          uitleg="Kleuren, lettertype, schoolnaam en schoollogo voor je lessen, toetsen en rapportteksten."
          actie={<ButtonLink href="/app/huisstijl">Huisstijl instellen</ButtonLink>}
        />

        <Section
          titel="Je gegevens downloaden"
          uitleg="Al je lessen, toetsen, rapportteksten, versiegeschiedenis en gebruiksgegevens in een JSON-bestand."
          actie={<ExportDataButton />}
        />

        <DeleteAccountSection />
      </div>
    </div>
  );
}
