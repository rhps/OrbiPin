// OrbiPin source whitelist (spec 06) — 12 verified feeds across 12 countries.
// All verified RSS (200 + XML) on 2026-09-21. Licensing: RSS = official
// interface; headline+link+snippet only, full text stays at the publisher.
export interface SourceDef {
  id: string;          // "npr" — stable id used in logs/budget
  country: string;     // ISO-2
  publisher: string;   // display name
  feedUrl: string;     // RSS/XML endpoint
  lang: string;
  stateMedia?: boolean; // editorial flag → UI badge (trust model)
  interface: "rss" | "scrape"; // licensing rule: prefer official interface
  crawlEveryMin: number;
  estCreditsPerCrawl: number; // Firecrawl credits; RSS fetch = 0 credits
}

export const WHITELIST: SourceDef[] = [
  // --- Americas ---
  { id: "npr", country: "US", publisher: "NPR", feedUrl: "https://feeds.npr.org/1001/rss.xml", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  // --- Europe ---
  { id: "bbc", country: "GB", publisher: "BBC World", feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  { id: "france24", country: "FR", publisher: "France 24", feedUrl: "https://www.france24.com/en/rss", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  { id: "dw", country: "DE", publisher: "Deutsche Welle", feedUrl: "https://rss.dw.com/rdf/rss-en-all", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  { id: "tass", country: "RU", publisher: "TASS", feedUrl: "https://tass.com/rss/v2.xml", lang: "en", stateMedia: true, interface: "rss", crawlEveryMin: 60, estCreditsPerCrawl: 0 },
  // --- Middle East ---
  { id: "aljazeera", country: "QA", publisher: "Al Jazeera", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  // --- Asia-Pacific ---
  { id: "japantimes", country: "JP", publisher: "The Japan Times", feedUrl: "https://www.japantimes.co.jp/feed/", lang: "en", interface: "rss", crawlEveryMin: 60, estCreditsPerCrawl: 0 },
  { id: "koreatimes", country: "KR", publisher: "The Korea Times", feedUrl: "https://www.koreatimes.co.kr/www/rss/rss.xml", lang: "en", interface: "rss", crawlEveryMin: 60, estCreditsPerCrawl: 0 },
  { id: "abc-au", country: "AU", publisher: "ABC News (AU)", feedUrl: "https://www.abc.net.au/news/feed/51120/rss.xml", lang: "en", interface: "rss", crawlEveryMin: 60, estCreditsPerCrawl: 0 },
  { id: "cna", country: "SG", publisher: "CNA", feedUrl: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  { id: "antara", country: "ID", publisher: "Antara News", feedUrl: "https://en.antaranews.com/rss/news", lang: "en", interface: "rss", crawlEveryMin: 30, estCreditsPerCrawl: 0 },
  { id: "dawn", country: "PK", publisher: "Dawn", feedUrl: "https://www.dawn.com/feeds/home", lang: "en", interface: "rss", crawlEveryMin: 60, estCreditsPerCrawl: 0 },
];

// Daily Firecrawl credit estimate: RSS fetches are free; credits burn only on
// deep-extraction of individual articles (1 credit/page, capped per day).
export const DEEP_EXTRACT_CAP_PER_DAY = 2000; // conservative vs 20k participant grant
