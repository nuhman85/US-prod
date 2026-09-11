const filePicker = document.getElementById("filePicker");
const folderPicker = document.getElementById("folderPicker");
const folderForm = document.getElementById("folderForm");
const status = document.getElementById("bulkStatus");
const totals = document.getElementById("bulkTotals");
const progress = document.getElementById("bulkProgress");
const resultList = document.getElementById("resultList");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function resultRow(result) {
  const ok = result.status !== "failed";
  return `<div class="result-row ${ok ? "success" : "failed"}"><span>${ok ? "✓" : "!"}</span><div><strong>${escapeHtml(result.filename)}</strong><small>${ok ? `${escapeHtml(result.retailer)} · ${result.productCount} products · ${escapeHtml(result.searchTerm)}` : escapeHtml(result.error)}</small></div></div>`;
}

function render(results, complete = false) {
  const imported = results.filter((result) => result.status !== "failed");
  const products = imported.reduce((sum, result) => sum + Number(result.productCount || 0), 0);
  const failed = results.length - imported.length;
  status.textContent = complete ? "Bulk import complete" : "Importing saved pages…";
  totals.textContent = `${imported.length} files imported · ${products} product rows processed${failed ? ` · ${failed} failed` : ""}`;
  resultList.innerHTML = results.map(resultRow).join("");
}

async function importFiles(fileList) {
  const files = [...fileList].filter((file) => /\.html?$/i.test(file.name));
  const results = [];
  resultList.innerHTML = "";
  if (!files.length) { status.textContent = "No HTML files selected"; return; }
  for (const [index, file] of files.entries()) {
    status.textContent = `Importing ${index + 1} of ${files.length}: ${file.name}`;
    progress.style.width = `${index / files.length * 100}%`;
    try {
      const response = await fetch("/api/bulk-import/file", { method: "POST", headers: { "content-type": "text/html", "x-filename": encodeURIComponent(file.name) }, body: await file.text() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      results.push({ status: "imported", ...data });
    } catch (error) {
      results.push({ status: "failed", filename: file.name, error: error.message });
    }
    render(results);
  }
  progress.style.width = "100%";
  render(results, true);
}

filePicker.onchange = () => importFiles(filePicker.files);
folderPicker.onchange = () => importFiles(folderPicker.files);

folderForm.onsubmit = async (event) => {
  event.preventDefault();
  status.textContent = "Importing folder…";
  totals.textContent = "This can take several minutes for large folders.";
  progress.style.width = "15%";
  resultList.innerHTML = "";
  try {
    const response = await fetch("/api/bulk-import/folder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folder: document.getElementById("folderPath").value.trim() }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    progress.style.width = "100%";
    render(data.results, true);
  } catch (error) {
    progress.style.width = "0";
    status.textContent = "Bulk import failed";
    totals.textContent = error.message;
  }
};
