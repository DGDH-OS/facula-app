import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { haalLidmaatschap } from "@/lib/school";

/**
 * Server-side auth-guard: leest de sessie uit cookies via de Supabase
 * server-client. Zonder geldige sessie -> direct redirect naar /login,
 * vóórdat er client-side JS draait (vervangt de oude localStorage-check die
 * triviaal te omzeilen was).
 *
 * Het lidmaatschap komt hier ook vandaan en gaat mee naar de navigatiebalk: of
 * er een "Sectie"- en "School"-knop hoort te staan, hangt af van waar deze
 * docent bij hoort. Dat is een serverlezing en geen clientkeuze, want anders
 * zou een docent zonder school die knoppen kunnen laten verschijnen (ze doen
 * dan niets, maar het is verwarrend en het suggereert toegang).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const lidmaatschap = await haalLidmaatschap(supabase, user.id);

  return (
    <AppShell
      email={user.email ?? ""}
      heeftSchool={lidmaatschap !== null}
      isBeheerder={lidmaatschap?.rol === "beheerder"}
    >
      {children}
    </AppShell>
  );
}
