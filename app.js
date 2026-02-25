// =============================
// Supabase Configuration
// =============================

// ملاحظة: تأكد من مراجعة سياسات RLS في لوحة تحكم Supabase للسماح بالرفع والقراءة
const SUPABASE_URL = "https://ygruefrffbpatidtldxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncnVlZnJmZmJwYXRpZHRsZHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTQyODksImV4cCI6MjA4NzUzMDI4OX0.9nOT9BqY5wlczibxgr1MBEJPJAAw6-9Msmo11r9UF7k";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================
// Helpers & State
// =============================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "hrdf_irshad_content_v3";
const COUNTER_KEY = "hrdf_irshad_content_counter_v1";

const state = {
  items: [],
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
  try {
    const { error } = await supabaseClient.storage
      .from("media")
      .upload(fileName, file);

    if (error) throw error;

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
  } catch (error) {
    console.error("Upload Error:", error);
    alert("فشل رفع المرفق، يرجى التحقق من الاتصال أو سياسات التخزين.");
    return null;
  }
}

// =============================
// Render Logic
// =============================

function renderAttachment(att) {
  if (!att || !att.url) return "-";
  const url = att.url;
  const mime = att.mime || "";

  let icon = "📄";
  let actionText = "تحميل";

  if (mime.startsWith("image/")) {
    return `
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <img src="${url}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />
        <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">عرض</button>
      </div>`;
  } else if (mime.startsWith("video/")) { icon = "🎥"; actionText = "عرض"; }
    else if (mime.startsWith("audio/")) { icon = "🎵"; actionText = "تشغيل"; }

  return `
    <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
      <span style="font-size:1.2rem;">${icon}</span>
      <button onclick="window.open('${url}','_blank')" class="btn btn--ghost">${actionText}</button>
    </div>`;
}

function render() {
  const tbody = $("#rows");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا يوجد محتوى حالياً</td></tr>`;
      return;
  }

  state.items.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${String(item.contentNumber).padStart(3, "0")}</td>
      <td>${item.title || "-"}</td>
      <td>${item.availableCount || 0}</td>
      <td>${item.consumedCount || 0}</td>
      <td>${renderAttachment(item.attachment)}</td>
      <td>
        <div style="display:flex; gap:5px; justify-content:center;">
            <button onclick="editItem('${item.id}')" class="btn btn--secondary">تعديل</button>
            <button onclick="deleteItem('${item.id}')" class="btn btn--danger">حذف</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================
// CRUD Actions
// =============================

function deleteItem(id) {
  if (confirm("هل أنت متأكد من حذف هذا العنصر؟")) {
    state.items = state.items.filter(x => x.id !== id);
    saveLocal();
    render();
  }
}

function editItem(id) {
    const item = state.items.find(x => x.id === id);
    if (!item) return;

    // تعبئة النموذج
    $("#id").value = item.id;
    $("#title").value = item.title;
    $("#availableCount").value = item.availableCount;
    $("#consumedCount").value = item.consumedCount;
    
    openModal();
}

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = "جاري الحفظ...";

  const idField = $("#id").value;
  const isEdit = Boolean(idField);
  const id = isEdit ? idField : uid();

  const file = $("#attachmentFile").files?.[0] || null;
  const prev = state.items.find(x => x.id === id);

  let attachment = isEdit ? prev?.attachment : null;

  // إذا تم اختيار ملف جديد، قم برفعه
  if (file) {
    const uploaded = await uploadToSupabase(file);
    if (uploaded) attachment = uploaded;
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
  render();
  closeModal();
  
  submitBtn.disabled = false;
  submitBtn.innerText = "حفظ";
});

// =============================
// Modal & Init
// =============================

const modal = $("#modal");
const btnNew = $("#btnNew");
const btnNew2 = $("#btnNew2");
const btnClose = $("#btnClose");

function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  $("#form").reset();
  $("#id").value = "";
}

btnNew?.addEventListener("click", openModal);
btnNew2?.addEventListener("click", openModal);
btnClose?.addEventListener("click", closeModal);

document.querySelectorAll("[data-close]").forEach(el => {
  el.addEventListener("click", closeModal);
});

function init() {
  state.items = loadLocal();
  render();
}

init();
