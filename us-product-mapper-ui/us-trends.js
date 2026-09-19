const filter = document.getElementById('trendFilter');
const category = document.getElementById('trendCategory');
const newOnly = document.getElementById('newOnly');
const refresh = document.getElementById('refreshTrends');
const status = document.getElementById('trendStatus');
const source = document.getElementById('trendSource');
const cards = document.getElementById('trendCards');
const normalize = value => value.toLowerCase().replace(/\s+/g, ' ').trim();
let data = null;
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, url) {
  const node = element('a', text);
  node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}
function render() {
  if (!data) return;
  const imports = new Map();
  for (const row of data.importedKeywords || []) {
    const key = normalize(row.keyword);
    if (!imports.has(key)) imports.set(key, new Set());
    imports.get(key).add(row.retailer);
  }
  const visible = data.suggestions.filter(item => normalize(item.keyword).includes(normalize(filter.value)) && (!category.value || category.value === item.category) && (!newOnly.checked || !imports.has(normalize(item.keyword))));
  cards.replaceChildren(...visible.map(item => {
    const card = element('article', '', 'trend-card');
    card.append(element('small', item.category), element('h2', item.keyword));
    const saved = imports.get(normalize(item.keyword));
    card.append(element('p', data.importedKeywords === null ? 'Import status unavailable' : saved ? `Imported: ${[...saved].join(', ')}` : 'No exact keyword import found', saved ? 'trend-imported' : 'trend-note'));
    card.append(element('p', `Inspired by: ${item.sourceTopic}`));
    card.append(element('p', item.basis, 'trend-note'));
    if (item.sourceDate) card.append(element('p', `Topic published: ${new Date(item.sourceDate).toLocaleString()}`, 'trend-note'));
    if (item.traffic) card.append(element('p', `Source topic traffic: ${item.traffic} (not keyword volume)`, 'trend-note'));
    card.append(link('Check topic on Google Trends ↗', item.sourceUrl));
    const actions = element('div', '', 'trend-actions');
    const copy = element('button', 'Copy keyword', 'secondary-button');
    copy.type = 'button';
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(item.keyword); copy.textContent = 'Copied'; }
      catch { copy.textContent = 'Select the keyword above to copy'; }
    };
    actions.append(copy);
    const keyword = encodeURIComponent(item.keyword);
    for (const [name, url] of [
      ['Amazon', `https://www.amazon.com/s?k=${keyword}`],
      ['Best Buy', `https://www.bestbuy.com/site/searchpage.jsp?st=${keyword}`],
      ['Walmart', `https://www.walmart.com/search?q=${keyword}`],
      ['eBay', `https://www.ebay.com/sch/i.html?_nkw=${keyword}`],
      ['Newegg', `https://www.newegg.com/p/pl?d=${keyword}`],
    ]) actions.append(link(name, url));
    card.append(actions);
    return card;
  }));
  status.textContent = data.suggestions.length === 0
    ? `No product-related topics found in the ${data.topicCount} topics returned by the US feed. Check back later.`
    : visible.length ? `${visible.length} keyword suggestions` : 'No suggestions match your filters.';
  if (data.importedKeywords === null) status.textContent += ' Import history could not be checked.';
  source.textContent = `${data.source} · Retrieved ${new Date(data.fetchedAt).toLocaleString()} · Refreshes at most every 10 minutes.${data.stale ? ' Feed unavailable — showing older cached suggestions.' : ''}`;
}
async function load() {
  refresh.disabled = true;
  cards.replaceChildren(); source.textContent = ''; data = null;
  status.textContent = 'Loading US trends…';
  try {
    const response = await fetch('/api/us-trends', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load US trends.');
    data = result;
    newOnly.disabled = data.importedKeywords === null;
    if (newOnly.disabled) newOnly.checked = false;
    render();
  } catch (error) { status.textContent = error.message; }
  finally { refresh.disabled = false; }
}
filter.oninput = render;
category.onchange = render;
newOnly.onchange = render;
refresh.onclick = load;
load();
