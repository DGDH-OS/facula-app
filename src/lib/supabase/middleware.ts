import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ververst de Supabase-sessie (indien nodig) op elk request en zet de
 * bijgewerkte cookies terug op de response — nodig omdat Server Components
 * cookies niet kunnen schrijven. Zonder dit verloopt een sessie stilletjes
 * na de access-token-lifetime, ook al is de refresh-token nog geldig.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Belangrijk: dit ververst het access token indien verlopen.
  await supabase.auth.getUser();

  return supabaseResponse;
}
