// Визначаємо базовий URL серверу
let BASE_URL;
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000";
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com";
}

const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

if (!userId) {
  window.location.href = "auth.html";
}

// ======= STATE =======
let currentStatsMode = null;
let userSchoolId = null;
let userSchoolName = null;

// ======= UTILITY HELPERS =======

function showLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-loading">
      <div class="spinner"></div>
      <span>Завантаження даних...</span>
    </div>`;
}

function showEmpty(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-empty">
      <div class="state-empty-icon">&#128203;</div>
      <p>${message || "Немає даних для відображення"}</p>
    </div>`;
}

function showError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="state-error">
      <div class="state-error-icon">&#9888;&#65039;</div>
      <p>${message || "Помилка завантаження даних"}</p>
      <button class="btn-retry" onclick="location.reload()">Спробувати знову</button>
    </div>`;
}

function showTableLoading(tbody, colspan) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colspan}" class="state-loading"><div class="spinner"></div><span>Завантаження...</span></td></tr>`;
}

function showTableEmpty(tbody, colspan, message) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colspan}" class="state-empty"><p>${message}</p></td></tr>`;
}

function showTableError(tbody, colspan, message) {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colspan}" class="state-error"><p>${message}</p></td></tr>`;
}

/** Safe fetch wrapper with error handling */
async function safeFetch(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}

function generateAvatarInitials(firstName, lastName) {
  const first = firstName?.trim() || "";
  const last = lastName?.trim() || "";
  if (!first && !last) return "?";
  return ((first[0] || "") + (last[0] || "")).toUpperCase();
}

function generateAvatarElement(person) {
  if (person.avatar) {
    return `<img src="${person.avatar}" alt="${person.first_name || ''}" class="avatar-img" onerror="this.style.display='none'; this.parentElement.textContent='${generateAvatarInitials(person.first_name, person.last_name)}'">`;
  }
  return `<div class="avatar-initials">${generateAvatarInitials(person.first_name, person.last_name)}</div>`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("uk-UA");
}

function getStatusInfo(status) {
  if (status === "активний") return { cls: "active", text: "Активний" };
  if (status === "майбутній") return { cls: "upcoming", text: "Майбутній" };
  return { cls: "completed", text: "Завершений" };
}

// ======= SCHOOL DATA FETCH =======

async function fetchUserSchool() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/my-school?userId=${userId}`);
    userSchoolId = data.schoolId;
    userSchoolName = data.schoolName || data.school;
    return data;
  } catch (error) {
    console.error("Error fetching user school:", error);
    return { school: null, schoolId: null, schoolName: null };
  }
}

// ======= MODE SELECTION =======

async function selectStatsMode(mode) {
  currentStatsMode = mode;
  document.getElementById("statsModeOverlay").style.display = "none";
  document.getElementById("statisticsPage").style.display = "block";

  if (mode === "platform") {
    document.getElementById("switchPlatform").classList.add("active");
    document.getElementById("switchInstitution").classList.remove("active");
    showPlatformStats();
    loadAllPlatformStats();
  } else {
    document.getElementById("switchInstitution").classList.add("active");
    document.getElementById("switchPlatform").classList.remove("active");
    showInstitutionStats();
    loadAllInstitutionStats();
  }
}

function switchMode(mode) {
  if (currentStatsMode === mode) return;
  currentStatsMode = mode;

  if (mode === "platform") {
    document.getElementById("switchPlatform").classList.add("active");
    document.getElementById("switchInstitution").classList.remove("active");
    showPlatformStats();
    loadAllPlatformStats();
  } else {
    document.getElementById("switchInstitution").classList.add("active");
    document.getElementById("switchPlatform").classList.remove("active");
    showInstitutionStats();
    loadAllInstitutionStats();
  }
}

function showPlatformStats() {
  document.getElementById("pageTitle").textContent = "Аналітика та Статистика";
  document.getElementById("pageSubtitle").textContent = "Загальна статистика платформи iEvents";

  document.querySelectorAll(".statistics-page > .overview-section, .statistics-page > .charts-section, .statistics-page > .top-students-section, .statistics-page > .competitions-stats-section, .statistics-page > .schools-stats-section, .statistics-page > .class-details-section, .statistics-page > .action-bar, .statistics-page > .planning-section").forEach(el => {
    el.style.display = "";
  });

  const instSections = document.getElementById("institutionSections");
  if (instSections) instSections.style.display = "none";
}

function showInstitutionStats() {
  document.getElementById("pageTitle").textContent = userSchoolName || "Статистика закладу";
  document.getElementById("pageSubtitle").textContent = "Детальна статистика вашого навчального закладу";

  document.querySelectorAll(".statistics-page > .overview-section, .statistics-page > .charts-section, .statistics-page > .top-students-section, .statistics-page > .competitions-stats-section, .statistics-page > .schools-stats-section, .statistics-page > .class-details-section, .statistics-page > .action-bar, .statistics-page > .planning-section").forEach(el => {
    el.style.display = "none";
  });

  const instSections = document.getElementById("institutionSections");
  if (instSections) instSections.style.display = "block";
}

// ======= PLATFORM STATISTICS =======

async function loadAllPlatformStats() {
  await Promise.all([
    loadOverviewStats(),
    loadParticipationRate(),
    loadGradeStats(),
    loadTimelineStats(),
    loadAverageScores(),
    loadTopStudents(),
    loadCompetitionsStats(),
    loadSchoolsStats(),
    loadClassDetails(),
  ]);
}

async function loadOverviewStats() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/overview`);
    document.getElementById("totalStudents").textContent = data.students || 0;
    document.getElementById("totalCompetitions").textContent = data.competitions || 0;
    document.getElementById("totalParticipations").textContent = data.participations || 0;
    document.getElementById("activeCompetitions").textContent = data.activeCompetitions || 0;
  } catch (error) {
    console.error("Error loading overview:", error);
  }
}

async function loadParticipationRate() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/participation-rate`);
    document.getElementById("participationRate").textContent = `${data.rate || 0}%`;
  } catch (error) {
    console.error("Error loading participation rate:", error);
  }
}

async function loadGradeStats() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/by-grade`);
    const canvas = document.getElementById("gradeChart");

    if (!data.grades || data.grades.length === 0) {
      showEmpty(canvas.parentElement, "Немає даних для відображення. Додайте учнів та конкурси.");
      return;
    }

    const grades = data.grades.map(g => g.grade || "Не вказано");
    const participations = data.grades.map(g => parseInt(g.participations_count) || 0);

    if (window.gradeChartInstance) window.gradeChartInstance.destroy();
    window.gradeChartInstance = new window.Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: grades,
        datasets: [{
          label: "Кількість участей",
          data: participations,
          backgroundColor: "rgba(102, 126, 234, 0.8)",
          borderColor: "rgba(102, 126, 234, 1)",
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  } catch (error) {
    console.error("Error loading grade stats:", error);
    showError(document.getElementById("gradeChart")?.parentElement, "Помилка завантаження графіка участі по класах");
  }
}

async function loadTimelineStats() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/competition-success`);
    const canvas = document.getElementById("timelineChart");

    if (!data.competitions || data.competitions.length === 0) {
      showEmpty(canvas.parentElement, "Немає даних для відображення. Додайте результати конкурсів.");
      return;
    }

    const competitions = data.competitions.map(c => c.title.length > 20 ? c.title.substring(0, 20) + "..." : c.title);
    const scores = data.competitions.map(c => parseFloat(c.average_score) || 0);

    if (window.timelineChartInstance) window.timelineChartInstance.destroy();
    window.timelineChartInstance = new window.Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: competitions,
        datasets: [{
          label: "Середній бал",
          data: scores,
          backgroundColor: "rgba(245, 87, 108, 0.8)",
          borderColor: "rgba(245, 87, 108, 1)",
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (ctx) => data.competitions[ctx[0].dataIndex].title } },
        },
        scales: { y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } } },
      },
    });
  } catch (error) {
    console.error("Error loading timeline stats:", error);
    showError(document.getElementById("timelineChart")?.parentElement, "Помилка завантаження графіка успішності");
  }
}

async function loadAverageScores() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/average-scores`);
    document.getElementById("averageScore").textContent = data.overallAverage || "N/A";

    const canvas = document.getElementById("averageScoresChart");
    if (data.byGrade && data.byGrade.length > 0) {
      const grades = data.byGrade.map(g => g.grade || "Не вказано");
      const averages = data.byGrade.map(g => parseFloat(g.average_score) || 0);

      if (window.averageScoresChartInstance) window.averageScoresChartInstance.destroy();
      window.averageScoresChartInstance = new window.Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: grades,
          datasets: [{
            label: "Середній бал",
            data: averages,
            backgroundColor: "rgba(250, 112, 154, 0.8)",
            borderColor: "rgba(250, 112, 154, 1)",
            borderWidth: 2,
            borderRadius: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100 } },
        },
      });
    } else {
      showEmpty(canvas.parentElement, "Немає даних про бали.");
    }
  } catch (error) {
    console.error("Error loading average scores:", error);
  }
}

async function loadTopStudents() {
  const container = document.getElementById("topStudents");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/top-students?limit=8`);

    if (!data.students || data.students.length === 0) {
      showEmpty(container, "Немає даних. Додайте учнів та конкурси.");
      return;
    }

    container.innerHTML = data.students.map(student => `
      <div class="student-card">
        <div class="student-avatar">${generateAvatarElement(student)}</div>
        <div class="student-name">${student.first_name || "Ім'я"} ${student.last_name || "не вказано"}</div>
        <div class="student-grade">${student.grade || "Клас не вказано"} | ${student.school || "Школа не вказана"}</div>
        <div class="student-participations">${student.participations_count || 0}</div>
        <div class="student-participations-label">участей</div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading top students:", error);
    showError(container, "Помилка завантаження топ учнів");
  }
}

async function loadCompetitionsStats() {
  const tbody = document.querySelector("#competitionsTable tbody");
  showTableLoading(tbody, 6);

  try {
    let data;
    try {
      data = await safeFetch(`${BASE_URL}/api/statistics/competitions-detailed`);
    } catch {
      data = await safeFetch(`${BASE_URL}/api/statistics/competitions`);
    }

    if (!data.competitions || data.competitions.length === 0) {
      showTableEmpty(tbody, 6, "Немає конкурсів. Створіть перший конкурс.");
      return;
    }

    tbody.innerHTML = data.competitions.map(comp => {
      const s = getStatusInfo(comp.status);
      return `
        <tr>
          <td>${comp.title}</td>
          <td data-label="Дата початку:">${formatDate(comp.start_date)}</td>
          <td data-label="Дата закінчення:">${formatDate(comp.end_date)}</td>
          <td data-label="Учасників:">${comp.participants_count || 0}</td>
          <td data-label="Середній бал:">${comp.average_score ? parseFloat(comp.average_score).toFixed(1) : "N/A"}</td>
          <td data-label="Статус:"><span class="status-badge ${s.cls}">${s.text}</span></td>
        </tr>`;
    }).join("");
  } catch (error) {
    console.error("Error loading competitions stats:", error);
    showTableError(tbody, 6, "Помилка завантаження статистики конкурсів");
  }
}

async function loadSchoolsStats() {
  const container = document.getElementById("schoolsList");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/by-school`);

    if (!data.schools || data.schools.length === 0) {
      showEmpty(container, "Немає даних. Додайте інформацію про школи в профілях учнів.");
      return;
    }

    container.innerHTML = data.schools.map(school => `
      <div class="school-item">
        <div class="school-info">
          <div class="school-name">${school.school}</div>
          <div class="school-students">${school.students_count || 0} ${school.students_count == 1 ? "учень" : "учнів"}</div>
        </div>
        <div class="school-participations">${school.participations_count || 0}</div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading schools stats:", error);
    showError(container, "Помилка завантаження статистики по школах");
  }
}

async function loadClassDetails() {
  const container = document.getElementById("classDetails");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/class-details`);

    if (!data.classes || data.classes.length === 0) {
      showEmpty(container, "Немає даних про класи.");
      return;
    }

    container.innerHTML = data.classes.map(cls => `
      <div class="class-detail-card">
        <div class="class-name">${cls.grade || "Клас не вказано"}</div>
        <div class="class-stats">
          <div class="class-stat-row"><span class="class-stat-label">Учнів:</span><span class="class-stat-value">${cls.students_count || 0}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Участей:</span><span class="class-stat-value">${cls.participations_count || 0}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Середній бал:</span><span class="class-stat-value">${cls.average_score ? parseFloat(cls.average_score).toFixed(1) : "N/A"}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Активність:</span><span class="class-stat-value">${cls.participation_rate ? parseFloat(cls.participation_rate).toFixed(1) : 0}%</span></div>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading class details:", error);
    showError(container, "Помилка завантаження деталей класів");
  }
}

// ======= INSTITUTION STATISTICS (filtered by school_id) =======

async function loadAllInstitutionStats() {
  if (!userSchoolId) {
    const banner = document.getElementById("institutionSummary");
    if (banner) banner.textContent = "Заклад не вказано у вашому профілі";
    return;
  }

  await Promise.all([
    loadInstOverview(),
    loadInstParticipationRate(),
    loadInstGradeStats(),
    loadInstCompetitionSuccess(),
    loadInstAverageScores(),
    loadInstTopStudents(),
    loadInstCompetitionsDetailed(),
    loadInstTeachers(),
    loadInstClassDetails(),
  ]);
}

async function loadInstOverview() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/overview?schoolId=${userSchoolId}`);

    document.getElementById("instTotalStudents").textContent = data.students || 0;
    document.getElementById("instTotalCompetitions").textContent = data.competitions || 0;
    document.getElementById("instTotalParticipations").textContent = data.participations || 0;
    document.getElementById("instActiveCompetitions").textContent = data.activeCompetitions || 0;
    document.getElementById("instTeachersCount").textContent = (data.teachers || 0) + (data.methodists || 0);

    document.getElementById("institutionName").textContent = userSchoolName;
    document.getElementById("institutionSummary").textContent =
      `${data.students || 0} учнів | ${(data.teachers || 0) + (data.methodists || 0)} вчителів | ${data.competitions || 0} конкурсів`;
  } catch (error) {
    console.error("Error loading institution overview:", error);
  }
}

async function loadInstParticipationRate() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/participation-rate?schoolId=${userSchoolId}`);
    document.getElementById("instParticipationRate").textContent = `${data.rate || 0}%`;
  } catch (error) {
    console.error("Error loading institution participation rate:", error);
  }
}

async function loadInstGradeStats() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/by-grade?schoolId=${userSchoolId}`);
    const canvas = document.getElementById("instGradeChart");

    if (!data.grades || data.grades.length === 0) {
      showEmpty(canvas.parentElement, "Немає даних для відображення.");
      return;
    }

    const grades = data.grades.map(g => g.grade || "Не вказано");
    const participations = data.grades.map(g => parseInt(g.participations_count) || 0);

    if (window.instGradeChartInstance) window.instGradeChartInstance.destroy();
    window.instGradeChartInstance = new window.Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: grades,
        datasets: [{
          label: "Кількість участей",
          data: participations,
          backgroundColor: "rgba(139, 115, 85, 0.8)",
          borderColor: "rgba(139, 115, 85, 1)",
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  } catch (error) {
    console.error("Error loading institution grade stats:", error);
    showError(document.getElementById("instGradeChart")?.parentElement, "Помилка завантаження");
  }
}

async function loadInstCompetitionSuccess() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/competition-success?schoolId=${userSchoolId}`);
    const canvas = document.getElementById("instTimelineChart");

    if (!data.competitions || data.competitions.length === 0) {
      showEmpty(canvas.parentElement, "Немає даних для відображення.");
      return;
    }

    const competitions = data.competitions.map(c => c.title.length > 20 ? c.title.substring(0, 20) + "..." : c.title);
    const scores = data.competitions.map(c => parseFloat(c.average_score) || 0);

    if (window.instTimelineChartInstance) window.instTimelineChartInstance.destroy();
    window.instTimelineChartInstance = new window.Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: competitions,
        datasets: [{
          label: "Середній бал",
          data: scores,
          backgroundColor: "rgba(168, 130, 100, 0.8)",
          borderColor: "rgba(168, 130, 100, 1)",
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (ctx) => data.competitions[ctx[0].dataIndex].title } },
        },
        scales: { y: { beginAtZero: true, max: 100, ticks: { stepSize: 10 } } },
      },
    });
  } catch (error) {
    console.error("Error loading institution competition success:", error);
    showError(document.getElementById("instTimelineChart")?.parentElement, "Помилка завантаження");
  }
}

async function loadInstAverageScores() {
  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/average-scores?schoolId=${userSchoolId}`);
    const canvas = document.getElementById("instAverageScoresChart");

    if (data.byGrade && data.byGrade.length > 0) {
      const grades = data.byGrade.map(g => g.grade || "Не вказано");
      const averages = data.byGrade.map(g => parseFloat(g.average_score) || 0);

      if (window.instAverageScoresChartInstance) window.instAverageScoresChartInstance.destroy();
      window.instAverageScoresChartInstance = new window.Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: grades,
          datasets: [{
            label: "Середній бал",
            data: averages,
            backgroundColor: "rgba(120, 100, 58, 0.8)",
            borderColor: "rgba(120, 100, 58, 1)",
            borderWidth: 2,
            borderRadius: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 100 } },
        },
      });
    } else {
      showEmpty(canvas.parentElement, "Немає даних про бали.");
    }
  } catch (error) {
    console.error("Error loading institution average scores:", error);
    showError(document.getElementById("instAverageScoresChart")?.parentElement, "Помилка завантаження");
  }
}

async function loadInstTopStudents() {
  const container = document.getElementById("instTopStudents");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/top-students?schoolId=${userSchoolId}&limit=8`);

    if (!data.students || data.students.length === 0) {
      showEmpty(container, "Немає даних про учнів закладу.");
      return;
    }

    container.innerHTML = data.students.map(student => `
      <div class="student-card">
        <div class="student-avatar">${generateAvatarElement(student)}</div>
        <div class="student-name">${student.first_name || "Ім'я"} ${student.last_name || "не вказано"}</div>
        <div class="student-grade">${student.grade || "Клас не вказано"}</div>
        <div class="student-participations">${student.participations_count || 0}</div>
        <div class="student-participations-label">участей</div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading institution top students:", error);
    showError(container, "Помилка завантаження топ учнів");
  }
}

async function loadInstCompetitionsDetailed() {
  const tbody = document.querySelector("#instCompetitionsTable tbody");
  showTableLoading(tbody, 6);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/competitions-detailed?schoolId=${userSchoolId}`);

    if (!data.competitions || data.competitions.length === 0) {
      showTableEmpty(tbody, 6, "Немає конкурсів закладу.");
      return;
    }

    tbody.innerHTML = data.competitions.map(comp => {
      const s = getStatusInfo(comp.status);
      return `
        <tr>
          <td>${comp.title}</td>
          <td data-label="Дата початку:">${formatDate(comp.start_date)}</td>
          <td data-label="Дата закінчення:">${formatDate(comp.end_date)}</td>
          <td data-label="Учасників:">${comp.participants_count || 0}</td>
          <td data-label="Середній бал:">${comp.average_score ? parseFloat(comp.average_score).toFixed(1) : "N/A"}</td>
          <td data-label="Статус:"><span class="status-badge ${s.cls}">${s.text}</span></td>
        </tr>`;
    }).join("");
  } catch (error) {
    console.error("Error loading institution competitions:", error);
    showTableError(tbody, 6, "Помилка завантаження конкурсів");
  }
}

async function loadInstTeachers() {
  const container = document.getElementById("instTeachersList");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/teachers?schoolId=${userSchoolId}`);

    if (!data.teachers || data.teachers.length === 0) {
      showEmpty(container, "Немає даних про вчителів закладу.");
      return;
    }

    container.innerHTML = data.teachers.map(teacher => `
      <div class="student-card teacher-card">
        <div class="student-avatar">${generateAvatarElement(teacher)}</div>
        <div class="student-name">${teacher.first_name || "Ім'я"} ${teacher.last_name || "не вказано"}</div>
        <div class="student-grade">${teacher.role === "методист" ? "Методист" : "Вчитель"}${teacher.specialization ? " | " + teacher.specialization : ""}${teacher.experience_years ? " | " + teacher.experience_years + " р. досвіду" : ""}</div>
        <div class="student-participations">${teacher.competitions_created || 0}</div>
        <div class="student-participations-label">створено конкурсів</div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading institution teachers:", error);
    showError(container, "Помилка завантаження вчителів");
  }
}

async function loadInstClassDetails() {
  const container = document.getElementById("instClassDetails");
  showLoading(container);

  try {
    const data = await safeFetch(`${BASE_URL}/api/statistics/institution/class-details?schoolId=${userSchoolId}`);

    if (!data.classes || data.classes.length === 0) {
      showEmpty(container, "Немає даних про класи закладу.");
      return;
    }

    container.innerHTML = data.classes.map(cls => `
      <div class="class-detail-card">
        <div class="class-name">${cls.grade || "Клас не вказано"}</div>
        <div class="class-stats">
          <div class="class-stat-row"><span class="class-stat-label">Учнів:</span><span class="class-stat-value">${cls.students_count || 0}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Участей:</span><span class="class-stat-value">${cls.participations_count || 0}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Середній бал:</span><span class="class-stat-value">${cls.average_score ? parseFloat(cls.average_score).toFixed(1) : "N/A"}</span></div>
          <div class="class-stat-row"><span class="class-stat-label">Активність:</span><span class="class-stat-value">${cls.participation_rate ? parseFloat(cls.participation_rate).toFixed(1) : 0}%</span></div>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading institution class details:", error);
    showError(container, "Помилка завантаження деталей класів");
  }
}

// ======= PLANNING FORM =======

function openPlanningForm() {
  document.getElementById("planningSection").style.display = "block";
  document.getElementById("eventStartDate").valueAsDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  document.getElementById("eventEndDate").valueAsDate = endDate;
}

function closePlanningForm() {
  document.getElementById("planningSection").style.display = "none";
  document.getElementById("planningForm").reset();
}

// ======= INIT =======

document.addEventListener("DOMContentLoaded", async () => {
  // Show planning button for teachers and methodists
  if (userRole === "вчитель" || userRole === "методист") {
    document.getElementById("planButton").style.display = "block";
  }

  // Planning form submit handler
  document.getElementById("planningForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("eventTitle").value;
    const description = document.getElementById("eventDescription").value;
    const startDate = document.getElementById("eventStartDate").value;
    const endDate = document.getElementById("eventEndDate").value;

    try {
      const response = await fetch(`${BASE_URL}/api/competitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, startDate, endDate, createdBy: userId }),
      });

      if (response.ok) {
        alert("Захід успішно створено!");
        closePlanningForm();
        await loadCompetitionsStats();
        await loadOverviewStats();
      } else {
        const error = await response.json();
        alert(`Помилка: ${error.error || "Не вдалося створити захід"}`);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Помилка створення заходу. Спробуйте ще раз.");
    }
  });

  // Fetch user school
  const schoolData = await fetchUserSchool();
  userSchoolId = schoolData.schoolId;
  userSchoolName = schoolData.schoolName || schoolData.school;

  // Update institution button description
  if (userSchoolId && userSchoolName) {
    document.getElementById("institutionDesc").textContent =
      `Статистика закладу "${userSchoolName}" - учні, вчителі, конкурси та результати`;
  } else {
    const instBtn = document.getElementById("btnInstitutionStats");
    instBtn.disabled = true;
    instBtn.style.opacity = "0.5";
    instBtn.style.cursor = "not-allowed";
    document.getElementById("institutionDesc").textContent =
      "Заклад не вказано у вашому профілі. Оновіть профіль, щоб бачити статистику закладу.";
  }

  // Show selection modal
  document.getElementById("statsModeOverlay").style.display = "flex";
});
