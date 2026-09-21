"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side navigatie/uitloggen-shell. De AUTH-GUARD zelf zit in
 * layout.tsx (server-side sessie-check) — dit component toont alleen de
 * al-geverifieerde gebruiker en regelt de uitlog-actie.
 */
export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navItem = (href: string, label: string) => {
    const actief = pathname === href || (href !== "/app" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        className={`block rounded-lg px-3 py-2 text-sm transition ${
          actief
            ? "bg-[var(--color-marine)] text-[var(--color-ivoor)]"
            : "text-[var(--color-inkt)]/75 hover:bg-[var(--color-marine)]/5"
        }`}
      >
        {label}
      </Link>
    );
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-ivoor)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6 md:block">
        <Link href="/" className="font-display text-xl text-[var(--color-marine)]">
          Facula
        </Link>
        <nav className="mt-10 space-y-1">
          {navItem("/app", "Overzicht")}
          {navItem("/app/lessons/new", "Nieuwe les")}
          {navItem("/app/tests/new", "Nieuwe toets")}
          {navItem("/app/reports/new", "Rapport & communicatie")}
        </nav>
        <div className="mt-auto" />
        <div className="mt-14 border-t border-[var(--color-lijn)] pt-6">
          <p className="mt-0.5 text-xs text-[var(--color-inkt)]/50">{email}</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-xs text-[var(--color-inkt)]/60 underline underline-offset-4 hover:text-[var(--color-marine)]"
          >
            Uitloggen
          </button>
        </div>
      </aside>
      <div className="flex-1">
        {/* mobiele topbalk */}
        <div className="flex items-center justify-between border-b border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] px-4 py-3 md:hidden">
          <Link href="/" className="font-display text-lg text-[var(--color-marine)]">
            Facula
          </Link>
          <nav className="flex gap-3 text-xs">
            {navItem("/app", "Overzicht")}
            {navItem("/app/lessons/new", "Les")}
            {navItem("/app/tests/new", "Toets")}
            {navItem("/app/reports/new", "Rapport")}
          </nav>
        </div>
        <div className="px-6 py-10 md:px-10">{children}</div>
      </div>
    </div>
  );
}
