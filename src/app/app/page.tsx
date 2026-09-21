"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMockUser, type MockUser } from "@/lib/auth";
import { MOCK_LESSEN, MOCK_TOETSEN } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AppDashboard() {
  const [user, setUser] = useState<MockUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only mock store on mount
    setUser(getMockUser());
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-[var(--color-marine)]">
          Welkom{user ? `, ${user.naam}` : ""}
        </h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/app/lessons/new"
          className="group rounded-2xl bg-[var(--color-marine)] p-6 text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
        >
          <p className="font-display text-xl">Lessen maken</p>
          <p className="mt-3 text-sm text-[var(--color-ivoor)]/70">
            {MOCK_LESSEN.length} lessen
          </p>
        </Link>
        <Link
          href="/app/tests/new"
          className="group rounded-2xl border-2 border-[var(--color-marine)]/30 p-6 transition hover:border-[var(--color-marine)]"
        >
          <p className="font-display text-xl text-[var(--color-marine)]">Toetsen maken</p>
          <p className="mt-3 text-sm text-[var(--color-inkt)]/60">
            {MOCK_TOETSEN.length} toetsen
          </p>
        </Link>
        <Link
          href="/app/reports/new"
          className="group rounded-2xl border-2 border-[var(--color-goud)]/50 p-6 transition hover:border-[var(--color-goud)]"
        >
          <div className="flex items-center gap-2">
            <p className="font-display text-xl text-[var(--color-marine)]">Rapporten schrijven</p>
            <StatusBadge label="AVG" tone="warning" title="Bevat mogelijk leerlinggegevens — AVG-let-op" />
          </div>
          <p className="mt-3 text-sm text-[var(--color-inkt)]/60">Oudercommunicatie</p>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl text-[var(--color-marine)]">Recente lessen</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-lijn)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-ivoor-deep)] text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">
              <tr>
                <th className="px-5 py-3 font-medium">Titel</th>
                <th className="px-5 py-3 font-medium">Vak</th>
                <th className="px-5 py-3 font-medium">Niveau</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Bijgewerkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-lijn)]">
              {MOCK_LESSEN.map((les) => (
                <tr key={les.id} className="bg-[var(--color-ivoor)]">
                  <td className="px-5 py-3 font-medium text-[var(--color-marine)]">{les.titel}</td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/75">{les.vak}</td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/75">
                    {les.niveau} {les.leerjaar}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      label={les.status === "klaar" ? "Klaar" : "Concept"}
                      tone={les.status === "klaar" ? "success" : "warning"}
                    />
                  </td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/50">{les.bijgewerkt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-[var(--color-marine)]">Recente toetsen</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-lijn)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-ivoor-deep)] text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">
              <tr>
                <th className="px-5 py-3 font-medium">Titel</th>
                <th className="px-5 py-3 font-medium">Vak</th>
                <th className="px-5 py-3 font-medium">Niveau</th>
                <th className="px-5 py-3 font-medium">Vragen</th>
                <th className="px-5 py-3 font-medium">Bijgewerkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-lijn)]">
              {MOCK_TOETSEN.map((toets) => (
                <tr key={toets.id} className="bg-[var(--color-ivoor)]">
                  <td className="px-5 py-3 font-medium text-[var(--color-marine)]">{toets.titel}</td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/75">{toets.vak}</td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/75">
                    {toets.niveau} {toets.leerjaar}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/75">{toets.vragen}</td>
                  <td className="px-5 py-3 text-[var(--color-inkt)]/50">{toets.bijgewerkt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-[var(--color-marine)]">Rapport &amp; communicatie</h2>
          <StatusBadge label="AVG" tone="warning" title="Bevat mogelijk leerlinggegevens — AVG-let-op" />
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-inkt)]/75">Nog geen rapportteksten.</p>
            <div className="flex gap-3">
              <Link
                href="/app/reports/new"
                className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
              >
                Nieuw rapport
              </Link>
              <Link
                href="/privacy/rapport-module"
                className="rounded-full border border-[var(--color-marine)]/30 px-5 py-2.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)]/5"
              >
                Privacy-uitleg
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
