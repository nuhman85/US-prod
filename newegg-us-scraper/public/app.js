const form = document.querySelector("#upload-form");
const input = document.querySelector("#html-file");
const label = document.querySelector("#file-label");
const importButton = document.querySelector("#import");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const rows = document.querySelector("#product-rows");
const liveForm = document.querySelector("#live-form");
const liveTerm = document.querySelector("#live-term");
const liveStartPage = document.querySelector("#live-start-page");
const livePages = document.querySelector("#live-pages");
const liveSearchButton = document.querySelector("#live-search");
let previewedLiveTerm = null;
let previewedLiveStartPage = null;
let previewedLivePages = null;
let previewSource = null;

input.onchange = () => {
  label.textContent = input.files[0]?.name || "Choose a Newegg HTML file";
  previewSource = null;
  importButton.disabled = true;
  importButton.textContent = "Import preview to database";
  results.hidden = true;
};
function body() {
  const data = new FormData();
  if (input.files[0]) data.append("htmlFile", input.files[0]);
  return data;
}
async function request(path) {
  const response = await fetch(path, { method: "POST", body: body() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function render(data) {
  rows.replaceChildren(
    ...data.products.map((product, index) => {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td></td><td><a target='_blank' rel='noreferrer'></a></td><td></td><td></td><td></td>";
      row.children[0].textContent = index + 1;
      row.children[1].firstChild.href = product.url;
      row.children[1].firstChild.textContent = product.name;
      row.children[2].textContent = product.sku || "—";
      row.children[3].textContent = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: product.currency || "USD",
      }).format(product.price);
      row.children[4].textContent = product.seller || "Newegg";
      return row;
    }),
  );
  document.querySelector("#count").textContent = Number.isInteger(data.expected)
    ? `${data.count} / ${data.expected}`
    : String(data.count);
  results.hidden = false;
}
form.onsubmit = async (event) => {
  event.preventDefault();
  try {
    status.textContent = "Reading saved page…";
    const data = await request("/api/preview");
    render(data);
    previewSource = "html";
    importButton.textContent = "Import HTML preview to database";
    importButton.disabled = data.count !== data.expected;
    status.textContent = `Found ${data.count} products for “${data.searchTerm}” with URLs and prices.`;
    status.className = data.count === data.expected ? "success" : "error";
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  }
};

async function liveRequest(shouldImport) {
  const response = await fetch("/api/live-search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      searchTerm: liveTerm.value.trim(),
      startPage: Number(liveStartPage.value),
      pages: Number(livePages.value),
      import: shouldImport,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Live search failed");
  return data;
}
function invalidateLivePreview() {
  if (
    (liveTerm.value.trim() !== previewedLiveTerm ||
      Number(liveStartPage.value) !== previewedLiveStartPage ||
      Number(livePages.value) !== previewedLivePages) &&
    previewSource === "live"
  ) {
    previewSource = null;
    importButton.disabled = true;
    importButton.textContent = "Import preview to database";
  }
}
liveTerm.oninput = invalidateLivePreview;
liveStartPage.oninput = invalidateLivePreview;
livePages.oninput = invalidateLivePreview;
liveForm.onsubmit = async (event) => {
  event.preventDefault();
  try {
    liveSearchButton.disabled = true;
    importButton.disabled = true;
    status.textContent = "Searching Newegg.com…";
    status.className = "";
    const data = await liveRequest(false);
    render(data);
    previewedLiveTerm = data.searchTerm;
    previewedLiveStartPage = data.startPage;
    previewedLivePages = data.pages;
    previewSource = "live";
    importButton.textContent = "Import live preview to database";
    importButton.disabled = false;
    status.textContent = data.message;
    status.className = "success";
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  } finally {
    liveSearchButton.disabled = false;
  }
};
importButton.onclick = async () => {
  try {
    importButton.disabled = true;
    if (previewSource === "live") {
      liveSearchButton.disabled = true;
      status.textContent = "Refreshing and importing live Newegg results…";
      status.className = "";
      const data = await liveRequest(true);
      render(data);
      status.textContent = data.message;
      status.className = "success";
    } else if (previewSource === "html") {
      status.textContent = "Importing HTML products into PostgreSQL…";
      status.className = "";
      const data = await request("/api/import");
      render({ ...data, expected: data.count });
      status.textContent = data.message;
      status.className = "success";
    } else {
      throw new Error("Preview live results or an HTML file before importing");
    }
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  } finally {
    importButton.disabled = false;
    liveSearchButton.disabled = false;
  }
};
