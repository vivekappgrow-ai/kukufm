import { randomUUID } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  listCurrentAffairsSources,
  saveCurrentAffairsArticle,
  setCurrentAffairsSourceStatus,
} from "./data/store.mjs";

const trustedHosts = new Set([
  "pib.gov.in", "www.pib.gov.in", "rbi.org.in", "www.rbi.org.in",
  "upsc.gov.in", "www.upsc.gov.in", "prsindia.org", "www.prsindia.org",
  "nasa.gov", "www.nasa.gov", "feeds.bbci.co.uk", "bbc.co.uk",
  "www.bbc.co.uk", "bbc.com", "www.bbc.com",
]);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  processEntities: true,
  trimValues: true,
});
const MAX_FEED_BYTES = 1_000_000;

export function isTrustedFeedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && trustedHosts.has(url.hostname.toLowerCase())
      && !url.username && !url.password;
  } catch {
    return false;
  }
}

function cleanText(value, maxLength = 4000) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function canonicalArticleUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password
      || !trustedHosts.has(url.hostname.toLowerCase())) return undefined;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return undefined;
  }
}

function categoryFor(text) {
  const categories = [
    ["Exam Alerts", /\b(notification|admit card|answer key|application deadline|vacanc(?:y|ies)|recruitment|result declared|exam date)\b|सूचना|प्रवेश पत्र|एडमिट कार्ड|उत्तर कुंजी|आवेदन|रिक्ति|भर्ती|परिणाम|परीक्षा तिथि/iu],
    ["Politics", /\b(parliament|election|politic|cabinet|minister|government|bill|policy)\b|संसद|चुनाव|राजनीति|मंत्रिमंडल|मंत्री|सरकार|विधेयक|नीति/iu],
    ["Economy", /\b(econom|inflation|budget|rbi|bank|gdp|trade|finance|tax)\b|अर्थव्यवस्था|महंगाई|बजट|बैंक|वित्त|कर/iu],
    ["Science & Technology", /\b(science|technology|research|space|satellite|ai|digital|innovation)\b|विज्ञान|प्रौद्योगिकी|अनुसंधान|अंतरिक्ष|उपग्रह|डिजिटल|नवाचार/iu],
    ["Sports", /\b(sport|cricket|football|olympic|championship|tournament|athlete)\b|खेल|क्रिकेट|फुटबॉल|ओलंपिक|चैंपियनशिप|टूर्नामेंट|खिलाड़ी/iu],
    ["Awards & Appointments", /\b(award|appoint|honour|honor|medal|chairperson|president)\b|पुरस्कार|नियुक्ति|सम्मान|पदक|अध्यक्ष|राष्ट्रपति/iu],
    ["Government Schemes", /\b(scheme|yojana|beneficiar|welfare|subsidy|mission)\b|योजना|लाभार्थी|कल्याण|सब्सिडी|मिशन/iu],
    ["Environment", /\b(environment|climate|wildlife|forest|pollution|renewable)\b|पर्यावरण|जलवायु|वन्यजीव|वन|प्रदूषण|नवीकरणीय/iu],
    ["International", /\b(international|global|world|united nations|foreign|summit)\b|अंतरराष्ट्रीय|वैश्विक|विश्व|संयुक्त राष्ट्र|विदेश|शिखर सम्मेलन/iu],
  ];
  return categories.find(([, pattern]) => pattern.test(text))?.[0] ?? "General";
}

function asArray(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function atomLink(entry) {
  const links = asArray(entry.link);
  const preferred = links.find((link) => link?.["@rel"] === "alternate") ?? links[0];
  return typeof preferred === "string" ? preferred : preferred?.["@href"];
}

function parseItems(data) {
  const rssItems = asArray(data?.rss?.channel?.item);
  const atomItems = asArray(data?.feed?.entry);
  return rssItems.length
    ? rssItems.map((item) => ({
      title: item.title,
      description: item.description ?? item["content:encoded"],
      link: typeof item.link === "string" ? item.link : item.link?.["@href"],
      publishedAt: item.pubDate ?? item.date ?? item["dc:date"],
    }))
    : atomItems.map((item) => ({
      title: item.title?.["#text"] ?? item.title,
      description: item.summary?.["#text"] ?? item.summary ?? item.content?.["#text"] ?? item.content,
      link: atomLink(item),
      publishedAt: item.published ?? item.updated,
    }));
}

async function readBoundedText(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
    throw new Error("RSS feed exceeds the 1 MB size limit.");
  }
  if (!response.body) throw new Error("RSS feed returned an empty response.");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error("RSS feed exceeds the 1 MB size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchFeed(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`RSS feed returned HTTP ${response.status}.`);
  }
  const xml = await readBoundedText(response);
  if (/<!DOCTYPE/i.test(xml)) throw new Error("RSS feeds containing a document type declaration are not accepted.");
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error("RSS feed contains malformed XML.");
  const items = parseItems(parser.parse(xml));
  if (!items.length) throw new Error("RSS feed did not contain RSS or Atom entries.");
  return items;
}

async function retry(operation, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
  throw lastError;
}

export async function syncCurrentAffairs({ fetchImpl = fetch } = {}) {
  const sources = await listCurrentAffairsSources({ activeOnly: true });
  const result = { sources: sources.length, fetched: 0, inserted: 0, skipped: 0, errors: [] };
  for (const source of sources) {
    if (!isTrustedFeedUrl(source.feedUrl)) {
      const message = "Feed URL is outside the configured trusted-host allowlist.";
      await setCurrentAffairsSourceStatus(source.id, { lastError: message });
      result.errors.push({ sourceId: source.id, message });
      continue;
    }
    try {
      const items = await retry(() => fetchFeed(source.feedUrl, fetchImpl));
      result.fetched += items.length;
      for (const item of items) {
        const title = cleanText(item.title, 500);
        const url = canonicalArticleUrl(item.link);
        const publishedDate = typeof item.publishedAt === "string" ? new Date(item.publishedAt) : new Date(Number.NaN);
        if (!title || !url || Number.isNaN(publishedDate.getTime()) || publishedDate.getTime() > Date.now() + 5 * 60_000) {
          result.skipped += 1;
          continue;
        }
        const summary = cleanText(item.description, 4000);
        const inserted = await saveCurrentAffairsArticle({
          id: randomUUID(),
          sourceId: source.id,
          title,
          summary,
          url,
          category: categoryFor(`${title} ${summary}`),
          language: source.language,
          publishedAt: publishedDate.toISOString(),
        });
        if (inserted) result.inserted += 1;
        else result.skipped += 1;
      }
      await setCurrentAffairsSourceStatus(source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Feed fetch failed.";
      await setCurrentAffairsSourceStatus(source.id, { lastError: message });
      result.errors.push({ sourceId: source.id, message });
      console.error(`Current affairs RSS sync failed for ${source.name}.`, error);
    }
  }
  return result;
}

export function scheduleCurrentAffairsIngestion() {
  let timer;
  let stopped = false;
  const schedule = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    timer = setTimeout(async () => {
      try {
        await syncCurrentAffairs();
      } catch (error) {
        console.error("Scheduled current affairs sync could not complete.", error);
      } finally {
        if (!stopped) schedule();
      }
    }, next.getTime() - now.getTime());
    timer.unref?.();
  };
  void syncCurrentAffairs().catch((error) => {
    console.error("Initial current affairs sync could not complete.", error);
  });
  schedule();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
