let BASE_URL;
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000";
} else {
  BASE_URL = "https://ievents-o8nm.onrender.com";
}

let allStudents = [];
let filteredStudents = [];
let studentPredictions = {}; // keyed by student id
let currentViewMode = "list";

const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");
const userSchoolId = localStorage.getItem("userSchoolId");

if (!userId) {
  window.location.href = "auth.html";
}

if (userRole !== "вчитель") {
  alert("У вас немає доступу до цієї сторінки");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadStudents();
  setupEventListeners();
  updateStats();
});

function setupEventListeners() {
  document
    .getElementById("searchStudents")
    .addEventListener("input", filterStudents);
  document
    .getElementById("filterGrade")
    .addEventListener("change", filterStudents);
  document
    .getElementById("filterStatus")
    .addEventListener("change", filterStudents);
  document
    .getElementById("filterTrend")
    .addEventListener("change", filterStudents);
}

// ========== PREDICTION LOGIC (mirrored from predictions.js) ==========

function calculateTrend(results) {
  if (results.length === 0) return "new";
  if (results.length === 1) return "new";
  const sorted = [...results].sort(
    (a, b) =>
      new Date(b.created_at || b.added_at) -
      new Date(a.created_at || a.added_at),
  );
  const recent = sorted.slice(0, Math.min(3, sorted.length));
  const scores = recent
    .map((r) => {
      const score = r.score;
      if (score && /^[0-9]+(\.[0-9]+)?$/.test(score.toString()))
        return parseFloat(score);
      return null;
    })
    .filter((s) => s !== null && s > 0);
  if (scores.length < 2) return "stable";
  const recentAvg =
    scores.slice(0, Math.min(2, scores.length)).reduce((a, b) => a + b, 0) /
    Math.min(2, scores.length);
  const olderAvg =
    scores.slice(-Math.min(2, scores.length)).reduce((a, b) => a + b, 0) /
    Math.min(2, scores.length);
  const diff = recentAvg - olderAvg;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

function calculateAverageScore(results) {
  const scores = results
    .map((r) => {
      const score = r.score;
      if (score && /^[0-9]+(\.[0-9]+)?$/.test(score.toString()))
        return parseFloat(score);
      return null;
    })
    .filter((s) => s !== null && s > 0);
  if (scores.length === 0) return 0;
  return Number(
    (scores.reduce((acc, s) => acc + s, 0) / scores.length).toFixed(1),
  );
}

function predictNextScore(results, trend, avgScore) {
  if (!avgScore || avgScore === 0) return 0;
  const avg = parseFloat(avgScore);
  if (isNaN(avg)) return 0;
  switch (trend) {
    case "improving":
      return Number((avg + 5).toFixed(1));
    case "declining":
      return Number(Math.max(0, avg - 5).toFixed(1));
    case "stable":
      return Number(avg.toFixed(1));
    case "new":
      return 0;
    default:
      return Number(avg.toFixed(1));
  }
}

function generateRecommendation(participationCount, trend, avgScore) {
  if (participationCount === 0)
    return "Учень ще не брав участі в конкурсах. Рекомендується залучити до найближчого конкурсу.";
  if (participationCount === 1)
    return "Учень має лише одну участь. Потрібно більше даних для точного прогнозу.";
  if (trend === "improving")
    return "Учень демонструє покращення результатів! Рекомендується запропонувати більш складні завдання.";
  if (trend === "declining")
    return "Результати учня погіршуються. Потрібна додаткова підтримка та консультації.";
  if (trend === "stable" && avgScore && parseFloat(avgScore) >= 80)
    return "Стабільно високі результати. Готовий до олімпіад та конкурсів вищого рівня.";
  if (trend === "stable" && avgScore && parseFloat(avgScore) < 60)
    return "Результати стабільні, але низькі. Рекомендується додаткова підготовка.";
  return "Учень показує стабільні результати. Продовжуйте підтримку поточного рівня.";
}

function getTrendIcon(trend) {
  const icons = {
    improving: "&#128200;",
    stable: "&#10145;&#65039;",
    declining: "&#128201;",
    new: "&#127381;",
  };
  return icons[trend] || "&#10145;&#65039;";
}

function getTrendLabel(trend) {
  const labels = {
    improving: "Покращення",
    stable: "Стабільний",
    declining: "Погіршення",
    new: "Новачок",
  };
  return labels[trend] || "Стабільний";
}

function getActivityLabel(count) {
  if (count >= 5) return "Висока";
  if (count >= 2) return "Середня";
  if (count >= 1) return "Низька";
  return "Відсутня";
}

// ========== LOAD STUDENTS + PREDICTIONS ==========

async function loadStudents() {
  const container = document.getElementById("studentsList");
  container.innerHTML = '<div class="loading">Завантаження учнів...</div>';

  try {
    const teacherResponse = await fetch(
      `${BASE_URL}/api/profile/teacher/${userId}`,
    );
    const teacherData = await teacherResponse.json();

    if (!teacherResponse.ok)
      throw new Error("Не вдалося завантажити профіль вчителя");

    const teacherSchoolId = teacherData.profile?.school_id
      ? parseInt(teacherData.profile.school_id, 10)
      : null;

    if (!teacherSchoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Помилка</h3>
          <p>Будь ласка, заповніть свій профіль і вкажіть навчальний заклад</p>
          <a href="profilesT.html" class="btn">Перейти до профілю</a>
        </div>
      `;
      return;
    }

    // Fetch students and all results in parallel
    const [studentsRes, resultsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/teacher/${userId}/students`),
      fetch(`${BASE_URL}/api/admin/all-results`),
    ]);

    const studentsData = await studentsRes.json();
    let allResults = [];
    try {
      const resultsData = await resultsRes.json();
      allResults = resultsData.results || [];
    } catch (e) {
      console.error("Could not fetch results for predictions:", e);
    }

    if (studentsRes.ok) {
      allStudents = (studentsData.students || []).filter((student) => {
        const studentSchoolId = student.school_id
          ? parseInt(student.school_id, 10)
          : null;
        return studentSchoolId === teacherSchoolId;
      });

      // Group results by student
      const resultsByStudent = {};
      allResults.forEach((result) => {
        if (!resultsByStudent[result.user_id])
          resultsByStudent[result.user_id] = [];
        resultsByStudent[result.user_id].push(result);
      });

      // Calculate predictions for each student
      allStudents.forEach((student) => {
        const studentResults = resultsByStudent[student.id] || [];
        const participationCount = studentResults.length;
        const trend = calculateTrend(studentResults);
        const avgScore = calculateAverageScore(studentResults);
        const predictedScore = predictNextScore(
          studentResults,
          trend,
          avgScore,
        );
        const recommendation = generateRecommendation(
          participationCount,
          trend,
          avgScore,
        );

        studentPredictions[student.id] = {
          participationCount,
          trend,
          avgScore,
          predictedScore,
          recommendation,
          results: studentResults,
        };
      });

      filteredStudents = [...allStudents];
      populateGradeFilter();

      if (allStudents.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>Учнів у вашій школі поки немає</h3>
            <p>Учні з'являються тут, коли будуть зареєстровані в вашому закладі</p>
          </div>
        `;
      } else {
        displayStudents(filteredStudents);
      }
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Помилка завантаження</h3>
          <p>${studentsData.error || "Не вдалося завантажити список учнів"}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading students:", error);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Помилка з'єднання</h3>
        <p>${error.message || "Перевірте своє інтернет-з'єднання"}</p>
      </div>
    `;
  }
}

function populateGradeFilter() {
  const grades = [
    ...new Set(allStudents.map((s) => s.grade).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const gradeSelect = document.getElementById("filterGrade");
  gradeSelect.innerHTML = '<option value="">Всі класи</option>';
  grades.forEach((grade) => {
    const option = document.createElement("option");
    option.value = grade;
    option.textContent = grade;
    gradeSelect.appendChild(option);
  });
}

function filterStudents() {
  const searchTerm = document
    .getElementById("searchStudents")
    .value.toLowerCase();
  const filterGrade = document.getElementById("filterGrade").value;
  const filterStatus = document.getElementById("filterStatus").value;
  const filterTrend = document.getElementById("filterTrend").value;

  filteredStudents = allStudents.filter((student) => {
    const fullName =
      `${student.last_name || ""} ${student.first_name || ""}`.toLowerCase();
    const email = (student.email || "").toLowerCase();

    const matchesSearch =
      !searchTerm ||
      fullName.includes(searchTerm) ||
      email.includes(searchTerm);
    const matchesGrade = !filterGrade || student.grade === filterGrade;
    const matchesStatus =
      !filterStatus ||
      (filterStatus === "active" && student.is_active) ||
      (filterStatus === "inactive" && !student.is_active);

    const pred = studentPredictions[student.id];
    const matchesTrend = !filterTrend || (pred && pred.trend === filterTrend);

    return matchesSearch && matchesGrade && matchesStatus && matchesTrend;
  });

  displayStudents(filteredStudents);
  updateStats();
}

function displayStudents(students) {
  const container = document.getElementById("studentsList");

  if (students.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Учнів не знайдено</h3>
        <p>Спробуйте змінити фільтри або параметри пошуку</p>
      </div>
    `;
    return;
  }

  container.innerHTML = students
    .map((student, index) => {
      const fullName =
        `${student.last_name || ""} ${student.first_name || ""}`.trim() ||
        student.email;
      const initials = fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

      const pred = studentPredictions[student.id] || {};
      const trend = pred.trend || "new";
      const avgScore = pred.avgScore || 0;
      const predictedScore = pred.predictedScore || 0;
      const participationCount = pred.participationCount || 0;

      return `
        <div class="student-item" style="animation-delay: ${index * 0.05}s" onclick="openStudentModal(${student.id})">
          <div class="student-avatar">
            ${student.avatar ? `<img src="${student.avatar}" alt="${fullName}">` : initials}
          </div>
          <div class="student-info">
            <div class="student-name">${fullName}</div>
            <div class="student-meta">
              <span>&#128218; ${student.grade || "Клас -"}</span>
              <span>&#128231; ${student.email || "-"}</span>
              <span>${student.is_active ? "&#9989; Активний" : "&#10060; Неактивний"}</span>
            </div>
            <div class="student-prediction-row">
              <span class="student-trend trend-${trend}">${getTrendIcon(trend)} ${getTrendLabel(trend)}</span>
              <span class="pred-chip"><span class="pred-label">Бал:</span> ${avgScore || "–"}</span>
              <span class="pred-chip"><span class="pred-label">Прогноз:</span> ${predictedScore || "–"}</span>
              <span class="pred-chip"><span class="pred-label">Участей:</span> ${participationCount}</span>
            </div>
          </div>
          <div class="student-actions">
            <button class="btn-sm" onclick="event.stopPropagation(); openStudentModal(${student.id})">Детальніше</button>
          </div>
        </div>
      `;
    })
    .join("");

  container.classList.remove("grid");
  if (currentViewMode === "grid") {
    container.classList.add("grid");
  }
}

function setViewMode(mode) {
  currentViewMode = mode;
  const container = document.getElementById("studentsList");

  document
    .querySelectorAll(".view-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  container.classList.remove("grid");
  if (mode === "grid") {
    container.classList.add("grid");
  }
}

async function openStudentModal(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}`);
    const data = await response.json();

    if (response.ok) {
      const student = data.student;
      const fullName =
        `${student.last_name || ""} ${student.first_name || ""}`.trim();

      document.getElementById("modalStudentName").textContent =
        fullName || student.email;
      document.getElementById("detailFullName").textContent = fullName || "-";
      document.getElementById("detailEmail").textContent = student.email || "-";
      document.getElementById("detailPhone").textContent = student.phone || "-";
      document.getElementById("detailBirthDate").textContent =
        student.date_of_birth
          ? new Date(student.date_of_birth).toLocaleDateString("uk-UA")
          : "-";
      document.getElementById("detailCity").textContent = student.city || "-";
      document.getElementById("detailGrade").textContent = student.grade || "-";
      document.getElementById("detailSchool").textContent =
        student.school_name || "-";

      // Fill prediction summary
      const pred = studentPredictions[studentId];
      const summaryEl = document.getElementById("detailPredictionSummary");
      if (pred) {
        summaryEl.style.display = "block";
        document.getElementById("detailTrend").innerHTML =
          `${getTrendIcon(pred.trend)} ${getTrendLabel(pred.trend)}`;
        document.getElementById("detailAvgScore").textContent =
          pred.avgScore || "–";
        document.getElementById("detailPredictedScore").textContent =
          pred.predictedScore || "–";
        document.getElementById("detailParticipationCount").textContent =
          pred.participationCount;
        document.getElementById("detailRecommendation").textContent =
          pred.recommendation;
      } else {
        summaryEl.style.display = "none";
      }

      // Load results
      await loadStudentResults(studentId);

      // Load participations
      await loadStudentParticipations(studentId);

      document.getElementById("studentDetailModal").classList.add("active");
    }
  } catch (error) {
    console.error("Error loading student details:", error);
    alert("Помилка завантаження деталей учня");
  }
}

async function loadStudentResults(studentId) {
  const container = document.getElementById("resultsList");
  container.innerHTML = "<p>Завантаження...</p>";

  try {
    const response = await fetch(
      `${BASE_URL}/api/students/${studentId}/results`,
    );
    const data = await response.json();

    if (response.ok && data.results && data.results.length > 0) {
      container.innerHTML = data.results
        .map((r) => {
          const date = r.created_at
            ? new Date(r.created_at).toLocaleDateString("uk-UA")
            : "";
          return `
            <div class="result-item">
              <div class="result-info">
                <div class="result-title">${r.competition_title || "Конкурс"}</div>
                <div class="result-date">${date}</div>
              </div>
              <div class="result-scores">
                ${r.score ? `<span class="result-badge score">Бал: ${r.score}</span>` : ""}
                ${r.place ? `<span class="result-badge place">Місце: ${r.place}</span>` : ""}
                ${r.achievement ? `<span class="result-badge achievement">${r.achievement}</span>` : ""}
              </div>
            </div>
          `;
        })
        .join("");
    } else {
      container.innerHTML = "<p>Немає результатів</p>";
    }
  } catch (error) {
    console.error("Error loading student results:", error);
    container.innerHTML = "<p>Помилка завантаження</p>";
  }
}

async function loadStudentParticipations(studentId) {
  try {
    const response = await fetch(
      `${BASE_URL}/api/students/${studentId}/participations`,
    );
    const data = await response.json();

    const participationList = document.getElementById("participationList");

    if (response.ok && data.participations && data.participations.length > 0) {
      participationList.innerHTML = data.participations
        .map(
          (p) => `
          <div class="participation-item">
            <strong>${p.competition_name}</strong>
            <br>
            <small>Результат: ${p.result_score || "Не оцінено"}</small>
          </div>
        `,
        )
        .join("");
    } else {
      participationList.innerHTML = "<p>Немає участей у конкурсах</p>";
    }
  } catch (error) {
    console.error("Error loading participations:", error);
    document.getElementById("participationList").innerHTML =
      "<p>Помилка завантаження</p>";
  }
}

function closeStudentModal() {
  document.getElementById("studentDetailModal").classList.remove("active");
}

function updateStats() {
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter((s) => s.is_active).length;

  const improvingStudents = filteredStudents.filter((s) => {
    const pred = studentPredictions[s.id];
    return pred && pred.trend === "improving";
  }).length;

  const needAttention = filteredStudents.filter((s) => {
    const pred = studentPredictions[s.id];
    return (
      pred && (pred.trend === "declining" || pred.participationCount === 0)
    );
  }).length;

  const gradesWithScores = filteredStudents.filter((s) => {
    const pred = studentPredictions[s.id];
    return pred && pred.avgScore > 0;
  });
  const averageGrade =
    gradesWithScores.length > 0
      ? (
          gradesWithScores.reduce(
            (sum, s) => sum + (studentPredictions[s.id]?.avgScore || 0),
            0,
          ) / gradesWithScores.length
        ).toFixed(1)
      : "–";

  document.getElementById("totalStudents").textContent = totalStudents;
  document.getElementById("activeStudents").textContent = activeStudents;
  document.getElementById("improvingStudents").textContent = improvingStudents;
  document.getElementById("needAttention").textContent = needAttention;
  document.getElementById("averageGrade").textContent = averageGrade;
}

function resetFilters() {
  document.getElementById("searchStudents").value = "";
  document.getElementById("filterGrade").value = "";
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterTrend").value = "";
  filterStudents();
}

window.addEventListener("click", (e) => {
  const modal = document.getElementById("studentDetailModal");
  if (e.target === modal) {
    closeStudentModal();
  }
});
