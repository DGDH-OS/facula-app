import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExportDataButton, DeleteAccountSection } from "@/components/ui/AccountActions";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-[var(--color-marine)]">Account</h1>

      <section className="mt-8 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
        <h2 className="font-display text-lg text-[var(--color-marine)]">Je gegevens</h2>
        <p className="mt-2 text-sm text-[var(--color-inkt)]/70">{user?.email}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
        <h2 className="font-display text-lg text-[var(--color-marine)]">Je gegevens downloaden</h2>
        <p className="mt-2 text-sm text-[var(--color-inkt)]/70">
          Download al je lessen, toetsen, rapportteksten, versiegeschiedenis
          en gebruiksgegevens als één JSON-bestand.
        </p>
        <div className="mt-4">
          <ExportDataButton />
        </div>
      </section>

      <section className="mt-6">
        <DeleteAccountSection />
      </section>
    </div>
  );
}
