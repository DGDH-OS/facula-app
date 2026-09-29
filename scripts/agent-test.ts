import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  voerAssistentUit,
  voerBevestigdeActieUit,
  weigerIndienNodig,
  WORKFLOWS,
  workflowById,
} from "../src/lib/agent";
import { maakResultaat, valideerVelden } from "../src/lib/agent/generator";
import { isPlainRecord } from "../src/lib/agent/policy";
import type { AssistentKlaar, WorkflowId } from "../src/lib/agent/types";

function alsVelden(waarde: unknown): Record<string, string> {
  return waarde as Record<string, string>;
}

const BESTAANDE_HREFS = new Set(WORKFLOWS.map((w) => w.href));

function klaar(
  gekozen: WorkflowId,
  velden: Record<string, string> = {},
) {
  const uit = voerAssistentUit(gekozen, velden);
  assert.equal(uit.soort, "klaar");
  if (uit.soort !== "klaar") throw new Error("verwacht klaar");
  assert.equal(uit.requiresConfirmation, true);
  assert.equal("href" in uit, false);
  return uit;
}

const leeg = voerAssistentUit();
assert.equal(leeg.soort, "geweigerd");
if (leeg.soort === "geweigerd") assert.equal(leeg.code, "onbekend");

const onbekendId = voerAssistentUit(
  "niet-bestaand" as unknown as WorkflowId,
);
assert.equal(onbekendId.soort, "geweigerd");
if (onbekendId.soort === "geweigerd") {
  assert.equal(onbekendId.code, "onbekend");
}
assert.equal(workflowById("niet-bestaand"), undefined);
assert.equal(workflowById(undefined), undefined);
assert.equal(workflowById(null), undefined);
assert.equal(workflowById(42), undefined);

const prototypeIds = [
  "__proto__",
  "constructor",
  "toString",
  "null",
  "undefined",
  "",
] as const;
for (const id of prototypeIds) {
  assert.equal(workflowById(id), undefined);
  const uit = voerAssistentUit(id as WorkflowId);
  assert.equal(uit.soort, "geweigerd");
  if (uit.soort === "geweigerd") assert.equal(uit.code, "onbekend");
}

const nietStringBronnen: unknown[] = [
  { vak: 42 },
  { vak: null },
  { vak: ["Geschiedenis"] },
  { vak: true },
  { vak: { waarde: "Geschiedenis" } },
];
for (const bron of nietStringBronnen) {
  const uit = voerAssistentUit("les", alsVelden(bron));
  assert.equal(uit.soort, "vragen");
  if (uit.soort === "vragen") {
    assert.ok(uit.ongeldigeVelden.some((f) => f.id === "vak"));
  }
}

const geenRecordBronnen: unknown[] = [null, ["les"], 7, false];
for (const bron of geenRecordBronnen) {
  const uit = voerAssistentUit("les", alsVelden(bron));
  assert.equal(uit.soort, "geweigerd");
  if (uit.soort === "geweigerd") {
    assert.equal(uit.code, "ongeldig-veld");
  }
}

const geldigeLesVelden = {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
};
const lesToegestaan = Object.keys(geldigeLesVelden);

function weigertVeld(uit: { soort: string; code?: string }) {
  assert.equal(uit.soort, "geweigerd");
  assert.equal(uit.code, "ongeldig-veld");
}

function erfPii(velden: Record<string, string>, proto: object) {
  return Object.assign(Object.create(proto), velden);
}

class CustomVelden {}
const erfBronnen: unknown[] = [
  erfPii(geldigeLesVelden, { naam: "Jan" }),
  erfPii(geldigeLesVelden, { __proto__: { naam: "Jan" } }),
  erfPii(geldigeLesVelden, { constructor: { naam: "Jan" } }),
  Object.assign(new CustomVelden(), geldigeLesVelden),
];
for (const bron of erfBronnen) {
  const velden = alsVelden(bron);
  weigertVeld(voerAssistentUit("les", velden));
  weigertVeld(maakResultaat("les", velden));
  const validatie = valideerVelden("les", velden);
  assert.equal(validatie.soort === "ok", false);
  if (validatie.soort === "geweigerd") {
    assert.equal(validatie.code, "ongeldig-veld");
  }
  const weiger = weigerIndienNodig(bron, lesToegestaan);
  assert.equal(weiger?.soort, "geweigerd");
}

const kaleLes = voerAssistentUit("les", { ...geldigeLesVelden });
assert.equal(kaleLes.soort, "klaar");
const nullProtoLes = Object.assign(Object.create(null), geldigeLesVelden);
assert.equal(voerAssistentUit("les", alsVelden(nullProtoLes)).soort, "klaar");
assert.equal(weigerIndienNodig(nullProtoLes, lesToegestaan), null);
assert.equal(
  valideerVelden("les", alsVelden(nullProtoLes)).soort,
  "ok",
);

const extraNaam = voerAssistentUit("les", { naam: "Jan" });
assert.equal(extraNaam.soort, "geweigerd");
if (extraNaam.soort === "geweigerd") {
  assert.equal(extraNaam.code, "ongeldig-veld");
}

const extraMail = voerAssistentUit("les", { email: "a@b.nl" });
assert.equal(extraMail.soort, "geweigerd");

const vrijTekst = voerAssistentUit("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "vrije tekst over Jan",
});
assert.equal(vrijTekst.soort, "vragen");
if (vrijTekst.soort === "vragen") {
  assert.ok(vrijTekst.ongeldigeVelden.some((f) => f.id === "leerdoel"));
}

const ontbreekt = voerAssistentUit("les");
assert.equal(ontbreekt.soort, "vragen");
if (ontbreekt.soort === "vragen") {
  assert.equal(ontbreekt.workflowId, "les");
  assert.ok(ontbreekt.ontbrekendeVelden.includes("vak"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("niveau"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerjaar"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerdoel"));
  assert.equal(ontbreekt.ontbrekendeVelden.includes("leerling"), false);
}

const geenDefault = voerAssistentUit("les", {
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
});
assert.equal(geenDefault.soort, "vragen");
if (geenDefault.soort === "vragen") {
  assert.ok(geenDefault.ontbrekendeVelden.includes("vak"));
  assert.equal(geenDefault.melding.includes("Maatschappijleer"), false);
}

const ongeldigVak = voerAssistentUit("les", {
  vak: "Wiskunde",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
});
assert.equal(ongeldigVak.soort, "vragen");
if (ongeldigVak.soort === "vragen") {
  assert.ok(ongeldigVak.ongeldigeVelden.some((f) => f.id === "vak"));
}

const ongeldigJaar = voerAssistentUit("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "9",
  leerdoel: "eu",
});
assert.equal(ongeldigJaar.soort, "vragen");

const les = klaar("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "industrie",
});
assert.equal(les.workflowId, "les");
assert.equal(les.menselijkeControle, true);
assert.equal(les.ingevuldeVelden.vak, "Geschiedenis");
assert.equal(les.ingevuldeVelden.leerdoel.includes("Jan"), false);

const zonderBevestiging = voerBevestigdeActieUit(les, false);
assert.equal(zonderBevestiging.soort, "geweigerd");
if (zonderBevestiging.soort === "geweigerd") {
  assert.equal(zonderBevestiging.code, "geen-bevestiging");
}
assert.equal("href" in zonderBevestiging, false);
assert.equal("send" in zonderBevestiging, false);

const lesActie = voerBevestigdeActieUit(les, true);
assert.equal(lesActie.soort, "actie");
if (lesActie.soort !== "actie") throw new Error("verwacht actie");
assert.equal(lesActie.href, "/app/lessons/new");
assert.equal(lesActie.href.includes("?"), false);
assert.ok(BESTAANDE_HREFS.has(lesActie.href));
assert.equal(lesActie.href.startsWith("/app/"), true);
assert.equal(/^https?:/i.test(lesActie.href), false);
assert.deepEqual(Object.keys(lesActie).sort(), [
  "checklist",
  "href",
  "label",
  "soort",
  "workflowId",
]);
assert.equal("send" in lesActie, false);
assert.equal("save" in lesActie, false);
assert.equal("export" in lesActie, false);
assert.equal("print" in lesActie, false);
assert.equal("grade" in lesActie, false);
assert.equal("clipboard" in lesActie, false);
assert.equal("download" in lesActie, false);
assert.equal("copy" in lesActie, false);

const toets = klaar("toets", {
  vak: "Economie",
  niveau: "vwo",
  leerjaar: "5",
  leerdoel: "vraag-aanbod",
});
assert.equal(toets.workflowId, "toets");
const toetsActie = voerBevestigdeActieUit(toets, true);
assert.equal(toetsActie.soort, "actie");
if (toetsActie.soort === "actie") {
  assert.equal(toetsActie.href, "/app/tests/new");
}

const toetsweek = klaar("toetsweek");
assert.equal(toetsweek.workflowId, "toetsweek");
assert.equal(toetsweek.menselijkeControle, true);
const twActie = voerBevestigdeActieUit(toetsweek, true);
assert.equal(twActie.soort, "actie");
if (twActie.soort === "actie") {
  assert.equal(twActie.href, "/app/toetsweek");
}

const rapport = klaar("rapport", { outputType: "rapporttekst" });
assert.equal(rapport.workflowId, "rapport");
assert.equal("leerlingLabel" in rapport.ingevuldeVelden, false);
assert.equal(
  rapport.checklist.join(" ").toLowerCase().includes("initialen"),
  false,
);
const rapportActie = voerBevestigdeActieUit(rapport, true);
assert.equal(rapportActie.soort, "actie");
if (rapportActie.soort === "actie") {
  assert.equal(rapportActie.href, "/app/reports/new");
}

const oudermail = klaar("oudermail");
assert.equal(oudermail.workflowId, "oudermail");
const mailActie = voerBevestigdeActieUit(oudermail, true);
assert.equal(mailActie.soort, "actie");
if (mailActie.soort === "actie") {
  assert.equal(mailActie.href, "/app/ouders");
}

const gesprek = klaar("oudergesprek");
assert.equal(gesprek.workflowId, "oudergesprek");

const coach = klaar("coach");
assert.equal(coach.workflowId, "coach");
const coachActie = voerBevestigdeActieUit(coach, true);
assert.equal(coachActie.soort, "actie");
if (coachActie.soort === "actie") {
  assert.equal(coachActie.href, "/app/coach");
}

const nakijken = klaar("nakijken");
assert.equal(nakijken.workflowId, "nakijken");
const nakActie = voerBevestigdeActieUit(nakijken, true);
assert.equal(nakActie.soort === "actie" && nakActie.href, "/app/nakijken");

for (const w of WORKFLOWS) {
  const def = workflowById(w.id);
  assert.ok(def);
  assert.equal(def.href.startsWith("/app/"), true);
  assert.equal(w.href.includes("naam="), false);
  assert.equal(
    w.velden.some((v) => /naam|leerling|email|telefoon|diagnose/i.test(v.id)),
    false,
  );
  assert.equal(
    w.velden.every((v) => v.soort === "keuze" && v.keuzes.length > 0),
    true,
  );
  const voorstel = voerAssistentUit(w.id, {});
  if (voorstel.soort === "klaar") {
    const geweigerd = voerBevestigdeActieUit(voorstel, false);
    assert.equal(geweigerd.soort, "geweigerd");
    const actie = voerBevestigdeActieUit(voorstel, true);
    assert.equal(actie.soort, "actie");
    if (actie.soort === "actie") {
      assert.equal(actie.href.startsWith("/app/"), true);
      assert.equal("href" in geweigerd, false);
    }
  }
}

const verbodenApi = new RegExp(
  "navigator\\.clipboard|clipboard\\.write|window\\.print|" +
    "document\\.execCommand|URL\\.createObjectURL|" +
    "localStorage|sessionStorage|indexedDB",
);
const vrijeInvoer = /<input|<textarea|contentEditable|contenteditable/i;
const bijwerkPad = new RegExp(
  "\\bfetch\\s*\\(|navigator\\.clipboard|clipboard|" +
    "window\\.print|download|localStorage|sessionStorage",
);
const bronnen = [
  "src/app/app/assistent/page.tsx",
  "src/components/app/AssistentScherm.tsx",
  "src/lib/agent/index.ts",
  "src/lib/agent/registry.ts",
  "src/lib/agent/generator.ts",
  "src/lib/agent/policy.ts",
  "src/lib/agent/types.ts",
];
for (const pad of bronnen) {
  const tekst = readFileSync(pad, "utf8");
  assert.equal(verbodenApi.test(tekst), false, pad);
  assert.equal(tekst.includes("Kopieer checklist"), false, pad);
  assert.equal(vrijeInvoer.test(tekst), false, pad);
  assert.equal(bijwerkPad.test(tekst), false, pad);
}

const assistentUi = readFileSync(
  "src/components/app/AssistentScherm.tsx",
  "utf8",
);
assert.equal(assistentUi.includes("CoachFloating"), false);
assert.equal(assistentUi.includes("Vraag de coach"), false);
assert.ok(assistentUi.includes('stap === "kies"'));
assert.ok(assistentUi.includes("kiesModule"));
assert.ok(assistentUi.includes("stap-fade"));

const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
assert.ok(appShell.includes("<CoachFloating"));
assert.ok(appShell.includes("/app/assistent"));

const coachBron = readFileSync(
  "src/components/coach/CoachPanel.tsx",
  "utf8",
);
assert.ok(coachBron.includes('pathname === "/app/coach"'));
assert.ok(coachBron.includes('pathname.startsWith("/app/assistent")'));
assert.ok(coachBron.includes("Vraag de coach"));
assert.ok(coachBron.includes("<input"));
assert.equal(coachBron.includes('startsWith("/app/lessons")'), false);
assert.equal(coachBron.includes('startsWith("/app/coach")'), false);

function weigertGeenActie(uit: { soort: string }) {
  assert.equal(uit.soort, "geweigerd");
  assert.equal("href" in uit, false);
}

const nullActie = voerBevestigdeActieUit(
  null as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(nullActie);

const kapotVoorstel = voerBevestigdeActieUit(
  { soort: "klaar" } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(kapotVoorstel);

const geenChecklist = voerBevestigdeActieUit(
  {
    soort: "klaar",
    workflowId: "les",
    requiresConfirmation: true,
  } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(geenChecklist);

const partieelKlaar = voerBevestigdeActieUit(
  {
    soort: "klaar",
    workflowId: "les",
    requiresConfirmation: true,
    checklist: ["Open de lesgenerator."],
  } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(partieelKlaar);

const zonderTitel = voerBevestigdeActieUit(
  {
    soort: "klaar",
    workflowId: "les",
    titel: "",
    samenvatting: "Les voorbereiden.",
    checklist: ["Open de lesgenerator."],
    waarschuwingen: ["Dit is een voorstel."],
    menselijkeControle: true,
    requiresConfirmation: true,
    ingevuldeVelden: {
      vak: "Geschiedenis",
      niveau: "havo",
      leerjaar: "4",
      leerdoel: "eu",
    },
  } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(zonderTitel);

const metHref = voerBevestigdeActieUit(
  {
    ...les,
    href: "/app/lessons/new",
  } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(metHref);

const valseVelden = voerBevestigdeActieUit(
  {
    ...les,
    ingevuldeVelden: { vak: "ongeldig" },
  } as unknown as AssistentKlaar,
  true,
);
weigertGeenActie(valseVelden);

const valseBevestiging = [
  1,
  "true",
  {},
  [],
  "1",
] as unknown as boolean[];
for (const vals of valseBevestiging) {
  weigertGeenActie(voerBevestigdeActieUit(les, vals));
}

const erfVelden = alsVelden(erfPii(geldigeLesVelden, { naam: "Jan" }));
weigertGeenActie(
  voerBevestigdeActieUit(
    { ...les, ingevuldeVelden: erfVelden } as unknown as AssistentKlaar,
    true,
  ),
);
weigertGeenActie(
  voerBevestigdeActieUit(
    Object.assign(Object.create({ naam: "Jan" }), les) as AssistentKlaar,
    true,
  ),
);
const nullProtoKlaar = Object.assign(Object.create(null), les);
assert.equal(
  voerBevestigdeActieUit(nullProtoKlaar as AssistentKlaar, true).soort,
  "actie",
);

const nullValidatie = valideerVelden(
  "les" as WorkflowId,
  null as unknown as Record<string, string>,
);
assert.equal(nullValidatie.soort === "ok", false);

const arrayValidatie = valideerVelden(
  "les" as WorkflowId,
  ["vak"] as unknown as Record<string, string>,
);
assert.equal(arrayValidatie.soort === "ok", false);

const nullWeiger = weigerIndienNodig(null as unknown as string, []);
assert.equal(nullWeiger?.soort, "geweigerd");

const geenLijst = weigerIndienNodig({ vak: "Geschiedenis" }, null);
assert.equal(geenLijst?.soort, "geweigerd");

const geenArray = weigerIndienNodig({ vak: "Geschiedenis" }, "vak");
assert.equal(geenArray?.soort, "geweigerd");

const kapotResultaat = maakResultaat(
  "les",
  null as unknown as Record<string, string>,
);
assert.equal(kapotResultaat.soort, "geweigerd");

const ongeldigDirect = maakResultaat("les", { vak: "ongeldig" });
assert.equal(ongeldigDirect.soort === "klaar", false);

const mistDirect = maakResultaat("les", {});
assert.equal(mistDirect.soort === "klaar", false);

const extraDirect = maakResultaat("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
  naam: "Jan",
});
assert.equal(extraDirect.soort === "klaar", false);

const geenStringDirect = maakResultaat(
  "les",
  { vak: 1 } as unknown as Record<string, string>,
);
assert.equal(geenStringDirect.soort === "klaar", false);

const geldigDirect = maakResultaat("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
});
assert.equal(geldigDirect.soort, "klaar");
if (geldigDirect.soort === "klaar") {
  const geldigeActie = voerBevestigdeActieUit(geldigDirect, true);
  assert.equal(geldigeActie.soort, "actie");
}

const r = Proxy.revocable({}, {});
r.revoke();
const herroepen = r.proxy;
assert.equal(isPlainRecord(herroepen), false);
assert.equal(
  voerAssistentUit("les", alsVelden(herroepen)).soort,
  "geweigerd",
);
weigertGeenActie(
  voerBevestigdeActieUit(herroepen as AssistentKlaar, true),
);
assert.equal(weigerIndienNodig(herroepen, ["vak"])?.soort, "geweigerd");
assert.equal(
  weigerIndienNodig({ vak: "Geschiedenis" }, herroepen)?.soort,
  "geweigerd",
);
assert.equal(
  valideerVelden("les", herroepen as Record<string, string>).soort === "ok",
  false,
);
assert.equal(
  maakResultaat("les", herroepen as Record<string, string>).soort,
  "geweigerd",
);
assert.equal(workflowById(herroepen), undefined);
assert.equal(voerAssistentUit(herroepen as WorkflowId).soort, "geweigerd");

const protoGooit = new Proxy(
  {},
  {
    getPrototypeOf() {
      throw new Error("proto");
    },
  },
);
assert.equal(isPlainRecord(protoGooit), false);
assert.equal(
  voerAssistentUit("les", alsVelden(protoGooit)).soort,
  "geweigerd",
);
weigertGeenActie(
  voerBevestigdeActieUit(protoGooit as AssistentKlaar, true),
);

const sparseChecklist = [...les.checklist];
sparseChecklist.length = sparseChecklist.length + 1;
weigertGeenActie(
  voerBevestigdeActieUit(
    { ...les, checklist: sparseChecklist } as AssistentKlaar,
    true,
  ),
);

const sparseWaarschuwingen = [...les.waarschuwingen];
sparseWaarschuwingen.length = sparseWaarschuwingen.length + 1;
weigertGeenActie(
  voerBevestigdeActieUit(
    {
      ...les,
      waarschuwingen: sparseWaarschuwingen,
    } as AssistentKlaar,
    true,
  ),
);

const dichteActie = voerBevestigdeActieUit(
  {
    ...les,
    checklist: [...les.checklist],
    waarschuwingen: [...les.waarschuwingen],
  },
  true,
);
assert.equal(dichteActie.soort, "actie");

const ownKeysVelden = new Proxy(
  { ...geldigeLesVelden },
  {
    ownKeys() {
      throw new Error("trap");
    },
  },
);
weigertVeld(voerAssistentUit("les", alsVelden(ownKeysVelden)));
weigertVeld(maakResultaat("les", alsVelden(ownKeysVelden)));
const ownKeysValidatie = valideerVelden("les", alsVelden(ownKeysVelden));
assert.equal(ownKeysValidatie.soort, "geweigerd");
if (ownKeysValidatie.soort === "geweigerd") {
  assert.equal(ownKeysValidatie.code, "ongeldig-veld");
}
assert.equal(
  weigerIndienNodig(ownKeysVelden, lesToegestaan)?.soort,
  "geweigerd",
);

const getVelden = new Proxy(
  { ...geldigeLesVelden },
  {
    get(target, prop, receiver) {
      if (prop === "vak") throw new Error("trap");
      return Reflect.get(target, prop, receiver);
    },
  },
);
weigertVeld(voerAssistentUit("les", alsVelden(getVelden)));
weigertVeld(maakResultaat("les", alsVelden(getVelden)));
const getValidatie = valideerVelden("les", alsVelden(getVelden));
assert.equal(getValidatie.soort, "geweigerd");
if (getValidatie.soort === "geweigerd") {
  assert.equal(getValidatie.code, "ongeldig-veld");
}
assert.equal(weigerIndienNodig(getVelden, lesToegestaan)?.soort, "geweigerd");

const hasVelden = new Proxy(
  { ...geldigeLesVelden },
  {
    has() {
      throw new Error("trap");
    },
  },
);
weigertVeld(voerAssistentUit("les", alsVelden(hasVelden)));
weigertVeld(maakResultaat("les", alsVelden(hasVelden)));
const hasValidatie = valideerVelden("les", alsVelden(hasVelden));
assert.equal(hasValidatie.soort, "geweigerd");
if (hasValidatie.soort === "geweigerd") {
  assert.equal(hasValidatie.code, "ongeldig-veld");
}
assert.equal(weigerIndienNodig(hasVelden, lesToegestaan)?.soort, "geweigerd");

const ownKeysKlaar = new Proxy(les, {
  ownKeys() {
    throw new Error("trap");
  },
});
weigertGeenActie(
  voerBevestigdeActieUit(ownKeysKlaar as AssistentKlaar, true),
);

const getKlaar = new Proxy(les, {
  get(target, prop, receiver) {
    if (prop === "titel") throw new Error("trap");
    return Reflect.get(target, prop, receiver);
  },
});
weigertGeenActie(voerBevestigdeActieUit(getKlaar as AssistentKlaar, true));

const lijstTrap = new Proxy([...lesToegestaan], {
  get(target, prop, receiver) {
    if (prop === "length" || prop === "0") throw new Error("trap");
    return Reflect.get(target, prop, receiver);
  },
});
assert.equal(
  weigerIndienNodig(geldigeLesVelden, lijstTrap)?.soort,
  "geweigerd",
);

const checklistTrap = new Proxy([...les.checklist], {
  get(target, prop, receiver) {
    if (prop === "length" || prop === "0") throw new Error("trap");
    return Reflect.get(target, prop, receiver);
  },
});
weigertGeenActie(
  voerBevestigdeActieUit(
    { ...les, checklist: checklistTrap } as AssistentKlaar,
    true,
  ),
);

function plat(bron: string): string {
  return bron.replace(/\s+/g, " ");
}

const privacyBron = plat(readFileSync("src/app/privacy/page.tsx", "utf8"));
assert.equal(privacyBron.includes("geen externe AI-diensten"), false);
assert.ok(privacyBron.includes("Google Vertex AI"));
assert.equal(privacyBron.includes("eigen servers draait"), false);

const aiBron = plat(readFileSync("src/app/ai/page.tsx", "utf8"));
assert.ok(aiBron.includes("Google Vertex AI"));
assert.ok(aiBron.includes("EU-regio"));

console.log("agent-test: alle checks geslaagd");
