export function privacyOuders(tekst: string) {
  const redenen: string[] = [];
  if (
    /\b(adhd|add|dyslexie|dyscalculie|autisme|diagnose|medicatie|depressie)\b/i.test(
      tekst,
    )
  )
    redenen.push("medische of diagnose-termen");
  if (
    /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+31|0)\s*\d(?:[\s-]*\d){8,})/i.test(
      tekst,
    )
  )
    redenen.push("e-mailadres of telefoonnummer");
  return {
    blokkeer: redenen.length > 0,
    redenen,
    waarschuwing: /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+\b/.test(
      tekst,
    ),
  };
}
