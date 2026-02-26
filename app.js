// =============================
// Supabase Configuration
// =============================

const SUPABASE_URL = "https://ygruefrffbpatidtldxd.supabase.co";
const SUPABASE_KEY = "sb_publishable_8GpUTVWD4YNPJA3jFnrlDA_8fLTBTS2";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================
// Helpers & State
// =============================

const $ = (sel, root = document) => root.querySelector(sel);

const STORAGE_KEY = "hrdf_irshad_content_v5";
const COUNTER_KEY = "hrdf_irshad_content_counter_v3";

let activeTypeFilter = "all";

const state = {
  items: []
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
// Supabase Upload
// =============================

async function uploadToSupabase(file) {

  // استخراج الامتداد فقط
  const extension = file.name.split('.').pop();

  // إنشاء اسم آمن بالكامل (لا يعتمد على اسم المستخدم)
  const fileName = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}.${extension}`;

  try {
    const { data, error } = await supabaseClient.storage
      .from("media")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      console.error("Upload error:", error);
      alert(error.message);
      return null;
    }

    const { data: publicData } = supabaseClient.storage
      .from("media")
      .getPublicUrl(fileName);

    return {
      name: file.name,   // نحفظ الاسم الأصلي للعرض فقط
      mime: file.type || "",
      size: file.size || 0,
      url: publicData.publicUrl,
      uploadedAt: new Date().toISOString()
    };

  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء رفع الملف");
    return null;
  }
  
// =============================
// Stats
// =============================

function updateStats() {
  const total = state.items.length;
  const used = state.items.filter(i => i.isUsed).length;

  $("#statTotal").textContent = total;
  $("#statUsed").textContent = used;

  updateTypeStats();
}

function updateTypeStats() {
  const container = $("#typeStats");
  if (!container) return;

  container.innerHTML = "";

  const counts = {};
  state.items.forEach(item => {
    const type = item.contentType || "other";
    counts[type] = (counts[type] || 0) + 1;
  });

  const labels = {
    article: "مقال",
    video: "فيديو",
    images: "صور",
    infographic: "انفوجرافيك",
    audio: "صوت",
    press: "لقاء صحفي",
    podcast: "بودكاست"
  };

  const colors = {
    article: "#0B6B3A",
    video: "#2563eb",
    images: "#9333ea",
    infographic: "#f59e0b",
    audio: "#14b8a6",
    press: "#ef4444",
    podcast: "#6366f1"
  };

  Object.keys(labels).forEach(key => {
    const value = counts[key] || 0;

    const box = document.createElement("div");
    box.style.cursor = "pointer";
    box.style.padding = "8px 14px";
    box.style.borderRadius = "20px";
    box.style.display = "flex";
    box.style.gap = "8px";
    box.style.alignItems = "center";
    box.style.fontWeight = "600";
    box.style.background = activeTypeFilter === key ? colors[key] : "#f3f6f5";
    box.style.color = activeTypeFilter === key ? "#fff" : "#0B6B3A";

    box.innerHTML = `
      <span>${labels[key]}</span>
      <span style="
        background:${activeTypeFilter === key ? "rgba(255,255,255,0.3)" : colors[key]};
        color:#fff;
        padding:2px 8px;
        border-radius:12px;">
        ${value}
      </span>
    `;

    box.addEventListener("click", () => {
      activeTypeFilter = activeTypeFilter === key ? "all" : key;
      render();
    });

    container.appendChild(box);
  });
}

// =============================
// Render
// =============================

function renderAttachment(att) {
  if (!att || !att.url) return "-";
  return `<button onclick="window.open('${att.url}','_blank')" class="btn btn--ghost">عرض</button>`;
}

function render() {
  const tbody = $("#rows");
  const searchTerm = $("#q")?.value?.toLowerCase() || "";

  if (!tbody) return;
  tbody.innerHTML = "";

  let filtered = state.items;

  if (activeTypeFilter !== "all") {
    filtered = filtered.filter(i => i.contentType === activeTypeFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(i =>
      i.title.toLowerCase().includes(searchTerm) ||
      String(i.contentNumber).includes(searchTerm)
    );
  }

  $("#statsPill").textContent = `${filtered.length} عنصر`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">لا يوجد محتوى مطابق</td></tr>`;
    updateStats();
    return;
  }

  const labels = {
    article: "مقال",
    video: "فيديو",
    images: "صور",
    infographic: "انفوجرافيك",
    audio: "صوت",
    press: "لقاء صحفي",
    podcast: "بودكاست"
  };

  filtered.forEach(item => {
    const tr = document.createElement("tr");

    if (item.isUsed) {
      tr.style.background = "#f0f8f5";
      tr.style.opacity = "0.8";
    }

    tr.innerHTML = `
      <td>${String(item.contentNumber).padStart(3,"0")}</td>
      <td>${item.title}</td>
      <td>
        <span style="
          padding:4px 10px;
          border-radius:14px;
          background:#e8f5ef;
          color:#0B6B3A;
          font-weight:600;
          font-size:0.8rem;">
          ${labels[item.contentType] || "-"}
        </span>
      </td>
      <td>${renderAttachment(item.attachment)}</td>
      <td>
        <button onclick="toggleUsed('${item.id}')" class="btn btn--ghost">
          ${item.isUsed ? "✓ مستخدم" : "تم استخدامه"}
        </button>
      </td>
      <td>
        <button onclick="editItem('${item.id}')" class="btn btn--secondary">تعديل</button>
        <button onclick="deleteItem('${item.id}')" class="btn btn--danger">حذف</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateStats();
}

// =============================
// Actions
// =============================

function toggleUsed(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  item.isUsed = !item.isUsed;
  saveLocal();
  render();
}

function deleteItem(id) {
  if (!confirm("هل أنت متأكد؟")) return;
  state.items = state.items.filter(x => x.id !== id);
  saveLocal();
  render();
}

function editItem(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  $("#id").value = item.id;
  $("#title").value = item.title;
  $("#contentType").value = item.contentType || "article";

  openModal();
}

// =============================
// Submit
// =============================

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const idField = $("#id").value;
  const isEdit = Boolean(idField);
  const id = isEdit ? idField : uid();

  const prev = state.items.find(x => x.id === id);
  const file = $("#attachmentFile").files?.[0] || null;

  let attachment = isEdit ? prev?.attachment : null;

  if (file) {
    const uploaded = await uploadToSupabase(file);
    if (uploaded) attachment = uploaded;
  }

  const item = {
    id,
    contentNumber: isEdit ? prev.contentNumber : getNextNumber(),
    title: $("#title").value.trim(),
    contentType: $("#contentType").value,
    attachment,
    isUsed: isEdit ? prev.isUsed : false,
    createdAt: isEdit ? prev.createdAt : nowISO(),
    updatedAt: nowISO()
  };

  const idx = state.items.findIndex(x => x.id === id);
  if (idx >= 0) state.items[idx] = item;
  else state.items.unshift(item);

  saveLocal();
  render();
  closeModal();
});

// =============================
// Modal
// =============================

const modal = $("#modal");

function openModal() {
  modal.classList.add("is-open");
}

function closeModal() {
  modal.classList.remove("is-open");
  $("#form").reset();
  $("#id").value = "";
}

$("#btnNew")?.addEventListener("click", openModal);
$("#btnNew2")?.addEventListener("click", openModal);
$("#btnClose")?.addEventListener("click", closeModal);

document.querySelectorAll("[data-close]").forEach(el =>
  el.addEventListener("click", closeModal)
);

// =============================
// Search
// =============================

$("#q")?.addEventListener("input", render);

// =============================
// Init
// =============================

function init() {
  state.items = loadLocal();
  render();
}

init();
