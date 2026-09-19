const filter = document.getElementById('keywordFilter');
const retailer = document.getElementById('retailerFilter');
const rows = document.getElementById('keywordRows');
const status = document.getElementById('keywordStatus');
const refresh = document.getElementById('refreshKeywords');
let keywords = [];
let loaded = false;
const normalize = value => value.trim().toLowerCase().replace(/\s+/g, ' ');
function render() {
  if (!loaded) return;
  const query = normalize(filter.value);
  const visible = keywords.filter(row => normalize(row.keyword).includes(query) && (!retailer.value || row.retailer === retailer.value));
  rows.replaceChildren(...visible.map(item => {
    const row = document.createElement('tr');
    for (const value of [item.keyword, item.retailer, item.product_count, item.last_imported_at ? new Date(item.last_imported_at).toLocaleString() : '—']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  }));
  status.textContent = !keywords.length ? 'No imported keywords yet.' : !visible.length ? 'No imported keywords match these filters.' : `${visible.length} saved ${visible.length === 1 ? "entry" : "entries"}`;
}
async function load() {
  refresh.disabled = true;
  loaded = false;
  rows.replaceChildren();
  status.textContent = 'Loading imported keywords…';
  try {
    const response = await fetch('/api/imported-keywords', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load imported keywords. Please try Refresh.');
    keywords = (await response.json()).keywords;
    loaded = true;
    render();
  } catch (error) { status.textContent = error.message; }
  finally { refresh.disabled = false; }
}
filter.addEventListener('input', render);
retailer.addEventListener('change', render);
refresh.addEventListener('click', load);
load();
