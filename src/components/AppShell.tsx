"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side navigatie/uitloggen-shell. De AUTH-GUARD zelf zit in
 * layout.tsx (server-side sessie-check) — dit component toont alleen de
 * al-geverifieerde gebruiker en regelt de uitlog-actie.
 *
 * Navigatie is bewust maximaal drie bestemmingen plus uitloggen (brief 4):
 * "Mijn werk" wijst naar de lijst op het startscherm, want een eigen
 * overzichtspagina bestaat nog niet. Uitloggen is visueel secundair en
 * staat rechts (brief 10.10), zonder bevestigingsmodal.
 *
 * De balk is sticky. `scroll-padding-top` in globals.css zorgt dat een
 * element dat via Tab of een anker focus krijgt niet onder deze balk
 * verdwijnt (WCAG 2.4.11).
 */
const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/app", label: "Start" },
  { href: "/app#werk", label: "Mijn werk" },
  { href: "/app/account", label: "Account" },
];

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ivoor">
      <header className="sticky top-0 z-20 border-b border-lijn bg-ivoor-deep">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-xl text-marine">
            Facula
          </Link>
          <nav aria-label="Hoofdnavigatie" className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map(({ href, label }) => {
              const doel = href.split("#")[0];
              const actief =
                pathname === doel || (doel !== "/app" && Boolean(pathname?.startsWith(doel)));
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={actief ? "page" : undefined}
                  className={`flex min-h-12 items-center rounded-lg px-4 text-base font-semibold transition-colors duration-200 ${
                    actief
                      ? "bg-marine text-op-donker"
                      : "text-tekst hover:bg-neutraal-vlak"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ms-auto flex items-center gap-4">
            <span className="hidden text-sm text-tekst-zacht sm:inline">{email}</span>
            <button
              onClick={handleLogout}
              className="flex min-h-12 items-center rounded-lg px-3 text-base text-tekst underline underline-offset-4 transition-colors duration-200 hover:bg-neutraal-vlak hover:no-underline"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
