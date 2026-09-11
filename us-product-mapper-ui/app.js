const retailerInfo = {
  bestbuy: { name: "Best Buy", short: "BB", className: "bestbuy", idField: "bestbuyProductId" },
  walmart: { name: "Walmart", short: "✦", className: "walmart", idField: "walmartProductId" },
  ebay: { name: "eBay", short: "eb", className: "ebay", idField: "ebayProductId" },
  newegg: { name: "Newegg", short: "N", className: "newegg", idField: "neweggProductId" },
};

let terms = [];
let activeTerm = null;
let termView = "active";
let activeProduct = null;
let productOffset = 0;
let productTotal = 0;
let matches = {};
let defaultMatches = {};
let candidateCounts = {};
let defaultCandidateCounts = {};
let selected = {};
let manualSearchActive = false;
let exportStatus = null;
let ebayConditionFilter = "all";
let excludedWords = (() => {
  try { return JSON.parse(localStorage.getItem("caMapperExcludedWords") || "[]").filter((word) => /^[a-z0-9]+$/.test(word)); }
  catch { return []; }
})();

const ignoredExcludeWords = new Set(["a", "an", "and", "the", "for", "with", "to", "of", "in", "on", "by", "from"]);
const excludeQuery = () => encodeURIComponent(excludedWords.join(","));

function titleWords(title) {
  return [...new Set(String(title || "").toLowerCase().match(/[a-z0-9]+/g) || [])]
    .filter((word) => word.length > 1 && !ignoredExcludeWords.has(word) && !excludedWords.includes(word));
}

function saveExcludedWords() {
  localStorage.setItem("caMapperExcludedWords", JSON.stringify(excludedWords));
}

function renderExcludeFilters() {
  const active = document.getElementById("activeExcludes");
  active.innerHTML = excludedWords.map((word) => `<button class="exclude-chip" type="button" data-word="${escapeHtml(word)}" title="Remove this exclusion">${escapeHtml(word)} ×</button>`).join("");
  active.querySelectorAll("button").forEach((button) => {
    button.onclick = async () => {
      excludedWords = excludedWords.filter((word) => word !== button.dataset.word);
      saveExcludedWords();
      productOffset = 0;
      await refreshTerms({ preservePosition: true });
      await loadProduct();
    };
  });
  document.getElementById("excludeSummary").textContent = excludedWords.length
    ? `${excludedWords.length} active filter${excludedWords.length === 1 ? "" : "s"}`
    : "No exclusions applied";
  document.getElementById("clearExcludes").hidden = excludedWords.length === 0;
  const words = titleWords(activeProduct?.title);
  document.getElementById("excludeWordList").innerHTML = words.length
    ? words.map((word) => `<label><input type="checkbox" value="${escapeHtml(word)}">${escapeHtml(word)}</label>`).join("")
    : "<span class=\"empty-state\">No additional title words available.</span>";
}

const money = (value, currency = "USD") => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function asCount(value) {
  return Number.parseInt(value ?? "0", 10) || 0;
}

function normalizeExportStatus(value) {
  return String(value || "pending").trim().toLowerCase() || "pending";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setLoading(message = "Loading products from PostgreSQL…") {
  document.getElementById("masterCard").className = "loading-card";
  document.getElementById("masterCard").innerHTML = message;
  document.getElementById("retailerGrid").innerHTML = "";
}

function renderTerms() {
  const list = document.getElementById("termList");
  list.innerHTML = "";
  terms.forEach(({ search_term: term, product_count: count }) => {
    const button = document.createElement("button");
    button.className = `term-chip${term === activeTerm ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(term)}</strong><small>${count}</small>`;
    button.onclick = () => selectTerm(term);
    list.appendChild(button);
  });
  document.querySelector(".term-total").textContent = `${terms.length} ${termView === "completed" ? "completed" : "pending"} term${terms.length === 1 ? "" : "s"}`;
  document.getElementById("termPrev").disabled = terms.length < 2;
  document.getElementById("termNext").disabled = terms.length < 2;
}

function renderTermView() {
  document.getElementById("activeTermsTab").classList.toggle("active", termView === "active");
  document.getElementById("completedTermsTab").classList.toggle("active", termView === "completed");
  const checkbox = document.getElementById("termCompleted");
  checkbox.checked = termView === "completed";
  checkbox.disabled = !activeTerm;
  document.getElementById("termCompletedLabel").textContent = termView === "completed"
    ? "Completed — uncheck to reopen"
    : "Mark search term complete";
}

function renderMaster() {
  const p = activeProduct;
  const status = normalizeExportStatus(p.export_status);
  const exportBadge = p.reviewed ? `<span class="export-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>` : "";
  const exportedDetail = p.pricematch_product_id ? `<span>CompareAllStores #${escapeHtml(p.pricematch_product_id)}</span>` : "";
  const image = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="" style="width:100%;height:100%;object-fit:contain" referrerpolicy="no-referrer">`
    : "<span>📦</span>";
  document.getElementById("masterCard").className = "master-card";
  document.getElementById("masterCard").innerHTML = `
    <div class="product-image">${image}<b class="retailer-badge">amazon.com</b></div>
    <div class="product-copy">
      <div class="product-meta"><span class="master-label">MASTER PRODUCT</span><span>ASIN ${escapeHtml(p.asin || "—")}</span>${p.reviewed ? "<span>Mapped in us_product_list</span>" : ""}${exportBadge}</div>
      <h3 class="product-title"><a href="${escapeHtml(p.affiliate_url || `https://www.amazon.com/dp/${p.asin}`)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title || "Untitled Amazon product")} <span aria-hidden="true">↗</span></a></h3>
      <div class="product-details"><span>${p.rating ?? "—"} ★ (${p.review_count ?? 0})</span><span>${p.is_prime ? "Prime" : "Amazon.com"}</span>${p.model_number ? `<span>Model ${escapeHtml(p.model_number)}</span>` : ""}${p.mpn ? `<span>MPN ${escapeHtml(p.mpn)}</span>` : ""}${p.upc ? `<span>UPC ${escapeHtml(p.upc)}</span>` : ""}<span>ID ${p.id}</span>${exportedDetail}<a href="${escapeHtml(p.affiliate_url || `https://www.amazon.com/dp/${p.asin}`)}" target="_blank" rel="noopener noreferrer">Open Amazon.com ↗</a></div>
    </div>
    <div class="master-price"><strong>${money(p.price, p.currency)}</strong><span>Amazon.com price</span></div>`;
  const pageInput = document.getElementById("productPage");
  pageInput.value = productOffset + 1;
  pageInput.max = productTotal;
  document.getElementById("productTotal").textContent = productTotal;
  document.getElementById("productPrev").disabled = productOffset === 0;
  document.getElementById("productNext").disabled = productOffset >= productTotal - 1;
  renderExcludeFilters();
}

function createCandidate(retailer, item) {
  const itemId = Number(item.id);
  const wrapper = document.createElement("div");
  wrapper.className = "candidate-wrap";
  const button = document.createElement("button");
  button.className = `candidate${selected[retailer] === itemId ? " selected" : ""}`;
  button.type = "button";
  const breakdown = item.score_breakdown || {};
  button.title = item.match_method === "hybrid"
    ? `Hybrid match: ${breakdown.lexical}% title, ${breakdown.semantic}% semantic, ${breakdown.metadata >= 0 ? "+" : ""}${breakdown.metadata} metadata`
    : `Title and product-metadata match: ${breakdown.lexical ?? item.confidence}%`;
  const thumbnail = item.image_url
    ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span>${retailer === "bestbuy" ? "💻" : retailer === "walmart" ? "📦" : retailer === "newegg" ? "🥚" : "🏷️"}</span>`;
  const identifiers = [item.model_number && `Model ${item.model_number}`, item.mpn && `MPN ${item.mpn}`, item.upc && `UPC ${item.upc}`].filter(Boolean);
  button.innerHTML = `
    <div class="product-image">${thumbnail}</div>
    <div class="candidate-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml([...identifiers, item.detail || item.sku || `ID ${item.id}`].join(" · "))}</small></div>
    <div class="candidate-price"><strong>${money(item.price, item.currency)}</strong>${retailer === "ebay" ? "<small>total</small>" : ""}<span class="score ${item.confidence < 80 ? "medium" : ""}">${item.confidence}%</span></div>
    <span class="select-circle">✓</span>`;
  button.onclick = () => {
    selected[retailer] = selected[retailer] === itemId ? undefined : itemId;
    renderRetailers();
    updateSelection();
  };
  const link = document.createElement("a");
  link.className = "candidate-link";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = `Open on ${retailerInfo[retailer].name}`;
  link.setAttribute("aria-label", `Open ${item.title} on ${retailerInfo[retailer].name}`);
  link.textContent = "↗";
  wrapper.append(button, link);
  return wrapper;
}

function renderRetailers() {
  const grid = document.getElementById("retailerGrid");
  grid.innerHTML = "";
  Object.entries(retailerInfo).forEach(([key, retailer]) => {
    if (manualSearchActive && Number.isInteger(selected[key])) return;
    const allCandidates = matches[key] || [];
    const candidates = key === "ebay"
      ? allCandidates.filter((item) => ebayConditionFilter === "all" || item.condition_group === ebayConditionFilter).slice(0, 5)
      : allCandidates;
    const column = document.createElement("article");
    column.className = `retailer-column ${retailer.className}`;
    column.innerHTML = `<header class="retailer-header"><div class="retailer-brand"><span class="logo-box">${retailer.short}</span>${retailer.name}</div><span class="match-count">${candidates.length} possible matches</span></header>${key === "ebay" ? `<div class="condition-tabs" role="tablist" aria-label="Filter eBay listings by condition"><button type="button" class="condition-tab${ebayConditionFilter === "all" ? " active" : ""}" data-condition="all">All</button><button type="button" class="condition-tab${ebayConditionFilter === "new" ? " active" : ""}" data-condition="new">New</button><button type="button" class="condition-tab${ebayConditionFilter === "used" ? " active" : ""}" data-condition="used">Used</button></div>` : ""}<div class="candidate-list"></div>`;
    column.querySelectorAll(".condition-tab").forEach((tab) => {
      tab.onclick = () => {
        ebayConditionFilter = tab.dataset.condition;
        renderRetailers();
      };
    });
    const list = column.querySelector(".candidate-list");
    if (!candidates.length) {
      const importedCount = asCount(candidateCounts[key]);
      list.innerHTML = importedCount
        ? `<div class="empty-state"><strong>${importedCount} imported listing${importedCount === 1 ? "" : "s"}</strong><br>None match this Amazon product's model, storage, or product type.</div>`
        : `<div class="empty-state">No imported products found for<br><strong>${escapeHtml(activeTerm)}</strong></div>`;
    }
    candidates.forEach((item) => list.appendChild(createCandidate(key, item)));
    grid.appendChild(column);
  });
}

function updateSelection() {
  const keys = Object.keys(selected).filter((key) => Number.isInteger(selected[key]));
  document.getElementById("selectedLogos").innerHTML = `<span class="logo-box" style="background:#ff9900;color:#111">a</span>` + keys.map((key) => {
    const r = retailerInfo[key];
    return `<span class="logo-box ${r.className}">${r.short}</span>`;
  }).join("");
  document.getElementById("selectionTitle").textContent = `Amazon master + ${keys.length} match${keys.length === 1 ? "" : "es"}`;
  document.getElementById("selectionHint").textContent = keys.length ? `${keys.map((key) => retailerInfo[key].name).join(", ")} selected` : "Choose one listing from any retailer";
  document.getElementById("saveButton").disabled = keys.length === 0;
  if (manualSearchActive) {
    const remaining = Object.keys(retailerInfo).filter((key) => !Number.isInteger(selected[key]));
    document.getElementById("manualMatchHint").textContent = remaining.length
      ? `Searching ${remaining.map((key) => retailerInfo[key].name).join(", ")} — selected retailers are hidden.`
      : "All retailers have a selected listing. Clear the search to review them.";
  }
}

function clearManualSearch() {
  manualSearchActive = false;
  matches = defaultMatches;
  candidateCounts = defaultCandidateCounts;
  document.getElementById("manualMatchSearch").value = "";
  document.getElementById("manualMatchClear").hidden = true;
  document.getElementById("manualMatchHint").textContent = "Optional — use this when the suggested matches do not contain the product.";
  renderRetailers();
  updateSelection();
}

async function searchImportedListings(query) {
  const retailers = Object.keys(retailerInfo).filter((key) => !Number.isInteger(selected[key]));
  if (!retailers.length) {
    showToast("All retailers already have a selected listing", "Nothing left to search");
    return;
  }
  const button = document.getElementById("manualMatchButton");
  button.disabled = true;
  try {
    const result = await api(`/api/manual-matches/${activeProduct.id}?q=${encodeURIComponent(query)}&retailers=${retailers.join(",")}`);
    manualSearchActive = true;
    matches = result.matches || {};
    candidateCounts = result.candidateCounts || {};
    document.getElementById("manualMatchClear").hidden = false;
    renderRetailers();
    updateSelection();
  } finally {
    button.disabled = false;
  }
}

async function loadProduct() {
  setLoading();
  selected = {};
  manualSearchActive = false;
  document.getElementById("manualMatchSearch").value = "";
  document.getElementById("manualMatchClear").hidden = true;
  try {
    const titleContainsTerm = document.getElementById("titleContainsTerm").checked;
    const result = await api(`/api/amazon-products?searchTerm=${encodeURIComponent(activeTerm)}&offset=${productOffset}&titleContainsTerm=${titleContainsTerm}&includeExported=${termView === "completed"}&exclude=${excludeQuery()}`);
    activeProduct = result.product;
    productTotal = result.total;
    if (!activeProduct) return setLoading("No Amazon products found for this term.");
    const matchResult = await api(`/api/matches/${activeProduct.id}`);
    matches = matchResult.matches;
    defaultMatches = matchResult.matches;
    candidateCounts = matchResult.candidateCounts || {};
    defaultCandidateCounts = matchResult.candidateCounts || {};
    if (matchResult.saved) {
      selected = {
        bestbuy: matchResult.saved.bestbuy_product_id == null ? undefined : Number(matchResult.saved.bestbuy_product_id),
        walmart: matchResult.saved.walmart_product_id == null ? undefined : Number(matchResult.saved.walmart_product_id),
        ebay: matchResult.saved.ebay_product_id == null ? undefined : Number(matchResult.saved.ebay_product_id),
        newegg: matchResult.saved.newegg_product_id == null ? undefined : Number(matchResult.saved.newegg_product_id),
      };
    }
    renderMaster();
    renderRetailers();
    updateSelection();
  } catch (error) {
    setLoading(`Unable to load database products: ${escapeHtml(error.message)}`);
  }
}

async function selectTerm(term) {
  activeTerm = term;
  productOffset = 0;
  renderTerms();
  renderTermView();
  await loadProduct();
}

function showToast(message = "Added to us_product_list", title = "Product saved") {
  const toast = document.getElementById("toast");
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 3200);
}

function renderExportStatus(data) {
  const counts = data?.counts || {};
  const total = asCount(counts.total_count);
  const pending = asCount(counts.pending_count) + asCount(counts.exporting_count);
  const failed = asCount(counts.failed_count);
  const exported = asCount(counts.exported_count);
  const nonExported = asCount(counts.non_exported_count);
  const exportButton = document.getElementById("exportButton");

  document.getElementById("exportTotalCount").textContent = total;
  document.getElementById("exportPendingCount").textContent = pending;
  document.getElementById("exportedCount").textContent = exported;
  document.getElementById("exportFailedCount").textContent = failed;
  document.getElementById("navExportPendingCount").textContent = nonExported;
  document.getElementById("exportTarget").textContent = `Target: ${data?.targetUrl || "https://compareallstores.com/ca"}`;

  if (!data?.configured) {
    exportButton.disabled = true;
    exportButton.querySelector("span").textContent = "Secret missing";
  } else if (nonExported === 0) {
    exportButton.disabled = true;
    exportButton.querySelector("span").textContent = "Nothing to export";
  } else {
    exportButton.disabled = false;
    exportButton.querySelector("span").textContent = `Export ${nonExported}`;
  }

  const rows = Array.isArray(data?.recent) ? data.recent : [];
  document.getElementById("exportRecent").innerHTML = rows.length
    ? `<table><thead><tr><th>Product</th><th>Status</th><th>Exported</th><th>Target ID</th></tr></thead><tbody>${rows.map((row) => {
        const status = normalizeExportStatus(row.export_status);
        return `<tr>
          <td><strong>${escapeHtml(row.amazon_title || "Untitled product")}</strong><small>${money(row.amazon_price, row.amazon_currency)}</small></td>
          <td><span class="export-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>${row.export_error ? `<small>${escapeHtml(row.export_error)}</small>` : ""}</td>
          <td>${escapeHtml(formatDate(row.exported_at || row.last_export_attempt_at))}</td>
          <td>${row.pricematch_product_id ? `#${escapeHtml(row.pricematch_product_id)}` : "—"}</td>
        </tr>`;
      }).join("")}</tbody></table>`
    : `<div class="empty-state">No mapped rows found in us_product_list.</div>`;
}

async function refreshExportStatus() {
  try {
    exportStatus = await api("/api/export-status");
    renderExportStatus(exportStatus);
  } catch (error) {
    document.getElementById("exportRecent").innerHTML = `<div class="empty-state">Unable to load export status: ${escapeHtml(error.message)}</div>`;
  }
}

async function refreshTerms({ preservePosition = false } = {}) {
  await refreshExportStatus();
  const titleContainsTerm = document.getElementById("titleContainsTerm").checked;
  const result = await api(`/api/search-terms?status=${termView}&titleContainsTerm=${titleContainsTerm}&exclude=${excludeQuery()}`);
  terms = result.terms;
  document.getElementById("navActiveTermCount").textContent = result.counts?.active ?? 0;
  document.getElementById("navCompletedTermCount").textContent = result.counts?.completed ?? 0;
  const total = terms.reduce((sum, term) => sum + term.product_count, 0);
  const reviewed = terms.reduce((sum, term) => sum + term.reviewed_count, 0);
  document.getElementById("progressText").textContent = `${reviewed} of ${total} reviewed`;
  document.getElementById("progressBar").style.width = `${total ? reviewed / total * 100 : 0}%`;
  document.getElementById("navSavedCount").textContent = reviewed;
  if (!terms.length) {
    activeTerm = null;
    activeProduct = null;
    renderTerms();
    renderTermView();
    setLoading(termView === "completed" ? "No completed search terms yet." : "No pending search terms remain.");
    return;
  }
  if (preservePosition && activeTerm && terms.some((term) => term.search_term === activeTerm)) {
    renderTerms();
    return;
  }
  await selectTerm(terms[0].search_term);
}

async function switchTermView(view) {
  termView = view;
  activeTerm = null;
  productOffset = 0;
  renderTermView();
  document.querySelector(".term-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  await refreshTerms();
}

document.getElementById("productPrev").onclick = () => { productOffset -= 1; loadProduct(); };
document.getElementById("productNext").onclick = () => { productOffset += 1; loadProduct(); };
function jumpToProduct() {
  const input = document.getElementById("productPage");
  const requestedPage = Number.parseInt(input.value, 10);
  if (!Number.isInteger(requestedPage)) {
    input.value = productOffset + 1;
    return;
  }
  const page = Math.max(1, Math.min(productTotal, requestedPage));
  input.value = page;
  if (page - 1 === productOffset) return;
  productOffset = page - 1;
  loadProduct();
}
document.getElementById("productPage").onchange = jumpToProduct;
document.getElementById("productPage").onkeydown = (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    jumpToProduct();
    event.currentTarget.blur();
  }
};
document.getElementById("termPrev").onclick = () => selectTerm(terms[(terms.findIndex((term) => term.search_term === activeTerm) - 1 + terms.length) % terms.length].search_term);
document.getElementById("termNext").onclick = () => selectTerm(terms[(terms.findIndex((term) => term.search_term === activeTerm) + 1) % terms.length].search_term);
document.getElementById("activeTermsTab").onclick = () => switchTermView("active");
document.getElementById("completedTermsTab").onclick = () => switchTermView("completed");
document.getElementById("termCompleted").onchange = async (event) => {
  if (!activeTerm) return;
  const completed = event.target.checked;
  event.target.disabled = true;
  try {
    await api(`/api/search-terms/${encodeURIComponent(activeTerm)}/completion`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    showToast(completed ? "Search term marked complete" : "Search term reopened", "Search term updated");
    await refreshTerms();
  } catch (error) {
    event.target.checked = !completed;
    showToast(error.message, "Unable to update search term");
  } finally {
    event.target.disabled = !activeTerm;
  }
};
document.getElementById("manualMatchForm").onsubmit = async (event) => {
  event.preventDefault();
  const query = document.getElementById("manualMatchSearch").value.trim();
  if (query.length < 2) {
    showToast("Enter at least two characters", "Search is too short");
    return;
  }
  try {
    await searchImportedListings(query);
  } catch (error) {
    showToast(error.message, "Unable to search listings");
  }
};
document.getElementById("manualMatchClear").onclick = clearManualSearch;
document.getElementById("titleContainsTerm").onchange = async () => {
  productOffset = 0;
  await refreshTerms({ preservePosition: true });
  await loadProduct();
};
document.getElementById("toggleExcludePicker").onclick = () => {
  const picker = document.getElementById("excludePicker");
  picker.hidden = !picker.hidden;
  if (!picker.hidden) renderExcludeFilters();
};
document.getElementById("applyExcludes").onclick = async () => {
  const additions = [...document.querySelectorAll("#excludeWordList input:checked")].map((input) => input.value);
  excludedWords = [...new Set([...excludedWords, ...additions])];
  saveExcludedWords();
  document.getElementById("excludePicker").hidden = true;
  productOffset = 0;
  await refreshTerms({ preservePosition: true });
  await loadProduct();
};
document.getElementById("clearExcludes").onclick = async () => {
  excludedWords = [];
  saveExcludedWords();
  productOffset = 0;
  await refreshTerms({ preservePosition: true });
  await loadProduct();
};
document.getElementById("skipButton").onclick = () => { if (productOffset < productTotal - 1) { productOffset += 1; loadProduct(); } };
document.getElementById("toast").querySelector("button").onclick = () => document.getElementById("toast").classList.remove("visible");
document.getElementById("exportButton").onclick = async () => {
  const button = document.getElementById("exportButton");
  button.disabled = true;
  button.querySelector("span").textContent = "Exporting…";
  try {
    const result = await api("/api/export-pending", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 250 }) });
    showToast(result.message || "Export completed");
    await refreshTerms();
  } catch (error) {
    showToast(error.message);
    await refreshExportStatus();
  }
};
document.getElementById("saveButton").onclick = async () => {
  const button = document.getElementById("saveButton");
  button.disabled = true;
  button.querySelector("span").textContent = "Saving…";
  try {
    const body = { amazonProductId: Number(activeProduct.id) };
    Object.entries(retailerInfo).forEach(([key, info]) => { if (Number.isInteger(selected[key])) body[info.idField] = selected[key]; });
    await api("/api/consolidated-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    showToast();
    const nextOffset = Math.min(productOffset + 1, productTotal - 1);
    await refreshTerms({ preservePosition: true });
    productOffset = nextOffset;
    await loadProduct();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.querySelector("span").textContent = "Save consolidated product";
    updateSelection();
  }
};

renderTermView();
refreshTerms().catch((error) => setLoading(`Unable to start: ${escapeHtml(error.message)}`));
