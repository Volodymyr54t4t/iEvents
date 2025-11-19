let BASE_URL;
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000";
} else {
  BASE_URL = "https://ievents-o8nm.onrender.com";
}

let allStudents = [];
let filteredStudents = [];
let allCompetitions = [];
let filteredCompetitions = [];
let allResults = [];
let filteredResults = [];
let teacherSchoolId = null;
let currentEditingCompetitionId = null;
let currentEditingResultId = null;

const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

if (!userId || userRole !== "вчитель") {
  alert("У вас немає доступу до цієї сторінки");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  await initializeAdmin();
  setupEventListeners();
});

function setupEventListeners() {
  // Students tab
  document.getElementById("searchStudents").addEventListener("input", filterStudents);
  document.getElementById("filterGrade").addEventListener("change", filterStudents);
  document.getElementById("filterStatus").addEventListener("change", filterStudents);
  
  // Competitions tab
  document.getElementById("searchCompetitions").addEventListener("input", filterCompetitions);
  document.getElementById("competitionForm").addEventListener("submit", handleCompetitionFormSubmit);
  
  // Results tab
  document.getElementById("searchResults").addEventListener("input", filterResults);
  document.getElementById("resultForm").addEventListener("submit", handleResultFormSubmit);
}

async function initializeAdmin() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`);
    
    if (!response.ok) {
      throw new Error("Не вдалося завантажити профіль вчителя");
    }
    
    const data = await response.json();
    teacherSchoolId = data.profile?.school_id;

    if (!teacherSchoolId) {
      showNotification("Будь ласка, заповніть свій профіль і вкажіть навчальний заклад", "error");
      return;
    }

    await loadStudents();
    await loadCompetitions();
    await loadResults();
  } catch (error) {
    console.error("[v0] Error initializing admin:", error);
    showNotification("Помилка ініціалізації: " + error.message, "error");
  }
}

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  
  // Show selected tab
  document.getElementById(`${tabName}Tab`).classList.add("active");
  event.target.classList.add("active");
  
  // Load data for the tab if needed
  if (tabName === "statistics") {
    loadStatistics();
  }
}

async function loadStudents() {
  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Завантаження учнів...</td></tr>';

  try {
    const response = await fetch(`${BASE_URL}/api/teacher/${userId}/students`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.success && data.students) {
      allStudents = data.students;
      filteredStudents = [...allStudents];
      
      populateGradeFilter();
      displayStudents(filteredStudents);
      updateStats();
    } else {
      throw new Error(data.error || "Не вдалося завантажити список учнів");
    }
  } catch (error) {
    console.error("[v0] Error loading students:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <h3>Помилка завантаження</h3>
          <p>${error.message}</p>
        </td>
      </tr>
    `;
    showNotification("Помилка завантаження учнів", "error");
  }
}

function populateGradeFilter() {
  const grades = [...new Set(allStudents.map(s => s.grade).filter(Boolean))].sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true })
  );

  const gradeSelect = document.getElementById("filterGrade");
  gradeSelect.innerHTML = '<option value="">Всі класи</option>';
  
  grades.forEach(grade => {
    const option = document.createElement("option");
    option.value = grade;
    option.textContent = grade;
    gradeSelect.appendChild(option);
  });
}

function filterStudents() {
  const searchTerm = document.getElementById("searchStudents").value.toLowerCase();
  const filterGrade = document.getElementById("filterGrade").value;
  const filterStatus = document.getElementById("filterStatus").value;

  filteredStudents = allStudents.filter(student => {
    const fullName = `${student.last_name || ""} ${student.first_name || ""}`.toLowerCase();
    const email = (student.email || "").toLowerCase();
    
    const matchesSearch = !searchTerm || fullName.includes(searchTerm) || email.includes(searchTerm);
    const matchesGrade = !filterGrade || student.grade === filterGrade;
    const matchesStatus = !filterStatus || 
      (filterStatus === "active" && student.is_active) || 
      (filterStatus === "inactive" && !student.is_active);

    return matchesSearch && matchesGrade && matchesStatus;
  });

  displayStudents(filteredStudents);
  updateStats();
}

function displayStudents(students) {
  const tbody = document.getElementById("studentsTableBody");

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <h3>Учнів не знайдено</h3>
          <p>Спробуйте змінити фільтри</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(student => {
    const fullName = `${student.last_name || ""} ${student.first_name || ""}`.trim() || student.email;
    const grade = student.grade || `${student.grade_number || ""}${student.grade_letter || ""}`.trim() || "-";
    
    return `
      <tr>
        <td>${student.id}</td>
        <td>${fullName}</td>
        <td>${student.email}</td>
        <td>${grade}</td>
        <td>${student.phone || "-"}</td>
        <td><span class="status-badge ${student.is_active ? 'active' : 'inactive'}">${student.is_active ? 'Активний' : 'Неактивний'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="viewStudentDetails(${student.id})">👁️ Переглянути</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function updateStats() {
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.is_active).length;
  
  document.getElementById("totalStudents").textContent = totalStudents;
  document.getElementById("activeStudents").textContent = activeStudents;
  
  loadParticipationsCount();
  
  const studentsWithScores = filteredStudents.filter(s => s.average_score);
  const averageScore = studentsWithScores.length > 0 
    ? (studentsWithScores.reduce((sum, s) => sum + (s.average_score || 0), 0) / studentsWithScores.length).toFixed(1) 
    : "–";
  
  document.getElementById("averageScore").textContent = averageScore;
}

async function loadParticipationsCount() {
  document.getElementById("totalParticipations").textContent = "...";
  
  if (filteredStudents.length === 0) {
    document.getElementById("totalParticipations").textContent = "0";
    return;
  }
  
  try {
    const batchSize = 5;
    let totalCount = 0;
    
    for (let i = 0; i < filteredStudents.length; i += batchSize) {
      const batch = filteredStudents.slice(i, i + batchSize);
      const participationPromises = batch.map(student => 
        fetch(`${BASE_URL}/api/students/${student.id}/participations`)
          .then(res => res.ok ? res.json() : { participations: [] })
          .then(data => data.participations?.length || 0)
          .catch(() => 0)
      );
      
      const counts = await Promise.all(participationPromises);
      totalCount += counts.reduce((sum, count) => sum + count, 0);
      
      document.getElementById("totalParticipations").textContent = totalCount;
      
      if (i + batchSize < filteredStudents.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error("[v0] Error loading participations count:", error);
    document.getElementById("totalParticipations").textContent = "–";
  }
}

function resetFilters() {
  document.getElementById("searchStudents").value = "";
  document.getElementById("filterGrade").value = "";
  document.getElementById("filterStatus").value = "";
  filterStudents();
}

async function viewStudentDetails(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження деталей учня");
    }

    const data = await response.json();

    if (data.success && data.student) {
      const student = data.student;
      const fullName = `${student.last_name || ""} ${student.first_name || ""} ${student.middle_name || ""}`.trim();

      document.getElementById("modalStudentName").textContent = fullName || student.email;
      document.getElementById("detailFullName").textContent = fullName || "-";
      document.getElementById("detailEmail").textContent = student.email || "-";
      document.getElementById("detailPhone").textContent = student.phone || "-";
      document.getElementById("detailTelegram").textContent = student.telegram || "-";
      document.getElementById("detailBirthDate").textContent = student.birth_date 
        ? new Date(student.birth_date).toLocaleDateString("uk-UA") 
        : "-";
      document.getElementById("detailCity").textContent = student.city || "-";
      document.getElementById("detailGrade").textContent = student.grade || "-";
      document.getElementById("detailStatus").textContent = student.is_active ? "✅ Активний" : "❌ Неактивний";

      await loadStudentParticipations(studentId);
      await loadStudentResults(studentId);

      document.getElementById("studentDetailModal").classList.add("show");
    } else {
      throw new Error(data.error || "Учня не знайдено");
    }
  } catch (error) {
    console.error("[v0] Error loading student details:", error);
    showNotification("Помилка завантаження деталей учня: " + error.message, "error");
  }
}

async function loadStudentParticipations(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/participations`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження участей");
    }
    
    const data = await response.json();

    const participationList = document.getElementById("participationList");

    if (data.success && data.participations && data.participations.length > 0) {
      participationList.innerHTML = data.participations.map(p => `
        <div class="participation-item">
          <strong>🏆 ${p.competition_name}</strong><br>
          <small>📅 ${new Date(p.start_date).toLocaleDateString("uk-UA")}</small>
        </div>
      `).join("");
    } else {
      participationList.innerHTML = "<p>Немає участей у конкурсах</p>";
    }
  } catch (error) {
    console.error("[v0] Error loading participations:", error);
    document.getElementById("participationList").innerHTML = "<p>Помилка завантаження</p>";
  }
}

async function loadStudentResults(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/results`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження результатів");
    }
    
    const data = await response.json();

    const resultsList = document.getElementById("resultsList");

    if (data.success && data.results && data.results.length > 0) {
      resultsList.innerHTML = data.results.map(r => `
        <div class="result-item">
          <strong>🏆 ${r.competition_title}</strong><br>
          ${r.place ? `<span>🥇 Місце: ${r.place}</span><br>` : ""}
          ${r.score ? `<span>⭐ Бали: ${r.score}</span><br>` : ""}
          ${r.achievement ? `<span>🎖️ Досягнення: ${r.achievement}</span><br>` : ""}
          ${r.notes ? `<small>📝 ${r.notes}</small>` : ""}
        </div>
      `).join("");
    } else {
      resultsList.innerHTML = "<p>Немає результатів</p>";
    }
  } catch (error) {
    console.error("[v0] Error loading results:", error);
    document.getElementById("resultsList").innerHTML = "<p>Помилка завантаження</p>";
  }
}

function closeStudentDetailModal() {
  document.getElementById("studentDetailModal").classList.remove("show");
}

async function loadCompetitions() {
  const tbody = document.getElementById("competitionsTableBody");
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Завантаження конкурсів...</td></tr>';

  try {
    const response = await fetch(`${BASE_URL}/api/competitions`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження конкурсів");
    }

    const data = await response.json();

    if (data.competitions) {
      allCompetitions = data.competitions;
      filteredCompetitions = [...allCompetitions];
      displayCompetitions(filteredCompetitions);
    }
  } catch (error) {
    console.error("[v0] Error loading competitions:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><h3>Помилка завантаження конкурсів</h3></td></tr>`;
    showNotification("Помилка завантаження конкурсів", "error");
  }
}

function filterCompetitions() {
  const searchTerm = document.getElementById("searchCompetitions").value.toLowerCase();
  const filterStatus = document.getElementById("filterCompStatus").value;

  filteredCompetitions = allCompetitions.filter(comp => {
    const matchesSearch = !searchTerm || comp.title.toLowerCase().includes(searchTerm);
    
    const status = getCompetitionStatus(comp);
    const matchesStatus = !filterStatus || status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  displayCompetitions(filteredCompetitions);
}

function getCompetitionStatus(competition) {
  const now = new Date();
  const startDate = new Date(competition.start_date);
  const endDate = new Date(competition.end_date);
  
  if (endDate < now) return 'завершений';
  if (startDate > now) return 'майбутній';
  return 'активний';
}

function displayCompetitions(competitions) {
  const tbody = document.getElementById("competitionsTableBody");

  if (competitions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <h3>Конкурсів не знайдено</h3>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = competitions.map(comp => {
    const status = getCompetitionStatus(comp);
    const statusClass = status === 'активний' ? 'активний' : status === 'майбутній' ? 'майбутній' : 'завершений';
    
    return `
      <tr>
        <td><strong>${comp.title}</strong></td>
        <td>${new Date(comp.start_date).toLocaleDateString("uk-UA")}</td>
        <td>${new Date(comp.end_date).toLocaleDateString("uk-UA")}</td>
        <td>${comp.participants_count || 0}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" onclick="editCompetition(${comp.id})">✏️ Редагувати</button>
            <button class="btn-action btn-delete" onclick="deleteCompetition(${comp.id}, '${comp.title}')">🗑️ Видалити</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddCompetitionModal() {
  currentEditingCompetitionId = null;
  document.getElementById("competitionModalTitle").textContent = "Створити конкурс";
  document.getElementById("competitionForm").reset();
  document.getElementById("competitionModal").classList.add("show");
}

async function editCompetition(competitionId) {
  currentEditingCompetitionId = competitionId;
  document.getElementById("competitionModalTitle").textContent = "Редагувати конкурс";
  
  const competition = allCompetitions.find(c => c.id === competitionId);
  if (competition) {
    document.getElementById("compTitle").value = competition.title || "";
    document.getElementById("compDescription").value = competition.description || "";
    document.getElementById("compStartDate").value = competition.start_date ? competition.start_date.split("T")[0] : "";
    document.getElementById("compEndDate").value = competition.end_date ? competition.end_date.split("T")[0] : "";
    document.getElementById("compOrganizer").value = competition.organizer || "";
    document.getElementById("compLocation").value = competition.location || "";
    
    document.getElementById("competitionModal").classList.add("show");
  }
}

function closeCompetitionModal() {
  document.getElementById("competitionModal").classList.remove("show");
  currentEditingCompetitionId = null;
}

async function handleCompetitionFormSubmit(e) {
  e.preventDefault();

  const competitionData = {
    title: document.getElementById("compTitle").value.trim(),
    description: document.getElementById("compDescription").value.trim(),
    startDate: document.getElementById("compStartDate").value,
    endDate: document.getElementById("compEndDate").value,
    organizer: document.getElementById("compOrganizer").value.trim(),
    location: document.getElementById("compLocation").value.trim(),
    createdBy: userId
  };

  try {
    let response;
    
    if (currentEditingCompetitionId) {
      response = await fetch(`${BASE_URL}/api/competitions/${currentEditingCompetitionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(competitionData)
      });
    } else {
      response = await fetch(`${BASE_URL}/api/competitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(competitionData)
      });
    }

    if (!response.ok) {
      throw new Error("Помилка збереження конкурсу");
    }

    showNotification(
      currentEditingCompetitionId ? "Конкурс успішно оновлено" : "Конкурс успішно створено",
      "success"
    );
    closeCompetitionModal();
    await loadCompetitions();
  } catch (error) {
    console.error("[v0] Error saving competition:", error);
    showNotification("Помилка збереження конкурсу: " + error.message, "error");
  }
}

async function deleteCompetition(competitionId, competitionTitle) {
  if (!confirm(`Ви впевнені, що хочете видалити конкурс "${competitionTitle}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Помилка видалення конкурсу");
    }

    showNotification("Конкурс успішно видалено", "success");
    await loadCompetitions();
  } catch (error) {
    console.error("[v0] Error deleting competition:", error);
    showNotification("Помилка видалення конкурсу: " + error.message, "error");
  }
}

async function loadResults() {
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Завантаження результатів...</td></tr>';

  try {
    const response = await fetch(`${BASE_URL}/api/admin/all-results`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження результатів");
    }

    const data = await response.json();

    if (data.results) {
      // Filter results for students from teacher's school
      const studentIds = allStudents.map(s => s.id);
      allResults = data.results.filter(r => studentIds.includes(r.user_id));
      filteredResults = [...allResults];
      
      populateResultCompetitionFilter();
      displayResults(filteredResults);
    }
  } catch (error) {
    console.error("[v0] Error loading results:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><h3>Помилка завантаження результатів</h3></td></tr>`;
    showNotification("Помилка завантаження результатів", "error");
  }
}

function populateResultCompetitionFilter() {
  const competitions = [...new Set(allResults.map(r => ({ id: r.competition_id, title: r.competition_title })))];
  
  const select = document.getElementById("filterResultCompetition");
  select.innerHTML = '<option value="">Всі конкурси</option>';
  
  competitions.forEach(comp => {
    if (comp.title) {
      const option = document.createElement("option");
      option.value = comp.id;
      option.textContent = comp.title;
      select.appendChild(option);
    }
  });
}

function filterResults() {
  const searchTerm = document.getElementById("searchResults").value.toLowerCase();
  const filterCompetition = document.getElementById("filterResultCompetition").value;

  filteredResults = allResults.filter(result => {
    const studentName = `${result.last_name || ""} ${result.first_name || ""}`.toLowerCase();
    const matchesSearch = !searchTerm || studentName.includes(searchTerm) || result.competition_title.toLowerCase().includes(searchTerm);
    const matchesCompetition = !filterCompetition || result.competition_id == filterCompetition;

    return matchesSearch && matchesCompetition;
  });

  displayResults(filteredResults);
}

function displayResults(results) {
  const tbody = document.getElementById("resultsTableBody");

  if (results.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <h3>Результатів не знайдено</h3>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = results.map(result => {
    const studentName = `${result.last_name || ""} ${result.first_name || ""}`.trim() || "Невідомий";
    
    return `
      <tr>
        <td>${studentName}</td>
        <td>${result.competition_title || "-"}</td>
        <td>${result.place || "-"}</td>
        <td>${result.score || "-"}</td>
        <td>${result.achievement || "-"}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" onclick="editResult(${result.id})">✏️ Редагувати</button>
            <button class="btn-action btn-delete" onclick="deleteResult(${result.id})">🗑️ Видалити</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function openAddResultModal() {
  currentEditingResultId = null;
  document.getElementById("resultModalTitle").textContent = "Додати результат";
  document.getElementById("resultForm").reset();
  
  // Populate competitions
  const compSelect = document.getElementById("resultCompetition");
  compSelect.innerHTML = '<option value="">Оберіть конкурс</option>';
  allCompetitions.forEach(comp => {
    const option = document.createElement("option");
    option.value = comp.id;
    option.textContent = comp.title;
    compSelect.appendChild(option);
  });
  
  // Populate students
  const studentSelect = document.getElementById("resultStudent");
  studentSelect.innerHTML = '<option value="">Оберіть учня</option>';
  allStudents.forEach(student => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = `${student.last_name || ""} ${student.first_name || ""}`.trim() || student.email;
    studentSelect.appendChild(option);
  });
  
  document.getElementById("resultModal").classList.add("show");
}

async function editResult(resultId) {
  currentEditingResultId = resultId;
  document.getElementById("resultModalTitle").textContent = "Редагувати результат";
  
  const result = allResults.find(r => r.id === resultId);
  if (result) {
    // Populate competitions
    const compSelect = document.getElementById("resultCompetition");
    compSelect.innerHTML = '<option value="">Оберіть конкурс</option>';
    allCompetitions.forEach(comp => {
      const option = document.createElement("option");
      option.value = comp.id;
      option.textContent = comp.title;
      if (comp.id === result.competition_id) option.selected = true;
      compSelect.appendChild(option);
    });
    
    // Populate students
    const studentSelect = document.getElementById("resultStudent");
    studentSelect.innerHTML = '<option value="">Оберіть учня</option>';
    allStudents.forEach(student => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.last_name || ""} ${student.first_name || ""}`.trim() || student.email;
      if (student.id === result.user_id) option.selected = true;
      studentSelect.appendChild(option);
    });
    
    document.getElementById("resultPlace").value = result.place || "";
    document.getElementById("resultScore").value = result.score || "";
    document.getElementById("resultAchievement").value = result.achievement || "";
    document.getElementById("resultNotes").value = result.notes || "";
    
    document.getElementById("resultModal").classList.add("show");
  }
}

function closeResultModal() {
  document.getElementById("resultModal").classList.remove("show");
  currentEditingResultId = null;
}

async function handleResultFormSubmit(e) {
  e.preventDefault();

  const resultData = {
    competitionId: document.getElementById("resultCompetition").value,
    studentId: document.getElementById("resultStudent").value,
    place: document.getElementById("resultPlace").value,
    score: document.getElementById("resultScore").value.trim(),
    achievement: document.getElementById("resultAchievement").value.trim(),
    notes: document.getElementById("resultNotes").value.trim(),
    addedBy: userId,
    isConfirmed: true
  };

  try {
    let response;
    
    if (currentEditingResultId) {
      response = await fetch(`${BASE_URL}/api/results/${currentEditingResultId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultData)
      });
    } else {
      response = await fetch(`${BASE_URL}/api/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultData)
      });
    }

    if (!response.ok) {
      throw new Error("Помилка збереження результату");
    }

    showNotification(
      currentEditingResultId ? "Результат успішно оновлено" : "Результат успішно додано",
      "success"
    );
    closeResultModal();
    await loadResults();
  } catch (error) {
    console.error("[v0] Error saving result:", error);
    showNotification("Помилка збереження результату: " + error.message, "error");
  }
}

async function deleteResult(resultId) {
  if (!confirm("Ви впевнені, що хочете видалити цей результат?")) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/results/${resultId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Помилка видалення результату");
    }

    showNotification("Результат успішно видалено", "success");
    await loadResults();
  } catch (error) {
    console.error("[v0] Error deleting result:", error);
    showNotification("Помилка видалення результату: " + error.message, "error");
  }
}

async function loadStatistics() {
  try {
    // Load basic stats
    document.getElementById("statTotalCompetitions").textContent = allCompetitions.length;
    document.getElementById("statTotalResults").textContent = allResults.length;
    
    const topPlaces = allResults.filter(r => r.place && r.place <= 3).length;
    document.getElementById("statTopPlaces").textContent = topPlaces;
    
    const scores = allResults.filter(r => r.score && !isNaN(parseFloat(r.score)));
    const avgScore = scores.length > 0 
      ? (scores.reduce((sum, r) => sum + parseFloat(r.score), 0) / scores.length).toFixed(1)
      : "0";
    document.getElementById("statAvgScore").textContent = avgScore;
    
    // Load top students
    await loadTopStudents();
    
    // Load class distribution
    loadClassDistribution();
  } catch (error) {
    console.error("[v0] Error loading statistics:", error);
    showNotification("Помилка завантаження статистики", "error");
  }
}

async function loadTopStudents() {
  const topStudentsList = document.getElementById("topStudentsList");
  topStudentsList.innerHTML = "<p>Завантаження...</p>";
  
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/top-students?limit=10`);
    
    if (!response.ok) {
      throw new Error("Помилка завантаження топ учнів");
    }
    
    const data = await response.json();
    
    if (data.success && data.students && data.students.length > 0) {
      // Filter for teacher's school students
      const schoolStudents = data.students.filter(s => 
        allStudents.some(as => as.id === s.id)
      ).slice(0, 10);
      
      topStudentsList.innerHTML = schoolStudents.map((student, index) => `
        <div class="top-student-item">
          <div class="student-rank">${index + 1}</div>
          <div class="student-info">
            <div class="student-name">${student.last_name || ""} ${student.first_name || ""}</div>
            <div class="student-grade">${student.grade || "Клас не вказано"}</div>
          </div>
          <div class="student-participations">${student.participations_count || 0} участей</div>
        </div>
      `).join("");
    } else {
      topStudentsList.innerHTML = "<p>Немає даних</p>";
    }
  } catch (error) {
    console.error("[v0] Error loading top students:", error);
    topStudentsList.innerHTML = "<p>Помилка завантаження</p>";
  }
}

function loadClassDistribution() {
  const classDistribution = document.getElementById("classDistribution");
  
  const classCounts = {};
  allStudents.forEach(student => {
    const grade = student.grade || "Не вказано";
    classCounts[grade] = (classCounts[grade] || 0) + 1;
  });
  
  const sortedClasses = Object.entries(classCounts).sort((a, b) => 
    a[0].localeCompare(b[0], undefined, { numeric: true })
  );
  
  if (sortedClasses.length > 0) {
    classDistribution.innerHTML = sortedClasses.map(([grade, count]) => `
      <div class="class-card">
        <div class="class-name">${grade}</div>
        <div class="class-count">${count} ${count === 1 ? 'учень' : 'учнів'}</div>
      </div>
    `).join("");
  } else {
    classDistribution.innerHTML = "<p>Немає даних</p>";
  }
}

function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

window.addEventListener("click", (e) => {
  const competitionModal = document.getElementById("competitionModal");
  const resultModal = document.getElementById("resultModal");
  const detailModal = document.getElementById("studentDetailModal");
  
  if (e.target === competitionModal) {
    closeCompetitionModal();
  }
  if (e.target === resultModal) {
    closeResultModal();
  }
  if (e.target === detailModal) {
    closeStudentDetailModal();
  }
});

// Make functions globally accessible
window.switchTab = switchTab;
window.viewStudentDetails = viewStudentDetails;
window.closeStudentDetailModal = closeStudentDetailModal;
window.resetFilters = resetFilters;
window.openAddCompetitionModal = openAddCompetitionModal;
window.editCompetition = editCompetition;
window.deleteCompetition = deleteCompetition;
window.closeCompetitionModal = closeCompetitionModal;
window.openAddResultModal = openAddResultModal;
window.editResult = editResult;
window.deleteResult = deleteResult;
window.closeResultModal = closeResultModal;
