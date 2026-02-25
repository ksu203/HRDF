// =============================
// Supabase Configuration
// =============================

const SUPABASE_URL = "https://ygruefrffbpatidldxd.supabase.co";
const SUPABASE_KEY = "sb_publishable_8GpUTVWD4YNPJA3jFnrlDA_8fLTBTS2";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// =============================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "hrdf_irshad_content_v3";
const THEME_KEY = "hrdf_irshad_theme";
const COUNTER_KEY = "hrdf_irshad_content_counter_v1";

const state = {
  items: [],
  q: "",
  filterContentType: "all",
  filterBeneficiary: "all",
  sortBy: "number_desc",
  editingId: null,
};

function uid() {
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function nowISO() {
  return new Date().toISOString();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

function getNextNumber() {
  const raw = localStorage.getItem(COUNTER_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  const next = Number.isFinite(n) ? (n + 1) : 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

// =============================
// 🔥 Supabase Upload
// =============================

async function uploadToSupabase(file) {
  const fileName = Date.now() + "_" + file.name;

  const { error } = await supabaseClient.storage
    .from("media")
    .upload(fileName, file);

  if (error) {
    console.error(error);
    alert("فشل رفع المرفق");
    return null;
  }

  const { data } = supabaseClient.storage
    .from("media")
    .getPublicUrl(fileName);

  return {
    name: file.name,
    mime: file.type || "",
    size: file.size || 0,
    url: data.publicUrl,
    uploadedAt: nowISO(),
  };
}

// =============================
// Render
// =============================

function render() {
  const tbody = $("#rows");
  tbody.innerHTML = "";

  for (const item of state.items) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${String(item.contentNumber).padStart(3,"0")}</td>
      <td>${item.title || "-"}</td>
      <td>${item.availableCount || 0}</td>
      <td>${item.consumedCount || 0}</td>
      <td>
       ${item.attachment?.url ? renderAttachment(item.attachment) : "-"}
      </td>
      <td>
        <button onclick="deleteItem('${item.id}')" class="btn btn--danger">حذف</button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

// =============================
// CRUD
// =============================

function deleteItem(id) {
  state.items = state.items.filter(x => x.id !== id);
  saveLocal();
  render();
}

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("#id").value || uid();
  const isEdit = Boolean($("#id").value);

  const file = $("#attachmentFile").files?.[0] || null;

  let attachment = null;
  const prev = state.items.find(x => x.id === id);

  if (file) {
    attachment = await uploadToSupabase(file);
  } else if (isEdit && prev?.attachment) {
    attachment = prev.attachment;
  }

  const item = {
    id,
    contentNumber: isEdit ? prev.contentNumber : getNextNumber(),
    title: $("#title").value.trim(),
    availableCount: parseInt($("#availableCount").value || "0", 10),
    consumedCount: parseInt($("#consumedCount").value || "0", 10),
    attachment,
    createdAt: isEdit ? prev.createdAt : nowISO(),
    updatedAt: nowISO(),
  };

  const idx = state.items.findIndex(x => x.id === id);
  if (idx >= 0) {
    state.items[idx] = item;
  } else {
    state.items.unshift(item);
  }

  saveLocal();
  $("#modal").classList.remove("is-open");
});

// =============================
// Init
// =============================

function init() {
  state.items = loadLocal();
  // =============================
// Attachment Renderer
// =============================

function renderAttachment(att) {
  const url = att.url;
  const mime = att.mime || "";

  if (mime.startsWith("image/")) {
    return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <img src="${url}" 
             style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.2);" />
        <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">فتح</button>
      </div>
    `;
  }

  if (mime.startsWith("video/")) {
    return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <span>🎥</span>
        <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">عرض</button>
      </div>
    `;
  }

  if (mime.startsWith("audio/")) {
    return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <span>🎵</span>
        <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">تشغيل</button>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
      <span>📄</span>
      <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">تحميل</button>
    </div>
  `;
}
function render() {
   ...

  render();
}

init();
// =============================
// Modal Control
// =============================

const modal = document.getElementById("modal");
const btnNew = document.getElementById("btnNew");
const btnNew2 = document.getElementById("btnNew2");
const btnClose = document.getElementById("btnClose");

// فتح المودال
function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

// إغلاق المودال
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

// زر محتوى جديد
btnNew?.addEventListener("click", () => {
  document.getElementById("form").reset();
  document.getElementById("id").value = "";
  openModal();
});

// زر داخل empty state
btnNew2?.addEventListener("click", openModal);

// زر X
btnClose?.addEventListener("click", closeModal);

// الضغط على الخلفية
document.querySelectorAll("[data-close]").forEach(el => {
  el.addEventListener("click", closeModal);
});
