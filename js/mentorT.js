// ============ MENTOR MATCHING PAGE (Teacher) - Database-backed ============

// --------------- STATE ---------------
let incomingRequests = [];
let filteredRequests = [];
let myStudents = [];
let mentorProfile = null;
let mentorStats = null;
let subjectsList = [];
let subjectsMap = {};
let materials = [];
let schedule = [];
let currentRequestFilter = "all";
let teacherId = null;

// --------------- INITIALIZATION ---------------
document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  if (!userId) {
    window.location.href = "auth.html";
    return;
  }

  if (userRole !== "вчитель" && userRole !== "методист") {
    window.location.href = "mentor.html";
    return;
  }

  teacherId = parseInt(userId);
  setupTabs();
  setupRequestFilters();
  setupModals();

  await Promise.all([
    loadProfile(),
    loadRequests(),
    loadStudents(),
    loadMaterials(),
    loadSchedule(),
  ]);
});

// --------------- TABS ---------------
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document
        .querySelectorAll(".tab-content")
        .forEach((tc) => tc.classList.remove("active"));
      const target = document.getElementById(`tab-${tabId}`);
      if (target) target.classList.add("active");
    });
  });
}

function setupRequestFilters() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentRequestFilter = chip.dataset.status;
      applyRequestFilter();
    });
  });
}

function setupModals() {
  const addMaterialBtn = document.getElementById("addMaterialBtn");
  if (addMaterialBtn)
    addMaterialBtn.addEventListener("click", openMaterialModal);

  const addSlotBtn = document.getElementById("addSlotBtn");
  if (addSlotBtn) addSlotBtn.addEventListener("click", openScheduleModal);
}

// --------------- LOAD DATA ---------------
async function loadProfile() {
  try {
    const res = await AppConfig.fetch(`/api/mentor-profile/${teacherId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    mentorProfile = data.profile;
    mentorStats = data.stats;
    subjectsList = data.subjects || [];
    subjectsMap = {};
    subjectsList.forEach((s) => {
      subjectsMap[s.id] = s.name;
    });

    renderProfile();
    updateStats();
  } catch (error) {
    console.error("Помилка завантаження профілю:", error);
    document.getElementById("profileContent").innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити профіль</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadRequests() {
  const list = document.getElementById("requestsList");
  list.innerHTML = '<div class="loading">Завантаження запитів...</div>';

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-requests-teacher/${teacherId}`,
    );
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    incomingRequests = (data.requests || []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      message: r.message || "",
      subject: r.subject || "",
      status: r.status || "pending",
      date: new Date(r.created_at).toLocaleDateString("uk-UA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      firstName: r.student_first_name || "",
      lastName: r.student_last_name || "",
      middleName: r.student_middle_name || "",
      grade: r.student_grade || "",
      city: r.student_city || "",
      avatar: r.student_avatar || "",
      school: r.school_name || r.school || "",
    }));

    filteredRequests = [...incomingRequests];
    applyRequestFilter();
    updateRequestsBadge();
    updateStats();
  } catch (error) {
    console.error("Помилка завантаження запитів:", error);
    list.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити запити</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadRequests()" style="margin-top:12px;">Спробувати знову</button>
      </div>
    `;
  }
}

async function loadStudents() {
  const grid = document.getElementById("studentsGrid");
  grid.innerHTML = '<div class="loading">Завантаження учнів...</div>';

  try {
    const res = await AppConfig.fetch(`/api/mentor-students/${teacherId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    myStudents = (data.students || []).map((s) => ({
      requestId: s.request_id,
      studentId: s.student_id,
      firstName: s.first_name || "",
      lastName: s.last_name || "",
      middleName: s.middle_name || "",
      grade: s.grade || "",
      city: s.city || "",
      avatar: s.avatar || "",
      school: s.school_name || s.school || "",
      email: s.email || "",
      subject: s.subject || "",
      requestDate: s.request_date
        ? new Date(s.request_date).toLocaleDateString("uk-UA")
        : "",
    }));

    renderStudents();
    updateStudentsBadge();
    updateStats();
    populateMaterialStudentSelect();
  } catch (error) {
    console.error("Помилка завантаження учнів:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити учнів</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadMaterials() {
  const list = document.getElementById("materialsList");
  list.innerHTML = '<div class="loading">Завантаження матеріалів...</div>';

  try {
    const res = await AppConfig.fetch(`/api/mentor-materials/${teacherId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    materials = data.materials || [];
    renderMaterials();
    updateStats();
  } catch (error) {
    console.error("Помилка завантаження матеріалів:", error);
    list.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити матеріали</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadSchedule() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = '<div class="loading">Завантаження розкладу...</div>';

  try {
    const res = await AppConfig.fetch(`/api/mentor-schedule/${teacherId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    schedule = data.schedule || [];
    renderSchedule();
  } catch (error) {
    console.error("Помилка завантаження розкладу:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити розклад</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// --------------- RENDER REQUESTS ---------------
function applyRequestFilter() {
  if (currentRequestFilter === "all") {
    filteredRequests = [...incomingRequests];
  } else {
    filteredRequests = incomingRequests.filter(
      (r) => r.status === currentRequestFilter,
    );
  }
  renderRequests();
}

function renderRequests() {
  const list = document.getElementById("requestsList");

  if (filteredRequests.length === 0) {
    const filterLabel =
      {
        all: "запитів",
        pending: "очікуючих запитів",
        accepted: "прийнятих запитів",
        rejected: "відхилених запитів",
      }[currentRequestFilter] || "запитів";

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <h3>Немає ${filterLabel}</h3>
        <p>Учні побачать ваш профіль та зможуть надсилати вам запити на наставництво</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredRequests
    .map((req, i) => {
      const initials = getInitials(req.firstName, req.lastName);
      const avatarHtml = req.avatar
        ? `<img src="${req.avatar}" alt="${req.lastName}">`
        : initials;

      const statusLabels = {
        pending: "Очікує",
        accepted: "Прийнято",
        rejected: "Відхилено",
      };

      return `
      <div class="request-card ${req.status}" style="animation-delay: ${i * 0.05}s">
        <div class="request-avatar">${avatarHtml}</div>
        <div class="request-info">
          <div class="request-student-name">${req.lastName} ${req.firstName} ${req.middleName}</div>
          <div class="request-meta">
            ${req.subject ? req.subject + " &middot; " : ""}${req.school}${req.grade ? " &middot; " + req.grade + " клас" : ""}${req.city ? " &middot; " + req.city : ""}
          </div>
          ${req.message ? `<div class="request-message-text">${escapeHtml(req.message)}</div>` : ""}
          <div class="request-date">Надіслано: ${req.date}</div>
        </div>
        <div class="request-actions">
          <div class="request-status-label ${req.status}">${statusLabels[req.status] || req.status}</div>
          ${
            req.status === "pending"
              ? `
            <div class="request-action-btns">
              <button class="btn btn-accept btn-sm" onclick="updateRequestStatus(${req.id}, 'accepted')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Прийняти
              </button>
              <button class="btn btn-reject btn-sm" onclick="updateRequestStatus(${req.id}, 'rejected')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Відхилити
              </button>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");
}

async function updateRequestStatus(requestId, status) {
  const actionLabel = status === "accepted" ? "прийняти" : "відхилити";
  if (!confirm(`Ви впевнені, що хочете ${actionLabel} цей запит?`)) return;

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-requests/${requestId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, teacherId }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    // Update local state
    const req = incomingRequests.find((r) => r.id === requestId);
    if (req) req.status = status;

    applyRequestFilter();
    updateRequestsBadge();
    updateStats();

    if (status === "accepted") {
      showToast("Запит прийнято! Учня додано до ваших підопічних.", "success");
      await loadStudents();
    } else {
      showToast("Запит відхилено.", "info");
    }
  } catch (error) {
    console.error("Помилка оновлення статусу:", error);
    showToast("Помилка при оновленні статусу запиту", "error");
  }
}

function updateRequestsBadge() {
  const badge = document.getElementById("requestsBadge");
  const pendingCount = incomingRequests.filter(
    (r) => r.status === "pending",
  ).length;
  if (pendingCount > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = pendingCount;
  } else {
    badge.style.display = "none";
  }
}

// --------------- RENDER STUDENTS ---------------
function renderStudents() {
  const grid = document.getElementById("studentsGrid");

  if (myStudents.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3>Поки немає учнів</h3>
        <p>Прийміть запити від учнів, щоб вони з'явились тут</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = myStudents
    .map((student, i) => {
      const initials = getInitials(student.firstName, student.lastName);
      const avatarHtml = student.avatar
        ? `<img src="${student.avatar}" alt="${student.lastName}">`
        : initials;
      const delay = Math.min(i * 0.05, 0.5);

      return `
      <div class="student-card" style="animation-delay: ${delay}s">
        <div class="student-card-header">
          <div class="student-avatar">${avatarHtml}</div>
          <div class="student-card-info">
            <div class="student-name">${student.lastName} ${student.firstName} ${student.middleName}</div>
            <div class="student-school">${student.school}</div>
          </div>
        </div>
        <div class="student-tags">
          ${student.subject ? `<span class="student-tag subject">${student.subject}</span>` : ""}
          ${student.grade ? `<span class="student-tag grade">${student.grade} клас</span>` : ""}
        </div>
        <div class="student-meta">
          ${
            student.city
              ? `
            <div class="student-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${student.city}</span>
            </div>
          `
              : ""
          }
          ${
            student.email
              ? `
            <div class="student-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>${student.email}</span>
            </div>
          `
              : ""
          }
          ${
            student.requestDate
              ? `
            <div class="student-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Наставництво з: <strong>${student.requestDate}</strong></span>
            </div>
          `
              : ""
          }
        </div>
        <div class="student-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="openStudentDetail(${student.studentId})">Детальніше</button>
          <button class="btn btn-primary btn-sm" onclick="openMaterialModalForStudent(${student.studentId}, '${escapeHtml(student.lastName)} ${escapeHtml(student.firstName)}')">Додати матеріал</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function updateStudentsBadge() {
  const badge = document.getElementById("studentsBadge");
  if (myStudents.length > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = myStudents.length;
  } else {
    badge.style.display = "none";
  }
}

function openStudentDetail(studentId) {
  const student = myStudents.find((s) => s.studentId === studentId);
  if (!student) return;

  const initials = getInitials(student.firstName, student.lastName);
  const avatarHtml = student.avatar
    ? `<img src="${student.avatar}" alt="${student.lastName}" style="width:80px;height:80px;border-radius:20px;object-fit:cover;border:3px solid #e5ddd3;">`
    : `<div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f5f1eb,#e5ddd3);display:flex;align-items:center;justify-content:center;font-size:32px;color:#78643a;font-weight:700;border:3px solid #e5ddd3;">${initials}</div>`;

  // Get materials for this student
  const studentMaterials = materials.filter(
    (m) => m.student_id === studentId || m.student_id === null,
  );

  document.getElementById("studentModalTitle").textContent =
    `${student.lastName} ${student.firstName}`;
  document.getElementById("studentModalBody").innerHTML = `
    <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:24px;">
      ${avatarHtml}
      <div>
        <h3 style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${student.lastName} ${student.firstName} ${student.middleName}</h3>
        <p style="font-size:14px;color:#6b7280;">${student.school}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
          ${student.subject ? `<span class="student-tag subject">${student.subject}</span>` : ""}
          ${student.grade ? `<span class="student-tag grade">${student.grade} клас</span>` : ""}
        </div>
      </div>
    </div>
    <div style="padding:20px;background:linear-gradient(135deg,#faf8f5,#f9f7f4);border-radius:12px;border-left:3px solid #a88264;margin-bottom:24px;">
      <h4 style="font-size:14px;font-weight:700;color:#1f2937;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Контакти</h4>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${student.email ? `<div class="student-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>${student.email}</span></div>` : ""}
        ${student.city ? `<div class="student-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${student.city}</span></div>` : ""}
        ${student.requestDate ? `<div class="student-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Наставництво з: <strong>${student.requestDate}</strong></span></div>` : ""}
      </div>
    </div>
    ${
      studentMaterials.length > 0
        ? `
      <div>
        <h4 style="font-size:14px;font-weight:700;color:#1f2937;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Матеріали для учня (${studentMaterials.length})</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${studentMaterials
            .map(
              (m) => `
            <div style="padding:12px;background:#fafaf9;border:1px solid #e5ddd3;border-radius:8px;font-size:13px;">
              <strong>${escapeHtml(m.title)}</strong>
              ${m.description ? `<p style="color:#6b7280;margin-top:4px;">${escapeHtml(m.description)}</p>` : ""}
              ${m.url ? `<a href="${escapeHtml(m.url)}" target="_blank" class="material-link" style="margin-top:4px;display:inline-block;">Відкрити</a>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `
        : ""
    }
  `;

  document.getElementById("studentDetailModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeStudentModal() {
  document.getElementById("studentDetailModal").classList.remove("active");
  document.body.style.overflow = "";
}

// --------------- RENDER PROFILE ---------------
function renderProfile() {
  const container = document.getElementById("profileContent");
  if (!mentorProfile) {
    container.innerHTML =
      '<div class="empty-state"><h3>Профіль не знайдено</h3></div>';
    return;
  }

  const p = mentorProfile;
  const initials = getInitials(p.first_name, p.last_name);
  const avatarHtml = p.avatar
    ? `<img src="${p.avatar}" alt="${p.last_name}">`
    : initials;

  let subjectNames = [];
  if (p.subjects_ids) {
    try {
      const ids = JSON.parse(p.subjects_ids);
      subjectNames = ids
        .map((id) => subjectsMap[id] || `#${id}`)
        .filter(Boolean);
    } catch (e) {
      const ids = p.subjects_ids.split(",").map((s) => s.trim());
      subjectNames = ids.map((id) => subjectsMap[id] || id).filter(Boolean);
    }
  }

  container.innerHTML = `
    <div class="profile-form">
      <div class="profile-header-info">
        <div class="profile-avatar-large">${avatarHtml}</div>
        <div class="profile-name-info">
          <h3>${p.last_name || ""} ${p.first_name || ""} ${p.middle_name || ""}</h3>
          <p>${p.school_name || p.school || ""}${p.city ? " &middot; " + p.city : ""}</p>
          <p>Досвід: ${p.experience_years || 0} років</p>
          <div class="profile-subjects-row">
            ${subjectNames.map((s) => `<span class="student-tag subject">${s}</span>`).join("")}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="profileSpecialization">Спеціалізація</label>
        <input type="text" id="profileSpecialization" class="form-input" value="${escapeAttr(p.specialization || "")}" placeholder="Наприклад: Олімпіадна математика, Підготовка до МАН">
      </div>

      <div class="form-group">
        <label for="profileAreas">Напрямки консультацій <span class="form-hint">(через кому)</span></label>
        <input type="text" id="profileAreas" class="form-input" value="${escapeAttr(p.consultation_areas || "")}" placeholder="Наприклад: Олімпіади, МАН, Конкурси з фізики">
      </div>

      <div class="form-group">
        <label for="profileBio">Про мене / Опис</label>
        <textarea id="profileBio" rows="4" placeholder="Розкажіть про свій досвід наставництва, підхід та що ви пропонуєте учням...">${escapeHtml(p.bio || "")}</textarea>
      </div>

      <div class="profile-save-row">
        <button class="btn btn-primary" onclick="saveProfile()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Зберегти зміни
        </button>
      </div>
    </div>
  `;
}

async function saveProfile() {
  const specialization = document
    .getElementById("profileSpecialization")
    .value.trim();
  const consultationAreas = document
    .getElementById("profileAreas")
    .value.trim();
  const bio = document.getElementById("profileBio").value.trim();

  try {
    const res = await AppConfig.fetch(`/api/mentor-profile/${teacherId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialization, consultationAreas, bio }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    showToast("Профіль наставника збережено!", "success");
  } catch (error) {
    console.error("Помилка збереження профілю:", error);
    showToast("Помилка при збереженні профілю", "error");
  }
}

// --------------- RENDER MATERIALS ---------------
function renderMaterials() {
  const list = document.getElementById("materialsList");

  if (materials.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h3>Немає матеріалів</h3>
        <p>Додавайте матеріали для підготовки ваших учнів до конкурсів</p>
      </div>
    `;
    return;
  }

  const typeLabels = {
    recommendation: "Рекомендація",
    link: "Посилання",
    book: "Книга",
    video: "Відео",
    task: "Завдання",
    other: "Інше",
  };

  const typeIcons = {
    recommendation:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    video:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    task: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    other:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  list.innerHTML = materials
    .map((m, i) => {
      const type = m.material_type || "other";
      const studentLabel = m.student_id
        ? `${m.student_last_name || ""} ${m.student_first_name || ""}`
        : "Для всіх";
      const dateStr = m.created_at
        ? new Date(m.created_at).toLocaleDateString("uk-UA")
        : "";

      return `
      <div class="material-card" style="animation-delay: ${i * 0.05}s">
        <div class="material-icon ${type}">${typeIcons[type] || typeIcons.other}</div>
        <div class="material-info">
          <div class="material-title">${escapeHtml(m.title)}</div>
          ${m.description ? `<div class="material-description">${escapeHtml(m.description)}</div>` : ""}
          <div class="material-meta">
            <span class="material-type-badge">${typeLabels[type] || type}</span>
            <span class="material-student-badge">${studentLabel}</span>
            ${m.url ? `<a href="${escapeHtml(m.url)}" target="_blank" class="material-link">Відкрити</a>` : ""}
            <span class="material-date">${dateStr}</span>
          </div>
        </div>
        <div class="material-actions">
          <button class="btn btn-danger btn-xs" onclick="deleteMaterial(${m.id})" title="Видалити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

function openMaterialModal() {
  document.getElementById("materialTitle").value = "";
  document.getElementById("materialDescription").value = "";
  document.getElementById("materialType").value = "recommendation";
  document.getElementById("materialUrl").value = "";
  document.getElementById("materialStudent").value = "";
  document.getElementById("materialModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function openMaterialModalForStudent(studentId, studentName) {
  openMaterialModal();
  const select = document.getElementById("materialStudent");
  select.value = String(studentId);
}

function closeMaterialModal() {
  document.getElementById("materialModal").classList.remove("active");
  document.body.style.overflow = "";
}

function populateMaterialStudentSelect() {
  const select = document.getElementById("materialStudent");
  select.innerHTML = '<option value="">Для всіх моїх учнів</option>';
  myStudents.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.studentId;
    opt.textContent = `${s.lastName} ${s.firstName}${s.grade ? " (" + s.grade + " кл.)" : ""}`;
    select.appendChild(opt);
  });
}

async function saveMaterial() {
  const title = document.getElementById("materialTitle").value.trim();
  const description = document
    .getElementById("materialDescription")
    .value.trim();
  const materialType = document.getElementById("materialType").value;
  const url = document.getElementById("materialUrl").value.trim();
  const studentId = document.getElementById("materialStudent").value;

  if (!title) {
    showToast("Вкажіть назву матеріалу", "error");
    return;
  }

  try {
    const res = await AppConfig.fetch("/api/mentor-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        studentId: studentId ? parseInt(studentId) : null,
        title,
        description,
        materialType,
        url,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    closeMaterialModal();
    showToast("Матеріал додано!", "success");
    await loadMaterials();
    updateStats();
  } catch (error) {
    console.error("Помилка збереження матеріалу:", error);
    showToast("Помилка при збереженні матеріалу", "error");
  }
}

async function deleteMaterial(materialId) {
  if (!confirm("Видалити цей матеріал?")) return;

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-materials/${materialId}?teacherId=${teacherId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) throw new Error("Помилка");

    materials = materials.filter((m) => m.id !== materialId);
    renderMaterials();
    updateStats();
    showToast("Матеріал видалено", "info");
  } catch (error) {
    console.error("Помилка видалення матеріалу:", error);
    showToast("Помилка при видаленні матеріалу", "error");
  }
}

// --------------- RENDER SCHEDULE ---------------
function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");

  if (schedule.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h3>Розклад порожній</h3>
        <p>Додайте слоти, щоб учні бачили, коли ви доступні для наставництва</p>
      </div>
    `;
    return;
  }

  const dayNames = [
    "Неділя",
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "П'ятниця",
    "Субота",
  ];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun

  const grouped = {};
  schedule.forEach((slot) => {
    const day = slot.day_of_week;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(slot);
  });

  grid.innerHTML = dayOrder
    .filter((d) => grouped[d])
    .map((day) => {
      const slots = grouped[day];
      return `
        <div class="schedule-day-group">
          <div class="schedule-day-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dayNames[day]}
          </div>
          <div class="schedule-slots">
            ${slots
              .map(
                (slot) => `
              <div class="schedule-slot">
                <div class="schedule-time">${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</div>
                <div class="schedule-note">${slot.note ? escapeHtml(slot.note) : "Консультація"}</div>
                <div class="schedule-slot-actions">
                  <button class="btn btn-danger btn-xs" onclick="deleteScheduleSlot(${slot.id})" title="Видалити">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function openScheduleModal() {
  document.getElementById("slotDay").value = "1";
  document.getElementById("slotStart").value = "09:00";
  document.getElementById("slotEnd").value = "10:00";
  document.getElementById("slotNote").value = "";
  document.getElementById("scheduleModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeScheduleModal() {
  document.getElementById("scheduleModal").classList.remove("active");
  document.body.style.overflow = "";
}

async function saveScheduleSlot() {
  const dayOfWeek = parseInt(document.getElementById("slotDay").value);
  const startTime = document.getElementById("slotStart").value;
  const endTime = document.getElementById("slotEnd").value;
  const note = document.getElementById("slotNote").value.trim();

  if (!startTime || !endTime) {
    showToast("Вкажіть час початку та кінця", "error");
    return;
  }

  if (startTime >= endTime) {
    showToast("Час початку має бути раніше за час кінця", "error");
    return;
  }

  try {
    const res = await AppConfig.fetch("/api/mentor-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, dayOfWeek, startTime, endTime, note }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    closeScheduleModal();
    showToast("Слот розкладу додано!", "success");
    await loadSchedule();
  } catch (error) {
    console.error("Помилка збереження слоту:", error);
    showToast("Помилка при збереженні слоту", "error");
  }
}

async function deleteScheduleSlot(slotId) {
  if (!confirm("Видалити цей слот з розкладу?")) return;

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-schedule/${slotId}?teacherId=${teacherId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) throw new Error("Помилка");

    schedule = schedule.filter((s) => s.id !== slotId);
    renderSchedule();
    showToast("Слот видалено", "info");
  } catch (error) {
    console.error("Помилка видалення слоту:", error);
    showToast("Помилка при видаленні слоту", "error");
  }
}

// --------------- STATS ---------------
function updateStats() {
  const pendingCount = incomingRequests.filter(
    (r) => r.status === "pending",
  ).length;
  document.getElementById("statPending").textContent = pendingCount;
  document.getElementById("statStudents").textContent = myStudents.length;
  document.getElementById("statMaterials").textContent = materials.length;

  if (mentorStats) {
    document.getElementById("statFavorites").textContent =
      mentorStats.favorites_count || 0;
  }
}

// --------------- TOAST ---------------
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.className = `toast show ${type}`;
  toast.textContent = message;

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => {
      toast.className = "toast";
    }, 400);
  }, 3000);
}

// --------------- UTILS ---------------
function getInitials(firstName, lastName) {
  const f = (firstName || "").charAt(0).toUpperCase();
  const l = (lastName || "").charAt(0).toUpperCase();
  return f + l || "?";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return "";
  return text
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  // Handle "HH:MM:SS" or "HH:MM"
  const parts = timeStr.split(":");
  return `${parts[0]}:${parts[1]}`;
}

// Close modals on escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMaterialModal();
    closeScheduleModal();
    closeStudentModal();
  }
});

// Close modals on backdrop click
document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("modal") &&
    e.target.classList.contains("active")
  ) {
    e.target.classList.remove("active");
    document.body.style.overflow = "";
  }
});
