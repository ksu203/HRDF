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

// 1. إعدادات الربط مع Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL'; 
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabasejs.createClient(supabaseUrl, supabaseKey);

let state = { items: [] };

// 2. قاموس المصطلحات لتعريب الأنواع في الواجهة
const typeMap = {
  article: "مقال",
  video: "فيديو",
  images: "صور",
  infographic: "انفوجرافيك",
  audio: "صوت",
  press: "لقاء صحفي",
  podcast: "بودكاست"
};

// 3. دالة جلب البيانات من Supabase (المزامنة الوظيفية)
async function fetchData() {
  const { data, error } = await supabase
    .from('content') // تأكد أن اسم الجدول في Supabase هو content
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching:', error);
  } else {
    state.items = data;
    render();
  }
}

// 4. دالة تصدير الإكسل (Excel Export)
function exportToExcel() {
  if (state.items.length === 0) return alert("لا يوجد بيانات لتصديرها");
  
  const dataToExport = state.items.map(item => ({
    "رقم المحتوى": item.contentNumber,
    "العنوان": item.title,
    "نوع المحتوى": typeMap[item.contentType] || item.contentType,
    "الفئة المستهدفة": item.targetGroup || "غير محدد",
    "الحالة": item.isUsed ? "مستخدم" : "متاح"
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المحتوى");
  XLSX.utils.writeFile(workbook, "إحصائيات_إرشاد_HRDF.xlsx");
}

// 5. دالة العرض (التحسين التصميمي)
function render() {
  const tbody = document.getElementById("rows");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.items.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge">${item.contentNumber || '0'}</span></td>
      <td style="font-weight:700; color:var(--blue);">${item.title}</td>
      <td><span class="badge" style="background:rgba(0,166,101,0.1); color:var(--green);">${typeMap[item.contentType] || item.contentType}</span></td>
      <td><span class="badge--group">${item.targetGroup || "-"}</span></td>
      <td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" style="text-decoration:none;">🔗 عرض</a>` : '-'}</td>
      <td>${item.isUsed ? '✅ مستخدم' : '⏳ متاح'}</td>
      <td><span class="status-dot"></span> نشط</td>
      <td>
        <button class="btn-action" onclick="deleteItem('${item.id}')" title="حذف">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateStats();
}

// استدعاء البيانات عند تشغيل الصفحة
fetchData();
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
