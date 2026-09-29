import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facula, lesmateriaal en toetsen voor docenten en scholen",
  description:
    "Facula maakt complete lessen, toetsen en rapportteksten die aansluiten op je eigen leerdoel. Voor losse docenten en voor scholen, met data in de EU en zonder leerlingaccounts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="nl"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
