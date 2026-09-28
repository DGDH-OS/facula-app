import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * `primary` / `secondary` / `ghost` zijn de drie varianten voor ivoor
 * achtergronden. `omgekeerd` is dezelfde hoofdknop, maar voor de donkere
 * marine secties: daar zou een marine knop wegvallen in de achtergrond.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "omgekeerd";

const BASIS =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition-colors duration-200 disabled:cursor-wait disabled:opacity-70";

const VARIANTEN: Record<ButtonVariant, string> = {
  primary: "bg-marine text-op-donker hover:bg-marine-deep",
  secondary:
    "border-2 border-marine bg-ivoor text-marine hover:bg-marine hover:text-op-donker",
  ghost:
    "border-2 border-transparent text-marine underline underline-offset-4 hover:border-lijn hover:no-underline",
  omgekeerd:
    "border-2 border-ivoor bg-ivoor text-marine hover:bg-op-donker-zacht",
};

export function knopKlassen(variant: ButtonVariant, extra = ""): string {
  return `${BASIS} ${VARIANTEN[variant]} ${extra}`.trim();
}

/**
 * Eén knop-patroon voor de hele app. Minimaal 56px hoog (min-h-14),
 * label als werkwoord + object, en per scherm precies één `primary`.
 *
 * `type` staat standaard op "button", niet op de HTML-default "submit":
 * een knop die per ongeluk een formulier verstuurt is hier de duurste
 * fout (halve invoer weg). Verstuurknoppen zetten `type="submit"` zelf.
 */
export function Button({
  variant = "secondary",
  className = "",
  volleBreedte = false,
  type = "button",
  children,
  ...rest
}: Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  volleBreedte?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      type={type}
      className={knopKlassen(variant, `${volleBreedte ? "w-full" : ""} ${className}`)}
    >
      {children}
    </button>
  );
}

/** Zelfde vorm als Button, maar navigeert. Voor "Terug", tegel-CTA's, etc. */
export function ButtonLink({
  variant = "secondary",
  className = "",
  volleBreedte = false,
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  volleBreedte?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      {...rest}
      className={knopKlassen(variant, `${volleBreedte ? "w-full" : ""} ${className}`)}
    >
      {children}
    </Link>
  );
}
