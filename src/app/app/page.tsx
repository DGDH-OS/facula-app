"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMockUser, type MockUser } from "@/lib/auth";
import { MOCK_LESSEN, MOCK_TOETSEN } from "@/lib/mock-data";

export default function AppDashboard() {
  const [user, setUser] = useState<MockUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only mock store on mount
    setUser(getMockUser());
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-marine)]">
            Welkom{user ? `, ${user.naam}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-inkt)]/70">
            Je overzicht van lessen en toetsen.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/app/lessons/new"
            className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
          >
            + Nieuwe les
          </Link>
          <Link
            href="/app/tests/new"
            className="rounded-full border border-[var(--color-marine)]/30 px-5 py-2.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)]/5"
          >
            + Nieuwe toets
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">Lessen</p>
          <p className="mt-2 font-display text-3xl text-[var(--color-marine)]">{MOCK_LESSEN.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">Toetsen</p>
          <p className="mt-2 font-display text-3xl text-[var(--color-marine)]">{MOCK_TOETSEN.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">Abonnement</p>
          <p className="mt-2 font-display text-lg text-[var(--color-marine)]">Actief — proefperiode</p>
        </div>
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
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        les.status === "klaar"
                          ? "bg-[var(--color-groen)]/10 text-[var(--color-groen)]"
                          : "bg-[var(--color-goud)]/15 text-[var(--color-goud)]"
                      }`}
                    >
                      {les.status === "klaar" ? "Klaar" : "Concept"}
                    </span>
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
    </div>
  );
}
