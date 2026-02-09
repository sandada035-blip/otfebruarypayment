/****************************************************
 * School Admin Pro - Pro Pack v2 (FULL)
 * ✅ Teacher dropdown auto (no missing)
 * ✅ Date filter uses PaymentDate r[7]
 * ✅ Role permissions (User = view only)
 ****************************************************/

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw7wVdV9cHgrPkuyr-yNZAECY1bRJqg6MhCEWIKqh2TuCmC8bXvWi-pzsB8NmqEgkfydw/exec";

/** IMPORTANT: Adjust only here if your columns differ */
const COL = {
  STUDENT_NAME: 0,
  GENDER: 1,
  GRADE: 2,
  TEACHER: 3,
  FEE: 4,
  PAYMENT_DATE: 7, // ✅ PaymentDate index = r[7]
};

let allStudents = [];
let studentViewRows = [];
let teacherRows = [];
let teacherViewRows = [];

let currentUserRole = "User";
let currentUsername = "-";

let isEditMode = false;
let originalName = "";

/* Teacher master list (auto) */
let teacherList = []; // ✅ merged list from students + teacher summary

/* Pagination + Sort */
let studentPage = 1;
let studentRowsPerPage = 20;
let studentSortKey = "name";
let studentSortDir = "asc";

let teacherPage = 1;
let teacherRowsPerPage = 20;
let teacherSortKey = "teacher";
let teacherSortDir = "asc";

/* Helpers */
function $(id) { return document.getElementById(id); }

function toNumber(val) {
  const s = String(val ?? "").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatKHR(n) {
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("en-US") + " ៛";
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleDateString("km-KH") + " " + d.toLocaleTimeString("km-KH");
}

function setLastSync(which) {
  const t = nowStamp();
  const el = $(which === "dashboard" ? "lastSyncDashboard" : "lastSyncStudents");
  if (el) el.innerText = t;
}

/* Parse date safely */
function parseDateAny(x) {
  if (!x) return null;
  const s = String(x).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* Escape HTML */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* API */
async function callAPI(funcName, ...args) {
  const url = `${WEB_APP_URL}?func=${funcName}&args=${encodeURIComponent(JSON.stringify(args))}`;
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

/* Auth */
async function login() {
  const u = $("username")?.value.trim();
  const p = $("password")?.value.trim();

  if (!u || !p) {
    return Swal.fire("តម្រូវការ", "សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ និងពាក្យសម្ងាត់", "warning");
  }

  Swal.fire({ title: "កំពុងផ្ទៀងផ្ទាត់...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await callAPI("checkLogin", u, p);

  if (res && res.success) {
    currentUserRole = res.role || "User";
    currentUsername = u;

    $("loginSection").classList.add("d-none");
    $("mainApp").style.display = "block";

    applyPermissions();
    showSection("dashboard");

    // ✅ load both so teacher list is ready (fix dropdown missing)
    await refreshAll();

    Swal.fire({ icon: "success", title: "ជោគជ័យ!", text: "អ្នកបានចូលប្រើប្រាស់ដោយជោគជ័យ!", timer: 1200, showConfirmButton: false });
  } else {
    Swal.fire("បរាជ័យ", "សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ឬពាក្យសម្ងាត់ម្តងទៀត!", "error");
  }
}

function logout() {
  Swal.fire({
    title: "តើអ្នកចង់ចាកចេញមែនទេ?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "បាទ ចាកចេញ",
    cancelButtonText: "បោះបង់",
  }).then((r) => {
    if (!r.isConfirmed) return;
    location.reload();
  });
}

function applyPermissions() {
  const isAdmin = currentUserRole === "Admin";

  const rb = $("roleBadge");
  const ub = $("userBadge");
  if (rb) {
    rb.innerText = isAdmin ? "ADMIN" : "USER";
    rb.classList.toggle("pill-admin", isAdmin);
    rb.classList.toggle("pill-user", !isAdmin);
  }
  if (ub) ub.innerHTML = `<i class="bi bi-person-circle"></i> ${escapeHtml(currentUsername)}`;

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });

  const note = document.querySelector(".user-note");
  if (note) note.classList.toggle("d-none", isAdmin);

  if (!isAdmin) {
    window.openStudentModal = () => Swal.fire("Permission", "User អាចមើលបានតែប៉ុណ្ណោះ។", "info");
    window.editStudent = () => Swal.fire("Permission", "User អាចមើលបានតែប៉ុណ្ណោះ។", "info");
    window.confirmDelete = () => Swal.fire("Permission", "User អាចមើលបានតែប៉ុណ្ណោះ។", "info");
    window.submitStudent = () => Swal.fire("Permission", "User អាចមើលបានតែប៉ុណ្ណោះ។", "info");
  }
}

/* Navigation */
function showSection(section) {
  $("dashboardSection").style.display = section === "dashboard" ? "block" : "none";
  $("studentSection").style.display = section === "students" ? "block" : "none";

  if (section === "dashboard") loadDashboard();
  if (section === "students") loadStudents();
}

async function refreshAll() {
  await Promise.allSettled([loadDashboard(), loadStudents()]);
}

/* =========================================================
   TEACHER LIST (AUTO) ✅ solves missing teachers + dropdown empty
========================================================= */
function buildTeacherList() {
  const set = new Set();

  // from Students
  allStudents.forEach(r => {
    const t = String(r?.[COL.TEACHER] ?? "").trim();
    if (t) set.add(t);
  });

  // from Teacher Summary
  teacherRows.forEach(r => {
    const t = String(r?.[0] ?? "").trim();
    if (t) set.add(t);
  });

  teacherList = Array.from(set).sort((a,b)=>a.localeCompare(b, "km", { sensitivity:"base" }));
}

function renderTeacherSelectOptions(selectEl, includeAll = false) {
  if (!selectEl) return;
  const opts = [];

  if (includeAll) {
    opts.push(`<option value="ALL">All Teachers</option>`);
  } else {
    opts.push(`<option value="">-- ជ្រើសរើសគ្រូ --</option>`);
  }

  teacherList.forEach(t => {
    opts.push(`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`);
  });

  selectEl.innerHTML = opts.join("");
}

function syncTeacherDropdowns() {
  buildTeacherList();

  // ✅ Filter dropdown
  renderTeacherSelectOptions($("filterTeacher"), true);

  // ✅ Modal dropdown (Add/Edit)
  renderTeacherSelectOptions($("addTeacherSelect"), false);
}

/* =========================================================
   DASHBOARD
========================================================= */
async function loadDashboard() {
  const res = await callAPI("getTeacherData");
  if (!res || !Array.isArray(res.rows)) return;

  teacherRows = res.rows;

  teacherPage = 1;
  teacherRowsPerPage = Number($("teacherRowsPerPage")?.value || 20);

  applyTeacherView();
  computeDashboardFromTeachers(teacherRows);

  // ✅ update teacher list (so modal has all)
  syncTeacherDropdowns();

  setLastSync("dashboard");
  bindTeacherSortEvents();
}

function computeDashboardFromTeachers(rows) {
  let totalStudents = 0, totalFee = 0, teacher80 = 0, school20 = 0;

  rows.forEach((r) => {
    totalStudents += toNumber(r[2]);
    totalFee += toNumber(r[3]);
    teacher80 += toNumber(r[4]);
    school20 += toNumber(r[5]);
  });

  if ((teacher80 === 0 && school20 === 0) && totalFee > 0) {
    teacher80 = totalFee * 0.8;
    school20 = totalFee * 0.2;
  }

  $("statsRow").innerHTML = `
    <div class="stat-card accent-purple">
      <div class="label">គ្រូសរុប</div>
      <div class="value">${rows.length.toLocaleString("en-US")}</div>
      <div class="sub">ចំនួនគ្រូទាំងអស់</div>
    </div>

    <div class="stat-card accent-green">
      <div class="label">សិស្សសរុប</div>
      <div class="value">${totalStudents.toLocaleString("en-US")}</div>
      <div class="sub">គណនាពី Teacher Summary</div>
    </div>

    <div class="stat-card accent-blue">
      <div class="label">ទឹកប្រាក់សរុប</div>
      <div class="value" style="color:#16a34a">${formatKHR(totalFee)}</div>
      <div class="sub">ចំណូលសរុបទាំងអស់</div>
    </div>

    <div class="stat-card accent-red">
      <div class="label">សាលា (20%) / គ្រូ (80%)</div>
      <div class="value" style="font-size:18px; line-height:1.2">
        <span style="color:#ef4444">${formatKHR(school20)}</span>
        <span style="color:#94a3b8"> • </span>
        <span style="color:#2563eb">${formatKHR(teacher80)}</span>
      </div>
      <div class="sub">បែងចែក 20% និង 80%</div>
    </div>
  `;
}

/* Teacher view apply */
function applyTeacherView() {
  teacherRowsPerPage = Number($("teacherRowsPerPage")?.value || 20);
  const q = ($("searchTeacher")?.value || "").toLowerCase().trim();

  teacherViewRows = teacherRows.map(r => ({
    teacher: String(r[0] ?? ""),
    gender: String(r[1] ?? ""),
    students: toNumber(r[2]),
    totalFee: toNumber(r[3]),
    teacher80: toNumber(r[4]) || toNumber(r[3]) * 0.8,
    school20: toNumber(r[5]) || toNumber(r[3]) * 0.2,
  }))
  .filter(o => !q || o.teacher.toLowerCase().includes(q))
  .sort((a,b)=>compareByKey(a,b,teacherSortKey,teacherSortDir));

  teacherPage = clampPage(teacherPage, teacherViewRows.length, teacherRowsPerPage);
  renderTeacherPage();
  updateTeacherSortIndicators();
}

function resetTeacherView() {
  $("searchTeacher").value = "";
  $("teacherRowsPerPage").value = "20";
  teacherRowsPerPage = 20;
  teacherPage = 1;
  teacherSortKey = "teacher";
  teacherSortDir = "asc";
  applyTeacherView();
}

function renderTeacherPage() {
  const { pageItems, startIndex, endIndex, totalPages, totalItems } =
    paginate(teacherViewRows, teacherPage, teacherRowsPerPage);

  $("teacherBody").innerHTML = pageItems.map(o => `
    <tr>
      <td>${escapeHtml(o.teacher)}</td>
      <td>${escapeHtml(o.gender)}</td>
      <td>${o.students}</td>
      <td class="fw-bold text-primary">${formatKHR(o.totalFee)}</td>
      <td class="text-success">${formatKHR(o.teacher80)}</td>
      <td class="text-danger">${formatKHR(o.school20)}</td>
    </tr>
  `).join("");

  $("teacherPagePill").innerText = `${teacherPage}/${Math.max(1,totalPages)}`;
  $("teacherPageInfo").innerText = `Showing ${startIndex}-${endIndex} of ${totalItems}`;
}

function teacherPrevPage(){ teacherPage = Math.max(1, teacherPage - 1); renderTeacherPage(); }
function teacherNextPage(){
  const totalPages = Math.max(1, Math.ceil(teacherViewRows.length / teacherRowsPerPage));
  teacherPage = Math.min(totalPages, teacherPage + 1);
  renderTeacherPage();
}

function bindTeacherSortEvents() {
  document.querySelectorAll("#teacherTable thead th.sortable").forEach(th => {
    th.onclick = () => {
      const key = th.getAttribute("data-key");
      if (!key) return;
      if (teacherSortKey === key) teacherSortDir = (teacherSortDir === "asc" ? "desc" : "asc");
      else { teacherSortKey = key; teacherSortDir = "asc"; }
      teacherPage = 1;
      applyTeacherView();
    };
  });

  $("searchTeacher")?.addEventListener("input", () => { teacherPage = 1; applyTeacherView(); });
  $("teacherRowsPerPage")?.addEventListener("change", () => { teacherPage = 1; applyTeacherView(); });
}

function updateTeacherSortIndicators() {
  document.querySelectorAll("#teacherTable thead th.sortable").forEach(th => {
    const key = th.getAttribute("data-key");
    const ind = th.querySelector(".sort-ind");
    if (!ind) return;
    ind.textContent = (key === teacherSortKey) ? (teacherSortDir === "asc" ? "▲" : "▼") : "";
  });
}

/* =========================================================
   STUDENTS
========================================================= */
async function loadStudents() {
  $("studentLoading")?.classList.remove("d-none");
  const res = await callAPI("getStudentData");
  $("studentLoading")?.classList.add("d-none");

  if (!res || !Array.isArray(res.rows)) return;

  allStudents = res.rows;

  setupStudentFilterOptions(allStudents);

  studentPage = 1;
  studentRowsPerPage = Number($("studentRowsPerPage")?.value || 20);

  applyStudentFilters();

  // ✅ make sure teacher dropdowns are always ready
  syncTeacherDropdowns();

  setLastSync("students");
  bindStudentSortEvents();
}

function setupStudentFilterOptions(rows) {
  const grades = new Set();
  rows.forEach(r => { if (r[COL.GRADE]) grades.add(String(r[COL.GRADE]).trim()); });

  const gradeSel = $("filterGrade");
  if (gradeSel) {
    const list = ["ALL", ...Array.from(grades).sort((a,b)=>a.localeCompare(b,'km'))];
    gradeSel.innerHTML = list.map(g => `<option value="${escapeHtml(g)}">${g === "ALL" ? "All Grades" : escapeHtml(g)}</option>`).join("");
  }
}

function applyStudentFilters() {
  studentRowsPerPage = Number($("studentRowsPerPage")?.value || 20);

  const q = ($("searchStudent")?.value || "").toLowerCase().trim();
  const teacher = ($("filterTeacher")?.value || "ALL");
  const grade = ($("filterGrade")?.value || "ALL");
  const gender = ($("filterGender")?.value || "ALL");

  const from = $("dateFrom")?.value ? new Date($("dateFrom").value + "T00:00:00") : null;
  const to = $("dateTo")?.value ? new Date($("dateTo").value + "T23:59:59") : null;

  const mapped = allStudents.map((r, idx) => ({
    idx,
    name: String(r[COL.STUDENT_NAME] ?? ""),
    gender: String(r[COL.GENDER] ?? ""),
    grade: String(r[COL.GRADE] ?? ""),
    teacher: String(r[COL.TEACHER] ?? ""),
    fee: toNumber(r[COL.FEE]),
    feeText: String(r[COL.FEE] ?? ""),
    payDateRaw: r[COL.PAYMENT_DATE],
    payDate: parseDateAny(r[COL.PAYMENT_DATE]),
    raw: r
  }));

  studentViewRows = mapped.filter(o => {
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.teacher.toLowerCase().includes(q);
    const matchTeacher = (teacher === "ALL") || (o.teacher === teacher);
    const matchGrade = (grade === "ALL") || (o.grade === grade);
    const matchGender = (gender === "ALL") || (o.gender === gender);

    let matchDate = true;
    if (from || to) {
      if (!o.payDate) matchDate = false;
      else {
        if (from && o.payDate < from) matchDate = false;
        if (to && o.payDate > to) matchDate = false;
      }
    }
    return matchQ && matchTeacher && matchGrade && matchGender && matchDate;
  })
  .sort((a,b)=>compareByKey(a,b, studentSortKey, studentSortDir));

  studentPage = clampPage(studentPage, studentViewRows.length, studentRowsPerPage);

  renderStudentPage();
  renderStudentQuickStats(studentViewRows);
  updateStudentSortIndicators();
}

function clearStudentFilters() {
  $("searchStudent").value = "";
  $("filterTeacher").value = "ALL";
  $("filterGrade").value = "ALL";
  $("filterGender").value = "ALL";
  $("dateFrom").value = "";
  $("dateTo").value = "";
  studentPage = 1;
  applyStudentFilters();
}

function renderStudentQuickStats(rows) {
  const count = rows.length;
  let totalFee = 0;
  rows.forEach(o => totalFee += o.fee);
  const teacher80 = totalFee * 0.8;
  const school20 = totalFee * 0.2;

  $("studentStatsRow").innerHTML = `
    <div class="stat-card accent-green">
      <div class="label">សិស្ស (Filtered)</div>
      <div class="value">${count.toLocaleString("en-US")}</div>
      <div class="sub">តាម Filter/ Search/ Date</div>
    </div>

    <div class="stat-card accent-blue">
      <div class="label">ទឹកប្រាក់ (Filtered)</div>
      <div class="value" style="color:#16a34a">${formatKHR(totalFee)}</div>
      <div class="sub">សរុបតាម Filter</div>
    </div>

    <div class="stat-card accent-purple">
      <div class="label">គ្រូ 80% (Filtered)</div>
      <div class="value" style="color:#2563eb">${formatKHR(teacher80)}</div>
      <div class="sub">គណនា 80%</div>
    </div>

    <div class="stat-card accent-red">
      <div class="label">សាលា 20% (Filtered)</div>
      <div class="value" style="color:#ef4444">${formatKHR(school20)}</div>
      <div class="sub">គណនា 20%</div>
    </div>
  `;
}

function renderStudentPage() {
  const { pageItems, startIndex, endIndex, totalPages, totalItems } =
    paginate(studentViewRows, studentPage, studentRowsPerPage);

  const isAdmin = currentUserRole === "Admin";

  $("studentBody").innerHTML = pageItems.map(o => `
    <tr>
      <td class="fw-bold text-primary">${escapeHtml(o.name)}</td>
      <td class="d-none d-md-table-cell">${escapeHtml(o.gender)}</td>
      <td class="d-none d-md-table-cell">${escapeHtml(o.grade)}</td>
      <td>${escapeHtml(o.teacher)}</td>
      <td class="text-success small fw-bold">${escapeHtml(o.feeText || formatKHR(o.fee))}</td>
      <td>${escapeHtml(o.payDateRaw || "")}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-info" title="វិក្កយបត្រ" onclick="printReceipt(${o.idx})">
            <i class="bi bi-printer"></i>
          </button>
          ${
            isAdmin ? `
              <button class="btn btn-sm btn-outline-warning" title="កែប្រែ" onclick="editStudent(${o.idx})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" title="លុប" onclick="confirmDelete(${o.idx})">
                <i class="bi bi-trash"></i>
              </button>
            ` : ""
          }
        </div>
      </td>
    </tr>
  `).join("");

  $("studentPagePill").innerText = `${studentPage}/${Math.max(1,totalPages)}`;
  $("studentPageInfo").innerText = `Showing ${startIndex}-${endIndex} of ${totalItems}`;
}

function studentPrevPage(){ studentPage = Math.max(1, studentPage - 1); renderStudentPage(); }
function studentNextPage(){
  const totalPages = Math.max(1, Math.ceil(studentViewRows.length / studentRowsPerPage));
  studentPage = Math.min(totalPages, studentPage + 1);
  renderStudentPage();
}

function bindStudentSortEvents() {
  document.querySelectorAll("#studentTable thead th.sortable").forEach(th => {
    th.onclick = () => {
      const key = th.getAttribute("data-key");
      if (!key) return;
      if (studentSortKey === key) studentSortDir = (studentSortDir === "asc" ? "desc" : "asc");
      else { studentSortKey = key; studentSortDir = "asc"; }
      studentPage = 1;
      applyStudentFilters();
    };
  });

  $("studentRowsPerPage")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
  $("searchStudent")?.addEventListener("input", () => { studentPage = 1; applyStudentFilters(); });
  $("filterTeacher")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
  $("filterGrade")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
  $("filterGender")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
  $("dateFrom")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
  $("dateTo")?.addEventListener("change", () => { studentPage = 1; applyStudentFilters(); });
}

function updateStudentSortIndicators() {
  document.querySelectorAll("#studentTable thead th.sortable").forEach(th => {
    const key = th.getAttribute("data-key");
    const ind = th.querySelector(".sort-ind");
    if (!ind) return;
    ind.textContent = (key === studentSortKey) ? (studentSortDir === "asc" ? "▲" : "▼") : "";
  });
}

/* =========================================================
   MODAL (Admin)
========================================================= */
function updateFeeSplitPreview() {
  const fee = toNumber($("addFee")?.value);
  $("disp80").innerText = formatKHR(fee * 0.8);
  $("disp20").innerText = formatKHR(fee * 0.2);
}

function openStudentModal() {
  isEditMode = false;
  originalName = "";

  $("modalTitle").innerText = "បញ្ចូលសិស្សថ្មី";
  $("addStudentName").value = "";
  $("addGender").value = "Male";
  $("addGrade").value = "";
  $("addFee").value = "";
  updateFeeSplitPreview();

  // ✅ ensure dropdown is filled even if user opens quickly
  syncTeacherDropdowns();

  bootstrap.Modal.getOrCreateInstance($("studentModal")).show();
}

function editStudent(index) {
  isEditMode = true;
  const r = allStudents[index];
  originalName = r?.[COL.STUDENT_NAME] ?? "";

  $("modalTitle").innerText = "កែប្រែព័ត៌មាន";
  $("addStudentName").value = r?.[COL.STUDENT_NAME] ?? "";
  $("addGender").value = r?.[COL.GENDER] ?? "Male";
  $("addGrade").value = r?.[COL.GRADE] ?? "";

  // ✅ ensure dropdown exists then select teacher
  syncTeacherDropdowns();
  $("addTeacherSelect").value = r?.[COL.TEACHER] ?? "";

  const feeValue = String(r?.[COL.FEE] ?? "").replace(/[^0-9]/g, "");
  $("addFee").value = feeValue;
  updateFeeSplitPreview();

  bootstrap.Modal.getOrCreateInstance($("studentModal")).show();
}

async function submitStudent() {
  if (currentUserRole !== "Admin") return;

  const name = $("addStudentName").value.trim();
  const teacher = $("addTeacherSelect").value;
  const feeNum = toNumber($("addFee").value);

  if (!name || !teacher) {
    return Swal.fire("Error", "សូមបំពេញឈ្មោះសិស្ស និងជ្រើសរើសគ្រូ", "error");
  }

  const form = {
    studentName: name,
    gender: $("addGender").value,
    grade: $("addGrade").value,
    teacherName: teacher,
    schoolFee: formatKHR(feeNum),
    teacherFeeVal: formatKHR(feeNum * 0.8),
    schoolFeeVal: formatKHR(feeNum * 0.2),
    paymentDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
  };

  Swal.fire({ title: "កំពុងរក្សាទុក...", didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  const res = isEditMode
    ? await callAPI("updateStudentData", originalName, form)
    : await callAPI("saveStudentToTeacherSheet", form);

  if (res && res.success) {
    Swal.fire("ជោគជ័យ", res.message || "រក្សាទុកបានសម្រេច", "success");
    bootstrap.Modal.getOrCreateInstance($("studentModal")).hide();
    await refreshAll();
  } else {
    Swal.fire("Error", res?.message || "រក្សាទុកមិនបានសម្រេច", "error");
  }
}

/* Placeholder receipt (keep yours if already good) */
function printReceipt(index) {
  const s = allStudents[index];
  if (!s) return;
  Swal.fire("Info", `Print receipt for: ${s[COL.STUDENT_NAME]}`, "info");
}

/* =========================================================
   Core utilities
========================================================= */
function paginate(items, page, perPage) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const p = Math.min(Math.max(1, page), totalPages);

  const start = (p - 1) * perPage;
  const end = Math.min(start + perPage, totalItems);
  const pageItems = items.slice(start, end);

  return {
    pageItems,
    startIndex: totalItems ? (start + 1) : 0,
    endIndex: end,
    totalPages,
    totalItems,
  };
}

function clampPage(page, totalItems, perPage) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  return Math.min(Math.max(1, page), totalPages);
}

function compareByKey(a, b, key, dir) {
  const mul = dir === "asc" ? 1 : -1;
  const va = a[key];
  const vb = b[key];

  if (va instanceof Date || vb instanceof Date) {
    const ta = va instanceof Date ? va.getTime() : -Infinity;
    const tb = vb instanceof Date ? vb.getTime() : -Infinity;
    return (ta - tb) * mul;
  }

  if (typeof va === "number" || typeof vb === "number") {
    const na = Number(va) || 0;
    const nb = Number(vb) || 0;
    return (na - nb) * mul;
  }

  return String(va ?? "").localeCompare(String(vb ?? ""), "km", { sensitivity: "base" }) * mul;
}

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  $("addFee")?.addEventListener("input", updateFeeSplitPreview);
});

