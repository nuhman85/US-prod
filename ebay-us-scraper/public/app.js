const form = document.querySelector("#upload-form");
const fileInput = document.querySelector("#html-file");
const fileLabel = document.querySelector("#file-label");
const searchTerm = document.querySelector("#search-term");
const importButton = document.querySelector("#import");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const rows = document.querySelector("#product-rows");
const count = document.querySelector("#count");
const resultTitle = document.querySelector("#result-title");
const dropZone = document.querySelector("#drop-zone");
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

fileInput.addEventListener("change", () => {
  fileLabel.textContent = fileInput.files[0]?.name || "Choose an eBay HTML file";
  importButton.disabled = true;
  results.hidden = true;
});
for (const event of ["dragenter", "dragover"]) dropZone.addEventListener(event, () => dropZone.classList.add("drag"));
for (const event of ["dragleave", "drop"]) dropZone.addEventListener(event, () => dropZone.classList.remove("drag"));

function data() {
  const body = new FormData();
  if (fileInput.files[0]) body.append("htmlFile", fileInput.files[0]);
  if (searchTerm.value.trim()) body.append("searchTerm", searchTerm.value.trim());
  return body;
}
function setStatus(message, type = "") { status.textContent = message; status.className = type; }
function price(value) { return value === null ? "Not shown" : currency.format(value); }
function render(payload) {
  if (!searchTerm.value && payload.searchTerm) searchTerm.value = payload.searchTerm;
  resultTitle.textContent = payload.searchTerm ? `Results for “${payload.searchTerm}”` : "Products found";
  rows.replaceChildren(...payload.products.map((product, index) => {
    const row = document.createElement("tr");
    row.innerHTML = "<td></td><td><a target='_blank' rel='noreferrer'></a><small></small></td><td></td><td></td><td></td><td class='total'></td><td class='specs'></td>";
    row.children[0].textContent = index + 1;
    row.children[1].querySelector("a").href = product.url;
    row.children[1].querySelector("a").textContent = product.name;
    row.children[1].querySelector("small").textContent = product.condition || "";
    row.children[2].textContent = product.itemId;
    row.children[3].textContent = price(product.itemPrice);
    row.children[4].textContent = product.shippingFee === null ? (product.shippingText || "Not shown") : price(product.shippingFee);
    row.children[5].textContent = price(product.totalPrice);
    row.children[6].textContent = Object.entries(product.specifications || {})
      .map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
      .join(" · ");
    return row;
  }));
  count.textContent = String(payload.products.length);
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
    setStatus("Reading the saved page…");
    const payload = await request("/api/preview");
    render(payload);
    importButton.disabled = payload.count === 0;
    setStatus(`Found ${payload.count} products. Total price includes displayed shipping to United States.`, payload.count ? "success" : "error");
  } catch (error) { setStatus(error.message, "error"); }
});
importButton.addEventListener("click", async () => {
  try {
    importButton.disabled = true;
    setStatus("Importing into PostgreSQL…");
    const payload = await request("/api/import");
    render(payload);
    setStatus(`${payload.message}. Existing item URLs were updated.`, "success");
  } catch (error) { setStatus(error.message, "error"); }
  finally { importButton.disabled = false; }
});
