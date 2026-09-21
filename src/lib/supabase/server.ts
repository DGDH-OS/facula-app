import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase-client voor server components/API-routes die de sessie van de
 * ingelogde gebruiker uit cookies leest. Queries via deze client respecteren
 * RLS (auth.uid() = user_id) — dit is de client die je gebruikt om te
 * verifiëren WIE de gebruiker is en om namens hen te lezen/schrijven.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll kan falen als het wordt aangeroepen vanuit een Server
            // Component (geen cookie-write-toegang). Dat is prima zolang er
            // middleware is die sessies ververst — hier niet blokerend nodig
            // omdat elke auth-actie via een API-route of Client Component
            // met eigen browser-client loopt.
          }
        },
      },
    }
  );
}

/**
 * Bevoorrechte service-role-client (server-only, NOOIT client-side
 * importeren) — omzeilt RLS volledig. Gebruik alleen voor operaties waar
 * de gebruiker al geverifieerd is via createServerSupabaseClient() en de
 * user_id vervolgens expliciet handmatig wordt meegegeven, of voor
 * systeemtaken (bv. de auto-profiel-trigger, die al database-side loopt).
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
