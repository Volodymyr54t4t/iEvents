// Contest Database Page - Бібліотека конкурсів
const BASE_URL = window.AppConfig
  ? window.AppConfig.API_URL
  : window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://ievents-qf5k.onrender.com";

let allContests = [];
let filteredContests = [];
let currentView = "grid";

document.addEventListener("DOMContentLoaded", () => {
  loadAllContests();
  setupFilters();
});

// ===== DATA LOADING =====
async function loadAllContests() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allContests = (data.competitions || []).map((c) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(c.start_date);
      const endDate = new Date(c.end_date);

      let status = "active";
      if (endDate < today) status = "finished";
      else if (startDate > today) status = "upcoming";

      if (c.manual_status === "неактивний") status = "finished";

      return { ...c, computed_status: status };
    });

    updateHeroStats();
    populateYearFilter();
    applyFilters();
  } catch (error) {
    console.error("[v0] Error loading contests:", error);
    document.getElementById("contestsContainer").innerHTML = `
      <div class="cdb-empty">
        <h3>Помилка завантаження</h3>
        <p>Не вдалося завантажити бібліотеку конкурсів. Спробуйте оновити сторінку.</p>
      </div>
    `;
  }
}

function updateHeroStats() {
  const total = allContests.length;
  const finished = allContests.filter(
    (c) => c.computed_status === "finished",
  ).length;
  const active = allContests.filter(
    (c) => c.computed_status === "active",
  ).length;
  const totalParticipants = allContests.reduce(
    (sum, c) => sum + (parseInt(c.participants_count) || 0),
    0,
  );

  animateNumber("statTotal", total);
  animateNumber("statFinished", finished);
  animateNumber("statActive", active);
  animateNumber("statParticipants", totalParticipants);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 800;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function populateYearFilter() {
  const years = new Set();
  allContests.forEach((c) => {
    if (c.start_date) years.add(new Date(c.start_date).getFullYear());
    if (c.end_date) years.add(new Date(c.end_date).getFullYear());
  });

  const select = document.getElementById("filterYear");
  const sorted = Array.from(years).sort((a, b) => b - a);
  sorted.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    select.appendChild(opt);
  });
}

// ===== FILTERS =====
function setupFilters() {
  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(applyFilters, 300));
  document
    .getElementById("filterStatus")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterYear")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterSort")
    .addEventListener("change", applyFilters);
}

function applyFilters() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const statusFilter = document.getElementById("filterStatus").value;
  const yearFilter = document.getElementById("filterYear").value;
  const sortBy = document.getElementById("filterSort").value;

  filteredContests = allContests.filter((c) => {
    // Search filter
    if (searchTerm) {
      const matchesSearch =
        (c.title || "").toLowerCase().includes(searchTerm) ||
        (c.description || "").toLowerCase().includes(searchTerm) ||
        (c.organizer || "").toLowerCase().includes(searchTerm) ||
        (c.location || "").toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && c.computed_status !== statusFilter)
      return false;

    // Year filter
    if (yearFilter !== "all") {
      const year = parseInt(yearFilter);
      const startYear = new Date(c.start_date).getFullYear();
      const endYear = new Date(c.end_date).getFullYear();
      if (startYear !== year && endYear !== year) return false;
    }

    return true;
  });

  // Sort
  filteredContests.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.start_date) - new Date(a.start_date);
      case "oldest":
        return new Date(a.start_date) - new Date(b.start_date);
      case "participants":
        return (
          (parseInt(b.participants_count) || 0) -
          (parseInt(a.participants_count) || 0)
        );
      case "alpha":
        return (a.title || "").localeCompare(b.title || "", "uk");
      default:
        return 0;
    }
  });

  renderContests();
}

// ===== RENDERING =====
function renderContests() {
  const container = document.getElementById("contestsContainer");
  const emptyState = document.getElementById("emptyState");

  if (filteredContests.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  container.innerHTML = filteredContests
    .map((c, index) => {
      const startDate = new Date(c.start_date).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const endDate = new Date(c.end_date).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const statusLabel =
        c.computed_status === "active"
          ? "Активний"
          : c.computed_status === "upcoming"
            ? "Майбутній"
            : "Завершено";

      const statusClass = c.computed_status;
      const participants = parseInt(c.participants_count) || 0;

      const desc = c.description
        ? c.description.length > 160
          ? c.description.substring(0, 160) + "..."
          : c.description
        : "Без опису";

      return `
        <div class="cdb-card card-${statusClass}" style="animation-delay: ${Math.min(index * 0.05, 0.5)}s" onclick="openContestDetail(${c.id})">
          <div class="cdb-card-top">
            <div class="cdb-card-banner status-${statusClass}"></div>
          </div>
          <div class="cdb-card-body">
            <div class="cdb-card-header">
              <h3 class="cdb-card-title">${escapeHtml(c.title)}</h3>
              <span class="cdb-status-tag ${statusClass}">${statusLabel}</span>
            </div>
            <p class="cdb-card-desc">${escapeHtml(desc)}</p>
            <div class="cdb-card-meta">
              <div class="cdb-meta-row">
                <svg class="cdb-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>${startDate} &mdash; ${endDate}</span>
              </div>
              ${
                c.location
                  ? `<div class="cdb-meta-row">
                <svg class="cdb-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${escapeHtml(c.location)}</span>
              </div>`
                  : ""
              }
              ${
                c.level
                  ? `<div class="cdb-meta-row">
                <svg class="cdb-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Рівень: <strong>${escapeHtml(c.level)}</strong></span>
              </div>`
                  : ""
              }
            </div>
          </div>
          <div class="cdb-card-footer">
            <div class="cdb-participants-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ${participants} учасн.
            </div>
            <button class="cdb-btn-view" onclick="event.stopPropagation(); openContestDetail(${c.id})">
              Детальніше
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ===== VIEW TOGGLE =====
function setView(view) {
  currentView = view;
  const container = document.getElementById("contestsContainer");

  if (view === "list") {
    container.classList.add("list-view");
  } else {
    container.classList.remove("list-view");
  }

  document
    .getElementById("viewGrid")
    .classList.toggle("active", view === "grid");
  document
    .getElementById("viewList")
    .classList.toggle("active", view === "list");
}

// ===== MODAL - CONTEST DETAIL =====
async function openContestDetail(id) {
  const modal = document.getElementById("contestModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");

  modal.classList.add("active");
  modalBody.innerHTML =
    '<div class="cdb-loading"><div class="cdb-spinner"></div><p>Завантаження деталей...</p></div>';

  try {
    // Fetch competition details
    const compResponse = await fetch(`${BASE_URL}/api/competitions/${id}`);
    if (!compResponse.ok) throw new Error(`HTTP ${compResponse.status}`);
    const compData = await compResponse.json();
    const comp = compData.competition;

    // Fetch results (winners)
    let results = [];
    try {
      const resultsResponse = await fetch(`${BASE_URL}/api/results/${id}`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        results = resultsData.results || [];
      }
    } catch (e) {
      // No results available
    }

    modalTitle.textContent = comp.title;

    const startDate = new Date(comp.start_date).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDate = new Date(comp.end_date).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const participants = parseInt(comp.participants_count) || 0;

    // Determine status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sDate = new Date(comp.start_date);
    const eDate = new Date(comp.end_date);
    let status = "active";
    let statusLabel = "Активний";
    if (eDate < today || comp.manual_status === "неактивний") {
      status = "finished";
      statusLabel = "Завершено";
    } else if (sDate > today) {
      status = "upcoming";
      statusLabel = "Майбутній";
    }

    // Sort results by place
    results.sort((a, b) => {
      const placeA = parseInt(a.place) || 999;
      const placeB = parseInt(b.place) || 999;
      return placeA - placeB;
    });

    let html = "";

    // Status + info grid
    html += `
      <div class="cdb-detail-section">
        <div class="cdb-detail-grid">
          <div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#128197;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Дати проведення</div>
              <div class="cdb-detail-card-value">${startDate} &mdash; ${endDate}</div>
            </div>
          </div>
          <div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#128101;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Учасників</div>
              <div class="cdb-detail-card-value">${participants}</div>
            </div>
          </div>
          <div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#9899;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Статус</div>
              <div class="cdb-detail-card-value"><span class="cdb-status-tag ${status}">${statusLabel}</span></div>
            </div>
          </div>
          ${
            comp.location
              ? `<div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#128205;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Місце проведення</div>
              <div class="cdb-detail-card-value">${escapeHtml(comp.location)}</div>
            </div>
          </div>`
              : ""
          }
          ${
            comp.level
              ? `<div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#11088;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Рівень</div>
              <div class="cdb-detail-card-value">${escapeHtml(comp.level)}</div>
            </div>
          </div>`
              : ""
          }
          ${
            comp.organizer
              ? `<div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#127970;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Організатор</div>
              <div class="cdb-detail-card-value">${escapeHtml(comp.organizer)}</div>
            </div>
          </div>`
              : ""
          }
          ${
            comp.is_online
              ? `<div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#127760;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Формат</div>
              <div class="cdb-detail-card-value">Онлайн</div>
            </div>
          </div>`
              : ""
          }
          ${
            comp.max_participants
              ? `<div class="cdb-detail-card">
            <div class="cdb-detail-card-icon">&#128202;</div>
            <div class="cdb-detail-card-text">
              <div class="cdb-detail-card-title">Макс. учасників</div>
              <div class="cdb-detail-card-value">${comp.max_participants}</div>
            </div>
          </div>`
              : ""
          }
        </div>
      </div>
    `;

    // Description
    if (comp.description) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Опис конкурсу
          </div>
          <div class="cdb-text-block">${escapeHtml(comp.description)}</div>
        </div>
      `;
    }

    // Requirements
    if (comp.requirements) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Умови участі
          </div>
          <div class="cdb-text-block">${escapeHtml(comp.requirements)}</div>
        </div>
      `;
    }

    // Prizes
    if (comp.prizes) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            Призи та нагороди
          </div>
          <div class="cdb-text-block">${escapeHtml(comp.prizes)}</div>
        </div>
      `;
    }

    // Website
    if (comp.website_url) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Вебсайт
          </div>
          <div class="cdb-detail-content">
            <a href="${escapeHtml(comp.website_url)}" target="_blank" rel="noopener noreferrer" style="color: #78643a; font-weight: 600; text-decoration: underline;">${escapeHtml(comp.website_url)}</a>
          </div>
        </div>
      `;
    }

    // Contact info
    if (comp.contact_info) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Контактна інформація
          </div>
          <div class="cdb-text-block">${escapeHtml(comp.contact_info)}</div>
        </div>
      `;
    }

    // Winners / Results
    if (results.length > 0) {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><rect x="6" y="9" width="12" height="4" rx="1"/><path d="M12 13v5"/><path d="M9 18h6"/></svg>
            Переможці та результати
          </div>
          <div class="cdb-winners-list">
            ${results
              .map((r) => {
                const placeEmoji =
                  r.place === "1" || r.place === 1
                    ? "&#129351;"
                    : r.place === "2" || r.place === 2
                      ? "&#129352;"
                      : r.place === "3" || r.place === 3
                        ? "&#129353;"
                        : "&#127941;";

                const name =
                  r.first_name && r.last_name
                    ? `${r.last_name} ${r.first_name}`
                    : r.email || "Учасник";

                return `
                  <div class="cdb-winner-item">
                    <div class="cdb-winner-place">${placeEmoji}</div>
                    <div class="cdb-winner-info">
                      <div class="cdb-winner-name">${escapeHtml(name)}</div>
                      <div class="cdb-winner-achievement">${escapeHtml(r.achievement || "")}</div>
                    </div>
                    ${r.score ? `<div class="cdb-winner-score">${escapeHtml(r.score)} балів</div>` : ""}
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    } else if (status === "finished") {
      html += `
        <div class="cdb-detail-section">
          <div class="cdb-detail-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><rect x="6" y="9" width="12" height="4" rx="1"/><path d="M12 13v5"/><path d="M9 18h6"/></svg>
            Переможці та результати
          </div>
          <div class="cdb-text-block" style="text-align: center; color: #9ca3af;">
            Результати ще не опубліковані
          </div>
        </div>
      `;
    }

    modalBody.innerHTML = html;
  } catch (error) {
    console.error("[v0] Error loading contest detail:", error);
    modalBody.innerHTML = `
      <div class="cdb-empty">
        <h3>Помилка завантаження</h3>
        <p>Не вдалося завантажити деталі конкурсу</p>
      </div>
    `;
  }
}

function closeModal() {
  document.getElementById("contestModal").classList.remove("active");
}

// Close modal on backdrop click
document.addEventListener("click", (e) => {
  const modal = document.getElementById("contestModal");
  if (e.target === modal) closeModal();
});

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ===== UTILITIES =====
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
