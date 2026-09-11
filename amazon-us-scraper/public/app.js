const form = document.querySelector("#search-form");
const status = document.querySelector("#status");
const toolbar = document.querySelector("#toolbar");
const summary = document.querySelector("#summary");
const results = document.querySelector("#results");
const download = document.querySelector("#download");
let latestResult = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

function render(result) {
  latestResult = result;
  const conditionLabel = result.condition === "both" ? "New + used" : `${result.condition[0].toUpperCase()}${result.condition.slice(1)} only`;
  summary.textContent = `${result.count} products found · ${result.savedCount} saved · ${conditionLabel} · ${result.pagesScraped} page${result.pagesScraped === 1 ? "" : "s"}`;
  toolbar.hidden = false;
  results.innerHTML = result.products.map((product) => `
    <article class="card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="">` : ""}
      <div class="card-content">
        <h2>${escapeHtml(product.title)}</h2>
        <p class="price">${product.price == null ? "Price unavailable" : `$${product.price.toFixed(2)} USD`}</p>
        <div class="meta">ASIN ${escapeHtml(product.asin)} · ${escapeHtml(product.condition)}${product.rating ? ` · ★ ${product.rating}` : ""}${product.reviewCount ? ` (${product.reviewCount.toLocaleString()})` : ""}</div>
        <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="noopener sponsored">View on Amazon.com</a>
      </div>
    </article>`).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  status.hidden = false;
  status.className = "status";
  status.textContent = "Searching Amazon.com. A browser window may open; complete any Amazon verification shown there.";
  toolbar.hidden = true;
  results.innerHTML = "";
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchTerm: document.querySelector("#search-term").value,
        maxPages: Number(document.querySelector("#max-pages").value),
        maxItems: Number(document.querySelector("#max-items").value),
        condition: new FormData(form).get("condition"),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search failed");
    status.hidden = true;
    render(data);
  } catch (error) {
    status.className = "status error";
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

download.addEventListener("click", () => {
  if (!latestResult) return;
  const fields = ["asin", "title", "price", "currency", "condition", "rating", "reviewCount", "prime", "sponsored", "imageUrl", "affiliateUrl"];
  const csv = [fields, ...latestResult.products.map((product) => fields.map((field) => product[field] ?? ""))]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `${latestResult.searchTerm.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "amazon-ca"}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});
