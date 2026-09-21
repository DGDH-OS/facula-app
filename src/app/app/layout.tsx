import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

/**
 * Server-side auth-guard: leest de sessie uit cookies via de Supabase
 * server-client. Zonder geldige sessie -> direct redirect naar /login,
 * vóórdat er client-side JS draait (vervangt de oude localStorage-check die
 * triviaal te omzeilen was).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell email={user.email ?? ""}>{children}</AppShell>;
}
