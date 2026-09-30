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
};

export interface BronResultaat {
  titel: string;
  site: string;
  domein: string;
  datum: string; // ISO
  url: string;
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
