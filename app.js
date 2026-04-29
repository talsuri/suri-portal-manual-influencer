// Configuration — replace before deploying.
// WEBHOOK_URL: your n8n webhook production URL (after activating the W4 workflow).
// API_KEY: matches the secret in W4's "Auth Check" node.
const CONFIG = {
  WEBHOOK_URL: "https://trysuri.app.n8n.cloud/webhook/manual-entry",
  API_KEY: "0b211913c38da5a95b1e44205526b3dc41a875c70c37f3b2",
  MAX_FILE_BYTES: 10 * 1024 * 1024 // 10 MB per file
};

const form = document.getElementById("entry-form");
const fileInput = document.getElementById("files");
const dropzone = document.getElementById("dropzone");
const fileListEl = document.getElementById("file-list");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");

// Files held in memory until submit (separate from the input element so we
// can render a list and allow individual removal).
let queuedFiles = [];

function renderFileList() {
  fileListEl.innerHTML = "";
  queuedFiles.forEach((file, idx) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = file.name;
    const size = document.createElement("span");
    size.className = "size";
    size.textContent = formatSize(file.size);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove";
    remove.addEventListener("click", () => {
      queuedFiles.splice(idx, 1);
      renderFileList();
    });
    li.append(name, size, remove);
    fileListEl.appendChild(li);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function addFiles(files) {
  for (const f of files) {
    if (f.size > CONFIG.MAX_FILE_BYTES) {
      setStatus("error", `${f.name} is over 10 MB — skipped`);
      continue;
    }
    queuedFiles.push(f);
  }
  renderFileList();
}

function setStatus(kind, message) {
  statusEl.className = "status " + kind;
  statusEl.textContent = message;
}

// Dropzone wiring
["dragenter", "dragover"].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});
dropzone.addEventListener("drop", e => {
  if (e.dataTransfer && e.dataTransfer.files.length) {
    addFiles(e.dataTransfer.files);
  }
});
fileInput.addEventListener("change", e => {
  if (e.target.files.length) {
    addFiles(e.target.files);
    fileInput.value = ""; // reset so the same file can be re-picked after removing
  }
});

// Submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const handle = document.getElementById("handle").value.trim().replace(/^@/, "");
  const platform = form.querySelector('input[name="platform"]:checked')?.value;
  const market = form.querySelector('input[name="market"]:checked')?.value;
  const owner = document.getElementById("owner").value;

  if (!handle) return setStatus("error", "Handle is required");
  if (!platform) return setStatus("error", "Pick a platform");
  if (!market) return setStatus("error", "Pick a market");
  if (!owner) return setStatus("error", "Pick an owner");
  if (queuedFiles.length === 0) return setStatus("error", "Add at least one stat screenshot");

  const formData = new FormData();
  formData.append("handle", handle);
  formData.append("platform", platform);
  formData.append("market", market);
  formData.append("owner", owner);
  queuedFiles.forEach((f) => formData.append("files", f, f.name));

  submitBtn.disabled = true;
  setStatus("pending", "Submitting…");

  try {
    const res = await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "X-API-Key": CONFIG.API_KEY },
      body: formData
    });
    const text = await res.text();
    let payload = {};
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }

    if (!res.ok) {
      setStatus("error", `Submission failed (${res.status}): ${payload.error || payload.message || "unknown error"}`);
    } else {
      setStatus("success", "✓ Submitted — check Slack for confirmation");
      // Reset form
      form.reset();
      queuedFiles = [];
      renderFileList();
    }
  } catch (err) {
    setStatus("error", "Network error: " + err.message);
  } finally {
    submitBtn.disabled = false;
  }
});
