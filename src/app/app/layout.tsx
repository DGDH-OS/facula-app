"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMockUser, clearMockUser, type MockUser } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MockUser | null | undefined>(undefined);

  useEffect(() => {
    const u = getMockUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only mock store on mount
    setUser(u);
  }, [router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-ivoor)]">
        <p className="text-sm text-[var(--color-inkt)]/50">Laden…</p>
      </div>
    );
  }
  if (!user) return null;

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
          <p className="text-sm font-medium text-[var(--color-marine)]">{user.naam}</p>
          <p className="mt-0.5 text-xs text-[var(--color-inkt)]/50">{user.email}</p>
          <button
            onClick={() => {
              clearMockUser();
              router.push("/");
            }}
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
