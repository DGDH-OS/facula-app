"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { wisAlleConcepten } from "@/lib/useDraft";
import { CoachFloating } from "@/components/coach/CoachPanel";

/**
 * Client-side navigatie/uitloggen-shell. De AUTH-GUARD zelf zit in
 * layout.tsx (server-side sessie-check) — dit component toont alleen de
 * al-geverifieerde gebruiker en regelt de uitlog-actie.
 *
 * Navigatie is bewust kort (brief 4): "Mijn werk" wijst naar de lijst op
 * het startscherm, want een eigen overzichtspagina bestaat nog niet.
 * Uitloggen is visueel secundair en staat rechts (brief 10.10), zonder
 * bevestigingsmodal.
 *
 * "Huisstijl" is de vierde bestemming en rekt de oorspronkelijke grens van
 * drie op. Dat is een bewuste keuze: het is een instelscherm dat een docent
 * eenmalig gebruikt maar wel moet kunnen vinden, en wegstoppen onder Account
 * zou het onvindbaar maken voor precies de docent die het nodig heeft. De
 * balk breekt netjes af op smalle schermen (flex-wrap), dus een vierde item
 * kost geen leesbaarheid.
 *
 * De balk plakt alleen mee op een scherm dat er ruimte voor heeft: de
 * klasse `app-balk` in globals.css zet `position: sticky` pas vanaf 48rem
 * breed én 32rem hoog. Op 320px of bij 400% zoom staat de balk gewoon
 * boven de pagina, en kan hij dus nooit een element met focus afdekken
 * (WCAG 2.4.11). `scroll-padding-top` hoort bij dezelfde media query.
 */

/**
 * `actiefOp` is het pad waarop dit item "page" is, en de match is exact.
 * "Mijn werk" heeft er geen: het is een anker op /app, en anders zouden
 * Start en Mijn werk allebei tegelijk aria-current="page" dragen.
 *
 * De balk houdt maximaal vijf bestemmingen. Daarom valt "Mijn werk" weg zodra
 * er een school is: het is een anker naar een lijst die op het startscherm al
 * in beeld staat, en "Sectie" is dan de bestemming die een docent echt nodig
 * heeft. "School" komt er alleen bij voor een beheerder, want alleen die kan
 * er iets doen.
 */
function navItems(heeftSchool: boolean, isBeheerder: boolean) {
  const items: { href: string; label: string; actiefOp?: string }[] = [
    { href: "/app", label: "Start", actiefOp: "/app" },
    { href: "/app/assistent", label: "Assistent", actiefOp: "/app/assistent" },
  ];

  if (heeftSchool) {
    items.push({ href: "/app/sectie", label: "Sectie", actiefOp: "/app/sectie" });
  } else {
    items.push({ href: "/app#werk", label: "Mijn werk" });
  }

  items.push({ href: "/app/periodes", label: "Periodes", actiefOp: "/app/periodes" });
  items.push({ href: "/app/huisstijl", label: "Huisstijl", actiefOp: "/app/huisstijl" });
  items.push({ href: "/app/coach", label: "Coach", actiefOp: "/app/coach" });
  items.push({ href: "/app/nakijken", label: "Nakijken", actiefOp: "/app/nakijken" });
  items.push({ href: "/app/toetsweek", label: "Toetsweek", actiefOp: "/app/toetsweek" });
  items.push({ href: "/app/ouders", label: "Ouders", actiefOp: "/app/ouders" });

  if (isBeheerder) {
    items.push({ href: "/app/school", label: "School", actiefOp: "/app/school" });
  }

  items.push({ href: "/app/account", label: "Account", actiefOp: "/app/account" });
  return items;
}

export function AppShell({
  email,
  heeftSchool = false,
  isBeheerder = false,
  children,
}: {
  email: string;
  heeftSchool?: boolean;
  isBeheerder?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    // Eerst de concepten, dan pas uitloggen: na signOut is de user-id weg
    // en blijft het halve werk van deze docent achter op deze computer.
    wisAlleConcepten();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-ivoor">
      <header className="app-balk z-20 border-b border-lijn bg-ivoor-deep">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:gap-x-6 sm:gap-y-3 sm:px-6 sm:py-3">
          {/* min-h-12 en min-w-12: een klikvlak van minstens 48x48px, ook
              als de merknaam ooit korter wordt (WCAG 2.5.8). */}
          <Link
            href="/"
            className="flex min-h-12 min-w-12 items-center font-display text-xl text-marine"
          >
            Facula
          </Link>
          <nav
            aria-label="Hoofdnavigatie"
            className="order-3 flex w-full flex-nowrap items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-wrap sm:gap-2"
          >
            {navItems(heeftSchool, isBeheerder).map(({ href, label, actiefOp }) => {
              const actief = actiefOp !== undefined && pathname === actiefOp;
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={actief ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200 sm:min-h-12 sm:px-4 sm:text-base ${
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
              className="flex min-h-11 items-center rounded-lg px-3 text-sm text-tekst underline underline-offset-4 transition-colors duration-200 hover:bg-neutraal-vlak hover:no-underline sm:min-h-12 sm:text-base"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
      <CoachFloating />
    </div>
  );
}
