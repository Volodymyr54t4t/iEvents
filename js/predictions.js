// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("Predictions module loaded, connecting to:", BASE_URL)

let allPredictions = []
let allPredictionsFull = [] // Full dataset (platform)
let institutionPredictions = [] // Filtered by school
let currentUserId = null
let currentPredMode = null
let userSchoolId = null
let userSchoolName = null

// ======= SCHOOL DATA FETCH =======
async function fetchUserSchool() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/my-school?userId=${currentUserId}`)
    if (!response.ok) throw new Error("Failed to fetch school")
    const data = await response.json()
    userSchoolId = data.schoolId
    userSchoolName = data.schoolName || data.school
    return data
  } catch (error) {
    console.error("Error fetching user school:", error)
    return { school: null, schoolId: null, schoolName: null }
  }
}

// ======= MODE SELECTION =======
function selectPredMode(mode) {
  currentPredMode = mode
  document.getElementById("predModeOverlay").style.display = "none"
  document.getElementById("predictionsPage").style.display = "block"

  if (mode === "platform") {
    document.getElementById("switchPlatform").classList.add("active")
    document.getElementById("switchInstitution").classList.remove("active")
    applyPlatformMode()
  } else {
    document.getElementById("switchInstitution").classList.add("active")
    document.getElementById("switchPlatform").classList.remove("active")
    applyInstitutionMode()
  }
}

function switchPredMode(mode) {
  if (currentPredMode === mode) return
  currentPredMode = mode

  if (mode === "platform") {
    document.getElementById("switchPlatform").classList.add("active")
    document.getElementById("switchInstitution").classList.remove("active")
    applyPlatformMode()
  } else {
    document.getElementById("switchInstitution").classList.add("active")
    document.getElementById("switchPlatform").classList.remove("active")
    applyInstitutionMode()
  }
}

function applyPlatformMode() {
  document.getElementById("pageTitle").textContent = "Прогнозування результатів учнів"
  document.getElementById("pageSubtitle").textContent = "Загальне прогнозування по всій платформі iEvents"

  // Remove institution banner if present
  const banner = document.getElementById("instBanner")
  if (banner) banner.style.display = "none"

  allPredictions = [...allPredictionsFull]
  populateGradeFilter(allPredictions)
  updateOverviewStats(allPredictions)
  filterPredictions()
}

function applyInstitutionMode() {
  document.getElementById("pageTitle").textContent = userSchoolName || "Прогнози закладу"
  document.getElementById("pageSubtitle").textContent = "Прогнозування для учнів вашого навчального закладу"

  // Show institution banner
  let banner = document.getElementById("instBanner")
  if (!banner) {
    const container = document.querySelector(".overview-section")
    if (container) {
      const bannerHTML = `<div class="institution-banner" id="instBanner">
        <div class="institution-banner-content">
          <div class="institution-banner-icon">&#127979;</div>
          <div class="institution-banner-info">
            <h3 id="instBannerName">${userSchoolName || "Мій заклад"}</h3>
            <p id="instBannerSummary">Прогнози для учнів закладу</p>
          </div>
        </div>
      </div>`
      container.insertAdjacentHTML("beforebegin", bannerHTML)
      banner = document.getElementById("instBanner")
    }
  }
  if (banner) {
    banner.style.display = "block"
    const nameEl = document.getElementById("instBannerName")
    if (nameEl) nameEl.textContent = userSchoolName || "Мій заклад"
  }

  // Filter predictions by school
  if (userSchoolId && allPredictionsFull.length > 0) {
    institutionPredictions = allPredictionsFull.filter(
      p => p.student.school_id && parseInt(p.student.school_id) === parseInt(userSchoolId)
    )
  } else {
    institutionPredictions = []
  }

  allPredictions = [...institutionPredictions]
  populateGradeFilter(allPredictions)
  updateOverviewStats(allPredictions)
  filterPredictions()
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  currentUserId = localStorage.getItem("userId")
  const userRole = localStorage.getItem("userRole")

  if (!currentUserId) {
    window.location.href = "auth.html"
    return
  }

  setupFilters()

  // Fetch user school info first
  await fetchUserSchool()

  // Update institution button description
  if (userSchoolId && userSchoolName) {
    document.getElementById("institutionDesc").textContent =
      `Прогнози для учнів закладу "${userSchoolName}"`
  } else {
    const instBtn = document.getElementById("btnInstitutionPred")
    instBtn.disabled = true
    instBtn.style.opacity = "0.5"
    instBtn.style.cursor = "not-allowed"
    document.getElementById("institutionDesc").textContent =
      "Заклад не вказано у вашому профілі. Оновіть профіль, щоб бачити прогнози закладу."
  }

  // Load data first, then show modal
  await loadPredictions()

  // Show selection modal
  document.getElementById("predModeOverlay").style.display = "flex"
})

// Setup filter event listeners
function setupFilters() {
  const searchInput = document.getElementById("searchInput")
  const gradeFilter = document.getElementById("gradeFilter")
  const trendFilter = document.getElementById("trendFilter")
  const activityFilter = document.getElementById("activityFilter")
  const sortBy = document.getElementById("sortBy")

  if (searchInput) searchInput.addEventListener("input", filterPredictions)
  if (gradeFilter) gradeFilter.addEventListener("change", filterPredictions)
  if (trendFilter) trendFilter.addEventListener("change", filterPredictions)
  if (activityFilter) activityFilter.addEventListener("change", filterPredictions)
  if (sortBy) sortBy.addEventListener("change", filterPredictions)
}

// Load and calculate predictions
async function loadPredictions() {
  showLoading(true)

  try {
    // Fetch all necessary data from the server (including school_id via profiles)
    const [studentsRes, resultsRes, profilesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/students`),
      fetch(`${BASE_URL}/api/admin/all-results`),
      fetch(`${BASE_URL}/api/schools`),
    ])

    if (!studentsRes.ok || !resultsRes.ok) {
      throw new Error("Failed to fetch data from server")
    }

    const studentsData = await studentsRes.json()
    const resultsData = await resultsRes.json()

    const students = studentsData.students || []
    const allResults = resultsData.results || []

    // We need school_id for each student - fetch profiles with school_id
    // The /api/students endpoint doesn't include school_id, so we fetch user profiles separately
    let profilesMap = {}
    try {
      const profilesDetailRes = await fetch(`${BASE_URL}/api/admin/users`)
      if (profilesDetailRes.ok) {
        const profilesData = await profilesDetailRes.json()
        const users = profilesData.users || []
        users.forEach(u => {
          profilesMap[u.id] = { school_id: u.school_id, school: u.school }
        })
      }
    } catch (e) {
      console.error("Could not fetch profiles for school_id:", e)
    }

    // Merge school_id into students
    const studentsWithSchool = students.map(student => ({
      ...student,
      school_id: profilesMap[student.id]?.school_id || null,
      school: student.school || profilesMap[student.id]?.school || null,
    }))

    // Group results by student
    const resultsByStudent = {}
    allResults.forEach((result) => {
      if (!resultsByStudent[result.user_id]) {
        resultsByStudent[result.user_id] = []
      }
      resultsByStudent[result.user_id].push(result)
    })

    // Calculate predictions for each student
    const predictions = studentsWithSchool.map((student) => {
      const studentResults = resultsByStudent[student.id] || []
      return calculatePrediction(student, studentResults)
    })

    allPredictionsFull = predictions.filter((p) => p !== null)
    allPredictions = [...allPredictionsFull]

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
  }
}

//Розрахунок прогнозу для учня
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

// Filter predictions
function filterPredictions() {
  const searchInput = document.getElementById("searchInput")
  const gradeFilter = document.getElementById("gradeFilter")
  const trendFilter = document.getElementById("trendFilter")
  const activityFilter = document.getElementById("activityFilter")
  const sortBy = document.getElementById("sortBy")

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : ""
  const gradeFilterValue = gradeFilter ? gradeFilter.value : "all"
  const trendFilterValue = trendFilter ? trendFilter.value : "all"
  const activityFilterValue = activityFilter ? activityFilter.value : "all"
  const sortByValue = sortBy ? sortBy.value : "name"

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
  if (gradeFilterValue !== "all") {
    filtered = filtered.filter((p) => p.student.grade === gradeFilterValue)
  }

  // Apply trend filter
  if (trendFilterValue !== "all") {
    filtered = filtered.filter((p) => p.trend === trendFilterValue)
  }

  // Apply activity filter
  if (activityFilterValue !== "all") {
    filtered = filtered.filter((p) => p.activityLevel === activityFilterValue)
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortByValue) {
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
            ${pred.student.grade ? `${pred.student.grade} клас` : "Клас не вказано"}${pred.student.school ? ` | ${pred.student.school}` : ""}
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

// Refresh predictions respecting current mode
async function refreshPredictions() {
  await loadPredictions()
  if (currentPredMode === "institution") {
    applyInstitutionMode()
  } else {
    applyPlatformMode()
  }
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none"
  document.getElementById("predictionsGrid").style.display = show ? "none" : "grid"
}

function showNoData(show) {
  document.getElementById("noData").style.display = show ? "block" : "none"
}
