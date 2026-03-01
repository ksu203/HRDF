// =============================
// Storage
// =============================

const STORAGE_KEY = "hrdf_irshad_content_clean";

let state = {
  items: []
};

// =============================
// Helpers
// =============================

function uid() {
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// =============================
// Render
// =============================

function render() {

  const tbody = document.getElementById("rows");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (state.items.length === 0) {
    tbody.innerHTML =
      `<tr>
        <td colspan="8" style="text-align:center;padding:20px;">
          لا يوجد محتوى
        </td>
      </tr>`;
  } else {
    state.items.forEach(item => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.contentNumber}</td>
        <td>${item.title}</td>
        <td>${item.contentType}</td>
        <td>${item.targetGroup || "-"}</td>
        <td>-</td>
        <td>-</td>
        <td>
          <button onclick="deleteItem('${item.id}')">حذف</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  updateStats();
}

// =============================
// Stats
// =============================

function updateStats() {

  const totalEl = document.getElementById("statTotal");
  const usedEl = document.getElementById("statUsed");
  const typeStats = document.getElementById("typeStats");

  if (totalEl) totalEl.textContent = state.items.length;
  if (usedEl) usedEl.textContent = 0;

  if (!typeStats) return;

  typeStats.innerHTML = "";

  const counts = {};

  state.items.forEach(i => {
    counts[i.contentType] = (counts[i.contentType] || 0) + 1;
  });

  const types = [
    "article",
    "video",
    "images",
    "infographic",
    "audio",
    "press",
    "podcast"
  ];

  types.forEach(type => {

    const div = document.createElement("div");
    div.className = "stats-item";

    div.innerHTML = `
      <span>${type}</span>
      <span class="stats-number">${counts[type] || 0}</span>
    `;

    typeStats.appendChild(div);
  });
}

// =============================
// Add
// =============================

document.getElementById("form")?.addEventListener("submit", function(e){

  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const contentType = document.getElementById("contentType").value;
  const targetGroup = document.getElementById("targetGroup").value;

  if (!title) return;

  const item = {
    id: uid(),
    contentNumber: state.items.length + 1,
    title,
    contentType,
    targetGroup
  };

  state.items.push(item);

  saveLocal();
  render();
  closeModal();
});

// =============================
// Delete
// =============================

function deleteItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  saveLocal();
  render();
}

// =============================
// Modal
// =============================

function openModal() {
  document.getElementById("modal")?.classList.add("active");
}

function closeModal() {
  document.getElementById("modal")?.classList.remove("active");
}

document.getElementById("btnNew")?.addEventListener("click", openModal);
document.getElementById("btnNew2")?.addEventListener("click", openModal);
document.getElementById("btnClose")?.addEventListener("click", closeModal);

// =============================
// Init
// =============================

function init() {
  state.items = loadLocal();
  render();
}

init();
