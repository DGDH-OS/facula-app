/**
 * Bronnenzoeker: vindt ECHTE nieuwsartikelen bij een zoekterm, met datum en
 * directe link. Geen AI en geen verzonnen tekst: alleen wat een Nederlandse
 * nieuwssite zelf gepubliceerd heeft. De docent kiest en controleert.
 *
 * Alleen sites op de toegestane lijst komen door (ook bij het ophalen van de
 * tekst), zodat de server nooit een willekeurige URL ophaalt.
 */
export const TOEGESTANE_SITES: Record<string, string> = {
  "nos.nl": "NOS",
  "nu.nl": "NU.nl",
  "rtl.nl": "RTL Nieuws",
  "rtlnieuws.nl": "RTL Nieuws",
  "volkskrant.nl": "de Volkskrant",
  "nrc.nl": "NRC",
  "trouw.nl": "Trouw",
  "ad.nl": "AD",
  "parool.nl": "Het Parool",
  "nieuwsuur.nl": "Nieuwsuur",
  "rijksoverheid.nl": "Rijksoverheid",
  "cbs.nl": "CBS",
  "tweedekamer.nl": "Tweede Kamer",
  "nji.nl": "NJi",
  "nl.wikipedia.org": "Wikipedia",
};

export interface BronResultaat {
  titel: string;
  site: string;
  domein: string;
  datum: string; // ISO
  url: string;
  /** Kernbegrippen die letterlijk in de artikeltekst voorkomen (alleen bij automatisch zoeken). */
  past?: string[];
}

export function domeinVan(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const treffer = Object.keys(TOEGESTANE_SITES).find(
      (d) => host === d || host.endsWith("." + d)
    );
    return treffer ?? null;
  } catch {
    return null;
  }
}

const UA = { "User-Agent": "Mozilla/5.0 (compatible; FaculaBronnen/1.0)" };

async function haal(url: string, init?: RequestInit): Promise<string> {
  const r = await fetch(url, {
    ...init,
    headers: { ...UA, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

function uitXml(blok: string, tag: string): string {
  const m = blok.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

export function decodeEntiteiten(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Google News-links wijzen naar Google; dit haalt de echte artikel-URL op. */
async function echteUrl(googleLink: string): Promise<string | null> {
  const id = googleLink.split("/articles/")[1]?.split("?")[0];
  if (!id) return null;
  const pagina = await haal(`https://news.google.com/articles/${id}`);
  const sg = pagina.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = pagina.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sg || !ts) return null;
  const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"NL:nl",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`;
  const antwoord = await haal("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ "f.req": JSON.stringify([[["Fbv4je", inner]]]) }).toString(),
  });
  const m = antwoord.match(/\[\\"garturlres\\",\\"(.*?)\\"/);
  return m ? m[1].replace(/\\\\u003d/g, "=").replace(/\\\\u0026/g, "&") : null;
}

export async function zoekBronnen(zoekterm: string, max = 8): Promise<BronResultaat[]> {
  const schoon = zoekterm.trim().slice(0, 120);
  if (!schoon) return [];
  let uitGoogle: BronResultaat[] = [];
  try {
    uitGoogle = await zoekViaGoogle(schoon, max);
  } catch {
    // Google begrenst soms; dan zoeken we in de feeds en op Wikipedia.
  }
  if (uitGoogle.length >= 4) return uitGoogle;
  const aanvulling = await zoekBronnenMinimaal([schoon], true, 4, max);
  const gezien = new Set(uitGoogle.map((b) => b.url));
  return [...uitGoogle, ...aanvulling.filter((b) => !gezien.has(b.url))].slice(0, max);
}

async function zoekViaGoogle(schoon: string, max: number): Promise<BronResultaat[]> {
  const sites = Object.keys(TOEGESTANE_SITES)
    .slice(0, 8)
    .map((d) => `site:${d}`)
    .join(" OR ");
  const q = `${schoon} (${sites})`;
  const xml = await haal(
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=nl&gl=NL&ceid=NL:nl`
  );
  const items = xml.split("<item>").slice(1, max * 3);
  const uit: BronResultaat[] = [];
  const gezien = new Set<string>();
  for (const it of items) {
    if (uit.length >= max) break;
    const link = decodeEntiteiten(uitXml(it, "link"));
    const titel = decodeEntiteiten(uitXml(it, "title")).replace(/\s+-\s+[^-]+$/, "");
    const datum = uitXml(it, "pubDate");
    let url: string | null = null;
    try {
      url = await echteUrl(link);
    } catch {
      url = null;
    }
    const domein = url ? domeinVan(url) : null;
    if (!url || !domein || gezien.has(url) || /\/(video|live|livestream|kijkverder)\b|\/v\/\d/.test(url)) continue;
    gezien.add(url);
    uit.push({
      titel,
      site: TOEGESTANE_SITES[domein],
      domein,
      datum: datum ? new Date(datum).toISOString() : "",
      url,
    });
  }
  return uit;
}

/** Haalt de artikeltekst op uit het JSON-LD (articleBody) of de alinea's. */
export async function haalArtikelTekst(url: string): Promise<{ tekst: string; titel: string }> {
  if (!domeinVan(url)) throw new Error("Deze site staat niet op de lijst.");
  if (domeinVan(url) === "nl.wikipedia.org") return haalWikipediaTekst(url);
  const html = await haal(url);
  const titel = decodeEntiteiten(
    html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ??
      html.match(/<title>([^<]*)<\/title>/)?.[1] ??
      ""
  );
  const ab = html.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  let tekst = "";
  if (ab) {
    try {
      tekst = JSON.parse(`"${ab[1]}"`);
    } catch {
      tekst = "";
    }
  }
  // Menu-rommel weigeren: een echte artikeltekst begint niet met "Sluit menu".
  if (/^(sluit menu|menu|zoeken|inloggen)\b/i.test(tekst.trim())) tekst = "";
  if (tekst.length < 300) {
    const kern = html.match(/<article[\s\S]*?<\/article>/)?.[0] ?? html;
    const alineas = [...kern.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) => decodeEntiteiten(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 60);
    if (alineas.join(" ").length > tekst.length) tekst = alineas.join("\n\n");
  }
  return { tekst: decodeEntiteiten(tekst).replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000), titel };
}

/**
 * Rechtstreekse RSS-feeds van de kranten zelf: geen tussenpartij, geen
 * limiet van Google, en de links zijn altijd echt. Alleen binnenland,
 * politiek en economie (maatschappijleer-onderwerpen).
 */
const FEEDS: { url: string; domein: string }[] = [
  { url: "https://feeds.nos.nl/nosnieuwsbinnenland", domein: "nos.nl" },
  { url: "https://feeds.nos.nl/nosnieuwspolitiek", domein: "nos.nl" },
  { url: "https://feeds.nos.nl/nosnieuwseconomie", domein: "nos.nl" },
  { url: "https://www.nu.nl/rss/Algemeen", domein: "nu.nl" },
  { url: "https://www.nu.nl/rss/Politiek", domein: "nu.nl" },
  { url: "https://www.nu.nl/rss/Economie", domein: "nu.nl" },
  { url: "https://www.nu.nl/rss/Wetenschap", domein: "nu.nl" },
  { url: "https://feeds.nos.nl/nosnieuwstech", domein: "nos.nl" },
  { url: "https://www.nrc.nl/rss/", domein: "nrc.nl" },
  { url: "https://www.trouw.nl/nieuws/rss.xml", domein: "trouw.nl" },
  { url: "https://www.ad.nl/binnenland/rss.xml", domein: "ad.nl" },
  { url: "https://www.parool.nl/nieuws/rss.xml", domein: "parool.nl" },
  { url: "https://www.rtl.nl/nieuws/rss.xml", domein: "rtl.nl" },
];

export interface FeedItem {
  titel: string;
  url: string;
  datum: string;
  samenvatting: string;
  domein: string;
}

/** Voor de dagelijkse archieftaak: de actuele feed-items ongefilterd. */
export async function haalActueleFeedItems(): Promise<FeedItem[]> {
  return haalFeedItems();
}

/** Zoekwoorden voor een reeks begrippen (zelfde stamlogica als de live-zoeker). */
export function zoekWoordenVoor(begrippen: string[]): string[] {
  return [
    ...new Set(
      begrippen
        .map((b) => b.trim())
        .filter((b) => b.length >= 3)
        .flatMap((t) => [
          stam(t),
          ...t
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length >= 6)
            .map(stam),
        ])
    ),
  ];
}

let feedCache: { op: number; items: FeedItem[] } | null = null;

async function haalFeedItems(): Promise<FeedItem[]> {
  if (feedCache && Date.now() - feedCache.op < 10 * 60 * 1000) return feedCache.items;
  const lijsten = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const xml = await haal(f.url);
        return xml
          .split(/<item[ >]/)
          .slice(1)
          .map((it): FeedItem | null => {
            const url = decodeEntiteiten(uitXml(it, "link"));
            const domein = domeinVan(url);
            if (!domein) return null;
            const d = uitXml(it, "pubDate");
            return {
              titel: decodeEntiteiten(uitXml(it, "title")),
              url,
              datum: d && !isNaN(new Date(d).getTime()) ? new Date(d).toISOString() : "",
              samenvatting: decodeEntiteiten(uitXml(it, "description").replace(/<[^>]+>/g, " ")),
              domein,
            };
          })
          .filter((x): x is FeedItem => x !== null && !/\/(video|live|livestream)\b/.test(x.url));
      } catch {
        return [] as FeedItem[];
      }
    })
  );
  const items = lijsten.flat();
  feedCache = { op: Date.now(), items };
  return items;
}

function stam(begrip: string): string {
  // Eenvoudige stam zodat "sociale ongelijkheid" ook "ongelijkheid" en "polarisatie" ook "polariserend" vindt.
  const w = begrip.toLowerCase().trim();
  return w.length > 8 ? w.slice(0, w.length - 2) : w;
}

/**
 * Automatisch zoeken bij de begrippen van de docent. Stap 1: recente artikelen
 * uit de feeds van de kranten zelf die in titel of samenvatting een begrip of
 * een kernwoord ervan bevatten. Stap 2: de echte artikeltekst lezen en tellen
 * welke begrippen er letterlijk in voorkomen. Artikelen zonder leesbare tekst
 * (betaalmuur, video) vallen af, dus elk aanbod is direct bruikbaar. Volgorde:
 * de meeste begrippen eerst, dan de nieuwste. Geen AI: alleen zoeken en tellen.
 */
async function zoekInArchief(woorden: string[]): Promise<FeedItem[]> {
  if (woorden.length === 0) return [];
  const { createServiceRoleClient } = await import("./supabase/server");
  const filter = woorden
    .slice(0, 10)
    .map((w) => w.replace(/[%,()*]/g, ""))
    .filter(Boolean)
    .flatMap((w) => [`titel.ilike.*${w}*`, `samenvatting.ilike.*${w}*`])
    .join(",");
  if (!filter) return [];
  const { data } = await createServiceRoleClient()
    .schema("facula")
    .from("bronnen_archief")
    .select("url, titel, domein, datum, samenvatting")
    .or(filter)
    .order("datum", { ascending: false })
    .limit(40);
  return (data ?? [])
    .filter((r) => domeinVan(r.url))
    .map((r) => ({
      titel: r.titel,
      url: r.url,
      datum: r.datum ?? "",
      samenvatting: r.samenvatting,
      domein: r.domein,
    }));
}

export async function zoekBronnenBijBegrippen(
  begrippen: string[],
  max = 6
): Promise<BronResultaat[]> {
  const termen = [...new Set(begrippen.map((b) => b.trim()).filter((b) => b.length >= 3))].slice(0, 6);
  if (termen.length === 0) return [];
  const woorden = [
    ...new Set(
      termen.flatMap((t) => [stam(t), ...t.toLowerCase().split(/\s+/).filter((w) => w.length >= 6).map(stam)])
    ),
  ];

  const items = await haalFeedItems();
  const uitArchief = await zoekInArchief(woorden).catch(() => [] as FeedItem[]);
  const gezienUrls = new Set(items.map((i) => i.url));
  for (const a of uitArchief) if (!gezienUrls.has(a.url)) items.push(a);
  const voorselectie = items
    .map((i) => {
      const hooi = `${i.titel} ${i.samenvatting}`.toLowerCase();
      return { i, score: woorden.filter((w) => hooi.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.i.datum.localeCompare(a.i.datum))
    .slice(0, 14)
    .map((x) => x.i);

  const beoordeeld = await Promise.all(
    voorselectie.map(async (i): Promise<(BronResultaat & { past: string[] }) | null> => {
      try {
        const { tekst } = await haalArtikelTekst(i.url);
        if (tekst.length < 400) return null;
        const laag = tekst.toLowerCase();
        const tel = (t: string) => laag.split(stam(t)).length - 1;
        // Een begrip telt pas mee als het echt onderwerp is: minstens 2x in de tekst.
        const past = termen.filter((t) => tel(t) >= 2);
        // Bij meerdere begrippen moeten er minstens twee echt onderwerp zijn, of één
        // moet in de titel staan. Zo valt een muziekartikel met "compromis" af.
        const inTitel = termen.some((t) => i.titel.toLowerCase().includes(stam(t)));
        const minimaal = termen.length >= 3 ? 2 : 1;
        if (past.length < minimaal && !(inTitel && past.length >= 1)) return null;
        return {
          titel: i.titel,
          site: TOEGESTANE_SITES[i.domein],
          domein: i.domein,
          datum: i.datum,
          url: i.url,
          past,
        };
      } catch {
        return null;
      }
    })
  );
  return beoordeeld
    .filter((b): b is BronResultaat & { past: string[] } => b !== null)
    .sort((a, b) => b.past.length - a.past.length || b.datum.localeCompare(a.datum))
    .slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Wikipedia (nl): echte encyclopedietekst voor vakken zonder nieuwsbron  */
/* Licentie CC BY-SA 4.0: bronvermelding met link is verplicht en wordt  */
/* automatisch meegegeven.                                                */
/* ------------------------------------------------------------------ */

const WIKI_API = "https://nl.wikipedia.org/w/api.php";
const WIKI_UA = { "User-Agent": "FaculaBronnen/1.0 (https://facula-app.vercel.app; info@dgdh-os.com)" };

function wikiSchoon(tekst: string): string {
  return tekst
    .replace(/^=+\s*[^=\n]+\s*=+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function knipOpAlinea(tekst: string, max: number): string {
  if (tekst.length <= max) return tekst;
  const stuk = tekst.slice(0, max);
  const punt = Math.max(stuk.lastIndexOf("\n\n"), stuk.lastIndexOf(". "));
  return (punt > max * 0.5 ? stuk.slice(0, punt + 1) : stuk).trim();
}

export async function haalWikipediaTekst(url: string): Promise<{ tekst: string; titel: string }> {
  const titel = decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, "")).replace(/_/g, " ");
  const api = `${WIKI_API}?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(titel)}&format=json`;
  const r = await fetch(api, { headers: WIKI_UA, signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!r.ok) throw new Error("Wikipedia niet bereikbaar");
  const d = (await r.json()) as { query?: { pages?: Record<string, { title: string; extract?: string }> } };
  const pagina = Object.values(d.query?.pages ?? {})[0];
  const extract = wikiSchoon(pagina?.extract ?? "");
  if (extract.length < 200) throw new Error("Geen tekst");
  return { tekst: knipOpAlinea(extract, 3500), titel: pagina?.title ?? titel };
}

export async function zoekWikipedia(
  begrippen: string[],
  max = 6,
  perTermLimiet = 3
): Promise<BronResultaat[]> {
  const termen = [...new Set(begrippen.map((b) => b.trim()).filter((b) => b.length >= 3))].slice(0, 6);
  if (termen.length === 0) return [];
  const perTerm = await Promise.all(
    termen.map(async (t) => {
      try {
        const api = `${WIKI_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(t)}&gsrlimit=${perTermLimiet}&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`;
        const r = await fetch(api, { headers: WIKI_UA, signal: AbortSignal.timeout(12000), cache: "no-store" });
        if (!r.ok) return [];
        const d = (await r.json()) as {
          query?: { pages?: Record<string, { title: string; fullurl: string; extract?: string; index: number }> };
        };
        return Object.values(d.query?.pages ?? {}).sort((a, b) => a.index - b.index);
      } catch {
        return [];
      }
    })
  );
  const uniek = new Map<string, { titel: string; url: string; extract: string; rang: number }>();
  perTerm.forEach((lijst) =>
    lijst.forEach((p, i) => {
      if (!p.fullurl?.startsWith("https://nl.wikipedia.org/") || (p.extract ?? "").length < 150) return;
      const bestaand = uniek.get(p.fullurl);
      const rang = i;
      if (!bestaand || rang < bestaand.rang) uniek.set(p.fullurl, { titel: p.title, url: p.fullurl, extract: p.extract ?? "", rang });
    })
  );
  const vandaag = new Date().toISOString();
  return [...uniek.values()]
    .map((p) => {
      const laag = `${p.titel} ${p.extract}`.toLowerCase();
      const past = termen.filter((t) => laag.includes(stam(t)));
      return { ...p, past };
    })
    .filter((p) => p.past.length > 0)
    .sort((a, b) => b.past.length - a.past.length || a.rang - b.rang)
    .slice(0, max)
    .map((p) => ({
      titel: p.titel,
      site: "Wikipedia",
      domein: "nl.wikipedia.org",
      datum: vandaag,
      url: p.url,
      past: p.past,
    }));
}

/* ------------------------------------------------------------------ */
/* APA 7 bronvermelding, automatisch uit de gevonden gegevens             */
/* ------------------------------------------------------------------ */

const MAANDEN_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function apaDatum(iso: string): string {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return "z.d.";
  return `${d.getFullYear()}, ${d.getDate()} ${MAANDEN_NL[d.getMonth()]}`;
}

function nu(): string {
  const d = new Date();
  return `${d.getDate()} ${MAANDEN_NL[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * APA 7 voor online nieuws: Organisatie. (jaar, dag maand). Titel. Site. URL
 * Een krant is hier de auteur (groepsauteur), want de feeds noemen geen
 * journalist. Wikipedia krijgt een opgehaald-op datum, omdat de pagina wijzigt.
 */
export function apaVermelding(b: { titel: string; site: string; domein: string; datum: string; url: string }): string {
  const titel = b.titel.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  if (b.domein === "nl.wikipedia.org") {
    return `Wikipedia. (z.d.). ${titel}. Geraadpleegd op ${nu()}, van ${b.url}`;
  }
  return `${b.site}. (${apaDatum(b.datum)}). ${titel}. ${b.site}. ${b.url}`;
}

/**
 * Levert ALTIJD minstens `minimum` bronnen als de wereld ze heeft. Volgorde:
 * 1. nieuws dat de begrippen echt behandelt (alleen bij nieuwsvakken),
 * 2. Wikipedia bij alle begrippen samen,
 * 3. Wikipedia met ruimere zoekresultaten per begrip,
 * 4. verwante Wikipedia-pagina's bij de beste treffers (uit de eigen links).
 * Alles echt, geen verzonnen bron. Dubbele links vallen af.
 */
export async function zoekBronnenMinimaal(
  begrippen: string[],
  nieuwsVak: boolean,
  minimum = 4,
  max = 6
): Promise<BronResultaat[]> {
  const uit: BronResultaat[] = [];
  const gezien = new Set<string>();
  const voegToe = (lijst: BronResultaat[]) => {
    for (const b of lijst) {
      if (uit.length >= max) return;
      if (!gezien.has(b.url)) {
        gezien.add(b.url);
        uit.push(b);
      }
    }
  };

  if (nieuwsVak) voegToe(await zoekBronnenBijBegrippen(begrippen, max).catch(() => []));
  if (uit.length < minimum) voegToe(await zoekWikipedia(begrippen, max).catch(() => []));
  if (uit.length < minimum) voegToe(await zoekWikipedia(begrippen, max, 8).catch(() => []));
  if (uit.length < minimum && uit.some((b) => b.domein === "nl.wikipedia.org")) {
    voegToe(await verwanteWikipedia(uit.filter((b) => b.domein === "nl.wikipedia.org")[0]).catch(() => []));
  }
  if (uit.length < minimum && !nieuwsVak) {
    voegToe(await zoekBronnenBijBegrippen(begrippen, max).catch(() => []));
  }
  return uit;
}

/** Pagina's waar de beste Wikipedia-treffer naar linkt: inhoudelijk verwant, altijd echt. */
async function verwanteWikipedia(basis: BronResultaat): Promise<BronResultaat[]> {
  const titel = decodeURIComponent(new URL(basis.url).pathname.replace(/^\/wiki\//, "")).replace(/_/g, " ");
  const api = `${WIKI_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(`morelike:${titel}`)}&gsrlimit=6&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`;
  const r = await fetch(api, { headers: WIKI_UA, signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!r.ok) return [];
  const d = (await r.json()) as {
    query?: { pages?: Record<string, { title: string; fullurl: string; extract?: string; index: number }> };
  };
  const vandaag = new Date().toISOString();
  return Object.values(d.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .filter((p) => p.fullurl?.startsWith("https://nl.wikipedia.org/") && (p.extract ?? "").length >= 150)
    .map((p) => ({
      titel: p.title,
      site: "Wikipedia",
      domein: "nl.wikipedia.org",
      datum: vandaag,
      url: p.fullurl,
      past: [],
    }));
}
