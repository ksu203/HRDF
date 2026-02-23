const el = (id) => document.getElementById(id);

const state = {
  items: [
    {
      id: crypto.randomUUID(),
      title: "دليل ارشاد للمستفيدين",
      type: "guide",
      status: "published",
      summary: "نسخة تجريبية لعنصر محتوى.",
      date: new Date().toISOString().slice(0,10),
    },
    {
      id: crypto.randomUUID(),
      title: "اسئلة شائعة عن الخدمة",
      type: "faq",
      status: "review",
      summary: "قيد المراجعة قبل النشر.",
      date: new Date().toISOString().slice(0,10),
    },
    {
      id: crypto.randomUUID(),
      title: "تحديثات داخلية للفريق",
      type: "post",
      status: "draft",
      summary: "مسودة ملاحظات داخلية.",
      date: new Date().toISOString().slice(0,10),
    },
  ],
};

const typeLabel = (t) => ({ guide:"دليل", faq:"اسئلة شائعة", post:"منشور" }[t] || t);
const statusLabel = (s) => ({ draft:"مسودة", review:"قيد المراجعة", published:"منشور", archived:"مؤرشف" }[s] || s);

function computeKPIs(items){
  const total = items.length;
  const draft = items.filter(i=>i.status==="draft").length;
  const review = items.filter(i=>i.status==="review").length;
  const published = items.filter(i=>i.status==="published").length;

  el("kpiTotal").textContent = total;
  el("kpiDraft").textContent = draft;
  el("kpiReview").textContent = review;
  el("kpiPublished").textContent = published;

  el("itemsHint").textContent = `${total} عنصر`;
}

function render(){
  const q = (el("q").value || "").trim().toLowerCase();
  const tf = el("typeFilter").value;
  const sf = el("statusFilter").value;

  let items = [...state.items];

  if(q){
    items = items.filter(i =>
      (i.title || "").toLowerCase().includes(q) ||
      (i.summary || "").toLowerCase().includes(q)
    );
  }
  if(tf !== "all") items = items.filter(i=>i.type===tf);
  if(sf !== "all") items = items.filter(i=>i.status===sf);

  computeKPIs(items);

  const rows = el("rows");
  rows.innerHTML = "";

  items.forEach(item=>{
    const row = document.createElement("div");
    row.className = "trow";
    row.innerHTML = `
      <div>
        <div style="font-weight:900">${escapeHtml(item.title)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(item.summary || "")}</div>
      </div>
      <div>${typeLabel(item.type)}</div>
      <div><span class="badge ${item.status}">${statusLabel(item.status)}</span></div>
      <div>${item.date || "-"}</div>
      <div>
        <button class="btn btn-outline btn-sm" data-view="${item.id}">عرض</button>
      </div>
    `;
    rows.appendChild(row);
  });

  rows.querySelectorAll("[data-view]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-view");
      const item = state.items.find(x=>x.id===id);
      if(!item) return;
      alert(`${item.title}\n\n${item.summary}\n\nالحالة: ${statusLabel(item.status)}\nالنوع: ${typeLabel(item.type)}`);
    });
  });
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function openModal(){
  el("modal").hidden = false;
}
function closeModal(){
  el("modal").hidden = true;
}

function bind(){
  ["q","typeFilter","statusFilter"].forEach(id=>{
    el(id).addEventListener("input", render);
    el(id).addEventListener("change", render);
  });

  el("btnClear").addEventListener("click", ()=>{
    el("q").value = "";
    el("typeFilter").value = "all";
    el("statusFilter").value = "all";
    render();
  });

  el("btnNew").addEventListener("click", openModal);
  el("modalClose").addEventListener("click", closeModal);
  el("modalBackdrop").addEventListener("click", closeModal);

  el("btnSave").addEventListener("click", ()=>{
    const title = el("title").value.trim();
    const summary = el("summary").value.trim();
    const type = el("type").value;
    const status = el("status").value;

    if(!title){
      alert("اكتب العنوان");
      return;
    }

    state.items.unshift({
      id: crypto.randomUUID(),
      title,
      summary,
      type,
      status,
      date: new Date().toISOString().slice(0,10),
    });

    el("title").value = "";
    el("summary").value = "";
    el("type").value = "guide";
    el("status").value = "draft";

    closeModal();
    render();
  });

  el("btnExport").addEventListener("click", ()=>{
    const csv = [
      ["title","type","status","date","summary"].join(","),
      ...state.items.map(i => [
        csvEscape(i.title),
        csvEscape(i.type),
        csvEscape(i.status),
        csvEscape(i.date),
        csvEscape(i.summary || "")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function csvEscape(v){
  const s = String(v ?? "");
  if(/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

bind();
render();
