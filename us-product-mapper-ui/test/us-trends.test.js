import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrendSuggestions, createTrendService, SOURCE_URL } from '../us-trends-store.js';
const feed = titles => `<rss xmlns:ht="https://trends.google.com/trending/rss"><channel>${titles.map(title => `<item><title>${title}</title><ht:approx_traffic>200+</ht:approx_traffic><pubDate>Mon, 14 Sep 2026 13:50:00 -0700</pubDate></item>`).join('')}</channel></rss>`;
test('suggests only recognized product topics, deduplicates and retains provenance', () => {
 const data = parseTrendSuggestions(feed(['political news', 'xbox subscription cancellations', 'xbox news', 'iphone 17 pro max launch']));
 assert.equal(data.topicCount,4);
 assert.deepEqual(data.suggestions.map(s=>s.keyword), ['xbox console','xbox controller','xbox gaming headset','iphone 17 pro max']);
 assert.equal(data.suggestions[0].traffic,'200+');
 assert.match(data.suggestions[0].basis,/not measured/);
 assert.match(data.suggestions[0].sourceUrl,/geo=US/);
 assert.equal(parseTrendSuggestions(feed(['baseball scores'])).suggestions.length,0);
 assert.throws(()=>parseTrendSuggestions('<html>error</html>'), /invalid feed/);
});
test('caches feed, shares in-flight requests and marks stale data on failure', async () => {
 let clock = Date.parse('2026-09-14T21:00:00Z'), calls=0, fail=false;
 const service = createTrendService({ now:()=>clock, fetcher:async url=>{
  assert.equal(url,SOURCE_URL); calls++;
  if(fail) throw new Error('offline');
  return {ok:true,text:async()=>feed(['ipad pro'])};
 }});
 await Promise.all([service(),service()]); assert.equal(calls,1);
 await service(); assert.equal(calls,1);
 clock+=601000; fail=true;
 const stale = await service(); assert.equal(stale.stale,true);
 assert.equal(stale.suggestions[0].keyword,'ipad pro');
 await service(); assert.equal(calls,2);
});
test('fails visibly on first fetch failure and throttles retries', async () => {
 let calls=0;
 const service=createTrendService({fetcher:async()=>{calls++;return {ok:false,status:503};}});
 await assert.rejects(service(),/temporarily unavailable/);
 await assert.rejects(service(),/temporarily unavailable/);
 assert.equal(calls,1);
});
