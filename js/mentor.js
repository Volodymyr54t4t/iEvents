// ============ MENTOR MATCHING PAGE (Student) - Database-backed ============

// --------------- STATE ---------------
let mentors = [];
let filteredMentors = [];
let myRequests = [];
let favorites = [];
let currentMentorId = null;
let subjectsList = [];
let subjectsMap = {};
let studentSchoolId = null;

// --------------- INITIALIZATION ---------------
document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    window.location.href = "auth.html";
    return;
  }

  setupTabs();
  setupFilters();

  await Promise.all([loadMentors(), loadFavorites(), loadRequests()]);
});

// --------------- LOAD DATA FROM API ---------------
async function loadMentors() {
  const userId = localStorage.getItem("userId");
  const grid = document.getElementById("mentorsGrid");
  grid.innerHTML = '<div class="loading">Завантаження наставників...</div>';

  try {
    const res = await AppConfig.fetch(`/api/mentors?userId=${userId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Помилка");

    subjectsList = data.subjects || [];
    subjectsMap = {};
    subjectsList.forEach((s) => {
      subjectsMap[s.id] = s.name;
    });

    studentSchoolId = data.studentSchoolId;

    mentors = (data.mentors || []).map((m) => {
      const subjectNames = m.subject_names || [];
      return {
        id: m.user_id,
        firstName: m.first_name || "",
        lastName: m.last_name || "",
        middleName: m.middle_name || "",
        city: m.city || "",
        school: m.school_name || m.school || "",
        schoolId: m.school_id,
        experience: m.experience_years || 0,
        specialization: m.specialization || "",
        awards: m.awards || "",
        bio: m.bio || "",
        avatar: m.avatar || "",
        subjects: subjectNames,
        subject: subjectNames[0] || "Без предмету",
        direction: m.consultation_areas || "",
        studentsCount: parseInt(m.students_count) || 0,
      };
    });

    filteredMentors = [...mentors];
    renderMentors();
    populateFilterOptions();
    updateStats();
  } catch (error) {
    console.error("Помилка завантаження наставників:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h3>Не вдалося завантажити наставників</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadMentors()" style="margin-top:12px;">Спробувати знову</button>
      </div>
    `;
  }
}

async function loadFavorites() {
  const userId = localStorage.getItem("userId");
  try {
    const res = await AppConfig.fetch(`/api/mentor-favorites/${userId}`);
    const data = await res.json();
    if (res.ok) {
      favorites = data.favorites || [];
    }
  } catch (error) {
    console.error("Помилка завантаження обраних:", error);
    favorites = [];
  }
  updateFavoritesBadge();
}

async function loadRequests() {
  const userId = localStorage.getItem("userId");
  try {
    const res = await AppConfig.fetch(`/api/mentor-requests/${userId}`);
    const data = await res.json();
    if (res.ok) {
      myRequests = (data.requests || []).map((r) => ({
        id: r.id,
        mentorId: r.teacher_id,
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
        teacherFirstName: r.teacher_first_name || "",
        teacherLastName: r.teacher_last_name || "",
        teacherMiddleName: r.teacher_middle_name || "",
        teacherSchool: r.school_name || r.school || "",
        teacherAvatar: r.teacher_avatar || "",
        teacherSpecialization: r.specialization || "",
        teacherSubjectsIds: r.subjects_ids || "",
      }));
    }
  } catch (error) {
    console.error("Помилка завантаження запитів:", error);
    myRequests = [];
  }
  updateRequestsBadge();
  renderRequests();
  updateStats();
}

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

      if (tabId === "favorites") {
        renderFavorites();
      }
    });
  });
}

// --------------- FILTERS ---------------
function setupFilters() {
  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const directionFilter = document.getElementById("directionFilter");
  const resetBtn = document.getElementById("resetFilters");

  searchInput.addEventListener("input", applyFilters);
  subjectFilter.addEventListener("change", applyFilters);
  directionFilter.addEventListener("change", applyFilters);
  resetBtn.addEventListener("click", resetFilters);
}

function populateFilterOptions() {
  const subjectSelect = document.getElementById("subjectFilter");
  const directionSelect = document.getElementById("directionFilter");

  // Clear existing options except first
  subjectSelect.innerHTML = '<option value="">Всі предмети</option>';
  directionSelect.innerHTML = '<option value="">Всі напрямки</option>';

  // Use subjects from DB
  subjectsList.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    subjectSelect.appendChild(opt);
  });

  // Gather unique directions from mentors
  const directions = new Set();
  mentors.forEach((m) => {
    if (m.direction) {
      m.direction.split(",").forEach((d) => {
        const trimmed = d.trim();
        if (trimmed) directions.add(trimmed);
      });
    }
  });
  directions.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    directionSelect.appendChild(opt);
  });
}

function applyFilters() {
  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const subject = document.getElementById("subjectFilter").value;
  const direction = document.getElementById("directionFilter").value;

  filteredMentors = mentors.filter((m) => {
    const fullName =
      `${m.lastName} ${m.firstName} ${m.middleName}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search) ||
      m.school.toLowerCase().includes(search) ||
      m.city.toLowerCase().includes(search);

    const matchSubject =
      !subject ||
      m.subject === subject ||
      (m.subjects && m.subjects.includes(subject));

    const matchDirection =
      !direction ||
      (m.direction &&
        m.direction.toLowerCase().includes(direction.toLowerCase()));

    return matchSearch && matchSubject && matchDirection;
  });

  renderMentors();
  updateActiveFilters();
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("subjectFilter").value = "";
  document.getElementById("directionFilter").value = "";
  filteredMentors = [...mentors];
  renderMentors();
  updateActiveFilters();
}

function updateActiveFilters() {
  const container = document.getElementById("activeFilters");
  const search = document.getElementById("searchInput").value.trim();
  const subject = document.getElementById("subjectFilter").value;
  const direction = document.getElementById("directionFilter").value;

  const tags = [];
  if (search)
    tags.push({
      label: `Пошук: "${search}"`,
      clear: () => {
        document.getElementById("searchInput").value = "";
        applyFilters();
      },
    });
  if (subject)
    tags.push({
      label: subject,
      clear: () => {
        document.getElementById("subjectFilter").value = "";
        applyFilters();
      },
    });
  if (direction)
    tags.push({
      label: direction,
      clear: () => {
        document.getElementById("directionFilter").value = "";
        applyFilters();
      },
    });

  if (tags.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  container.innerHTML = tags
    .map(
      (tag, i) =>
        `<span class="filter-tag">${tag.label} <span class="filter-tag-remove" data-idx="${i}">&times;</span></span>`,
    )
    .join("");

  container.querySelectorAll(".filter-tag-remove").forEach((el, i) => {
    el.addEventListener("click", () => tags[i].clear());
  });
}

// --------------- RENDER MENTORS ---------------
function renderMentors() {
  const grid = document.getElementById("mentorsGrid");

  if (filteredMentors.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h3>Наставників не знайдено</h3>
        <p>${studentSchoolId ? "У вашому закладі немає зареєстрованих вчителів. Зверніться до адміністрації." : "Спробуйте змінити параметри пошуку або скинути фільтри"}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredMentors
    .map((m, i) => createMentorCard(m, i))
    .join("");
  attachCardListeners(grid);
}

function attachCardListeners(container) {
  container.querySelectorAll(".mentor-favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(parseInt(btn.dataset.id));
    });
  });

  container.querySelectorAll(".btn-view-mentor").forEach((btn) => {
    btn.addEventListener("click", () =>
      openMentorDetail(parseInt(btn.dataset.id)),
    );
  });

  container.querySelectorAll(".btn-send-request").forEach((btn) => {
    btn.addEventListener("click", () =>
      openRequestModal(parseInt(btn.dataset.id)),
    );
  });
}

function createMentorCard(mentor, index) {
  const initials = getInitials(mentor.firstName, mentor.lastName);
  const isFav = favorites.includes(mentor.id);
  const hasRequest = myRequests.some((r) => r.mentorId === mentor.id);
  const delay = Math.min(index * 0.05, 0.5);
  const avatarHtml = mentor.avatar
    ? `<img src="${mentor.avatar}" alt="${mentor.lastName}" class="mentor-avatar-img">`
    : `<div class="mentor-avatar">${initials}</div>`;

  return `
    <div class="mentor-card" style="animation-delay: ${delay}s">
      <button class="mentor-favorite-btn ${isFav ? "favorited" : ""}" data-id="${mentor.id}" aria-label="${isFav ? "Видалити з обраних" : "Додати до обраних"}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? "#e74c3c" : "none"}" stroke="${isFav ? "#e74c3c" : "#9ca3af"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="mentor-card-header">
        ${avatarHtml}
        <div class="mentor-card-info">
          <div class="mentor-name">${mentor.lastName} ${mentor.firstName} ${mentor.middleName}</div>
          <div class="mentor-school">${mentor.school}</div>
        </div>
      </div>
      <div class="mentor-tags">
        ${
          mentor.subjects.length > 0
            ? mentor.subjects
                .slice(0, 3)
                .map((s) => `<span class="mentor-tag subject">${s}</span>`)
                .join("")
            : `<span class="mentor-tag subject">${mentor.subject}</span>`
        }
        ${mentor.direction ? `<span class="mentor-tag direction">${mentor.direction.split(",")[0].trim()}</span>` : ""}
      </div>
      <div class="mentor-meta">
        <div class="mentor-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Досвід: <strong>${mentor.experience} р.</strong></span>
        </div>
        <div class="mentor-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${mentor.city || "Не вказано"}</span>
        </div>
        <div class="mentor-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Учнів: <strong>${mentor.studentsCount}</strong></span>
        </div>
      </div>
      <div class="mentor-card-actions">
        <button class="btn btn-secondary btn-sm btn-view-mentor" data-id="${mentor.id}">Детальніше</button>
        <button class="btn btn-primary btn-sm btn-send-request" data-id="${mentor.id}" ${hasRequest ? "disabled" : ""}>
          ${hasRequest ? "Запит надіслано" : "Надіслати запит"}
        </button>
      </div>
    </div>
  `;
}

// --------------- FAVORITES (DB-backed) ---------------
async function toggleFavorite(mentorId) {
  const userId = localStorage.getItem("userId");

  try {
    const res = await AppConfig.fetch("/api/mentor-favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: parseInt(userId),
        teacherId: mentorId,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (data.action === "added") {
      favorites.push(mentorId);
      showToast("Наставника додано до обраних", "success");
    } else {
      favorites = favorites.filter((id) => id !== mentorId);
      showToast("Наставника видалено з обраних", "info");
    }
  } catch (error) {
    console.error("Помилка обраних:", error);
    showToast("Помилка при оновленні обраних", "error");
    return;
  }

  updateFavoritesBadge();
  renderMentors();
}

function updateFavoritesBadge() {
  const badge = document.getElementById("favoritesBadge");
  if (favorites.length > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = favorites.length;
  } else {
    badge.style.display = "none";
  }
}

function renderFavorites() {
  const grid = document.getElementById("favoritesGrid");
  const favMentors = mentors.filter((m) => favorites.includes(m.id));

  if (favMentors.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <h3>Список порожній</h3>
        <p>Натисніть на серце на картці наставника, щоб додати його до обраних</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = favMentors.map((m, i) => createMentorCard(m, i)).join("");

  // Re-attach event listeners for favorites grid
  grid.querySelectorAll(".mentor-favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(parseInt(btn.dataset.id)).then(() => renderFavorites());
    });
  });

  grid.querySelectorAll(".btn-view-mentor").forEach((btn) => {
    btn.addEventListener("click", () =>
      openMentorDetail(parseInt(btn.dataset.id)),
    );
  });

  grid.querySelectorAll(".btn-send-request").forEach((btn) => {
    btn.addEventListener("click", () =>
      openRequestModal(parseInt(btn.dataset.id)),
    );
  });
}

// --------------- REQUESTS (DB-backed) ---------------
function updateRequestsBadge() {
  const badge = document.getElementById("requestsBadge");
  if (myRequests.length > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = myRequests.length;
  } else {
    badge.style.display = "none";
  }
}

function renderRequests() {
  const list = document.getElementById("requestsList");

  if (myRequests.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <h3>Ще немає запитів</h3>
        <p>Перейдіть на вкладку "Наставники" та надішліть запит обраному наставнику</p>
      </div>
    `;
    return;
  }

  list.innerHTML = myRequests
    .map((req, i) => {
      // Try to get mentor from loaded list, or use data stored in request
      const mentor = mentors.find((m) => m.id === req.mentorId);
      const firstName = mentor ? mentor.firstName : req.teacherFirstName;
      const lastName = mentor ? mentor.lastName : req.teacherLastName;
      const middleName = mentor ? mentor.middleName : req.teacherMiddleName;
      const school = mentor ? mentor.school : req.teacherSchool;
      const subject = mentor ? mentor.subject : req.subject || "";
      const initials = getInitials(firstName, lastName);
      const statusLabels = {
        pending: "Очікує",
        accepted: "Прийнято",
        rejected: "Відхилено",
      };
      const statusIcons = {
        pending: "&#x23F3;",
        accepted: "&#x2705;",
        rejected: "&#x274C;",
      };

      return `
      <div class="request-card" style="animation-delay: ${i * 0.05}s">
        <div class="request-avatar">${initials}</div>
        <div class="request-info">
          <div class="request-mentor-name">${lastName} ${firstName} ${middleName}</div>
          <div class="request-subject">${subject}${school ? " &middot; " + school : ""}</div>
          ${req.message ? `<div class="request-message-text">${escapeHtml(req.message)}</div>` : ""}
          <div class="request-date">Надіслано: ${req.date}</div>
        </div>
        <div class="request-status-actions">
          <div class="request-status ${req.status}">
            <span>${statusIcons[req.status] || ""}</span>
            ${statusLabels[req.status] || req.status}
          </div>
          ${req.status === "pending" ? `<button class="btn btn-secondary btn-xs btn-cancel-request" data-id="${req.id}" title="Скасувати запит">Скасувати</button>` : ""}
        </div>
      </div>
    `;
    })
    .join("");

  // Attach cancel listeners
  list.querySelectorAll(".btn-cancel-request").forEach((btn) => {
    btn.addEventListener("click", () =>
      cancelRequest(parseInt(btn.dataset.id)),
    );
  });
}

async function cancelRequest(requestId) {
  const userId = localStorage.getItem("userId");
  if (!confirm("Скасувати цей запит на наставництво?")) return;

  try {
    const res = await AppConfig.fetch(
      `/api/mentor-requests/${requestId}?userId=${userId}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw new Error("Помилка");

    myRequests = myRequests.filter((r) => r.id !== requestId);
    updateRequestsBadge();
    renderRequests();
    renderMentors();
    updateStats();
    showToast("Запит скасовано", "info");
  } catch (error) {
    console.error("Помилка скасування:", error);
    showToast("Помилка при скасуванні запиту", "error");
  }
}

// --------------- MENTOR DETAIL MODAL ---------------
function openMentorDetail(mentorId) {
  const mentor = mentors.find((m) => m.id === mentorId);
  if (!mentor) return;

  currentMentorId = mentorId;
  const hasRequest = myRequests.some((r) => r.mentorId === mentorId);
  const initials = getInitials(mentor.firstName, mentor.lastName);
  const avatarHtml = mentor.avatar
    ? `<img src="${mentor.avatar}" alt="${mentor.lastName}" class="mentor-detail-avatar-img">`
    : `<div class="mentor-detail-avatar">${initials}</div>`;

  document.getElementById("modalMentorName").textContent =
    `${mentor.lastName} ${mentor.firstName}`;

  const sendBtn = document.getElementById("modalSendRequestBtn");
  if (hasRequest) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Запит вже надіслано";
  } else {
    sendBtn.disabled = false;
    sendBtn.textContent = "Надіслати запит";
  }

  document.getElementById("modalMentorBody").innerHTML = `
    <div class="mentor-detail">
      <div class="mentor-detail-header">
        ${avatarHtml}
        <div class="mentor-detail-info">
          <h3>${mentor.lastName} ${mentor.firstName} ${mentor.middleName}</h3>
          <p>${mentor.school}${mentor.city ? " &middot; " + mentor.city : ""}</p>
          <div class="mentor-tags" style="margin-top: 12px;">
            ${mentor.subjects.map((s) => `<span class="mentor-tag subject">${s}</span>`).join("")}
            ${
              mentor.direction
                ? mentor.direction
                    .split(",")
                    .map(
                      (d) =>
                        `<span class="mentor-tag direction">${d.trim()}</span>`,
                    )
                    .join("")
                : ""
            }
          </div>
        </div>
      </div>
      
      <div class="mentor-detail-section">
        <h4>Інформація</h4>
        <div class="mentor-detail-grid">
          <div class="mentor-detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Досвід: <strong>${mentor.experience} років</strong></span>
          </div>
          <div class="mentor-detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Учнів: <strong>${mentor.studentsCount}</strong></span>
          </div>
          <div class="mentor-detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Місто: <strong>${mentor.city || "Не вказано"}</strong></span>
          </div>
          ${
            mentor.specialization
              ? `
          <div class="mentor-detail-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a88264" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Спеціалізація: <strong>${mentor.specialization}</strong></span>
          </div>`
              : ""
          }
        </div>
      </div>

      ${
        mentor.awards
          ? `
        <div class="mentor-detail-section">
          <h4>Досягнення</h4>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">${escapeHtml(mentor.awards)}</p>
        </div>
      `
          : ""
      }

      ${
        mentor.bio
          ? `
        <div class="mentor-detail-section">
          <h4>Про наставника</h4>
          <div class="mentor-detail-bio">${escapeHtml(mentor.bio)}</div>
        </div>
      `
          : ""
      }
    </div>
  `;

  document.getElementById("mentorDetailModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeMentorModal() {
  document.getElementById("mentorDetailModal").classList.remove("active");
  document.body.style.overflow = "";
  currentMentorId = null;
}

function sendRequestFromModal() {
  if (currentMentorId) {
    closeMentorModal();
    openRequestModal(currentMentorId);
  }
}

// --------------- REQUEST MODAL ---------------
function openRequestModal(mentorId) {
  const mentor = mentors.find((m) => m.id === mentorId);
  if (!mentor) return;

  if (myRequests.some((r) => r.mentorId === mentorId)) {
    showToast("Ви вже надіслали запит цьому наставнику", "info");
    return;
  }

  currentMentorId = mentorId;

  document.getElementById("requestMentorInfo").textContent =
    `Запит до: ${mentor.lastName} ${mentor.firstName} ${mentor.middleName} (${mentor.subject}, ${mentor.school})`;

  // Populate subject dropdown from mentor's subjects
  const subjectSelect = document.getElementById("requestSubject");
  subjectSelect.innerHTML = '<option value="">Оберіть предмет</option>';
  mentor.subjects.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    subjectSelect.appendChild(opt);
  });

  document.getElementById("requestMessage").value = "";
  document.getElementById("requestMessageModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeRequestMessageModal() {
  document.getElementById("requestMessageModal").classList.remove("active");
  document.body.style.overflow = "";
  currentMentorId = null;
}

async function confirmSendRequest() {
  if (!currentMentorId) return;

  const userId = localStorage.getItem("userId");
  const message = document.getElementById("requestMessage").value.trim();
  const subject = document.getElementById("requestSubject").value;

  try {
    const res = await AppConfig.fetch("/api/mentor-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: parseInt(userId),
        teacherId: currentMentorId,
        message: message,
        subject: subject,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        showToast("Ви вже надіслали запит цьому наставнику", "info");
      } else {
        throw new Error(data.error || "Помилка");
      }
      closeRequestMessageModal();
      return;
    }

    // Add to local state
    const mentor = mentors.find((m) => m.id === currentMentorId);
    myRequests.push({
      id: data.request.id,
      mentorId: currentMentorId,
      message: message,
      subject: subject,
      status: "pending",
      date: new Date().toLocaleDateString("uk-UA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      teacherFirstName: mentor ? mentor.firstName : "",
      teacherLastName: mentor ? mentor.lastName : "",
      teacherMiddleName: mentor ? mentor.middleName : "",
      teacherSchool: mentor ? mentor.school : "",
    });

    updateRequestsBadge();
    renderRequests();
    renderMentors();
    closeRequestMessageModal();
    showToast("Запит на наставництво успішно надіслано!", "success");
    updateStats();
  } catch (error) {
    console.error("Помилка відправки запиту:", error);
    showToast("Помилка при надсиланні запиту", "error");
  }
}

// --------------- STATS ---------------
function updateStats() {
  document.getElementById("totalMentors").textContent = mentors.length;

  const uniqueSubjects = new Set();
  mentors.forEach((m) => {
    if (m.subjects) m.subjects.forEach((s) => uniqueSubjects.add(s));
  });
  document.getElementById("totalSubjects").textContent = uniqueSubjects.size;
  document.getElementById("myRequestsCount").textContent = myRequests.length;
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
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Close modals on escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMentorModal();
    closeRequestMessageModal();
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
    currentMentorId = null;
  }
});
