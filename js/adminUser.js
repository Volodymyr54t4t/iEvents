// E-Cabinet Student JS
let BASE_URL;
if (window.AppConfig) {
  BASE_URL = window.AppConfig.API_URL;
} else if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000";
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com";
}

const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

if (!userId) {
  window.location.href = "auth.html";
}

if (userRole !== "учень") {
  alert("Доступ заборонено. Ця сторінка тільки для учнів.");
  window.location.href = "index.html";
}

let currentUserData = null;
let allCompetitions = [];
let allResults = [];
let allRehearsals = [];

document.addEventListener("DOMContentLoaded", () => {
  setupCabinetNav();
  setupCompTabs();
  setupPasswordForm();
  setupPersonalForm();

  // Load all data in parallel
  Promise.all([
    loadPersonalInfo(),
    loadCompetitions(),
    loadResults(),
    loadRehearsals(),
  ]).then(() => {
    updateStats();
    renderOverview();
  });
});

// ==================== NAVIGATION ====================

function setupCabinetNav() {
  const btns = document.querySelectorAll(".cabinet-nav-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".cabinet-section")
        .forEach((s) => s.classList.remove("active"));
      const target = document.getElementById(`section-${section}`);
      if (target) target.classList.add("active");
    });
  });
}

function setupCompTabs() {
  const tabs = document.querySelectorAll(".comp-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelectorAll(".comp-tab-content")
        .forEach((c) => c.classList.remove("active"));
      document.getElementById(`${tabName}Tab`).classList.add("active");
    });
  });
}

// ==================== PERSONAL INFO ====================

async function loadPersonalInfo() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`);
    const data = await response.json();

    if (response.ok && data.profile) {
      currentUserData = data.profile;
      updateHeroBanner(data.profile);
      displayPersonalInfo(data.profile);
      displayQuickInfo(data.profile);
    } else {
      showError("personalInfo", "Помилка завантаження даних");
    }
  } catch (error) {
    console.error("Помилка завантаження профілю:", error);
    showError("personalInfo", "Помилка з'єднання");
  }
}

function updateHeroBanner(profile) {
  const fullName = [profile.last_name, profile.first_name, profile.middle_name]
    .filter(Boolean)
    .join(" ");
  const heroName = document.getElementById("heroName");
  heroName.textContent = fullName || "Учень iEvents";

  // Avatar initials
  const avatar = document.getElementById("cabinetAvatar");
  if (profile.first_name && profile.last_name) {
    const initials = (
      profile.first_name[0] + profile.last_name[0]
    ).toUpperCase();
    avatar.innerHTML = initials;
    avatar.style.fontSize = "1.75rem";
    avatar.style.fontWeight = "700";
    avatar.style.color = "#fff";
  }

  // City
  const cityText = document.getElementById("heroCityText");
  cityText.textContent = profile.city || "Не вказано";

  // Email
  const emailText = document.getElementById("heroEmailText");
  emailText.textContent = localStorage.getItem("userEmail") || "Не вказано";
}

function displayPersonalInfo(profile) {
  const container = document.getElementById("personalInfo");
  const email = localStorage.getItem("userEmail") || "Не вказано";

  const fields = [
    {
      label: "Email",
      value: email,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    },
    {
      label: "Прізвище",
      value: profile.last_name,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    {
      label: "Ім'я",
      value: profile.first_name,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    {
      label: "По батькові",
      value: profile.middle_name,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    {
      label: "Телефон",
      value: profile.phone,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    },
    {
      label: "Telegram",
      value: profile.telegram,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    },
    {
      label: "Місто",
      value: profile.city,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    },
    {
      label: "Клас",
      value: profile.grade,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    },
    {
      label: "Школа",
      value: profile.school,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    },
    {
      label: "Дата народження",
      value: profile.birth_date
        ? new Date(profile.birth_date).toLocaleDateString("uk-UA")
        : null,
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    },
  ];

  container.innerHTML = fields
    .map(
      (f) => `
    <div class="profile-field">
      <div class="profile-field-label">${f.icon} ${f.label}</div>
      <div class="profile-field-value ${!f.value ? "empty" : ""}">${f.value || "Не вказано"}</div>
    </div>
  `,
    )
    .join("");
}

function displayQuickInfo(profile) {
  const container = document.getElementById("quickInfo");
  const email = localStorage.getItem("userEmail") || "";
  const fullName = [profile.last_name, profile.first_name]
    .filter(Boolean)
    .join(" ");

  const rows = [
    { label: "ПІБ", value: fullName },
    { label: "Email", value: email },
    { label: "Клас", value: profile.grade },
    { label: "Школа", value: profile.school },
    { label: "Місто", value: profile.city },
    { label: "Telegram", value: profile.telegram },
  ];

  container.innerHTML = `
    <div class="quick-info-list">
      ${rows
        .map(
          (r) => `
        <div class="quick-info-row">
          <span class="quick-info-label">${r.label}</span>
          <span class="quick-info-value ${!r.value ? "empty" : ""}">${r.value || "Не вказано"}</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

// ==================== EDIT MODE ====================

function toggleEditMode(section) {
  if (section === "personal") {
    const infoSection = document.getElementById("personalInfo");
    const formSection = document.getElementById("personalForm");
    const btn = document.getElementById("editPersonalBtn");

    if (formSection.style.display === "none") {
      infoSection.style.display = "none";
      formSection.style.display = "block";
      btn.textContent = "Переглянути";

      if (currentUserData) {
        document.getElementById("editFirstName").value =
          currentUserData.first_name || "";
        document.getElementById("editLastName").value =
          currentUserData.last_name || "";
        document.getElementById("editMiddleName").value =
          currentUserData.middle_name || "";
        document.getElementById("editPhone").value =
          currentUserData.phone || "";
        document.getElementById("editTelegram").value =
          currentUserData.telegram || "";
        document.getElementById("editCity").value = currentUserData.city || "";
      }
    } else {
      infoSection.style.display = "grid";
      formSection.style.display = "none";
      btn.textContent = "Редагувати";
    }
  }
}

function cancelEdit(section) {
  toggleEditMode(section);
}

function setupPersonalForm() {
  const form = document.getElementById("personalForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append(
      "firstName",
      document.getElementById("editFirstName").value.trim(),
    );
    formData.append(
      "lastName",
      document.getElementById("editLastName").value.trim(),
    );
    formData.append(
      "middleName",
      document.getElementById("editMiddleName").value.trim(),
    );
    formData.append("phone", document.getElementById("editPhone").value.trim());
    formData.append(
      "telegram",
      document.getElementById("editTelegram").value.trim(),
    );
    formData.append("city", document.getElementById("editCity").value.trim());

    try {
      const response = await fetch(`${BASE_URL}/api/profile`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        await loadPersonalInfo();
        toggleEditMode("personal");
        showToast("Дані успішно оновлено!", "success");
      } else {
        showToast(data.error || "Помилка збереження даних", "error");
      }
    } catch (error) {
      console.error("Помилка збереження:", error);
      showToast("Помилка з'єднання з сервером", "error");
    }
  });
}

// ==================== PASSWORD ====================

function setupPasswordForm() {
  const form = document.getElementById("passwordForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword.length < 6) {
      showPasswordMessage(
        "Новий пароль повинен містити мінімум 6 символів",
        "error",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage("Паролі не співпадають", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showPasswordMessage("Пароль успішно змінено!", "success");
        form.reset();
      } else {
        showPasswordMessage(data.error || "Помилка зміни пароля", "error");
      }
    } catch (error) {
      console.error("Помилка зміни пароля:", error);
      showPasswordMessage("Помилка з'єднання з сервером", "error");
    }
  });
}

function showPasswordMessage(text, type) {
  const messageDiv = document.getElementById("passwordMessage");
  messageDiv.textContent = text;
  messageDiv.className = `cabinet-message ${type}`;
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

// ==================== COMPETITIONS ====================

async function loadCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions/my/${userId}`);
    const data = await response.json();

    if (response.ok) {
      allCompetitions = data.competitions || [];
      const active = allCompetitions.filter((c) => c.status === "активний");
      const upcoming = allCompetitions.filter((c) => c.status === "майбутній");
      const completed = allCompetitions.filter(
        (c) => c.status === "неактивний",
      );

      displayCompetitions("activeTab", active, "active");
      displayCompetitions("upcomingTab", upcoming, "upcoming");
      displayCompetitions("completedTab", completed, "completed");
    } else {
      showError("activeTab", "Помилка завантаження конкурсів");
      showError("upcomingTab", "Помилка завантаження конкурсів");
      showError("completedTab", "Помилка завантаження конкурсів");
    }
  } catch (error) {
    console.error("Помилка:", error);
    showError("activeTab", "Помилка з'єднання");
    showError("upcomingTab", "Помилка з'єднання");
    showError("completedTab", "Помилка з'єднання");
  }
}

function displayCompetitions(containerId, competitions, type) {
  const container = document.getElementById(containerId);

  if (competitions.length === 0) {
    const messages = {
      active: "Наразі немає активних конкурсів",
      upcoming: "Наразі немає майбутніх конкурсів",
      completed: "Ще немає завершених конкурсів",
    };
    container.innerHTML = renderEmpty(
      messages[type] || "Немає конкурсів",
      "Очікуйте, поки викладач додасть вас на конкурс",
    );
    return;
  }

  container.innerHTML = `
    <div class="comp-list">
      ${competitions
        .map((c) => {
          const startDate = new Date(c.start_date);
          const endDate = new Date(c.end_date);
          const today = new Date();

          let daysInfo = "";
          if (type === "active") {
            const daysLeft = Math.ceil(
              (endDate - today) / (1000 * 60 * 60 * 24),
            );
            if (daysLeft > 0) {
              daysInfo = `<div class="comp-days-badge active">Залишилось ${daysLeft} дн.</div>`;
            }
          } else if (type === "upcoming") {
            const daysUntil = Math.ceil(
              (startDate - today) / (1000 * 60 * 60 * 24),
            );
            if (daysUntil > 0) {
              daysInfo = `<div class="comp-days-badge upcoming">Через ${daysUntil} дн.</div>`;
            }
          }

          return `
            <div class="comp-item">
              <div class="comp-status-dot ${type}"></div>
              <div class="comp-item-body">
                <div class="comp-item-title">${c.title}</div>
                ${c.description ? `<div class="comp-item-desc">${c.description}</div>` : ""}
                <div class="comp-item-meta">
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    ${startDate.toLocaleDateString("uk-UA")} - ${endDate.toLocaleDateString("uk-UA")}
                  </span>
                </div>
                ${daysInfo}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// ==================== RESULTS ====================

async function loadResults() {
  try {
    const allResultsResponse = await fetch(`${BASE_URL}/api/admin/all-results`);
    const allResultsData = await allResultsResponse.json();

    if (!allResultsResponse.ok || !allResultsData.results) {
      allResults = [];
      return;
    }

    allResults = allResultsData.results.filter(
      (r) => r.user_id === parseInt(userId),
    );
    allResults.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));

    displayResults();
  } catch (error) {
    console.error("Помилка завантаження результатів:", error);
    allResults = [];
  }
}

function displayResults() {
  const container = document.getElementById("resultsContainer");

  if (allResults.length === 0) {
    container.innerHTML = renderEmpty(
      "Ще немає результатів",
      "Результати з'являться після завершення конкурсів",
    );
    return;
  }

  container.innerHTML = `
    <div class="results-list">
      ${allResults
        .map((r) => {
          const date = new Date(r.added_at).toLocaleDateString("uk-UA");
          const placeClass =
            r.place == 1
              ? "gold"
              : r.place == 2
                ? "silver"
                : r.place == 3
                  ? "bronze"
                  : "other";
          const placeText = r.place || "-";

          return `
            <div class="result-item">
              <div class="result-place-badge ${placeClass}">${placeText}</div>
              <div class="result-item-body">
                <div class="result-item-title">${r.competition_title}</div>
                <div class="result-item-date">${date}</div>
                <div class="result-item-details">
                  ${r.place ? `<span class="result-detail-tag place">Місце: ${r.place}</span>` : ""}
                  ${r.score ? `<span class="result-detail-tag score">Бали: ${r.score}</span>` : ""}
                  ${r.achievement ? `<span class="result-detail-tag achievement">${r.achievement}</span>` : ""}
                </div>
                ${r.notes ? `<div class="result-notes-text">${r.notes}</div>` : ""}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// ==================== REHEARSALS ====================

async function loadRehearsals() {
  try {
    const response = await fetch(
      `${BASE_URL}/api/rehearsals/student/${userId}`,
    );
    const data = await response.json();

    if (response.ok) {
      allRehearsals = data.rehearsals || [];
      displayRehearsals();
    } else {
      allRehearsals = [];
    }
  } catch (error) {
    console.error("Помилка завантаження репетицій:", error);
    allRehearsals = [];
  }
}

function displayRehearsals() {
  const container = document.getElementById("rehearsalsContainer");

  if (allRehearsals.length === 0) {
    container.innerHTML = renderEmpty(
      "Немає запланованих репетицій",
      "Репетиції з'являться, коли вчитель їх призначить",
    );
    return;
  }

  const months = [
    "СІЧ",
    "ЛЮТ",
    "БЕР",
    "КВІ",
    "ТРА",
    "ЧЕР",
    "ЛИП",
    "СЕР",
    "ВЕР",
    "ЖОВ",
    "ЛИС",
    "ГРУ",
  ];

  container.innerHTML = `
    <div class="rehearsal-list">
      ${allRehearsals
        .map((r) => {
          const date = new Date(r.rehearsal_date);
          const day = date.getDate();
          const month = months[date.getMonth()];
          const time = date.toLocaleTimeString("uk-UA", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return `
            <div class="rehearsal-item">
              <div class="rehearsal-date-badge">
                <span class="rehearsal-date-day">${day}</span>
                <span class="rehearsal-date-month">${month}</span>
              </div>
              <div class="rehearsal-item-body">
                <div class="rehearsal-item-title">${r.title}</div>
                <div class="rehearsal-item-comp">${r.competition_title}</div>
                <div class="rehearsal-item-meta">
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${time}
                  </span>
                  ${r.duration ? `<span>${r.duration} хв</span>` : ""}
                  ${
                    r.location
                      ? `<span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${r.location}
                  </span>`
                      : ""
                  }
                  ${
                    r.teacher_name
                      ? `<span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ${r.teacher_name}
                  </span>`
                      : ""
                  }
                </div>
                ${r.is_online ? '<span class="rehearsal-online-badge">Online</span>' : ""}
                ${r.description ? `<div class="result-notes-text" style="margin-top:8px">${r.description}</div>` : ""}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// ==================== STATS ====================

function updateStats() {
  document.getElementById("statCompetitions").textContent =
    allCompetitions.length;
  document.getElementById("statActive").textContent = allCompetitions.filter(
    (c) => c.status === "активний",
  ).length;
  document.getElementById("statResults").textContent = allResults.length;
  document.getElementById("statRehearsals").textContent = allRehearsals.length;
}

// ==================== OVERVIEW ====================

function renderOverview() {
  renderUpcomingEvents();
  renderRecentResults();
}

function renderUpcomingEvents() {
  const container = document.getElementById("upcomingEvents");
  const today = new Date();

  // Gather upcoming competitions and rehearsals
  const events = [];

  allCompetitions
    .filter((c) => c.status === "активний" || c.status === "майбутній")
    .forEach((c) => {
      const date =
        c.status === "майбутній"
          ? new Date(c.start_date)
          : new Date(c.end_date);
      events.push({
        title: c.title,
        sub: c.status === "активний" ? "Активний конкурс" : "Майбутній конкурс",
        date: date,
        type: c.status === "активний" ? "active" : "upcoming",
      });
    });

  allRehearsals
    .filter((r) => new Date(r.rehearsal_date) >= today)
    .forEach((r) => {
      events.push({
        title: r.title,
        sub: r.competition_title,
        date: new Date(r.rehearsal_date),
        type: "rehearsal",
      });
    });

  events.sort((a, b) => a.date - b.date);
  const upcoming = events.slice(0, 6);

  if (upcoming.length === 0) {
    container.innerHTML = renderEmpty(
      "Немає найближчих подій",
      "Ваші конкурси та репетиції з'являться тут",
    );
    return;
  }

  container.innerHTML = `
    <div class="timeline">
      ${upcoming
        .map(
          (e) => `
        <div class="timeline-item">
          <div class="timeline-dot ${e.type}"></div>
          <div class="timeline-content">
            <div class="timeline-title">${e.title}</div>
            <div class="timeline-sub">${e.sub}</div>
          </div>
          <div class="timeline-date">${e.date.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderRecentResults() {
  const container = document.getElementById("recentResults");
  const recent = allResults.slice(0, 4);

  if (recent.length === 0) {
    container.innerHTML = renderEmpty(
      "Немає результатів",
      "Результати конкурсів з'являться тут",
    );
    return;
  }

  container.innerHTML = `
    <div class="results-list">
      ${recent
        .map((r) => {
          const date = new Date(r.added_at).toLocaleDateString("uk-UA");
          const placeClass =
            r.place == 1
              ? "gold"
              : r.place == 2
                ? "silver"
                : r.place == 3
                  ? "bronze"
                  : "other";

          return `
            <div class="result-item">
              <div class="result-place-badge ${placeClass}">${r.place || "-"}</div>
              <div class="result-item-body">
                <div class="result-item-title">${r.competition_title}</div>
                <div class="result-item-date">${date}</div>
                <div class="result-item-details">
                  ${r.score ? `<span class="result-detail-tag score">Бали: ${r.score}</span>` : ""}
                  ${r.achievement ? `<span class="result-detail-tag achievement">${r.achievement}</span>` : ""}
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// ==================== HELPERS ====================

function renderEmpty(title, description) {
  return `
    <div class="cabinet-empty">
      <div class="cabinet-empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      </div>
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
  `;
}

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = renderEmpty(message, "Спробуйте оновити сторінку");
  }
}

function showToast(text, type) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = text;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Keep old function name for compatibility
function showMessage(text, type) {
  showToast(text, type);
}
