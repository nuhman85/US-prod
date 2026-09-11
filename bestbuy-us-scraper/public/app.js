const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#html-file");
const queryInput = document.querySelector("#search-query");
const fileLabel = document.querySelector("#file-label");
const importButton = document.querySelector("#import");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const rows = document.querySelector("#product-rows");
const count = document.querySelector("#count");
const dropZone = document.querySelector("#drop-zone");
let previewCount = 0;

fileInput.addEventListener("change", () => {
  fileLabel.textContent = fileInput.files[0]?.name || "Choose a Best Buy HTML file";
  importButton.disabled = true;
  results.hidden = true;
  previewCount = 0;
  if (fileInput.files[0]) form.requestSubmit();
});
queryInput.addEventListener("input", () => {
  importButton.disabled = previewCount < 1 || !queryInput.value.trim();
  importButton.title = !queryInput.value.trim()
    ? "Enter the search query before importing"
    : previewCount < 1 ? "No valid products were found" : "";
});
for (const event of ["dragenter", "dragover"]) dropZone.addEventListener(event, () => dropZone.classList.add("drag"));
for (const event of ["dragleave", "drop"]) dropZone.addEventListener(event, () => dropZone.classList.remove("drag"));

function data() {
  const body = new FormData();
  if (fileInput.files[0]) body.append("htmlFile", fileInput.files[0]);
  body.append("searchQuery", queryInput.value.trim());
  return body;
}
function setStatus(message, type = "") { status.textContent = message; status.className = type; }
function render(products) {
  rows.replaceChildren(...products.map((product, index) => {
    const row = document.createElement("tr");
    const specText = product.specifications.map((spec) => `${spec.name}: ${spec.value}`).join(" · ");
    row.innerHTML = '<td></td><td><a class="product-link" target="_blank" rel="noreferrer"></a></td><td></td><td class="price"></td><td class="specs"></td>';
    row.children[0].textContent = index + 1;
    row.children[1].firstChild.href = product.url;
    row.children[1].firstChild.textContent = product.name;
    row.children[2].textContent = product.sku;
    row.children[3].textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.price);
    row.children[4].textContent = specText;
    return row;
  }));
  count.textContent = `${products.length}`;
  results.hidden = false;
}
async function request(endpoint) {
  const response = await fetch(endpoint, { method: "POST", body: data() });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Reading and validating the saved page…");
    const payload = await request("/api/preview");
    if (payload.searchQuery) queryInput.value = payload.searchQuery;
    render(payload.products);
    previewCount = payload.count;
    importButton.disabled = previewCount < 1 || !queryInput.value.trim();
    importButton.title = previewCount < 1
      ? "No valid products were found"
      : !queryInput.value.trim() ? "Enter the search query before importing" : "";
    const nextStep = previewCount > 0
      ? (queryInput.value.trim() ? `Detected search query: “${queryInput.value.trim()}”. Ready to import.` : "Search query was not detected; enter it manually.")
      : "Import remains disabled because no valid products were found.";
    setStatus(`Found ${previewCount} products with URLs and prices. ${nextStep}`, previewCount > 0 ? "success" : "error");
  } catch (error) { setStatus(error.message, "error"); }
});
importButton.addEventListener("click", async () => {
  try {
    importButton.disabled = true;
    setStatus("Importing products into PostgreSQL…");
    const payload = await request("/api/import");
    render(payload.products);
    setStatus(`${payload.message}. Existing URLs were updated without duplicates.`, "success");
  } catch (error) { setStatus(error.message, "error"); }
  finally { importButton.disabled = false; }
});
