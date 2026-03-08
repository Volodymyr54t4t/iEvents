// ============ MENTOR MATCHING PAGE (Methodist/Admin) - Database-backed ============

// --------------- STATE ---------------
let allMentors = [];
let filteredMentors = [];
let allRequests = [];
let filteredRequests = [];
let activePairs = [];
let filteredPairs = [];
let studentsForAssign = [];
let mentorsForAssign = [];
let subjectsList = [];
let subjectsMap = {};

let selectedStudentId = null;
let selectedMentorId = null;
let currentConfirmAction = null;

// --------------- INITIALIZATION ---------------
document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  if (!userId) {
    window.location.href = "auth.html";
    return;
  }

  if (userRole !== "методист") {
    window.location.href = "mentor.html";
    return;
  }

  setupTabs();
  setupFilters();
  setupAssignSearch();

  await Promise.all([
    loadMentors(),
    loadRequests(),
    loadActivePairs(),
    loadSubjects(),
  ]);

  updateStats();
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

// --------------- FILTERS ---------------
function setupFilters() {
  // Mentor search
  const mentorSearch = document.getElementById("mentorSearch");
  if (mentorSearch) {
    mentorSearch.addEventListener("input", () => applyMentorFilters());
  }

  // Mentor status filter
  const mentorStatusFilter = document.getElementById("mentorStatusFilter");
  if (mentorStatusFilter) {
    mentorStatusFilter.addEventListener("change", () => applyMentorFilters());
  }

  // Request status filter
  const requestStatusFilter = document.getElementById("requestStatusFilter");
  if (requestStatusFilter) {
    requestStatusFilter.addEventListener("change", () => applyRequestFilters());
  }

  // Pairs search
  const pairsSearch = document.getElementById("pairsSearch");
  if (pairsSearch) {
    pairsSearch.addEventListener("input", () => applyPairsFilters());
  }
}

// --------------- LOAD DATA ---------------
async function loadSubjects() {
  try {
    const res = await AppConfig.fetch("/api/subjects");
    const data = await res.json();
    if (res.ok) {
      subjectsList = data.subjects || [];
      subjectsMap = {};
      subjectsList.forEach((s) => {
        subjectsMap[s.id] = s.name;
      });
      populateSubjectSelect();
    }
  } catch (error) {
    console.error("Помилка завантаження предметів:", error);
  }
}

function populateSubjectSelect() {
  const select = document.getElementById("assignSubject");
  if (!select) return;
  select.innerHTML = '<option value="">Оберіть предмет</option>';
  subjectsList.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

async function loadMentors() {
  const wrapper = document.getElementById("mentorsTableWrapper");
  wrapper.innerHTML = '<div class="loading">Завантаження наставників...</div>';

  try {
    const res = await AppConfig.fetch("/api/mentor-admin/mentors");
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    allMentors = (data.mentors || []).map((m) => ({
      id: m.user_id,
      firstName: m.first_name || "",
      lastName: m.last_name || "",
      middleName: m.middle_name || "",
      school: m.school_name || "",
      city: m.city || "",
      experience: m.experience_years || 0,
      studentsCount: parseInt(m.students_count) || 0,
      subjectsIds: m.subjects_ids || "",
      avatar: m.avatar || "",
      isBlocked: m.is_blocked || false,
      email: m.email || "",
    }));

    filteredMentors = [...allMentors];
    renderMentorsTable();
    updateMentorsBadge();
  } catch (error) {
    console.error("Помилка завантаження наставників:", error);
    wrapper.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити наставників</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadMentors()" style="margin-top:12px;">Спробувати знову</button>
      </div>
    `;
  }
}

async function loadRequests() {
  const list = document.getElementById("requestsList");
  list.innerHTML = '<div class="loading">Завантаження заявок...</div>';

  try {
    const res = await AppConfig.fetch("/api/mentor-admin/requests");
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    allRequests = (data.requests || []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      teacherId: r.teacher_id,
      studentFirstName: r.student_first_name || "",
      studentLastName: r.student_last_name || "",
      studentMiddleName: r.student_middle_name || "",
      studentSchool: r.student_school || "",
      studentGrade: r.student_grade || "",
      teacherFirstName: r.teacher_first_name || "",
      teacherLastName: r.teacher_last_name || "",
      teacherMiddleName: r.teacher_middle_name || "",
      teacherSchool: r.teacher_school || "",
      subject: r.subject || "",
      message: r.message || "",
      status: r.status || "pending",
      createdAt: new Date(r.created_at).toLocaleDateString("uk-UA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    filteredRequests = [...allRequests];
    applyRequestFilters();
    updateRequestsBadge();
  } catch (error) {
    console.error("Помилка завантаження заявок:", error);
    list.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити заявки</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadActivePairs() {
  const list = document.getElementById("pairsList");
  list.innerHTML = '<div class="loading">Завантаження пар...</div>';

  try {
    const res = await AppConfig.fetch("/api/mentor-admin/pairs");
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    activePairs = (data.pairs || []).map((p) => ({
      requestId: p.id,
      studentId: p.student_id,
      teacherId: p.teacher_id,
      studentFirstName: p.student_first_name || "",
      studentLastName: p.student_last_name || "",
      studentMiddleName: p.student_middle_name || "",
      studentSchool: p.student_school || "",
      studentGrade: p.student_grade || "",
      teacherFirstName: p.teacher_first_name || "",
      teacherLastName: p.teacher_last_name || "",
      teacherMiddleName: p.teacher_middle_name || "",
      teacherSchool: p.teacher_school || "",
      subject: p.subject || "",
      createdAt: new Date(p.created_at).toLocaleDateString("uk-UA"),
    }));

    filteredPairs = [...activePairs];
    renderPairs();
  } catch (error) {
    console.error("Помилка завантаження пар:", error);
    list.innerHTML = `
      <div class="empty-state">
        <h3>Не вдалося завантажити пари</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// --------------- RENDER MENTORS TABLE ---------------
function applyMentorFilters() {
  const search = document
    .getElementById("mentorSearch")
    .value.toLowerCase()
    .trim();
  const status = document.getElementById("mentorStatusFilter").value;

  filteredMentors = allMentors.filter((m) => {
    const fullName =
      `${m.lastName} ${m.firstName} ${m.middleName}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search) ||
      m.school.toLowerCase().includes(search);

    let matchStatus = true;
    if (status === "active") matchStatus = !m.isBlocked;
    if (status === "blocked") matchStatus = m.isBlocked;

    return matchSearch && matchStatus;
  });

  renderMentorsTable();
}

function renderMentorsTable() {
  const wrapper = document.getElementById("mentorsTableWrapper");

  if (filteredMentors.length === 0) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3>Наставників не знайдено</h3>
        <p>Спробуйте змінити параметри пошуку</p>
      </div>
    `;
    return;
  }

  let html = `
    <table class="mentors-table">
      <thead>
        <tr>
          <th>Наставник</th>
          <th>Заклад</th>
          <th>Досвід</th>
          <th>Учнів</th>
          <th>Статус</th>
          <th>Дії</th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredMentors.forEach((m, i) => {
    const initials = getInitials(m.firstName, m.lastName);
    const avatarHtml = m.avatar
      ? `<img src="${m.avatar}" alt="${m.lastName}">`
      : initials;

    html += `
      <tr style="animation: fadeInUp 0.4s ease-out ${i * 0.03}s both;">
        <td>
          <div class="mentor-cell">
            <div class="mentor-avatar-sm">${avatarHtml}</div>
            <div>
              <div class="mentor-name-cell">${m.lastName} ${m.firstName} ${m.middleName}</div>
              <div class="mentor-school-cell">${m.email}</div>
            </div>
          </div>
        </td>
        <td>${m.school || "-"}</td>
        <td>${m.experience} р.</td>
        <td>${m.studentsCount}</td>
        <td>
          <span class="status-badge ${m.isBlocked ? "blocked" : "active"}">
            ${m.isBlocked ? "Заблокований" : "Активний"}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="openMentorDetail(${m.id})" title="Переглянути">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            ${
              m.isBlocked
                ? `<button class="btn-icon success" onclick="confirmUnblockMentor(${m.id})" title="Розблокувати">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </button>`
                : `<button class="btn-icon danger" onclick="confirmBlockMentor(${m.id})" title="Заблокувати">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </button>`
            }
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

function updateMentorsBadge() {
  const badge = document.getElementById("mentorsBadge");
  if (allMentors.length > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = allMentors.length;
  } else {
    badge.style.display = "none";
  }
}

// --------------- RENDER REQUESTS ---------------
function applyRequestFilters() {
  const status = document.getElementById("requestStatusFilter").value;

  if (status === "all") {
    filteredRequests = [...allRequests];
  } else {
    filteredRequests = allRequests.filter((r) => r.status === status);
  }

  renderRequests();
}

function renderRequests() {
  const list = document.getElementById("requestsList");

  if (filteredRequests.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <h3>Заявок не знайдено</h3>
        <p>Немає заявок з обраним статусом</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredRequests
    .map((r, i) => {
      const statusLabels = {
        pending: "Очікує",
        accepted: "Прийнято",
        rejected: "Відхилено",
      };

      return `
      <div class="request-card ${r.status}" style="animation-delay: ${i * 0.05}s">
        <div class="request-pair-info">
          <div class="request-person">
            <div class="request-person-label">Учень</div>
            <div class="request-person-name">${r.studentLastName} ${r.studentFirstName}</div>
            <div class="request-person-meta">${r.studentSchool}${r.studentGrade ? " &middot; " + r.studentGrade + " кл." : ""}</div>
          </div>
          <div class="request-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
          <div class="request-person">
            <div class="request-person-label">Наставник</div>
            <div class="request-person-name">${r.teacherLastName} ${r.teacherFirstName}</div>
            <div class="request-person-meta">${r.teacherSchool}</div>
          </div>
          <div class="request-details">
            ${r.subject ? `<span class="request-subject">${r.subject}</span>` : ""}
            ${r.message ? `<div class="request-message">${escapeHtml(r.message)}</div>` : ""}
            <div class="request-date">Надіслано: ${r.createdAt}</div>
          </div>
        </div>
        <div class="request-actions">
          <span class="request-status-badge ${r.status}">${statusLabels[r.status]}</span>
          ${
            r.status === "pending"
              ? `
            <div class="request-action-btns">
              <button class="btn btn-accept btn-sm" onclick="adminUpdateRequestStatus(${r.id}, 'accepted')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Прийняти
              </button>
              <button class="btn btn-reject btn-sm" onclick="adminUpdateRequestStatus(${r.id}, 'rejected')">
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

function updateRequestsBadge() {
  const badge = document.getElementById("requestsBadge");
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  if (pendingCount > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = pendingCount;
  } else {
    badge.style.display = "none";
  }
}

async function adminUpdateRequestStatus(requestId, status) {
  const actionLabel = status === "accepted" ? "прийняти" : "відхилити";
  if (!confirm(`Ви впевнені, що хочете ${actionLabel} цю заявку?`)) return;

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-admin/requests/${requestId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    // Update local state
    const req = allRequests.find((r) => r.id === requestId);
    if (req) req.status = status;

    applyRequestFilters();
    updateRequestsBadge();
    updateStats();

    if (status === "accepted") {
      showToast("Заявку прийнято! Пару створено.", "success");
      await loadActivePairs();
    } else {
      showToast("Заявку відхилено.", "info");
    }
  } catch (error) {
    console.error("Помилка оновлення статусу:", error);
    showToast("Помилка при оновленні статусу заявки", "error");
  }
}

// --------------- RENDER PAIRS ---------------
function applyPairsFilters() {
  const search = document
    .getElementById("pairsSearch")
    .value.toLowerCase()
    .trim();

  if (!search) {
    filteredPairs = [...activePairs];
  } else {
    filteredPairs = activePairs.filter((p) => {
      const studentName =
        `${p.studentLastName} ${p.studentFirstName}`.toLowerCase();
      const teacherName =
        `${p.teacherLastName} ${p.teacherFirstName}`.toLowerCase();
      return studentName.includes(search) || teacherName.includes(search);
    });
  }

  renderPairs();
}

function renderPairs() {
  const list = document.getElementById("pairsList");

  if (filteredPairs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <h3>Активних пар не знайдено</h3>
        <p>Пари учень-наставник з'являться тут після підтвердження заявок</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredPairs
    .map((p, i) => {
      const studentInitials = getInitials(
        p.studentFirstName,
        p.studentLastName,
      );
      const teacherInitials = getInitials(
        p.teacherFirstName,
        p.teacherLastName,
      );

      return `
      <div class="pair-card" style="animation-delay: ${i * 0.05}s">
        <div class="pair-person">
          <div class="pair-avatar">${studentInitials}</div>
          <div class="pair-person-info">
            <div class="pair-person-label">Учень</div>
            <div class="pair-person-name">${p.studentLastName} ${p.studentFirstName}</div>
            <div class="pair-person-meta">${p.studentSchool}${p.studentGrade ? " &middot; " + p.studentGrade + " кл." : ""}</div>
          </div>
        </div>
        <div class="pair-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
        <div class="pair-person">
          <div class="pair-avatar">${teacherInitials}</div>
          <div class="pair-person-info">
            <div class="pair-person-label">Наставник</div>
            <div class="pair-person-name">${p.teacherLastName} ${p.teacherFirstName}</div>
            <div class="pair-person-meta">${p.teacherSchool}</div>
          </div>
        </div>
        <div class="pair-meta">
          ${p.subject ? `<span class="pair-subject">${p.subject}</span>` : ""}
          <span class="pair-date">з ${p.createdAt}</span>
        </div>
        <div class="pair-actions">
          <button class="btn btn-danger btn-sm" onclick="confirmRemovePair(${p.requestId})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Розірвати
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

// --------------- ASSIGN FORM ---------------
function setupAssignSearch() {
  const studentSearch = document.getElementById("studentSearchAssign");
  const mentorSearch = document.getElementById("mentorSearchAssign");

  if (studentSearch) {
    studentSearch.addEventListener(
      "input",
      debounce(() => searchStudentsForAssign(studentSearch.value), 300),
    );
  }

  if (mentorSearch) {
    mentorSearch.addEventListener(
      "input",
      debounce(() => searchMentorsForAssign(mentorSearch.value), 300),
    );
  }
}

async function searchStudentsForAssign(query) {
  const list = document.getElementById("studentAssignList");

  if (!query || query.length < 2) {
    list.innerHTML =
      '<div class="assign-hint">Введіть мінімум 2 символи для пошуку</div>';
    return;
  }

  list.innerHTML = '<div class="loading">Пошук...</div>';

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-admin/search-students?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    studentsForAssign = data.students || [];

    if (studentsForAssign.length === 0) {
      list.innerHTML = '<div class="assign-hint">Учнів не знайдено</div>';
      return;
    }

    list.innerHTML = studentsForAssign
      .map((s) => {
        const initials = getInitials(s.first_name, s.last_name);
        return `
        <div class="assign-item" data-student-id="${s.id}" data-last-name="${escapeAttr(s.last_name)}" data-first-name="${escapeAttr(s.first_name)}" data-school="${escapeAttr(s.school_name || "")}" data-grade="${s.grade || ""}">
          <div class="assign-item-avatar">${initials}</div>
          <div class="assign-item-info">
            <div class="assign-item-name">${escapeHtml(s.last_name)} ${escapeHtml(s.first_name)} ${escapeHtml(s.middle_name || "")}</div>
            <div class="assign-item-meta">${escapeHtml(s.school_name || "")}${s.grade ? " &middot; " + s.grade + " кл." : ""}</div>
          </div>
        </div>
      `;
      })
      .join("");

    // Add click handlers via event delegation
    list.querySelectorAll(".assign-item").forEach((item) => {
      item.addEventListener("click", function () {
        const id = parseInt(this.dataset.studentId);
        const lastName = this.dataset.lastName;
        const firstName = this.dataset.firstName;
        const school = this.dataset.school;
        const grade = this.dataset.grade;
        selectStudent(id, lastName, firstName, school, grade);
      });
    });
  } catch (error) {
    console.error("Помилка пошуку учнів:", error);
    list.innerHTML = '<div class="assign-hint">Помилка пошуку</div>';
  }
}

async function searchMentorsForAssign(query) {
  const list = document.getElementById("mentorAssignList");

  if (!query || query.length < 2) {
    list.innerHTML =
      '<div class="assign-hint">Введіть мінімум 2 символи для пошуку</div>';
    return;
  }

  list.innerHTML = '<div class="loading">Пошук...</div>';

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-admin/search-mentors?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    mentorsForAssign = data.mentors || [];

    if (mentorsForAssign.length === 0) {
      list.innerHTML = '<div class="assign-hint">Наставників не знайдено</div>';
      return;
    }

    list.innerHTML = mentorsForAssign
      .map((m) => {
        const initials = getInitials(m.first_name, m.last_name);
        return `
        <div class="assign-item" data-mentor-id="${m.id}" data-last-name="${escapeAttr(m.last_name)}" data-first-name="${escapeAttr(m.first_name)}" data-school="${escapeAttr(m.school_name || "")}">
          <div class="assign-item-avatar">${initials}</div>
          <div class="assign-item-info">
            <div class="assign-item-name">${escapeHtml(m.last_name)} ${escapeHtml(m.first_name)} ${escapeHtml(m.middle_name || "")}</div>
            <div class="assign-item-meta">${escapeHtml(m.school_name || "")}</div>
          </div>
        </div>
      `;
      })
      .join("");

    // Add click handlers via event delegation
    list.querySelectorAll(".assign-item").forEach((item) => {
      item.addEventListener("click", function () {
        const id = parseInt(this.dataset.mentorId);
        const lastName = this.dataset.lastName;
        const firstName = this.dataset.firstName;
        const school = this.dataset.school;
        selectMentor(id, lastName, firstName, school);
      });
    });
  } catch (error) {
    console.error("Помилка пошуку наставників:", error);
    list.innerHTML = '<div class="assign-hint">Помилка пошуку</div>';
  }
}

function selectStudent(id, lastName, firstName, school, grade) {
  selectedStudentId = id;
  const initials = getInitials(firstName, lastName);

  document.getElementById("studentAssignList").style.display = "none";
  const selected = document.getElementById("selectedStudent");
  selected.style.display = "block";
  selected.innerHTML = `
    <div class="selected-item-header">Обрано учня</div>
    <div class="selected-item-content">
      <div class="selected-item-avatar">${initials}</div>
      <div class="selected-item-info">
        <div class="selected-item-name">${lastName} ${firstName}</div>
        <div class="selected-item-meta">${school}${grade ? " &middot; " + grade + " кл." : ""}</div>
      </div>
      <button class="selected-item-remove" onclick="clearSelectedStudent()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  updateCreatePairBtn();
}

function selectMentor(id, lastName, firstName, school) {
  selectedMentorId = id;
  const initials = getInitials(firstName, lastName);

  document.getElementById("mentorAssignList").style.display = "none";
  const selected = document.getElementById("selectedMentor");
  selected.style.display = "block";
  selected.innerHTML = `
    <div class="selected-item-header">Обрано наставника</div>
    <div class="selected-item-content">
      <div class="selected-item-avatar">${initials}</div>
      <div class="selected-item-info">
        <div class="selected-item-name">${lastName} ${firstName}</div>
        <div class="selected-item-meta">${school}</div>
      </div>
      <button class="selected-item-remove" onclick="clearSelectedMentor()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  updateCreatePairBtn();
}

function clearSelectedStudent() {
  selectedStudentId = null;
  document.getElementById("selectedStudent").style.display = "none";
  document.getElementById("studentAssignList").style.display = "block";
  document.getElementById("studentSearchAssign").value = "";
  document.getElementById("studentAssignList").innerHTML =
    '<div class="assign-hint">Почніть вводити ПІБ для пошуку учня</div>';
  updateCreatePairBtn();
}

function clearSelectedMentor() {
  selectedMentorId = null;
  document.getElementById("selectedMentor").style.display = "none";
  document.getElementById("mentorAssignList").style.display = "block";
  document.getElementById("mentorSearchAssign").value = "";
  document.getElementById("mentorAssignList").innerHTML =
    '<div class="assign-hint">Почніть вводити ПІБ для пошуку наставника</div>';
  updateCreatePairBtn();
}

function clearAssignForm() {
  clearSelectedStudent();
  clearSelectedMentor();
  document.getElementById("assignSubject").value = "";
  document.getElementById("assignMessage").value = "";
}

function updateCreatePairBtn() {
  const btn = document.getElementById("createPairBtn");
  btn.disabled = !(selectedStudentId && selectedMentorId);
}

async function createManualPair() {
  if (!selectedStudentId || !selectedMentorId) {
    showToast("Оберіть учня та наставника", "error");
    return;
  }

  const subject = document.getElementById("assignSubject").value;
  const message = document.getElementById("assignMessage").value;

  try {
    const res = await AppConfig.fetch("/api/mentor-admin/create-pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        teacherId: selectedMentorId,
        subject,
        message: message || "Призначено методистом",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    showToast("Пару успішно створено!", "success");
    clearAssignForm();

    // Reload data
    await Promise.all([loadRequests(), loadActivePairs()]);
    updateStats();
  } catch (error) {
    console.error("Помилка створення пари:", error);
    showToast(error.message || "Помилка при створенні пари", "error");
  }
}

// --------------- MENTOR ACTIONS ---------------
function openMentorDetail(mentorId) {
  const mentor = allMentors.find((m) => m.id === mentorId);
  if (!mentor) return;

  const initials = getInitials(mentor.firstName, mentor.lastName);
  const avatarHtml = mentor.avatar
    ? `<img src="${mentor.avatar}" alt="${mentor.lastName}" style="width:80px;height:80px;border-radius:20px;object-fit:cover;border:3px solid #e5ddd3;">`
    : `<div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f5f1eb,#e5ddd3);display:flex;align-items:center;justify-content:center;font-size:32px;color:#78643a;font-weight:700;border:3px solid #e5ddd3;">${initials}</div>`;

  // Get subject names
  let subjectNames = [];
  if (mentor.subjectsIds) {
    try {
      const ids = JSON.parse(mentor.subjectsIds);
      subjectNames = ids
        .map((id) => subjectsMap[id] || `#${id}`)
        .filter(Boolean);
    } catch (e) {}
  }

  document.getElementById("mentorModalTitle").textContent =
    `${mentor.lastName} ${mentor.firstName}`;
  document.getElementById("mentorModalBody").innerHTML = `
    <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:24px;">
      ${avatarHtml}
      <div>
        <h3 style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${mentor.lastName} ${mentor.firstName} ${mentor.middleName}</h3>
        <p style="font-size:14px;color:#6b7280;">${mentor.school}</p>
        <p style="font-size:13px;color:#9ca3af;">${mentor.city}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">
          ${subjectNames.map((s) => `<span style="padding:4px 12px;background:#f0ebe4;color:#78643a;border-radius:6px;font-size:12px;font-weight:600;">${s}</span>`).join("")}
        </div>
      </div>
    </div>
    <div style="padding:20px;background:linear-gradient(135deg,#faf8f5,#f9f7f4);border-radius:12px;border-left:3px solid #a88264;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <span style="font-size:12px;color:#9ca3af;display:block;">Email</span>
          <span style="font-size:14px;color:#1f2937;font-weight:600;">${mentor.email || "-"}</span>
        </div>
        <div>
          <span style="font-size:12px;color:#9ca3af;display:block;">Досвід</span>
          <span style="font-size:14px;color:#1f2937;font-weight:600;">${mentor.experience} років</span>
        </div>
        <div>
          <span style="font-size:12px;color:#9ca3af;display:block;">Кількість учнів</span>
          <span style="font-size:14px;color:#1f2937;font-weight:600;">${mentor.studentsCount}</span>
        </div>
        <div>
          <span style="font-size:12px;color:#9ca3af;display:block;">Статус</span>
          <span class="status-badge ${mentor.isBlocked ? "blocked" : "active"}">${mentor.isBlocked ? "Заблокований" : "Активний"}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById("mentorModalFooter").innerHTML = `
    <button class="btn btn-secondary" onclick="closeMentorModal()">Закрити</button>
    ${
      mentor.isBlocked
        ? `<button class="btn btn-primary" onclick="closeMentorModal(); confirmUnblockMentor(${mentor.id})">Розблокувати</button>`
        : `<button class="btn btn-danger" onclick="closeMentorModal(); confirmBlockMentor(${mentor.id})">Заблокувати</button>`
    }
  `;

  document.getElementById("mentorDetailModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeMentorModal() {
  document.getElementById("mentorDetailModal").classList.remove("active");
  document.body.style.overflow = "";
}

function confirmBlockMentor(mentorId) {
  currentConfirmAction = () => blockMentor(mentorId);
  document.getElementById("confirmModalTitle").textContent =
    "Заблокувати наставника?";
  document.getElementById("confirmModalMessage").textContent =
    "Наставник не зможе отримувати нові заявки від учнів. Існуючі пари збережуться.";
  document.getElementById("confirmModalBtn").className = "btn btn-danger";
  document.getElementById("confirmModalBtn").textContent = "Заблокувати";
  document.getElementById("confirmModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function confirmUnblockMentor(mentorId) {
  currentConfirmAction = () => unblockMentor(mentorId);
  document.getElementById("confirmModalTitle").textContent =
    "Розблокувати наставника?";
  document.getElementById("confirmModalMessage").textContent =
    "Наставник знову зможе отримувати заявки від учнів.";
  document.getElementById("confirmModalBtn").className = "btn btn-primary";
  document.getElementById("confirmModalBtn").textContent = "Розблокувати";
  document.getElementById("confirmModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function confirmRemovePair(requestId) {
  currentConfirmAction = () => removePair(requestId);
  document.getElementById("confirmModalTitle").textContent = "Розірвати пару?";
  document.getElementById("confirmModalMessage").textContent =
    "Учень більше не буде закріплений за цим наставником. Цю дію неможливо скасувати.";
  document.getElementById("confirmModalBtn").className = "btn btn-danger";
  document.getElementById("confirmModalBtn").textContent = "Розірвати";
  document.getElementById("confirmModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("active");
  document.body.style.overflow = "";
  currentConfirmAction = null;
}

function confirmAction() {
  if (currentConfirmAction) {
    currentConfirmAction();
  }
  closeConfirmModal();
}

async function blockMentor(mentorId) {
  try {
    const res = await AppConfig.fetch(
      `/api/mentor-admin/mentors/${mentorId}/block`,
      {
        method: "PUT",
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    const mentor = allMentors.find((m) => m.id === mentorId);
    if (mentor) mentor.isBlocked = true;

    applyMentorFilters();
    showToast("Наставника заблоковано", "info");
  } catch (error) {
    console.error("Помилка блокування:", error);
    showToast("Помилка при блокуванні наставника", "error");
  }
}

async function unblockMentor(mentorId) {
  try {
    const res = await AppConfig.fetch(
      `/api/mentor-admin/mentors/${mentorId}/unblock`,
      {
        method: "PUT",
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    const mentor = allMentors.find((m) => m.id === mentorId);
    if (mentor) mentor.isBlocked = false;

    applyMentorFilters();
    showToast("Наставника розблоковано", "success");
  } catch (error) {
    console.error("Помилка розблокування:", error);
    showToast("Помилка при розблокуванні наставника", "error");
  }
}

async function removePair(requestId) {
  try {
    const res = await AppConfig.fetch(`/api/mentor-admin/pairs/${requestId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");

    activePairs = activePairs.filter((p) => p.requestId !== requestId);
    filteredPairs = filteredPairs.filter((p) => p.requestId !== requestId);
    renderPairs();
    updateStats();
    showToast("Пару розірвано", "info");
  } catch (error) {
    console.error("Помилка видалення пари:", error);
    showToast("Помилка при видаленні пари", "error");
  }
}

// --------------- STATS ---------------
function updateStats() {
  document.getElementById("statMentors").textContent = allMentors.filter(
    (m) => !m.isBlocked,
  ).length;
  document.getElementById("statPendingRequests").textContent =
    allRequests.filter((r) => r.status === "pending").length;
  document.getElementById("statActivePairs").textContent = activePairs.length;

  // Count unique students with mentors
  const uniqueStudents = new Set(activePairs.map((p) => p.studentId));
  document.getElementById("statStudents").textContent = uniqueStudents.size;
}

// --------------- UTILS ---------------
function getInitials(firstName, lastName) {
  const f = (firstName || "").charAt(0).toUpperCase();
  const l = (lastName || "").charAt(0).toUpperCase();
  return f + l || "??";
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => {
      toast.className = "toast";
    }, 400);
  }, 3000);
}
