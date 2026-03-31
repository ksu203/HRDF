// =============================
// Supabase Configuration
// =============================

const SUPABASE_URL = "https://fmsxnznoynnhcwvstheu.supabase.co";
const SUPABASE_KEY = "sb_publishable_OGDFqdQK4gWgJ4EOtTna0g_24Mv7WYq";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================
// Helpers & State
// =============================

const $ = (sel, root = document) => root.querySelector(sel);

let activeTypeFilter = "all";
let currentUser = null;
let currentRole = null;

const state = { items: [] };

// =============================
// Auth Check
// =============================

async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return;
  currentUser = data.session.user;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
  if (profile) currentRole = profile.role;
}

// =============================
// Load Content from Supabase
// =============================

async function loadFromSupabase() {
  const { data, error } = await sb.from('content').select('*').order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// =============================
// Upload File
// =============================

async function uploadFile(file) {
  const fileName = Date.now() + '_' + file.name;
  const { error } = await sb.storage.from('content-files').upload(fileName, file);
  if (error) { alert('خطأ في رفع الملف: ' + error.message); return null; }
  const { data } = sb.storage.from('content-files').getPublicUrl(fileName);
  return data.publicUrl;
}

// =============================
// Stats
// =============================

function updateTypeStats() {
  const container = $("#typeStats");
  if (!container) return;
  container.innerHTML = "";

  const counts = {};
  state.items.forEach(item => {
    const type = item.content_type || "other";
    counts[type] = (counts[type] || 0) + 1;
  });

  const labels = {
    "مقال": "مقال", "فيديو": "فيديو", "صور": "صور",
    "انفوجرافيك": "انفوجرافيك", "صوت": "صوت",
    "لقاء صحفي": "لقاء صحفي", "بودكاست": "بودكاست"
  };

  Object.keys(labels).forEach(key => {
    const value = counts[key] || 0;
    const div = document.createElement("div");
    div.className = "stats-item";
    div.style.cursor = "pointer";
    div.innerHTML = `<span>${labels[key]}</span><span class="stats-number">${value}</span>`;
    div.addEventListener("click", () => openTypeModal(key, labels[key]));
    container.appendChild(div);
  });
}

function updateTargetStats() {
  const container = $("#targetStats");
  if (!container) return;
  container.innerHTML = "";

  const counts = {};
  state.items.forEach(item => {
    const group = item.target_audience || "غير محدد";
    counts[group] = (counts[group] || 0) + 1;
  });

  const labels = [
    "الباحثين عن عمل", "المعلمين", "طلاب المدارس",
    "طلاب الجامعات", "طلاب المعاهد", "الموظفين",
    "أولياء الأمور", "المرشدين المهنيين", "غير محدد"
  ];

  labels.forEach(key => {
    const value = counts[key] || 0;
    const div = document.createElement("div");
    div.className = "stats-item";
    div.innerHTML = `<span>${key}</span><span class="stats-number">${value}</span>`;
    container.appendChild(div);
  });
}

function updateStats() {
  const total = state.items.length;
  const used = state.items.filter(i => i.status === 'used').length;
  const totalEl = $("#statTotal");
  const usedEl = $("#statUsed");
  if (totalEl) totalEl.textContent = total;
  if (usedEl) usedEl.textContent = used;
  updateTypeStats();
  updateTargetStats();
}

// =============================
// Render
// =============================

function renderAttachment(url) {
  if (!url) return "-";
  return `<button onclick="window.open('${url}','_blank')" class="btn btn--ghost">عرض</button>`;
}

function render() {
  const tbody = $("#rows");
  const searchTerm = $("#q")?.value?.toLowerCase() || "";
  if (!tbody) return;
  tbody.innerHTML = "";

  let filtered = state.items;

  if (activeTypeFilter !== "all") {
    filtered = filtered.filter(i => i.content_type === activeTypeFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(i =>
      i.title.toLowerCase().includes(searchTerm) ||
      String(i.id).includes(searchTerm)
    );
  }

  $("#statsPill").textContent = `${filtered.length} عنصر`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;">لا يوجد محتوى مطابق</td></tr>`;
    updateStats();
    return;
  }

  filtered.forEach((item, index) => {
    const tr = document.createElement("tr");
    if (item.status === 'used') {
      tr.style.background = "#f0f8f5";
      tr.style.opacity = "0.8";
    }

    const canEdit = currentRole === 'admin' || currentRole === 'editor';

    tr.innerHTML = `
      <td>${String(index + 1).padStart(3, "0")}</td>
      <td>${item.title}</td>
      <td>
        <span style="padding:4px 10px;border-radius:14px;background:#e8f5ef;color:#0B6B3A;font-weight:600;font-size:0.8rem;">
          ${item.content_type || "-"}
        </span>
      </td>
      <td>${item.target_audience || "-"}</td>
      <td>${renderAttachment(item.file_url)}</td>
      <td>
        ${canEdit ? `<button onclick="toggleUsed(${item.id})" class="btn btn--ghost">
          ${item.status === 'used' ? "✓ مستخدم" : "تم استخدامه"}
        </button>` : (item.status === 'used' ? "✓ مستخدم" : "غير مستخدم")}
      </td>
      <td>${item.status === 'used' ? "مستخدم" : "غير مستخدم"}</td>
      <td>
        ${currentRole === 'admin' ? `
          <button onclick="editItem(${item.id})" class="btn btn--secondary">تعديل</button>
          <button onclick="deleteItem(${item.id})" class="btn btn--danger">حذف</button>
        ` : '-'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateStats();
}

// =============================
// Actions
// =============================

async function toggleUsed(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  const newStatus = item.status === 'used' ? 'active' : 'used';
  await sb.from('content').update({ status: newStatus }).eq('id', id);
  item.status = newStatus;
  render();
}

async function deleteItem(id) {
  if (!confirm("هل أنت متأكد؟")) return;
  await sb.from('content').delete().eq('id', id);
  state.items = state.items.filter(x => x.id !== id);
  render();
}

function editItem(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;
  $("#id").value = item.id;
  $("#title").value = item.title;
  $("#contentType").value = item.content_type || "article";
  $("#targetGroup").value = item.target_audience || "";
  openModal();
}

// =============================
// Submit
// =============================

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const idField = $("#id").value;
  const isEdit = Boolean(idField);
  const file = $("#attachmentFile").files?.[0] || null;

  let fileUrl = null;
  if (file) {
    fileUrl = await uploadFile(file);
    if (!fileUrl) return;
  }

  const obj = {
    title: $("#title").value.trim(),
    content_type: $("#contentType").value,
    target_audience: $("#targetGroup").value,
    created_by: currentUser?.id
  };

  if (fileUrl) obj.file_url = fileUrl;

  if (isEdit) {
    await sb.from('content').update(obj).eq('id', idField);
  } else {
    obj.status = 'active';
    await sb.from('content').insert(obj);
  }

  closeModal();
  await init();
});

// =============================
// Modal
// =============================

const modal = $("#modal");

function openModal() { modal.classList.add("active"); }
function closeModal() {
  modal.classList.remove("active");
  $("#form").reset();
  $("#id").value = "";
}

$("#btnNew")?.addEventListener("click", openModal);
$("#btnNew2")?.addEventListener("click", openModal);
$("#btnClose")?.addEventListener("click", closeModal);
document.querySelectorAll("[data-close]").forEach(el => {
  el.addEventListener("click", closeModal);
});

// =============================
// Type Modal
// =============================

function openTypeModal(typeKey, typeLabel) {
  const filtered = state.items.filter(i => i.content_type === typeKey);
  const wrapper = document.createElement("div");
  wrapper.className = "modal active";
  wrapper.innerHTML = `
    <div class="modal__backdrop"></div>
    <div class="modal__dialog">
      <div class="modal__head">
        <h3>المواضيع الخاصة بـ ${typeLabel}</h3>
        <button class="iconBtn">✕</button>
      </div>
      <div class="modal__body">
        ${filtered.length === 0
          ? "<p>لا يوجد محتوى في هذا التصنيف</p>"
          : `<ul style="line-height:2;">${filtered.map(i => `<li>${i.title}</li>`).join("")}</ul>`
        }
      </div>
    </div>
  `;
  wrapper.querySelector(".modal__backdrop").addEventListener("click", () => wrapper.remove());
  wrapper.querySelector(".iconBtn").addEventListener("click", () => wrapper.remove());
  document.body.appendChild(wrapper);
}

// =============================
// Search
// =============================

$("#q")?.addEventListener("input", render);

// =============================
// Init
// =============================

async function init() {
  await checkAuth();
  state.items = await loadFromSupabase();

  // إخفاء زر إضافة محتوى لغير Admin
  if (currentRole !== 'admin') {
    $("#btnNew") && ($("#btnNew").style.display = 'none');
    $("#btnNew2") && ($("#btnNew2").style.display = 'none');
  }

  render();
}

init();
