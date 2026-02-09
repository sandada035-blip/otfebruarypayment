/****************************************************
 * School Admin Pro - script.js (CLEAN + STABLE)
 * - Login (checkLogin)
 * - Dashboard (getTeacherData) -> cards + teacher table
 * - Students (getStudentData) -> table + admin actions
 * - CRUD (saveStudentToTeacherSheet / updateStudentData / deleteStudentData)
 * - Print: printPage / printStudentReportDetailed / printReceipt
 ****************************************************/

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwuOhZPO7OtZxkMGMOMJWJXRAMbR8t5l9TCviVoOHhgjVUVn3kzM2KE1ILnBbkCB21TDg/exec";

let allStudents = [];
let currentUserRole = "User";

let isEditMode = false;
let originalName = "";

/* =========================
   Helpers
========================= */
function $(id) {
  return document.getElementById(id);
}

function toNumber(val) {
  const s = String(val ?? "").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatKHR(n) {
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("en-US") + " ៛";
}

/* =========================
   API Core
========================= */
async function callAPI(funcName, ...args) {
  const url = `${WEB_APP_URL}?func=${funcName}&args=${encodeURIComponent(
    JSON.stringify(args)
  )}`;
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

/* =========================
   Auth
========================= */
async function login() {
  const u = $("username")?.value.trim();
  const p = $("password")?.value.trim();

  if (!u || !p) {
    return Swal.fire("តម្រូវការ", "សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ និងពាក្យសម្ងាត់", "warning");
  }

  Swal.fire({
    title: "កំពុងផ្ទៀងផ្ទាត់...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  const res = await callAPI("checkLogin", u, p);

  if (res && res.success) {
    currentUserRole = res.role || "User";

    // Hide login / show app
    const loginSec = $("loginSection");
    loginSec.classList.remove("d-flex");
    loginSec.classList.add("d-none");
    $("mainApp").style.display = "block";

    applyPermissions();
    showSection("dashboard");

    Swal.fire({
      icon: "success",
      title: "ជោគជ័យ!",
      text: "អ្នកបានចូលប្រើប្រាស់ដោយជោគជ័យ!",
      timer: 1800,
      showConfirmButton: false,
    });
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
  }).then((result) => {
    if (!result.isConfirmed) return;

    // Reset UI
    const loginSec = $("loginSection");
    loginSec.classList.remove("d-none");
    loginSec.classList.add("d-flex");
    $("mainApp").style.display = "none";

    $("username").value = "";
    $("password").value = "";

    // Reset state
    allStudents = [];
    currentUserRole = "User";
  });
}

function applyPermissions() {
  // Elements with class .admin-only will show only for Admin
  const adminEls = document.querySelectorAll(".admin-only");
  adminEls.forEach((el) => {
    el.style.display = currentUserRole === "Admin" ? "" : "none";
  });
}

/* =========================
   Navigation
========================= */
function showSection(section) {
  $("dashboardSection").style.display = section === "dashboard" ? "block" : "none";
  $("studentSection").style.display = section === "students" ? "block" : "none";

  if (section === "dashboard") loadDashboard();
  if (section === "students") loadStudents();
}

/* =========================
   Search Filters
========================= */
function filterTeachers() {
  const input = $("searchTeacher");
  const filter = (input?.value || "").toLowerCase();

  const table = $("teacherTable");
  const tr = table?.getElementsByTagName("tr") || [];

  for (let i = 1; i < tr.length; i++) {
    const td = tr[i].getElementsByTagName("td")[0]; // Teacher name
    if (!td) continue;

    const txtValue = (td.textContent || td.innerText || "").toLowerCase();
    tr[i].style.display = txtValue.includes(filter) ? "" : "none";
  }
}

function filterStudents() {
  const input = $("searchStudent");
  const filter = (input?.value || "").toLowerCase();

  const table = $("studentTable");
  const tr = table?.getElementsByTagName("tr") || [];

  for (let i = 1; i < tr.length; i++) {
    const tdName = tr[i].getElementsByTagName("td")[0]; // student name
    const tdTeacher = tr[i].getElementsByTagName("td")[3]; // teacher
    if (!tdName) continue;

    const nameValue = (tdName.textContent || tdName.innerText || "").toLowerCase();
    const teacherValue = (tdTeacher?.textContent || tdTeacher?.innerText || "").toLowerCase();

    tr[i].style.display = nameValue.includes(filter) || teacherValue.includes(filter) ? "" : "none";
  }
}

/* =========================
   Dashboard (Teacher Summary + Cards)
========================= */
function renderStatsCards({ totalStudents, totalFee, teacher80, school20 }) {
  // You can keep Bootstrap row/col OR your custom stats-grid.
  // This version keeps your existing Bootstrap structure.
  $("statsRow").innerHTML = `
    <div class="col-6 col-md-3">
      <div class="stat-card stat-accent-success">
        <small class="text-muted">សិស្សសរុប</small>
        <div class="h4 mb-0">${Number(totalStudents || 0).toLocaleString("en-US")}</div>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="stat-card stat-accent-primary">
        <small class="text-muted">ទឹកប្រាក់សរុប</small>
        <div class="h4 mb-0 text-success">${formatKHR(totalFee)}</div>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="stat-card stat-accent-danger">
        <small class="text-muted">សាលា (20%)</small>
        <div class="h4 mb-0 text-danger">${formatKHR(school20)}</div>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="stat-card stat-accent-success">
        <small class="text-muted">គ្រូ (80%)</small>
        <div class="h4 mb-0 text-primary">${formatKHR(teacher80)}</div>
      </div>
    </div>
  `;
}

async function loadDashboard() {
  const res = await callAPI("getTeacherData");
  if (!res || !Array.isArray(res.rows)) return;

  // rows expected:
  // [0]=Teacher, [1]=Sex, [2]=Students, [3]=TotalFee, [4]=80%, [5]=20%
  let totalStudents = 0;
  let totalFee = 0;
  let teacher80 = 0;
  let school20 = 0;

  res.rows.forEach((r) => {
    totalStudents += toNumber(r[2]);
    totalFee += toNumber(r[3]);
    teacher80 += toNumber(r[4]);
    school20 += toNumber(r[5]);
  });

  // fallback if api doesn't send 80/20 as numeric
  if ((teacher80 === 0 && school20 === 0) && totalFee > 0) {
    teacher80 = totalFee * 0.8;
    school20 = totalFee * 0.2;
  }

  renderStatsCards({ totalStudents, totalFee, teacher80, school20 });

  $("teacherBody").innerHTML = res.rows
    .map(
      (r) => `
      <tr>
        <td>${r[0] ?? ""}</td>
        <td>${r[1] ?? ""}</td>
        <td>${r[2] ?? 0}</td>
        <td class="fw-bold text-primary">${r[3] ?? ""}</td>
        <td class="text-success">${r[4] ?? ""}</td>
        <td class="text-danger">${r[5] ?? ""}</td>
      </tr>
    `
    )
    .join("");
}

/* =========================
   Students
========================= */
async function loadStudents() {
  const loading = $("studentLoading");
  loading?.classList.remove("d-none");

  const res = await callAPI("getStudentData");

  loading?.classList.add("d-none");
  if (!res || !Array.isArray(res.rows)) return;

  allStudents = res.rows;
  renderStudentTable(allStudents);
}

function renderStudentTable(rows) {
  $("studentBody").innerHTML = rows
    .map((r, i) => {
      const canEdit = currentUserRole === "Admin";
      return `
        <tr>
          <td class="fw-bold text-primary">${r[0] ?? ""}</td>
          <td class="d-none d-md-table-cell">${r[1] ?? ""}</td>
          <td class="d-none d-md-table-cell">${r[2] ?? ""}</td>
          <td>${r[3] ?? ""}</td>
          <td class="text-success small fw-bold">${r[4] ?? ""}</td>
          <td>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-info" title="វិក្កយបត្រ" onclick="printReceipt(${i})">
                <i class="bi bi-printer"></i>
              </button>

              ${
                canEdit
                  ? `
                <button class="btn btn-sm btn-outline-warning" title="កែប្រែ" onclick="editStudent(${i})">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="លុប" onclick="confirmDelete(${i})">
                  <i class="bi bi-trash"></i>
                </button>
              `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
   Modal + Fee Split Preview
========================= */
function updateFeeSplitPreview() {
  const fee = toNumber($("addFee")?.value);
  const t80 = fee * 0.8;
  const s20 = fee * 0.2;
  if ($("disp80")) $("disp80").innerText = formatKHR(t80);
  if ($("disp20")) $("disp20").innerText = formatKHR(s20);
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

  bootstrap.Modal.getOrCreateInstance($("studentModal")).show();
}

function editStudent(index) {
  isEditMode = true;
  const r = allStudents[index];

  originalName = r[0] ?? "";

  $("modalTitle").innerText = "កែប្រែព័ត៌មាន";
  $("addStudentName").value = r[0] ?? "";
  $("addGender").value = r[1] ?? "Male";
  $("addGrade").value = r[2] ?? "";
  $("addTeacherSelect").value = r[3] ?? "";
  const feeValue = String(r[4] ?? "").replace(/[^0-9]/g, "");
  $("addFee").value = feeValue;

  updateFeeSplitPreview();
  bootstrap.Modal.getOrCreateInstance($("studentModal")).show();
}

/* =========================
   CRUD
========================= */
async function submitStudent() {
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

  Swal.fire({
    title: "កំពុងរក្សាទុក...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
  });

  const res = isEditMode
    ? await callAPI("updateStudentData", originalName, form)
    : await callAPI("saveStudentToTeacherSheet", form);

  if (res && res.success) {
    Swal.fire("ជោគជ័យ", res.message || "រក្សាទុកបានសម្រេច", "success");
    bootstrap.Modal.getOrCreateInstance($("studentModal")).hide();
    await loadStudents();
    await loadDashboard(); // refresh summary too
  } else {
    Swal.fire("Error", res?.message || "រក្សាទុកមិនបានសម្រេច", "error");
  }
}

async function confirmDelete(index) {
  if (currentUserRole !== "Admin") return;

  const name = allStudents[index]?.[0] || "";
  const teacher = allStudents[index]?.[3] || "";

  Swal.fire({
    title: "លុបទិន្នន័យ?",
    text: `តើអ្នកចង់លុបសិស្ស ${name}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    confirmButtonText: "បាទ លុបវា!",
    cancelButtonText: "បោះបង់",
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    Swal.fire({ title: "កំពុងលុប...", didOpen: () => Swal.showLoading() });
    const res = await callAPI("deleteStudentData", name, teacher);

    if (res && res.success) {
      Swal.fire("Deleted!", res.message || "លុបបានសម្រេច", "success");
      await loadStudents();
      await loadDashboard();
    } else {
      Swal.fire("Error", res?.message || "លុបមិនបានសម្រេច", "error");
    }
  });
}

/* =========================
   Print
========================= */

// 1) Print current page (use your @media print CSS)
function printPage() {
  window.print();
}

// 2) Print detailed student report in new window (Landscape)
function printStudentReportDetailed() {
  const printWindow = window.open("", "", "height=900,width=1100");

  const totalStudents = allStudents.length;
  const totalFemale = allStudents.filter((s) => s[1] === "Female" || s[1] === "ស្រី").length;

  let totalFee = 0;
  const tableRows = allStudents
    .map((r) => {
      const feeNum = toNumber(r[4]);
      totalFee += feeNum;

      const teacherPart = feeNum * 0.8;
      const schoolPart = feeNum * 0.2;

      let payDate = r[7]; // adjust if your sheet uses another index
      if (!payDate || String(payDate).includes("KHR")) {
        payDate = new Date().toLocaleDateString("km-KH");
      }

      return `
        <tr>
          <td style="border:1px solid #000;padding:6px;text-align:left;">${r[0] ?? ""}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${r[1] ?? ""}</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${r[2] ?? ""}</td>
          <td style="border:1px solid #000;padding:6px;text-align:left;">${r[3] ?? ""}</td>
          <td style="border:1px solid #000;padding:6px;text-align:right;font-weight:bold;">${feeNum.toLocaleString()} ៛</td>
          <td style="border:1px solid #000;padding:6px;text-align:right;color:#0d6efd;">${teacherPart.toLocaleString()} ៛</td>
          <td style="border:1px solid #000;padding:6px;text-align:right;color:#dc3545;">${schoolPart.toLocaleString()} ៛</td>
          <td style="border:1px solid #000;padding:6px;text-align:center;">${payDate}</td>
        </tr>
      `;
    })
    .join("");

  const fee80 = totalFee * 0.8;
  const fee20 = totalFee * 0.2;

  const reportHTML = `
  <html>
  <head>
    <title>Student Report Detailed</title>
    <style>
      body { font-family: 'Khmer OS Siemreap', sans-serif; padding: 20px; color: black; background: white; }
      .header-wrapper { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 22px; }
      .left-header { text-align:center; }
      .right-header { text-align:center; font-family: 'Khmer OS Muol Light'; font-size: 14px; }
      .logo-box { width: 70px; margin:0 auto 5px; }
      .logo-box img { width:100%; display:block; }
      .school-kh { font-family: 'Khmer OS Muol Light'; font-size: 14px; line-height: 1.8; }

      .report-title { text-align:center; font-family:'Khmer OS Muol Light'; font-size:18px; text-decoration: underline; margin: 0 0 14px; }

      .stats { display:grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
      .stat { border:1px solid #000; padding: 6px; text-align:center; border-radius: 4px; }
      .stat .label { font-size:10px; font-weight:700; }
      .stat .value { font-size:12px; font-weight:800; margin-top:2px; }

      table { width:100%; border-collapse: collapse; font-size: 12px; }
      th { border:1px solid #000; padding: 8px; background:#f2f2f2; }
      td { border:1px solid #000; padding: 6px; }

      .date-section { text-align:right; font-size: 13px; margin-top: 14px; padding-right: 60px; }
      .signature-wrapper { display:flex; justify-content:space-between; padding: 0 80px; margin-top: 18px; }
      .sig-box { text-align:center; width: 220px; }
      .sig-role { font-family:'Khmer OS Muol Light'; font-size: 13px; margin-bottom: 60px; }
      .sig-line { border-bottom: 1px dotted #000; width:100%; margin-top: 30px; }
      .sig-name { font-weight:800; font-size: 13px; margin-top: 10px; }

      @media print {
        @page { size: A4 landscape; margin: 1cm; }
      }
    </style>
  </head>
  <body>
    <div class="header-wrapper">
      <div class="left-header">
        <div class="logo-box">
          <img src="https://blogger.googleusercontent.com/img/a/AVvXsEi33gP-LjadWAMAbW6z8mKj7NUYkZeslEJ4sVFw7WK3o9fQ-JTQFMWEe06xxew4lj7WKpfuk8fadTm5kXo3GSW9jNaQHE8SrCs8_bUFDV8y4TOJ1Zhbu0YKVnWIgL7sTPuEPMrmrtuNqwDPWKHOvy6PStAaSrCz-GpLfsQNyq-BAElq9EI3etjnYsft0Pvo" alt="Logo"/>
        </div>
        <div class="school-kh">សាលាបឋមសិក្សាសម្តេចព្រះរាជអគ្គមហេសី<br/>នរោត្តមមុនីនាថសីហនុ</div>
      </div>

      <div class="right-header">
        ព្រះរាជាណាចក្រកម្ពុជា<br/>ជាតិ សាសនា ព្រះមហាក្សត្រ
      </div>
    </div>

    <div class="report-title">របាយការណ៍លម្អិតសិស្សរៀនបំប៉នបន្ថែម</div>

    <div class="stats">
      <div class="stat"><div class="label">សិស្សសរុប</div><div class="value">${totalStudents} នាក់</div></div>
      <div class="stat"><div class="label">សរុបស្រី</div><div class="value">${totalFemale} នាក់</div></div>
      <div class="stat"><div class="label">ទឹកប្រាក់សរុប</div><div class="value">${totalFee.toLocaleString()} ៛</div></div>
      <div class="stat"><div class="label">គ្រូ (80%)</div><div class="value">${fee80.toLocaleString()} ៛</div></div>
      <div class="stat"><div class="label">សាលា (20%)</div><div class="value">${fee20.toLocaleString()} ៛</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:18%;">ឈ្មោះសិស្ស</th>
          <th style="width:7%;">ភេទ</th>
          <th style="width:8%;">ថ្នាក់</th>
          <th style="width:15%;">គ្រូបង្រៀន</th>
          <th style="width:13%;">តម្លៃសិក្សា</th>
          <th style="width:13%;">គ្រូ (80%)</th>
          <th style="width:13%;">សាលា (20%)</th>
          <th style="width:13%;">ថ្ងៃបង់ប្រាក់</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div class="date-section">ថ្ងៃទី........ខែ........ឆ្នាំ២០២៦</div>

    <div class="signature-wrapper">
      <div class="sig-box">
        <div class="sig-role">បានពិនិត្យ និងឯកភាព<br/>នាយកសាលា</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <div class="sig-role">អ្នកចេញវិក្កយបត្រ</div>
        <div class="sig-name">ហម ម៉ាលីនដា</div>
      </div>
    </div>

    <script>
      window.onload = function() {
        window.print();
        setTimeout(function(){ window.close(); }, 600);
      };
    </script>
  </body>
  </html>`;

  printWindow.document.write(reportHTML);
  printWindow.document.close();
}

// 3) Print receipt per student
function printReceipt(index) {
  const s = allStudents[index];
  if (!s) return;

  const printWindow = window.open("", "", "height=600,width=800");
  const receiptHTML = `
    <html>
    <head>
      <title>Receipt - ${s[0] ?? ""}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Khmer:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Noto Serif Khmer', serif; padding: 40px; text-align: center; }
        .receipt-box { border: 2px solid #333; padding: 30px; width: 420px; margin: auto; border-radius: 12px; }
        .header { font-weight: 800; font-size: 20px; margin-bottom: 5px; color: #4361ee; }
        .line { border-bottom: 2px dashed #ccc; margin: 15px 0; }
        .details { text-align: left; font-size: 15px; line-height: 1.85; }
        .footer { margin-top: 22px; font-size: 12px; font-style: italic; color: #666; }
        .price { font-size: 18px; color: #10b981; font-weight: 800; }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <div class="header">វិក្កយបត្របង់ប្រាក់</div>
        <div style="font-size: 14px;">សាលារៀន ព្រះរាជអគ្គមហេសី</div>
        <div class="line"></div>
        <div class="details">
          <div>ឈ្មោះសិស្ស: <b>${s[0] ?? ""}</b></div>
          <div>ភេទ: <b>${s[1] ?? ""}</b></div>
          <div>ថ្នាក់សិក្សា: <b>${s[2] ?? ""}</b></div>
          <div>គ្រូបង្រៀន: <b>${s[3] ?? ""}</b></div>
          <div>តម្លៃសិក្សា: <span class="price">${s[4] ?? ""}</span></div>
          <div>កាលបរិច្ឆេទ: <b>${new Date().toLocaleDateString("km-KH")}</b></div>
        </div>
        <div class="line"></div>
        <div class="footer">សូមអរគុណ! ការអប់រំគឺជាទ្រព្យសម្បត្តិដែលមិនអាចកាត់ថ្លៃបាន។</div>
      </div>
      <script>window.onload = function(){ window.print(); window.close(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(receiptHTML);
  printWindow.document.close();
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Update 80/20 preview when typing fee
  $("addFee")?.addEventListener("input", updateFeeSplitPreview);
});
