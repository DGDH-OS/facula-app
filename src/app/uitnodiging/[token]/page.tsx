import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UitnodigingAccepteren } from "@/components/school/UitnodigingAccepteren";
import { ButtonLink } from "@/components/ui/Button";

/**
 * De pagina achter een uitnodigingslink.
 *
 * Het token staat in de URL en gaat niet verder dan deze pagina en de route die
 * hem accepteert. Bewust geen `robots`-zorg nodig: de pagina is alleen te
 * bereiken met het token zelf, en er staat niets op dat zonder token iets
 * verraadt.
 *
 * Wie niet ingelogd is, gaat eerst naar inloggen en komt daarna hier terug. Dat
 * is een bewuste omweg: lid worden hoort te gebeuren onder het account dat de
 * docent ook gebruikt, en niet onder wie er toevallig nog ingelogd was.
 *
 * Accepteren gebeurt met een knop en niet automatisch bij het openen van de
 * pagina. Een mailprogramma of virusscanner die links vooraf opent, zou de
 * uitnodiging anders opgebruiken voordat de docent hem gezien heeft.
 */
export default async function UitnodigingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?volgende=" + encodeURIComponent("/uitnodiging/" + token));
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl text-marine">
            Uitnodiging van je school
          </h1>
          <p className="mt-4 max-w-[62ch] text-lg text-tekst">
            Je bent uitgenodigd om met je school in Facula te werken. Je bent
            ingelogd als <strong>{user.email}</strong>. Klopt dat, dan kun je de
            uitnodiging hieronder accepteren.
          </p>

          <div className="mt-10">
            <UitnodigingAccepteren token={token} />
          </div>

          <div className="mt-12 border-t-2 border-lijn pt-8">
            <h2 className="font-display text-xl text-marine">
              Wil je met een ander account?
            </h2>
            <p className="mt-2 max-w-[62ch] text-base text-tekst">
              Log dan eerst uit en open deze link opnieuw. Je hoort bij de school
              met het account waarmee je accepteert.
            </p>
            <div className="mt-4">
              <ButtonLink href="/app/account" variant="secondary">
                Naar je account
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
