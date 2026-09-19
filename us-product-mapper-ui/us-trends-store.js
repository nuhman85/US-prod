import { load } from 'cheerio';

export const SOURCE_URL = 'https://trends.google.com/trending/rss?geo=US';
const rules = [
  [/\biphone(?:\s+\d+(?:\s+(?:pro|max|plus|air)){0,2})?\b/i, 'Phones', null],
  [/\b(?:samsung\s+)?galaxy\s+(?:s\d+(?:\s+ultra)?|z\s+(?:fold|flip)\s*\d*)\b/i, 'Phones', null],
  [/\b(?:google\s+)?pixel\s+\d+(?:\s+pro)?\b/i, 'Phones', null],
  [/\bmacbook(?:\s+(?:air|pro))?\b/i, 'Computers', null],
  [/\bipad(?:\s+(?:air|pro|mini))?\b/i, 'Computers', null],
  [/\b(?:airpods|airtag|apple watch)(?:\s+(?:pro|max|ultra))?\b/i, 'Electronics', null],
  [/\bxbox\b/i, 'Gaming', ['xbox console', 'xbox controller', 'xbox gaming headset']],
  [/\b(?:playstation|ps5)\b/i, 'Gaming', ['playstation 5 console', 'ps5 controller']],
  [/\bnintendo switch(?:\s+2)?\b/i, 'Gaming', null],
  [/\b(?:geforce|rtx)\s*\d{4}(?:\s*ti)?\b/i, 'Computers', null],
  [/\b(?:laptop|gaming monitor|graphics card|ssd|mechanical keyboard|webcam)\b/i, 'Computers', null],
  [/\b(?:headphones|earbuds|smartwatch|smart tv|oled tv|soundbar|camera)\b/i, 'Electronics', null],
  [/\b(?:dyson|shark vacuum|roborock|roomba|robot vacuum|air purifier|air fryer|espresso machine|ninja creami)\b/i, 'Home', null],
];
const normalize = value => value.toLowerCase().replace(/\s+/g, ' ').trim();
export function parseTrendSuggestions(xml) {
  const $ = load(xml, { xmlMode: true });
  if (!$('rss > channel').length) throw new Error('Google Trends returned an invalid feed.');
  const suggestions = new Map();
  let topicCount = 0;
  $('channel > item').each((_index, item) => {
    topicCount++;
    const title = $(item).children('title').text().trim();
    const published = new Date($(item).children('pubDate').text());
    const sourceDate = Number.isNaN(published.getTime()) ? null : published.toISOString();
    const traffic = $(item).children('ht\\:approx_traffic').text().trim() || null;
    const sourceUrl = `https://trends.google.com/trends/explore?geo=US&q=${encodeURIComponent(title)}`;
    for (const [pattern, category, related] of rules) {
      const match = title.match(pattern);
      if (!match) continue;
      for (const keyword of related || [normalize(match[0])]) {
        if (suggestions.has(keyword)) continue;
        suggestions.set(keyword, { keyword, category, sourceTopic: title, sourceDate, sourceUrl, traffic,
          basis: 'Related keyword idea — not measured product demand' });
      }
    }
  });
  return { suggestions: [...suggestions.values()], topicCount };
}

export function createTrendService({ fetcher = fetch, now = Date.now } = {}) {
  let cached = null;
  let pending = null;
  let retryAfter = 0;
  return async function getTrends() {
    if (cached && now() - Date.parse(cached.fetchedAt) < 10 * 60_000) return cached;
    if (pending) return pending;
    if (now() < retryAfter) {
      if (cached) return { ...cached, stale: true };
      throw new Error('US trends are temporarily unavailable. Try again in a minute.');
    }
    pending = (async () => {
      try {
        const response = await fetcher(SOURCE_URL, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/rss+xml, application/xml, text/xml' } });
        if (!response.ok) throw new Error(`Trend feed returned HTTP ${response.status}`);
        const xml = await response.text();
        if (xml.length > 2_000_000) throw new Error('Trend feed is too large.');
        cached = { ...parseTrendSuggestions(xml), fetchedAt: new Date(now()).toISOString(), source: 'Google Trends · United States', sourceUrl: SOURCE_URL, stale: false };
        return cached;
      } catch {
        retryAfter = now() + 60000;
        if (cached) return { ...cached, stale: true };
        throw new Error('US trends are temporarily unavailable. Try again in a minute.');
      } finally { pending = null; }
    })();
    return pending;
  };
}
