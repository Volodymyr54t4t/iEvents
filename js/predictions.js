// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-o8nm.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

let allPredictions = []
let currentUserId = null
let currentUserSchoolId = null

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  currentUserId = localStorage.getItem("userId")
  const userRole = localStorage.getItem("userRole")

  if (!currentUserId) {
    window.location.href = "auth.html"
    return
  }

  if (userRole !== "вчитель" && userRole !== "методист") {
    alert("У вас немає доступу до цієї сторінки")
    window.location.href = "index.html"
    return
  }

  loadPredictions()
  setupFilters()
})

// Setup filter event listeners
function setupFilters() {
  document.getElementById("searchInput").addEventListener("input", filterPredictions)
  document.getElementById("gradeFilter").addEventListener("change", filterPredictions)
  document.getElementById("trendFilter").addEventListener("change", filterPredictions)
  document.getElementById("activityFilter").addEventListener("change", filterPredictions)
  document.getElementById("sortBy").addEventListener("change", filterPredictions)
}

// Load and calculate predictions
async function loadPredictions() {
  showLoading(true)

  try {
    const profileRes = await fetch(`${BASE_URL}/api/profile/teacher/${currentUserId}`)
    if (!profileRes.ok) {
      throw new Error("Не вдалося завантажити профіль. Будь ласка, заповніть свій профіль.")
    }

    const profileData = await profileRes.json()
    currentUserSchoolId = profileData.profile?.school_id

    if (!currentUserSchoolId) {
      showLoading(false)
      showNoData(true)
      document.getElementById("noData").innerHTML = `
        <p>Будь ласка, вкажіть навчальний заклад у своєму профілі</p>
        <a href="profilesT.html" style="color: #7ec8e3; text-decoration: underline;">Перейти до профілю</a>
      `
      return
    }

    console.log("[v0] Current user school_id:", currentUserSchoolId)

    const studentsRes = await fetch(`${BASE_URL}/api/teacher/${currentUserId}/students`)
    const resultsRes = await fetch(`${BASE_URL}/api/admin/all-results`)

    if (!studentsRes.ok || !resultsRes.ok) {
      throw new Error("Failed to fetch data from server")
    }

    const studentsData = await studentsRes.json()
    const resultsData = await resultsRes.json()

    const students = (studentsData.students || []).filter((student) => {
      const studentSchoolId = student.school_id ? Number.parseInt(student.school_id, 10) : null
      return studentSchoolId === Number.parseInt(currentUserSchoolId, 10)
    })

    console.log("[v0] Students from same institution:", students.length)

    const allResults = resultsData.results || []

    // Group results by student
    const resultsByStudent = {}
    allResults.forEach((result) => {
      if (!resultsByStudent[result.user_id]) {
        resultsByStudent[result.user_id] = []
      }
      resultsByStudent[result.user_id].push(result)
    })

    // Calculate predictions for each student
    const predictions = students.map((student) => {
      const studentResults = resultsByStudent[student.id] || []
      return calculatePrediction(student, studentResults)
    })

    allPredictions = predictions.filter((p) => p !== null)

    // Populate grade filter
    populateGradeFilter(allPredictions)

    // Update overview stats
    updateOverviewStats(allPredictions)

    // Display predictions
    filterPredictions()

    showLoading(false)
  } catch (error) {
    console.error("Error loading predictions:", error)
    showLoading(false)
    showNoData(true)
    document.getElementById("noData").innerHTML = `<p>${error.message || "Помилка завантаження даних"}</p>`
  }
}

// Calculate prediction for a student
function calculatePrediction(student, studentResults) {
  const participationCount = studentResults.length

  // Determine activity level
  let activityLevel = "none"
  if (participationCount >= 5) activityLevel = "high"
  else if (participationCount >= 2) activityLevel = "medium"
  else if (participationCount >= 1) activityLevel = "low"

  // Calculate trend based on recent competitions
  const trend = calculateTrend(studentResults)

  // Calculate average score (if available)
  const avgScore = calculateAverageScore(studentResults)

  // Generate recommendation
  const recommendation = generateRecommendation(participationCount, trend, avgScore, student.grade)

  // Predict next performance
  const predictedScore = predictNextScore(studentResults, trend, avgScore)

  return {
    student,
    participationCount,
    activityLevel,
    trend,
    avgScore,
    predictedScore,
    recommendation,
    lastCompetitionDate: studentResults[0]?.added_at || null,
  }
}

// Calculate trend from competition history
function calculateTrend(results) {
  if (results.length === 0) return "new"
  if (results.length === 1) return "new"

  // Sort by date (newest first)
  const sorted = [...results].sort((a, b) => new Date(b.added_at) - new Date(a.added_at))

  // Get recent competitions (last 3)
  const recent = sorted.slice(0, Math.min(3, sorted.length))

  // Extract numeric scores
  const scores = recent
    .map((r) => {
      const score = r.score
      // Check if score is numeric
      if (score && /^[0-9]+(\.[0-9]+)?$/.test(score.toString())) {
        return Number.parseFloat(score)
      }
      return null
    })
    .filter((s) => s !== null && s > 0)

  if (scores.length < 2) return "stable"

  // Compare recent scores to older scores
  const recentAvg = scores.slice(0, Math.min(2, scores.length)).reduce((a, b) => a + b, 0) / Math.min(2, scores.length)
  const olderAvg = scores.slice(-Math.min(2, scores.length)).reduce((a, b) => a + b, 0) / Math.min(2, scores.length)

  const diff = recentAvg - olderAvg

  if (diff > 5) return "improving"
  if (diff < -5) return "declining"
  return "stable"
}

// Calculate average score
function calculateAverageScore(results) {
  const scores = results
    .map((r) => {
      const score = r.score
      // Check if score is numeric
      if (score && /^[0-9]+(\.[0-9]+)?$/.test(score.toString())) {
        return Number.parseFloat(score)
      }
      return null
    })
    .filter((s) => s !== null && s > 0)

  if (scores.length === 0) return 0

  const sum = scores.reduce((acc, score) => acc + score, 0)
  const average = sum / scores.length

  return isNaN(average) ? 0 : Number(average.toFixed(1))
}

// Predict next score based on trend
function predictNextScore(results, trend, avgScore) {
  if (!avgScore || avgScore === 0) return 0

  const avg = Number.parseFloat(avgScore)

  if (isNaN(avg)) return 0

  switch (trend) {
    case "improving":
      return Number((avg + 5).toFixed(1))
    case "declining":
      return Number(Math.max(0, avg - 5).toFixed(1))
    case "stable":
      return Number(avg.toFixed(1))
    case "new":
      return 0
    default:
      return Number(avg.toFixed(1))
  }
}

// Generate recommendation
function generateRecommendation(participationCount, trend, avgScore, grade) {
  if (participationCount === 0) {
    return "Учень ще не брав участі в конкурсах. Рекомендується залучити до найближчого конкурсу для оцінки рівня."
  }

  if (participationCount === 1) {
    return "Учень має лише одну участь. Потрібно більше даних для точного прогнозу. Запропонуйте участь у 2-3 конкурсах."
  }

  if (trend === "improving") {
    return "Учень демонструє покращення результатів! Рекомендується запропонувати більш складні завдання та конкурси вищого рівня."
  }

  if (trend === "declining") {
    return "Результати учня погіршуються. Потрібна додаткова підтримка, індивідуальні консультації та можливо зменшення складності завдань."
  }

  if (trend === "stable" && avgScore && Number.parseFloat(avgScore) >= 80) {
    return "Учень показує стабільно високі результати. Готовий до участі в олімпіадах та конкурсах вищого рівня."
  }

  if (trend === "stable" && avgScore && Number.parseFloat(avgScore) < 60) {
    return "Результати стабільні, але низькі. Рекомендується додаткова підготовка та участь у тренувальних конкурсах."
  }

  return "Учень показує стабільні результати. Продовжуйте підтримувати поточний рівень участі в конкурсах."
}

// Populate grade filter
function populateGradeFilter(predictions) {
  const grades = [...new Set(predictions.map((p) => p.student.grade).filter((g) => g))].sort()

  const gradeFilter = document.getElementById("gradeFilter")
  const currentValue = gradeFilter.value

  gradeFilter.innerHTML = '<option value="all">Всі класи</option>'

  grades.forEach((grade) => {
    const option = document.createElement("option")
    option.value = grade
    option.textContent = `${grade} клас`
    gradeFilter.appendChild(option)
  })

  gradeFilter.value = currentValue
}

// Update overview statistics
function updateOverviewStats(predictions) {
  const totalStudents = predictions.length
  const activeStudents = predictions.filter((p) => p.participationCount > 0).length
  const improvingStudents = predictions.filter((p) => p.trend === "improving").length
  const needAttention = predictions.filter((p) => p.trend === "declining" || p.participationCount === 0).length

  document.getElementById("totalStudents").textContent = totalStudents
  document.getElementById("activeStudents").textContent = activeStudents
  document.getElementById("improvingStudents").textContent = improvingStudents
  document.getElementById("needAttention").textContent = needAttention
}

function filterPredictions() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const gradeFilter = document.getElementById("gradeFilter").value
  const trendFilter = document.getElementById("trendFilter").value
  const activityFilter = document.getElementById("activityFilter").value
  const sortBy = document.getElementById("sortBy").value

  let filtered = [...allPredictions]

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter((p) => {
      const fullName = `${p.student.last_name || ""} ${p.student.first_name || ""}`.toLowerCase()
      const email = (p.student.email || "").toLowerCase()
      return fullName.includes(searchTerm) || email.includes(searchTerm)
    })
  }

  // Apply grade filter
  if (gradeFilter !== "all") {
    filtered = filtered.filter((p) => p.student.grade === gradeFilter)
  }

  // Apply trend filter
  if (trendFilter !== "all") {
    filtered = filtered.filter((p) => p.trend === trendFilter)
  }

  // Apply activity filter
  if (activityFilter !== "all") {
    filtered = filtered.filter((p) => p.activityLevel === activityFilter)
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name":
        const nameA = `${a.student.last_name || ""} ${a.student.first_name || ""}`.toLowerCase()
        const nameB = `${b.student.last_name || ""} ${b.student.first_name || ""}`.toLowerCase()
        return nameA.localeCompare(nameB)
      case "grade":
        return (a.student.grade || "").localeCompare(b.student.grade || "", undefined, { numeric: true })
      case "avgScore":
        return (b.avgScore || 0) - (a.avgScore || 0)
      case "predictedScore":
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      case "participation":
        return b.participationCount - a.participationCount
      case "trend":
        const trendOrder = { improving: 0, stable: 1, new: 2, declining: 3 }
        return trendOrder[a.trend] - trendOrder[b.trend]
      default:
        return 0
    }
  })

  displayPredictions(filtered)
}

// Display predictions
function displayPredictions(predictions) {
  const grid = document.getElementById("predictionsGrid")
  const noData = document.getElementById("noData")

  if (predictions.length === 0) {
    grid.innerHTML = ""
    noData.style.display = "block"
    return
  }

  noData.style.display = "none"

  grid.innerHTML = predictions
    .map((pred) => {
      const avatarUrl = pred.student.avatar || "/uploads/default-avatar.png"
      const displayAvgScore = pred.avgScore === 0 ? "Невизначено" : pred.avgScore
      const displayPredictedScore = pred.predictedScore === 0 ? "Невизначено" : pred.predictedScore

      return `
    <div class="prediction-card">
      <div class="student-header">
        <img 
          src="${avatarUrl}" 
          alt="${pred.student.first_name || "Учень"}"
          class="student-avatar"
          onerror="this.style.display='none'"
        >
        <div class="student-info">
          <div class="student-name">
            ${pred.student.first_name || ""} ${pred.student.last_name || pred.student.email}
          </div>
          <div class="student-meta">
            ${pred.student.grade ? `${pred.student.grade} клас` : "Клас не вказано"}
          </div>
        </div>
        <span class="trend-badge trend-${pred.trend}">
          ${getTrendIcon(pred.trend)} ${getTrendLabel(pred.trend)}
        </span>
      </div>

      <div class="prediction-stats">
        <div class="stat-item">
          <div class="stat-item-label">Участей</div>
          <div class="stat-item-value">${pred.participationCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-label">Середній бал</div>
          <div class="stat-item-value">${displayAvgScore}</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-label">Прогноз</div>
          <div class="stat-item-value">${displayPredictedScore}</div>
        </div>
        <div class="stat-item">
          <div class="stat-item-label">Активність</div>
          <div class="stat-item-value">${getActivityLabel(pred.activityLevel)}</div>
        </div>
      </div>

      <div class="recommendation-box">
        <h4>💡 Рекомендація</h4>
        <p>${pred.recommendation}</p>
      </div>
    </div>
  `
    })
    .join("")
}

// Helper functions
function getTrendIcon(trend) {
  const icons = {
    improving: "📈",
    stable: "➡️",
    declining: "📉",
    new: "🆕",
  }
  return icons[trend] || "➡️"
}

function getTrendLabel(trend) {
  const labels = {
    improving: "Покращення",
    stable: "Стабільний",
    declining: "Погіршення",
    new: "Новачок",
  }
  return labels[trend] || "Стабільний"
}

function getActivityLabel(level) {
  const labels = {
    high: "Висока",
    medium: "Середня",
    low: "Низька",
    none: "Відсутня",
  }
  return labels[level] || "Відсутня"
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none"
  document.getElementById("predictionsGrid").style.display = show ? "none" : "grid"
}

function showNoData(show) {
  document.getElementById("noData").style.display = show ? "block" : "none"
}
