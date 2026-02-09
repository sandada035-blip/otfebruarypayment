/* =========================================================
  School Admin Pro - Stats Cards (Facebook-like)
  - Works with your existing rendering
  - It reads totals from #teacherBody table rows
========================================================= */

function $(id){ return document.getElementById(id); }

/* ---------- Money Helpers ---------- */
function toNumber(val){
  // accept: "1,200 ៛" or "1200" or "" -> number
  const s = String(val ?? "").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatKHR(n){
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("en-US") + " ៛";
}

/* ---------- Fee split preview in modal ---------- */
function updateFeeSplitPreview(){
  const fee = toNumber($("addFee")?.value);
  const teacher80 = fee * 0.8;
  const school20 = fee * 0.2;
  if ($("disp80")) $("disp80").textContent = formatKHR(teacher80);
  if ($("disp20")) $("disp20").textContent = formatKHR(school20);
}

/* ---------- Build Facebook-like stat cards ---------- */
function renderStatsCards({ totalStudents, totalFee, teacher80, school20 }){
  const host = $("statsRow");
  if (!host) return;

  host.innerHTML = `
    <div class="stat-card stat-span-6">
      <div class="top">
        <div>
          <div class="label">ទឹកប្រាក់សរុប</div>
          <div class="value">${formatKHR(totalFee)}</div>
          <div class="sub">សរុបចំណូលទាំងអស់</div>
        </div>
        <div class="stat-icon bg-total"><i class="bi bi-cash-stack"></i></div>
      </div>
    </div>

    <div class="stat-card stat-span-3">
      <div class="top">
        <div>
          <div class="label">សាលា 20%</div>
          <div class="value">${formatKHR(school20)}</div>
          <div class="sub">ចំណែកសាលា</div>
        </div>
        <div class="stat-icon bg-school"><i class="bi bi-building"></i></div>
      </div>
    </div>

    <div class="stat-card stat-span-3">
      <div class="top">
        <div>
          <div class="label">គ្រូ 80%</div>
          <div class="value">${formatKHR(teacher80)}</div>
          <div class="sub">ចំណែកគ្រូ</div>
        </div>
        <div class="stat-icon bg-teacher"><i class="bi bi-person-badge"></i></div>
      </div>
    </div>

    <div class="stat-card stat-span-4">
      <div class="top">
        <div>
          <div class="label">ចំនួនសិស្សសរុប</div>
          <div class="value">${(Number(totalStudents)||0).toLocaleString("en-US")}</div>
          <div class="sub">សិស្សទាំងអស់ (គណនាពី Teacher Summary)</div>
        </div>
        <div class="stat-icon bg-students"><i class="bi bi-people-fill"></i></div>
      </div>
    </div>
  `;
}

/* ---------- Compute totals from Teacher Summary table ---------- */
function computeTotalsFromTeacherTable(){
  const tbody = $("teacherBody");
  if (!tbody) {
    return { totalStudents: 0, totalFee: 0, teacher80: 0, school20: 0 };
  }

  let totalStudents = 0;
  let totalFee = 0;
  let teacher80 = 0;
  let school20 = 0;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  for (const tr of rows){
    const tds = tr.querySelectorAll("td");
    // expected columns:
    // 0 Teacher, 1 Sex, 2 Students, 3 Total, 4 80%, 5 20%
    if (tds.length >= 6){
      totalStudents += toNumber(tds[2].textContent);
      totalFee += toNumber(tds[3].textContent);
      teacher80 += toNumber(tds[4].textContent);
      school20 += toNumber(tds[5].textContent);
    }
  }

  // If your table doesn't have 80/20 columns numeric, fallback:
  if (teacher80 === 0 && school20 === 0 && totalFee > 0){
    teacher80 = totalFee * 0.8;
    school20 = totalFee * 0.2;
  }

  return { totalStudents, totalFee, teacher80, school20 };
}

/* ---------- Public function: refresh stats now ---------- */
function refreshStatsNow(){
  const totals = computeTotalsFromTeacherTable();
  renderStatsCards(totals);
}

/* =========================================================
  Hook: Auto refresh when teacher table changes
========================================================= */
function observeTeacherTable(){
  const tbody = $("teacherBody");
  if (!tbody) return;

  const obs = new MutationObserver(() => {
    // whenever your app re-renders teacher rows, cards update automatically
    refreshStatsNow();
  });

  obs.observe(tbody, { childList: true, subtree: true });
}

/* =========================================================
  Your existing functions (login/showSection/logout/print...)
  - Keep yours as-is.
  - Below are safe fallbacks to avoid errors
========================================================= */

// OPTIONAL FALLBACKS (remove if you already have them)
window.showSection = window.showSection || function(name){
  const dash = $("dashboardSection");
  const stu = $("studentSection");
  if (!dash || !stu) return;
  if (name === "students"){
    dash.style.display = "none";
    stu.style.display = "block";
  } else {
    dash.style.display = "block";
    stu.style.display = "none";
  }
};

window.login = window.login || function(){
  // Keep your real login logic if you have it
  const u = $("username")?.value?.trim();
  const p = $("password")?.value?.trim();
  if (!u || !p){
    Swal.fire("បរាជ័យ", "សូមបញ្ចូល Username និង Password", "warning");
    return;
  }
  $("loginSection").style.display = "none";
  $("mainApp").style.display = "block";
  refreshStatsNow();
};

window.logout = window.logout || function(){
  $("mainApp").style.display = "none";
  $("loginSection").style.display = "flex";
};

window.printReport = window.printReport || function(){
  window.print();
};

// OPTIONAL placeholders
window.filterTeachers = window.filterTeachers || function(){};
window.filterStudents = window.filterStudents || function(){};
window.openStudentModal = window.openStudentModal || function(){
  const modalEl = $("studentModal");
  if (!modalEl) return;
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
};
window.submitStudent = window.submitStudent || function(){};

/* =========================================================
  Init
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  observeTeacherTable();
  updateFeeSplitPreview();
  // try initial render (in case table already exists)
  refreshStatsNow();
});
