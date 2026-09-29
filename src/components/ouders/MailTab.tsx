"use client";
import { valideerInitialen } from "@/lib/nakijken/rubric";
import { maakOudermail, type MailInput } from "@/lib/ouders/mail";
import { privacyOuders } from "@/lib/ouders/privacy";
import { AANLEIDINGEN } from "@/lib/ouders/templates";
import { Veld, inputClass } from "./Veld";
import { OuderOutput } from "./OuderOutput";
export function MailTab({
  mail,
  setMail,
  kopieer,
}: {
  mail: MailInput;
  setMail: (mail: MailInput) => void;
  kopieer: (tekst: string) => void;
}) {
  const output = maakOudermail(mail);
  const mailto = [
    "mailto:?subject=",
    encodeURIComponent(output.subject),
    "&body=",
    encodeURIComponent(output.body),
  ].join("");
  const update = (key: keyof MailInput, value: string) =>
    setMail({ ...mail, [key]: value } as MailInput);
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border-2 border-lijn bg-ivoor p-5">
        <label className="block text-base font-semibold text-marine">
          Aanleiding
          <select
            className={inputClass}
            value={mail.aanleiding}
            onChange={(event) => update("aanleiding", event.target.value)}
          >
            {AANLEIDINGEN.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <Veld
          label="Aanhef"
          value={mail.aanhef}
          onChange={(value) => update("aanhef", value)}
        />
        <Veld
          label="Initialen of ‘uw kind’"
          value={mail.leerling}
          onChange={(value) => update("leerling", value)}
          placeholder="Bijvoorbeeld L.J."
        />
        {mail.leerling &&
          !valideerInitialen(mail.leerling) &&
          mail.leerling !== "uw kind" && (
            <p className="text-base text-fout">
              Gebruik alleen initialen, bijvoorbeeld L.J.
            </p>
          )}
        <Veld
          label="Vak"
          value={mail.vak}
          onChange={(value) => update("vak", value)}
        />
        <Veld
          label="Concrete observatie"
          value={mail.observatie}
          onChange={(value) => update("observatie", value)}
          multiline
        />
        <Veld
          label="Tweede observatie"
          value={mail.observatie2}
          onChange={(value) => update("observatie2", value)}
          multiline
        />
        <Veld
          label="Gewenste actie"
          value={mail.actie}
          onChange={(value) => update("actie", value)}
          multiline
        />
        <Veld
          label="Naam docent"
          value={mail.naam}
          onChange={(value) => update("naam", value)}
        />
      </div>
      <OuderOutput
        titel="Mailtekst"
        onderwerp={output.subject}
        tekst={output.body}
        privacy={privacyOuders(output.body)}
        kopieer={kopieer}
        mailto={mailto}
      />
    </section>
  );
}
