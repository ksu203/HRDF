/* HRDF Irshad - Content Management UI (Vanilla JS)
   Added fields:
   - contentNumber (auto increment)
   - contentType
   - beneficiary
   - materialDate
   - availableCount / consumedCount
   - attachmentType + attachment (local/base64)
*/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "hrdf_irshad_content_v2";
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

function fmtDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
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

function ensureCounterIsAtLeast(maxExistingNumber) {
  const raw = localStorage.getItem(COUNTER_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(n) || n < maxExistingNumber) {
    localStorage.setItem(COUNTER_KEY, String(maxExistingNumber));
  }
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const t = localStorage.getItem(THEME_KEY);
  if (t === "light") setTheme("light");
}

function toast(msg) {
  const el = $("#toast");
  const txt = $("#toastText");
  txt.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 1800);
}

function contentTypeLabel(v) {
  const map = {
    article: "مقال",
    video: "فيديو",
    images: "صور",
    infographic: "انفوجرافيك",
    audio: "صوت",
    press: "لقاء صحفي",
    podcast: "بودكاست",
  };
  return map[v] || v || "-";
}

function beneficiaryLabel(v) {
  const map = {
    career_counselor: "مرشد مهني",
    student: "طالب",
    career_advisor: "موجه مهني",
    job_seeker: "باحث عن عمل",
  };
  return map[v] || v || "-";
}

function attachmentTypeLabel(v) {
  const map = { text: "نص", image: "صوره", audio: "صوت", video: "فيديو" };
  return map[v] || v || "-";
}

function norm(str) {
  return (str || "").toString().trim().toLowerCase();
}

function filteredItems() {
  const q = norm(state.q);
  let items = [...state.items];

  if (state.filterContentType !== "all") {
    items = items.filter(x => x.contentType === state.filterContentType);
  }
  if (state.filterBeneficiary !== "all") {
    items = items.filter(x => x.beneficiary === state.filterBeneficiary);
  }

  if (q) {
    items = items.filter(x => {
      const inNumber = String(x.contentNumber || "").includes(q);
      const inTitle = norm(x.title).includes(q);
      const inSummary = norm(x.summary).includes(q);
      return inNumber || inTitle || inSummary;
    });
  }

  if (state.sortBy === "number_desc") {
    items.sort((a, b) => (b.contentNumber || 0) - (a.contentNumber || 0));
  } else if (state.sortBy === "number_asc") {
    items.sort((a, b) => (a.contentNumber || 0) - (b.contentNumber || 0));
  } else if (state.sortBy === "newest") {
    items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  } else if (state.sortBy === "oldest") {
    items.sort((a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""));
  } else if (state.sortBy === "title") {
    items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
  }

  return items;
}

function renderStats() {
  const total = state.items.length;

  const sumAvailable = state.items.reduce((acc, x) => acc + (Number(x.availableCount) || 0), 0);
  const sumConsumed = state.items.reduce((acc, x) => acc + (Number(x.consumedCount) || 0), 0);
  const denom = sumAvailable + sumConsumed;
  const rate = denom ? Math.round((sumConsumed / denom) * 100) : 0;

  $("#statTotal").textContent = total;
  $("#statAvailable").textContent = sumAvailable;
  $("#statConsumed").textContent = sumConsumed;
  $("#statRate").textContent = `${rate}%`;

  const visible = filteredItems().length;
  $("#statsPill").textContent = `${visible} عنصر`;
}

function renderTable() {
  const tbody = $("#rows");
  const items = filteredItems();
  tbody.innerHTML = "";

  if (!items.length) {
    $("#emptyState").hidden = false;
    return;
  }
  $("#emptyState").hidden = true;

  for (const item of items) {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.textContent = item.contentNumber != null ? String(item.contentNumber).padStart(3, "0") : "-";

    const tdTitle = document.createElement("td");
    const titleWrap = document.createElement("div");
    titleWrap.className = "rowTitle";
    const strong = document.createElement("strong");
    strong.textContent = item.title || "(بدون عنوان)";
    const sub = document.createElement("span");
    sub.textContent = item.summary ? item.summary : "بدون وصف";
    titleWrap.appendChild(strong);
    titleWrap.appendChild(sub);
    tdTitle.appendChild(titleWrap);

    const tdType = document.createElement("td");
    tdType.className = "hide-md";
    tdType.textContent = contentTypeLabel(item.contentType);

    const tdBen = document.createElement("td");
    tdBen.className = "hide-md";
    tdBen.textContent = beneficiaryLabel(item.beneficiary);

    const tdDate = document.createElement("td");
    tdDate.className = "hide-md";
    tdDate.textContent = fmtDate(item.materialDate);

    const tdAvail = document.createElement("td");
    tdAvail.textContent = Number.isFinite(Number(item.availableCount)) ? String(item.availableCount) : "0";

    const tdCons = document.createElement("td");
    tdCons.textContent = Number.isFinite(Number(item.consumedCount)) ? String(item.consumedCount) : "0";

    const tdAttach = document.createElement("td");
    tdAttach.className = "col-actions";
    if (item.attachment && item.attachment.name) {
      const btn = document.createElement("button");
      btn.className = "btn btn--ghost";
      btn.type = "button";
      btn.textContent = `تحميل (${attachmentTypeLabel(item.attachmentType)})`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadAttachment(item);
      });
      tdAttach.appendChild(btn);
    } else {
      tdAttach.textContent = "-";
    }

    const tdActions = document.createElement("td");
    tdActions.className = "col-actions";
    const actions = document.createElement("div");
    actions.className = "actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "iconBtn";
    btnEdit.type = "button";
    btnEdit.title = "تعديل";
    btnEdit.textContent = "✎";
    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(item.id);
    });

    const btnDup = document.createElement("button");
    btnDup.className = "iconBtn";
    btnDup.type = "button";
    btnDup.title = "نسخ";
    btnDup.textContent = "⎘";
    btnDup.addEventListener("click", (e) => {
      e.stopPropagation();
      duplicateItem(item.id);
    });

    actions.appendChild(btnEdit);
    actions.appendChild(btnDup);
    tdActions.appendChild(actions);

    tr.appendChild(tdNum);
    tr.appendChild(tdTitle);
    tr.appendChild(tdType);
    tr.appendChild(tdBen);
    tr.appendChild(tdDate);
    tr.appendChild(tdAvail);
    tr.appendChild(tdCons);
    tr.appendChild(tdAttach);
    tr.appendChild(tdActions);

    tr.addEventListener("click", () => openModal(item.id));
    tbody.appendChild(tr);
  }
}

function render() {
  renderStats();
  renderTable();
}

function onEscClose(e) {
  if (e.key === "Escape") closeModal();
}

function openModal(id = null) {
  const modal = $("#modal");
  const form = $("#form");
  const fileInput = $("#attachmentFile");

  state.editingId = id;

  const isEdit = Boolean(id);
  $("#modalTitle").textContent = isEdit ? "تعديل محتوى" : "إضافة محتوى";
  $("#modalKicker").textContent = isEdit ? "تحرير" : "جديد";
  $("#btnDelete").hidden = !isEdit;

  form.reset();
  fileInput.value = "";

  if (isEdit) {
    const item = state.items.find(x => x.id === id);
    if (!item) return;

    $("#id").value = item.id;
    $("#number").value = item.contentNumber != null ? String(item.contentNumber).padStart(3, "0") : "";
    $("#materialDate").value = item.materialDate ? item.materialDate.slice(0, 10) : "";
    $("#title").value = item.title || "";
    $("#contentType").value = item.contentType || "article";
    $("#beneficiary").value = item.beneficiary || "career_counselor";
    $("#availableCount").value = Number(item.availableCount ?? 0);
    $("#consumedCount").value = Number(item.consumedCount ?? 0);
    $("#attachmentType").value = item.attachmentType || "text";
    $("#summary").value = item.summary || "";
    $("#body").value = item.body || "";
    $("#attachmentHint").textContent = item.attachment?.name ? `مرفق حالي: ${item.attachment.name}` : "اختياري - سيتم حفظه محليا حاليا";
  } else {
    $("#id").value = "";
    const nextNum = previewNextNumber();
    $("#number").value = String(nextNum).padStart(3, "0");
    $("#attachmentHint").textContent = "اختياري - سيتم حفظه محليا حاليا";
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => $("#materialDate").focus(), 0);

  document.addEventListener("keydown", onEscClose);
}

function closeModal() {
  const modal = $("#modal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  state.editingId = null;
  document.removeEventListener("keydown", onEscClose);
}

function previewNextNumber() {
  // لا نزيد العداد فعليا إلا عند الحفظ، هذا فقط للعرض
  const raw = localStorage.getItem(COUNTER_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  const safe = Number.isFinite(n) ? n : 0;
  return safe + 1;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read error"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function upsertItem(item) {
  const idx = state.items.findIndex(x => x.id === item.id);
  if (idx >= 0) {
    state.items[idx] = item;
    toast("تم تحديث المحتوى");
  } else {
    state.items.unshift(item);
    toast("تم إضافة محتوى جديد");
  }
  saveLocal();
  render();
}

function deleteItem(id) {
  const idx = state.items.findIndex(x => x.id === id);
  if (idx < 0) return;
  state.items.splice(idx, 1);
  saveLocal();
  render();
  toast("تم الحذف");
}

function duplicateItem(id) {
  const item = state.items.find(x => x.id === id);
  if (!item) return;

  const maxNum = Math.max(0, ...state.items.map(x => Number(x.contentNumber) || 0));
  ensureCounterIsAtLeast(maxNum);

  const newNumber = getNextNumber();
  const copy = {
    ...item,
    id: uid(),
    contentNumber: newNumber,
    title: (item.title || "بدون عنوان") + " (نسخة)",
    updatedAt: nowISO(),
    createdAt: nowISO(),
  };

  state.items.unshift(copy);
  saveLocal();
  render();
  toast("تم إنشاء نسخة");
}

function downloadAttachment(item) {
  const att = item.attachment;
  if (!att || !att.dataUrl) return;

  // dataUrl = "data:...;base64,...."
  const a = document.createElement("a");
  a.href = att.dataUrl;
  a.download = att.name || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();

  toast("بدء التحميل");
}

function exportJSON() {
  const data = { exportedAt: nowISO(), items: state.items };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "hrdf-irshad-content.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast("تم التصدير");
}

function bindUI() {
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value;
    render();
  });

  $("#filterContentType").addEventListener("change", (e) => {
    state.filterContentType = e.target.value;
    render();
  });

  $("#filterBeneficiary").addEventListener("change", (e) => {
    state.filterBeneficiary = e.target.value;
    render();
  });

  $("#sortBy").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    render();
  });

  $("#btnNew").addEventListener("click", () => openModal(null));
  $("#btnNew2").addEventListener("click", () => openModal(null));

  $("#btnClose").addEventListener("click", closeModal);
  $$("#modal [data-close='true']").forEach(el => el.addEventListener("click", closeModal));

  $("#btnDelete").addEventListener("click", () => {
    const id = $("#id").value;
    if (!id) return;
    const ok = confirm("هل تريد حذف هذا المحتوى؟");
    if (!ok) return;
    deleteItem(id);
    closeModal();
  });

  $("#btnExport").addEventListener("click", exportJSON);

  $("#btnTheme").addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    setTheme(isLight ? "dark" : "light");
    toast(isLight ? "تم تفعيل الوضع الداكن" : "تم تفعيل الوضع الفاتح");
  });

  // Form submit (handles file upload)
  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = $("#id").value || uid();
    const isEdit = Boolean($("#id").value);

    // Ensure counter based on current max
    const maxNum = Math.max(0, ...state.items.map(x => Number(x.contentNumber) || 0));
    ensureCounterIsAtLeast(maxNum);

    const contentNumber = isEdit
      ? (state.items.find(x => x.id === id)?.contentNumber || maxNum || 0)
      : getNextNumber();

    const materialDate = $("#materialDate").value ? new Date($("#materialDate").value).toISOString() : "";
    const title = $("#title").value.trim();
    const contentType = $("#contentType").value;
    const beneficiary = $("#beneficiary").value;

    const availableCount = Math.max(0, parseInt($("#availableCount").value || "0", 10));
    const consumedCount = Math.max(0, parseInt($("#consumedCount").value || "0", 10));

    const attachmentType = $("#attachmentType").value;
    const summary = $("#summary").value.trim();
    const body = $("#body").value.trim();

    // Attachment handling
    const file = $("#attachmentFile").files?.[0] || null;

    let attachment = null;
    const prev = state.items.find(x => x.id === id);
    if (file) {
      const dataUrl = await fileToBase64(file);
      attachment = {
        name: file.name,
        mime: file.type || "",
        size: file.size || 0,
        dataUrl,
        uploadedAt: nowISO(),
      };
    } else if (isEdit && prev?.attachment) {
      // Keep existing if no new file selected
      attachment = prev.attachment;
    }

    const item = {
      id,
      contentNumber,
      title,
      contentType,
      beneficiary,
      materialDate,
      availableCount,
      consumedCount,
      attachmentType,
      attachment,
      summary,
      body,
      updatedAt: nowISO(),
      createdAt: isEdit ? (prev?.createdAt || nowISO()) : nowISO(),
    };

    upsertItem(item);
    closeModal();
  });

  // Sidebar placeholders
  $$(".nav__item").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".nav__item").forEach(x => x.classList.remove("is-active"));
      btn.classList.add("is-active");
      toast("تم تغيير القسم (سيتم تفعيله لاحقا)");
    });
  });
}

function seedIfEmpty() {
  if (state.items.length) return;

  const n1 = getNextNumber();
  const n2 = getNextNumber();

  state.items = [
    {
      id: uid(),
      contentNumber: n2, // نعرض الاعلى أول
      title: "سياسة إدارة المحتوى",
      contentType: "article",
      beneficiary: "career_advisor",
      materialDate: new Date().toISOString(),
      availableCount: 25,
      consumedCount: 7,
      attachmentType: "text",
      attachment: null,
      summary: "وثيقة توضح معايير اعتماد المحتوى وآلية تحديثه.",
      body: "اكتب هنا المحتوى التفصيلي...",
      updatedAt: nowISO(),
      createdAt: nowISO(),
    },
    {
      id: uid(),
      contentNumber: n1,
      title: "انفوجرافيك: خطوات بناء المسار المهني",
      contentType: "infographic",
      beneficiary: "student",
      materialDate: new Date().toISOString(),
      availableCount: 100,
      consumedCount: 43,
      attachmentType: "image",
      attachment: null,
      summary: "ملف بصري يساعد الطالب على فهم خطوات اختيار المسار.",
      body: "ملاحظات داخلية...",
      updatedAt: nowISO(),
      createdAt: nowISO(),
    },
  ];

  saveLocal();
}

function init() {
  initTheme();
  state.items = loadLocal();

  // Counter sync
  const maxNum = Math.max(0, ...state.items.map(x => Number(x.contentNumber) || 0));
  ensureCounterIsAtLeast(maxNum);

  seedIfEmpty();
  bindUI();
  render();
}

init();
