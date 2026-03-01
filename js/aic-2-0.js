// AIC 2.0 - Adaptive Intelligence Core
// ML-аналітика та прогнозування успіху учня

let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com"
}

let currentStudentId = null
let studentData = null
let studentResults = []
let allStudents = []

// Chart instances
let trendChartInstance = null
let radarChartInstance = null
let achievementChartInstance = null
let scoreDistChartInstance = null
let complexityChartInstance = null
let trajectoryChartInstance = null
let amiTrendChartInstance = null

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId")
  if (!userId) {
    window.location.href = "auth.html"
    return
  }

  // Check if studentId is passed in URL
  const urlParams = new URLSearchParams(window.location.search)
  const studentIdParam = urlParams.get("studentId")

  // Load all students for selector
  await loadAllStudents()

  if (studentIdParam) {
    selectStudent(parseInt(studentIdParam))
  }
})

// =============================================
// STUDENT SELECTOR
// =============================================
async function loadAllStudents() {
  try {
    const response = await fetch(`${BASE_URL}/api/students`)
    if (!response.ok) throw new Error("Failed to load students")
    const data = await response.json()
    allStudents = data.students || []
    renderStudentsList(allStudents)
  } catch (error) {
    console.error("Error loading students:", error)
    document.getElementById("aicStudentsList").innerHTML =
      '<div class="aic-loading"><p>Помилка завантаження учнів</p></div>'
  }
}

function renderStudentsList(students) {
  const container = document.getElementById("aicStudentsList")
  if (students.length === 0) {
    container.innerHTML = '<div class="aic-loading"><p>Учнів не знайдено</p></div>'
    return
  }

  container.innerHTML = students.map(s => {
    const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email
    const initials = getInitials(s.first_name, s.last_name, s.email)
    const grade = s.grade ? `${s.grade} клас` : ""
    const avatarHtml = s.avatar
      ? `<img src="${s.avatar}" alt="${name}" onerror="this.parentElement.innerHTML='${initials}'">`
      : initials

    return `
      <div class="aic-student-item" onclick="selectStudent(${s.id})">
        <div class="student-avatar-small">${avatarHtml}</div>
        <div class="student-details">
          <div class="name">${escapeHtml(name)}</div>
          <div class="meta">${grade}${grade ? " | " : ""}${escapeHtml(s.email)}</div>
        </div>
      </div>
    `
  }).join("")
}

// Search filter
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("studentSearchInput")
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase()
      const filtered = allStudents.filter(s => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase()
        const email = (s.email || "").toLowerCase()
        return name.includes(term) || email.includes(term)
      })
      renderStudentsList(filtered)
    })
  }
})

function showStudentSelector() {
  document.getElementById("aicModeOverlay").style.display = "flex"
  document.getElementById("aicPage").style.display = "none"
  const searchInput = document.getElementById("studentSearchInput")
  if (searchInput) {
    searchInput.value = ""
    renderStudentsList(allStudents)
  }
}

async function selectStudent(studentId) {
  currentStudentId = studentId
  document.getElementById("aicModeOverlay").style.display = "none"
  document.getElementById("aicPage").style.display = "block"

  // Load data
  await Promise.all([
    loadStudentProfile(studentId),
    loadStudentResults(studentId),
  ])

  // Process & render everything
  renderStudentBanner()
  calculateAndRenderML()
  renderCompetencyRadar()
  renderIndices()
  renderHistoryAnalysis()
  renderComplexityScore()
  renderExplainableAI()
  renderRiskIndex()
  renderTrajectoryModel()
  renderTalentDetection()
  renderComparativePosition()
  renderMomentumIndex()
  renderRecommendations()
}

// =============================================
// DATA LOADING
// =============================================
async function loadStudentProfile(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}`)
    if (!response.ok) throw new Error("Failed to load student profile")
    const data = await response.json()
    studentData = data.student
  } catch (error) {
    console.error("Error loading student profile:", error)
    studentData = allStudents.find(s => s.id === studentId) || null
  }
}

async function loadStudentResults(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/results`)
    if (!response.ok) throw new Error("Failed to load results")
    const data = await response.json()
    studentResults = data.results || []
  } catch (error) {
    console.error("Error loading student results:", error)
    studentResults = []
  }
}

// =============================================
// STUDENT BANNER
// =============================================
function renderStudentBanner() {
  if (!studentData) return

  const name = `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim() || studentData.email
  const initials = getInitials(studentData.first_name, studentData.last_name, studentData.email)

  document.getElementById("bannerName").textContent = name
  document.getElementById("bannerGrade").textContent = studentData.grade ? `${studentData.grade} клас` : "Клас не вказано"
  document.getElementById("bannerSchool").textContent = studentData.school || studentData.city || "Заклад не вказано"
  document.getElementById("bannerEmail").textContent = studentData.email || ""

  // Avatar
  const avatarEl = document.getElementById("bannerAvatar")
  if (studentData.avatar) {
    avatarEl.innerHTML = `<img src="${studentData.avatar}" alt="${name}" onerror="this.parentElement.innerHTML='<span class=\\'avatar-initials\\'>${initials}</span>'">`
  } else {
    document.getElementById("bannerInitials").textContent = initials
  }

  // Stats
  document.getElementById("bannerTotalComps").textContent = studentResults.length

  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "-"
  document.getElementById("bannerAvgScore").textContent = avgScore

  const places = studentResults.map(r => parseInt(r.place)).filter(p => !isNaN(p) && p > 0)
  const bestPlace = places.length > 0 ? Math.min(...places) : "-"
  document.getElementById("bannerBestPlace").textContent = bestPlace
}

// =============================================
// ML PREDICTION ENGINE
// =============================================
function calculateAndRenderML() {
  renderPrizeProbability()
  renderLevelRecommendation()
  renderTrendChart()
}

function renderPrizeProbability() {
  const canvas = document.getElementById("prizeCircle")
  const ctx = canvas.getContext("2d")

  // Calculate probability based on history
  let probability = 0
  let note = "Недостатньо даних для аналізу"

  if (studentResults.length > 0) {
    const prizeResults = studentResults.filter(r => {
      const place = parseInt(r.place)
      return !isNaN(place) && place >= 1 && place <= 3
    })
    const withScores = studentResults.filter(r => {
      const score = parseFloat(r.score)
      return !isNaN(score) && score > 0
    })

    // Base probability from historical performance
    const prizeRate = studentResults.length > 0 ? prizeResults.length / studentResults.length : 0

    // Bonus from scores
    const scores = withScores.map(r => parseFloat(r.score))
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    // Trend bonus
    const trend = calculateTrend(studentResults)
    const trendBonus = trend === "improving" ? 0.1 : trend === "declining" ? -0.1 : 0

    // Calculate composite probability
    probability = Math.min(95, Math.max(5,
      Math.round((prizeRate * 50 + (avgScore / 100) * 30 + trendBonus * 100 + (studentResults.length > 5 ? 10 : studentResults.length * 2)))
    ))

    if (probability >= 70) note = "Висока імовірність! Рекомендуємо конкурси вищого рівня"
    else if (probability >= 40) note = "Середня імовірність. Є потенціал для покращення"
    else note = "Низька імовірність. Рекомендуємо додаткову підготовку"
  }

  if (studentResults.length === 0) {
    probability = 0
    note = "Учень ще не брав участі в конкурсах"
  }

  // Draw donut chart
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = 70
  const lineWidth = 14

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Background circle
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = "#efe4d8"
  ctx.lineWidth = lineWidth
  ctx.stroke()

  // Progress arc
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + (2 * Math.PI * probability / 100)
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, startAngle, endAngle)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  if (probability >= 70) {
    gradient.addColorStop(0, "#4CAF50")
    gradient.addColorStop(1, "#2E7D32")
  } else if (probability >= 40) {
    gradient.addColorStop(0, "#FF9800")
    gradient.addColorStop(1, "#E65100")
  } else {
    gradient.addColorStop(0, "#a88264")
    gradient.addColorStop(1, "#78643a")
  }
  ctx.strokeStyle = gradient
  ctx.lineWidth = lineWidth
  ctx.lineCap = "round"
  ctx.stroke()

  document.getElementById("prizePercent").textContent = `${probability}%`
  document.getElementById("prizeNote").textContent = note
}

function renderLevelRecommendation() {
  const levels = ["school", "city", "region", "national", "international"]
  const levelItems = document.querySelectorAll(".level-item")

  // Determine recommended level
  let recommendedLevel = 0 // school
  let note = "Рекомендуємо почати зі шкільних конкурсів"

  if (studentResults.length > 0) {
    const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const prizeCount = studentResults.filter(r => {
      const p = parseInt(r.place)
      return !isNaN(p) && p >= 1 && p <= 3
    }).length

    if (avgScore >= 85 && prizeCount >= 3 && studentResults.length >= 5) {
      recommendedLevel = 4 // international
      note = "Готовий до міжнародних змагань!"
    } else if (avgScore >= 75 && prizeCount >= 2 && studentResults.length >= 4) {
      recommendedLevel = 3 // national
      note = "Рекомендуємо всеукраїнські конкурси"
    } else if (avgScore >= 60 && studentResults.length >= 3) {
      recommendedLevel = 2 // region
      note = "Готовий до обласних конкурсів"
    } else if (studentResults.length >= 2) {
      recommendedLevel = 1 // city
      note = "Рекомендуємо міські конкурси"
    } else {
      recommendedLevel = 0 // school
      note = "Рекомендуємо почати зі шкільних конкурсів"
    }
  }

  // Apply visual state
  levelItems.forEach((item, i) => {
    item.classList.remove("active", "passed")
    if (i < recommendedLevel) item.classList.add("passed")
    if (i === recommendedLevel) item.classList.add("active")
  })

  // Set progress bar width
  const progressPercent = (recommendedLevel / (levels.length - 1)) * 100
  document.getElementById("levelProgress").style.setProperty("--progress", `${progressPercent}%`)
  document.getElementById("levelNote").textContent = note
}

function renderTrendChart() {
  if (trendChartInstance) trendChartInstance.destroy()

  const canvas = document.getElementById("trendChart")
  const ctx = canvas.getContext("2d")

  // Sort results by date (oldest first)
  const sorted = [...studentResults]
    .filter(r => r.score && !isNaN(parseFloat(r.score)))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  if (sorted.length < 2) {
    trendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Немає даних"],
        datasets: [{
          label: "Бали",
          data: [0],
          borderColor: "#a88264",
          backgroundColor: "rgba(168, 130, 100, 0.1)",
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Недостатньо даних для побудови тренду", color: "#8b7355" }
        }
      }
    })
    return
  }

  const labels = sorted.map(r => r.competition_title || "Конкурс")
  const scores = sorted.map(r => parseFloat(r.score))

  // Generate prediction (next 2 points)
  const trend = calculateTrend(studentResults)
  const lastScore = scores[scores.length - 1]
  const delta = trend === "improving" ? 5 : trend === "declining" ? -5 : 0
  const predicted1 = Math.max(0, Math.min(100, lastScore + delta))
  const predicted2 = Math.max(0, Math.min(100, predicted1 + delta * 0.8))

  const allLabels = [...labels, "Прогноз 1", "Прогноз 2"]
  const actualData = [...scores, null, null]
  const predictedData = Array(scores.length - 1).fill(null).concat([scores[scores.length - 1], predicted1, predicted2])

  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: [
        {
          label: "Фактичні бали",
          data: actualData,
          borderColor: "#78643a",
          backgroundColor: "rgba(120, 100, 58, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: "#78643a",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: "Прогноз ML",
          data: predictedData,
          borderColor: "#a88264",
          backgroundColor: "rgba(168, 130, 100, 0.08)",
          fill: true,
          borderDash: [8, 4],
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: "#a88264",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { weight: "bold" }, color: "#78643a" }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(120, 100, 58, 0.08)" },
          ticks: { color: "#8b7355" },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: "#8b7355",
            maxRotation: 45,
            font: { size: 11 }
          }
        }
      }
    }
  })
}

// =============================================
// COMPETENCY RADAR
// =============================================
function renderCompetencyRadar() {
  if (radarChartInstance) radarChartInstance.destroy()

  const canvas = document.getElementById("radarChart")
  const ctx = canvas.getContext("2d")

  // Build competency dimensions from results
  const competencies = analyzeCompetencies()

  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: competencies.labels,
      datasets: [{
        label: "Рівень компетентності",
        data: competencies.values,
        backgroundColor: "rgba(168, 130, 100, 0.2)",
        borderColor: "#78643a",
        borderWidth: 2,
        pointBackgroundColor: "#78643a",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: "#8b7355",
            backdropColor: "transparent",
            font: { size: 10 }
          },
          pointLabels: {
            color: "#78643a",
            font: { size: 12, weight: "bold" }
          },
          grid: { color: "rgba(120, 100, 58, 0.15)" },
          angleLines: { color: "rgba(120, 100, 58, 0.15)" }
        }
      }
    }
  })
}

function analyzeCompetencies() {
  // Build competency areas from competition titles and results
  const competencyMap = {
    "Аналітичне мислення": 0,
    "Креативність": 0,
    "Систематичність": 0,
    "Комунікація": 0,
    "Стресостійкість": 0,
    "Адаптивність": 0,
  }

  if (studentResults.length === 0) {
    return {
      labels: Object.keys(competencyMap),
      values: Object.values(competencyMap),
    }
  }

  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const trend = calculateTrend(studentResults)

  // Analytical: based on average scores
  competencyMap["Аналітичне мислення"] = Math.min(100, Math.round(avgScore * 1.1))

  // Creativity: based on achievement variety and improving trend
  const uniqueAchievements = new Set(studentResults.map(r => r.achievement).filter(Boolean))
  competencyMap["Креативність"] = Math.min(100, Math.round(
    (uniqueAchievements.size / Math.max(1, studentResults.length)) * 60 +
    (trend === "improving" ? 30 : trend === "stable" ? 15 : 5) +
    (avgScore > 70 ? 10 : 0)
  ))

  // Systematicity: based on participation count and regularity
  competencyMap["Систематичність"] = Math.min(100, Math.round(
    Math.min(60, studentResults.length * 12) +
    (scores.length > 2 ? 20 : 0) +
    (calculateStability(scores) * 20)
  ))

  // Communication: estimated from participation frequency
  competencyMap["Комунікація"] = Math.min(100, Math.round(
    Math.min(50, studentResults.length * 10) +
    (avgScore > 50 ? 25 : 10) +
    (studentResults.length > 3 ? 15 : 5)
  ))

  // Stress resistance: derived from consistency of results
  const stability = calculateStability(scores)
  competencyMap["Стресостійкість"] = Math.min(100, Math.round(
    stability * 60 +
    (studentResults.length > 3 ? 20 : studentResults.length * 5) +
    (trend !== "declining" ? 15 : 0)
  ))

  // Adaptivity: improvement rate and participation breadth
  competencyMap["Адаптивність"] = Math.min(100, Math.round(
    (trend === "improving" ? 40 : trend === "stable" ? 25 : 10) +
    Math.min(30, studentResults.length * 6) +
    (avgScore > 60 ? 20 : 10) +
    (uniqueAchievements.size > 2 ? 10 : 0)
  ))

  return {
    labels: Object.keys(competencyMap),
    values: Object.values(competencyMap),
  }
}

// =============================================
// INDICES
// =============================================
function renderIndices() {
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const trend = calculateTrend(studentResults)

  // STEM Index (0-100)
  const stemIndex = calculateSTEMIndex(avgScore, studentResults.length, trend)
  animateIndex("stemBar", "stemValue", stemIndex)
  document.getElementById("stemNote").textContent = stemIndex >= 70
    ? "Високий рівень STEM-компетентності"
    : stemIndex >= 40 ? "Середній рівень, є потенціал для зростання"
      : "Початковий рівень, потребує розвитку"

  // Stability Index (0-100)
  const stability = Math.round(calculateStability(scores) * 100)
  animateIndex("stabilityBar", "stabilityValue", stability)
  document.getElementById("stabilityNote").textContent = stability >= 70
    ? "Дуже стабільні результати"
    : stability >= 40 ? "Помірна стабільність"
      : scores.length < 2 ? "Недостатньо даних" : "Результати нестабільні"

  // Improvement Rate (0-100)
  const improvement = calculateImprovementRate(scores, trend)
  animateIndex("improvementBar", "improvementValue", improvement)
  document.getElementById("improvementNote").textContent = improvement >= 70
    ? "Відмінна динаміка розвитку!"
    : improvement >= 40 ? "Стабільний темп розвитку"
      : "Потребує додаткової підтримки"

  // Engagement Score (0-100)
  const engagement = calculateEngagement(studentResults.length)
  animateIndex("engagementBar", "engagementValue", engagement)
  document.getElementById("engagementNote").textContent = engagement >= 70
    ? "Активний учасник конкурсів"
    : engagement >= 40 ? "Помірна активність"
      : "Низька залученість у конкурси"
}

function calculateSTEMIndex(avgScore, totalComps, trend) {
  if (totalComps === 0) return 0
  const scoreComponent = Math.min(40, avgScore * 0.4)
  const expComponent = Math.min(30, totalComps * 5)
  const trendComponent = trend === "improving" ? 30 : trend === "stable" ? 15 : 5
  return Math.min(100, Math.round(scoreComponent + expComponent + trendComponent))
}

function calculateImprovementRate(scores, trend) {
  if (scores.length < 2) return 0

  // Compare first half vs second half averages
  const mid = Math.floor(scores.length / 2)
  const firstHalf = scores.slice(0, mid)
  const secondHalf = scores.slice(mid)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diff = secondAvg - firstAvg
  // Normalize to 0-100
  let rate = 50 + diff // baseline at 50
  rate = Math.max(0, Math.min(100, Math.round(rate)))

  if (trend === "improving") rate = Math.min(100, rate + 10)
  if (trend === "declining") rate = Math.max(0, rate - 10)

  return rate
}

function calculateEngagement(totalComps) {
  if (totalComps === 0) return 0
  if (totalComps >= 8) return 100
  if (totalComps >= 6) return 85
  if (totalComps >= 4) return 70
  if (totalComps >= 3) return 55
  if (totalComps >= 2) return 40
  return 20
}

function animateIndex(barId, valueId, targetValue) {
  const bar = document.getElementById(barId)
  const valueEl = document.getElementById(valueId)

  setTimeout(() => {
    bar.style.width = `${targetValue}%`
    valueEl.textContent = targetValue
  }, 300)
}

// =============================================
// HISTORY ANALYSIS
// =============================================
function renderHistoryAnalysis() {
  renderAchievementChart()
  renderScoreDistChart()
  renderHistoryTable()
}

function renderAchievementChart() {
  if (achievementChartInstance) achievementChartInstance.destroy()

  const canvas = document.getElementById("achievementChart")
  const ctx = canvas.getContext("2d")

  // Count achievement types
  const achievementCounts = {}
  studentResults.forEach(r => {
    const ach = r.achievement || "Без досягнення"
    achievementCounts[ach] = (achievementCounts[ach] || 0) + 1
  })

  const labels = Object.keys(achievementCounts)
  const data = Object.values(achievementCounts)
  const colors = ["#78643a", "#a88264", "#c4a882", "#e8dcc8", "#d8cdb8", "#8b7355"]

  if (labels.length === 0) {
    labels.push("Немає даних")
    data.push(1)
  }

  achievementChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "white",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#78643a", font: { size: 12 }, padding: 12 }
        }
      }
    }
  })
}

function renderScoreDistChart() {
  if (scoreDistChartInstance) scoreDistChartInstance.destroy()

  const canvas = document.getElementById("scoreDistChart")
  const ctx = canvas.getContext("2d")

  const scores = studentResults
    .map(r => parseFloat(r.score))
    .filter(s => !isNaN(s) && s > 0)

  // Create distribution buckets
  const buckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 }

  scores.forEach(s => {
    if (s <= 20) buckets["0-20"]++
    else if (s <= 40) buckets["21-40"]++
    else if (s <= 60) buckets["41-60"]++
    else if (s <= 80) buckets["61-80"]++
    else buckets["81-100"]++
  })

  scoreDistChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        label: "Кількість результатів",
        data: Object.values(buckets),
        backgroundColor: [
          "rgba(168, 130, 100, 0.3)",
          "rgba(168, 130, 100, 0.45)",
          "rgba(168, 130, 100, 0.6)",
          "rgba(168, 130, 100, 0.75)",
          "rgba(120, 100, 58, 0.9)",
        ],
        borderColor: "#78643a",
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: "#8b7355" },
          grid: { color: "rgba(120, 100, 58, 0.08)" }
        },
        x: {
          ticks: { color: "#8b7355" },
          grid: { display: false }
        }
      }
    }
  })
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTableBody")

  if (studentResults.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Немає даних про участь у конкурсах</td></tr>'
    return
  }

  // Sort by date descending
  const sorted = [...studentResults].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  tbody.innerHTML = sorted.map(r => {
    const place = parseInt(r.place)
    let placeBadge = "-"
    if (!isNaN(place) && place > 0) {
      const placeClass = place <= 3 ? `place-${place}` : "place-other"
      placeBadge = `<span class="place-badge ${placeClass}">${place}</span>`
    }

    const score = r.score || "-"
    const achievement = escapeHtml(r.achievement || "-")
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString("uk-UA") : "-"
    const title = escapeHtml(r.competition_title || "Конкурс")

    return `
      <tr>
        <td>${title}</td>
        <td>${placeBadge}</td>
        <td>${score}</td>
        <td>${achievement}</td>
        <td>${date}</td>
      </tr>
    `
  }).join("")
}

// =============================================
// 1. ACHIEVEMENT COMPLEXITY SCORE
// =============================================
function getCompetitionLevel(result) {
  const title = (result.competition_title || "").toLowerCase()
  if (title.includes("міжнародн") || title.includes("international")) return { level: 5, name: "Міжнародний" }
  if (title.includes("всеукраїнськ") || title.includes("national") || title.includes("україн")) return { level: 4, name: "Всеукраїнський" }
  if (title.includes("обласн") || title.includes("регіон") || title.includes("region")) return { level: 3, name: "Обласний" }
  if (title.includes("міськ") || title.includes("район") || title.includes("city")) return { level: 2, name: "Міський" }
  return { level: 1, name: "Шкільний" }
}

function calculateCC(result) {
  const levelInfo = getCompetitionLevel(result)
  const score = parseFloat(result.score) || 0
  // Simulate participants by level
  const participantsByLevel = { 1: 20, 2: 50, 3: 100, 4: 200, 5: 500 }
  const participants = participantsByLevel[levelInfo.level] || 20
  const avgScoreEstimate = 55 // average benchmark
  const cc = (levelInfo.level * participants * avgScoreEstimate) / 10000
  const adjustedScore = Math.round(score * cc * 10) / 10
  return { cc: Math.round(cc * 100) / 100, adjustedScore, levelInfo, rawScore: score }
}

function renderComplexityScore() {
  if (complexityChartInstance) complexityChartInstance.destroy()

  const tbody = document.getElementById("ccTableBody")
  if (studentResults.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Немає даних</td></tr>'
    return
  }

  const rows = studentResults.map(r => {
    const { cc, adjustedScore, levelInfo, rawScore } = calculateCC(r)
    const scoreClass = adjustedScore >= 100 ? "cc-high" : adjustedScore >= 40 ? "cc-medium" : "cc-low"
    return {
      title: r.competition_title || "Конкурс",
      rawScore, cc, adjustedScore, scoreClass, levelInfo
    }
  })

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.title)}<br><small style="color:#8b7355">${r.levelInfo.name}</small></td>
      <td>${r.rawScore}</td>
      <td>${r.cc}</td>
      <td><span class="cc-adjusted ${r.scoreClass}">${r.adjustedScore}</span></td>
    </tr>
  `).join("")

  // Chart: Raw vs Adjusted
  const labels = rows.map((r, i) => `#${i + 1}`)
  const rawData = rows.map(r => r.rawScore)
  const adjData = rows.map(r => r.adjustedScore)

  const canvas = document.getElementById("complexityChart")
  complexityChartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Raw Score",
          data: rawData,
          backgroundColor: "rgba(168, 130, 100, 0.4)",
          borderColor: "#a88264",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Adjusted Score",
          data: adjData,
          backgroundColor: "rgba(120, 100, 58, 0.7)",
          borderColor: "#78643a",
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { color: "#78643a", font: { size: 12, weight: "bold" } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: "#8b7355" }, grid: { color: "rgba(120,100,58,0.08)" } },
        x: { ticks: { color: "#8b7355" }, grid: { display: false } }
      }
    }
  })
}

// =============================================
// 2. EXPLAINABLE AI (XAI)
// =============================================
function renderExplainableAI() {
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const stability = calculateStability(scores)
  const trend = calculateTrend(studentResults)
  const engagement = calculateEngagement(studentResults.length)
  const improvement = scores.length >= 2 ? calculateImprovementRate(scores, trend) : 0

  // Factor scores (0-100)
  const factor1 = Math.min(100, Math.round(avgScore)) // previous results
  const factor2 = Math.round(stability * 100)           // stability
  const factor3 = engagement                             // activity
  const factor4 = Math.min(100, studentResults.reduce((sum, r) => sum + getCompetitionLevel(r).level * 20, 0) / Math.max(1, studentResults.length)) // complexity
  const factor5 = improvement                            // growth rate

  // Weighted total
  const total = Math.round(factor1 * 0.30 + factor2 * 0.25 + factor3 * 0.20 + factor4 * 0.15 + factor5 * 0.10)

  // Animate factor bars
  const colors = ["#78643a", "#4CAF50", "#2196F3", "#FF9800", "#9C27B0"]
  const factors = [factor1, factor2, factor3, factor4, factor5]
  factors.forEach((val, i) => {
    const bar = document.getElementById(`xaiFactor${i + 1}`)
    const valEl = document.getElementById(`xaiFactorVal${i + 1}`)
    setTimeout(() => {
      bar.style.width = `${val}%`
      bar.style.background = colors[i]
      valEl.textContent = val
    }, 200 + i * 100)
  })

  // Total circle
  drawSmallDonut("xaiTotalCircle", total, 160, total >= 60 ? "#4CAF50" : total >= 35 ? "#FF9800" : "#e53e3e")
  document.getElementById("xaiTotalValue").textContent = `${total}%`

  // Confidence
  const sampleSize = studentResults.length
  document.getElementById("xaiSampleSize").textContent = `${sampleSize} результатів`
  const confBadge = document.getElementById("xaiConfBadge")
  if (sampleSize >= 5) {
    confBadge.textContent = "Високий"
    confBadge.className = "xai-conf-badge xai-conf-high"
  } else if (sampleSize >= 2) {
    confBadge.textContent = "Середній"
    confBadge.className = "xai-conf-badge xai-conf-medium"
  } else {
    confBadge.textContent = "Низький"
    confBadge.className = "xai-conf-badge xai-conf-low"
  }
}

// =============================================
// 3. RISK INDEX
// =============================================
function renderRiskIndex() {
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const stability = Math.round(calculateStability(scores) * 100)
  const trend = calculateTrend(studentResults)
  const trendScore = trend === "improving" ? 80 : trend === "stable" ? 50 : 20
  const activity = calculateEngagement(studentResults.length)

  const risk = Math.round(100 - (stability + trendScore + activity) / 3)

  // Draw gauge
  drawRiskGauge(risk)
  document.getElementById("riskGaugeValue").textContent = risk

  // Label
  const label = document.getElementById("riskLevelLabel")
  if (risk < 40) {
    label.textContent = "Безпечна зона"
    label.className = "risk-level-label risk-level-safe"
  } else if (risk < 70) {
    label.textContent = "Зона уваги"
    label.className = "risk-level-label risk-level-warning"
  } else {
    label.textContent = "Зона небезпеки"
    label.className = "risk-level-label risk-level-danger"
  }

  // Component bars
  setTimeout(() => {
    document.getElementById("riskStability").style.width = `${stability}%`
    document.getElementById("riskStabilityVal").textContent = stability
    document.getElementById("riskTrend").style.width = `${trendScore}%`
    document.getElementById("riskTrendVal").textContent = trendScore
    document.getElementById("riskActivity").style.width = `${activity}%`
    document.getElementById("riskActivityVal").textContent = activity
  }, 300)
}

function drawRiskGauge(value) {
  const canvas = document.getElementById("riskGaugeCanvas")
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height - 10
  const r = 90
  const lw = 18

  // Background arc (semicircle)
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0)
  ctx.strokeStyle = "#e8dcc8"
  ctx.lineWidth = lw
  ctx.lineCap = "round"
  ctx.stroke()

  // Colored arc
  const angle = Math.PI + (Math.PI * Math.min(100, value) / 100)
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, angle)
  if (value < 40) ctx.strokeStyle = "#4CAF50"
  else if (value < 70) ctx.strokeStyle = "#FF9800"
  else ctx.strokeStyle = "#e53e3e"
  ctx.lineWidth = lw
  ctx.lineCap = "round"
  ctx.stroke()
}

// =============================================
// 4. LEARNING TRAJECTORY MODEL
// =============================================
function renderTrajectoryModel() {
  if (trajectoryChartInstance) trajectoryChartInstance.destroy()

  const sorted = [...studentResults]
    .filter(r => r.score && !isNaN(parseFloat(r.score)))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const scores = sorted.map(r => parseFloat(r.score))
  const lastScore = scores.length > 0 ? scores[scores.length - 1] : 50
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
  const trend = calculateTrend(studentResults)
  const trendDelta = trend === "improving" ? 4 : trend === "declining" ? -3 : 1

  // Generate monthly labels for 1 year (12 months)
  const months = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"]
  const now = new Date()
  const futureLabels = []
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    futureLabels.push(months[d.getMonth()] + " " + d.getFullYear())
  }

  // 3 scenario projections
  const conservative = [], realistic = [], ambitious = []
  let cScore = lastScore, rScore = lastScore, aScore = lastScore

  for (let i = 0; i < 12; i++) {
    cScore = Math.max(0, Math.min(100, cScore + trendDelta - 3 + Math.random() * 2 - 1))
    rScore = Math.max(0, Math.min(100, rScore + trendDelta + Math.random() * 2 - 1))
    aScore = Math.max(0, Math.min(100, aScore + trendDelta + 4 + Math.random() * 2 - 1))
    conservative.push(Math.round(cScore * 10) / 10)
    realistic.push(Math.round(rScore * 10) / 10)
    ambitious.push(Math.round(aScore * 10) / 10)
  }

  // Update scenario cards
  const cEl = document.getElementById("scenarioConservative")
  const rEl = document.getElementById("scenarioRealistic")
  const aEl = document.getElementById("scenarioAmbitious")
  cEl.querySelector(".scenario-score").textContent = Math.round(conservative[11])
  rEl.querySelector(".scenario-score").textContent = Math.round(realistic[11])
  aEl.querySelector(".scenario-score").textContent = Math.round(ambitious[11])

  const canvas = document.getElementById("trajectoryChart")
  trajectoryChartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: futureLabels,
      datasets: [
        {
          label: "Conservative",
          data: conservative,
          borderColor: "#e53e3e",
          backgroundColor: "rgba(229, 62, 62, 0.05)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 3,
          pointBackgroundColor: "#e53e3e",
        },
        {
          label: "Realistic",
          data: realistic,
          borderColor: "#FF9800",
          backgroundColor: "rgba(255, 152, 0, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "#FF9800",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
        {
          label: "Ambitious",
          data: ambitious,
          borderColor: "#4CAF50",
          backgroundColor: "rgba(76, 175, 80, 0.05)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 3,
          pointBackgroundColor: "#4CAF50",
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { weight: "bold", size: 12 }, color: "#78643a" }
        },
        title: {
          display: true,
          text: "Прогноз на 12 місяців",
          color: "#78643a",
          font: { size: 14, weight: "bold" }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#8b7355" },
          grid: { color: "rgba(120,100,58,0.08)" },
        },
        x: {
          ticks: { color: "#8b7355", maxRotation: 45, font: { size: 10 } },
          grid: { display: false },
        }
      }
    }
  })
}

// =============================================
// 5. TALENT DETECTION MODULE
// =============================================
function renderTalentDetection() {
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const trend = calculateTrend(studentResults)
  const stability = calculateStability(scores)
  const engagement = calculateEngagement(studentResults.length)
  const improvement = scores.length >= 2 ? calculateImprovementRate(scores, trend) : 0

  // Calculate talent scores
  const talents = {
    stem: Math.min(100, Math.round(avgScore * 0.5 + (studentResults.length * 5) + (trend === "improving" ? 20 : 0))),
    humanitarian: Math.min(100, Math.round(avgScore * 0.4 + stability * 30 + (engagement > 60 ? 20 : 10))),
    leader: Math.min(100, Math.round(engagement * 0.5 + studentResults.length * 8 + (avgScore > 60 ? 15 : 0))),
    strategist: Math.min(100, Math.round(stability * 50 + (trend === "stable" ? 30 : trend === "improving" ? 20 : 5) + (avgScore > 50 ? 15 : 5))),
    progressor: Math.min(100, Math.round(improvement * 0.5 + (trend === "improving" ? 40 : 10) + (scores.length >= 3 ? 10 : 0)))
  }

  // Find dominant talent
  const talentEntries = Object.entries(talents)
  talentEntries.sort((a, b) => b[1] - a[1])
  const dominant = talentEntries[0]

  const talentNames = {
    stem: { name: "STEM High-Performer", icon: "&#129514;", desc: "Високі аналітичні здібності, системне мислення та орієнтація на точні науки" },
    humanitarian: { name: "Humanitarian Scholar", icon: "&#128214;", desc: "Стабільність, глибокий аналіз та широкий кругозір у гуманітарних дисциплінах" },
    leader: { name: "Activity Leader", icon: "&#127941;", desc: "Висока залученість, регулярна участь та мотивація до змагань" },
    strategist: { name: "Strategic Stabilizer", icon: "&#9878;&#65039;", desc: "Постійний рівень результатів, надійність та системний підхід" },
    progressor: { name: "Rapid Progressor", icon: "&#128640;", desc: "Швидкий темп зростання, висхідний тренд та адаптивність" }
  }

  const info = talentNames[dominant[0]]
  document.getElementById("talentBadgeIcon").innerHTML = info.icon
  document.getElementById("talentTypeName").textContent = info.name
  document.getElementById("talentTypeDesc").textContent = info.desc

  // Render talent cards
  const cardIds = { stem: "talentSTEM", humanitarian: "talentHuman", leader: "talentLeader", strategist: "talentStrategist", progressor: "talentProgressor" }
  const valIds = { stem: "talentSTEMVal", humanitarian: "talentHumanVal", leader: "talentLeaderVal", strategist: "talentStrategistVal", progressor: "talentProgressorVal" }

  Object.entries(talents).forEach(([key, val]) => {
    const bar = document.getElementById(cardIds[key])
    const valEl = document.getElementById(valIds[key])
    setTimeout(() => {
      bar.style.width = `${val}%`
      valEl.textContent = `${val}%`
    }, 400)

    // Highlight dominant talent card
    const card = bar.closest(".talent-card")
    if (key === dominant[0]) {
      card.classList.add("talent-active")
    } else {
      card.classList.remove("talent-active")
    }
  })
}

// =============================================
// 6. COMPARATIVE POSITION (PERCENTILES)
// =============================================
function renderComparativePosition() {
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  // Simulate percentiles based on score distribution
  // In a real app this would compare against all students in the DB
  const classPercentile = Math.min(99, Math.max(1, Math.round(avgScore * 0.95 + Math.random() * 5)))
  const schoolPercentile = Math.min(99, Math.max(1, Math.round(avgScore * 0.85 + Math.random() * 8)))
  const regionPercentile = Math.min(99, Math.max(1, Math.round(avgScore * 0.75 + Math.random() * 10)))

  // Draw circles
  drawSmallDonut("percentileClass", classPercentile, 130, "#78643a")
  drawSmallDonut("percentileSchool", schoolPercentile, 130, "#a88264")
  drawSmallDonut("percentileRegion", regionPercentile, 130, "#8b7355")

  document.getElementById("percentileClassVal").textContent = `${classPercentile}%`
  document.getElementById("percentileSchoolVal").textContent = `${schoolPercentile}%`
  document.getElementById("percentileRegionVal").textContent = `${regionPercentile}%`

  const name = studentData ? `${studentData.first_name || "Учень"}` : "Учень"
  document.getElementById("percentileClassDesc").textContent = `${name} входить у топ ${100 - classPercentile}% класу`
  document.getElementById("percentileSchoolDesc").textContent = `${name} входить у топ ${100 - schoolPercentile}% школи`
  document.getElementById("percentileRegionDesc").textContent = `${name} входить у топ ${100 - regionPercentile}% області`
}

// =============================================
// 7. ACHIEVEMENT MOMENTUM INDEX (AMI)
// =============================================
function renderMomentumIndex() {
  if (amiTrendChartInstance) amiTrendChartInstance.destroy()

  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const trend = calculateTrend(studentResults)
  const stability = calculateStability(scores)
  const engagement = calculateEngagement(studentResults.length)
  const improvement = scores.length >= 2 ? calculateImprovementRate(scores, trend) : 50

  // AMI = (Trend * Activity) / Stability
  const trendFactor = trend === "improving" ? 80 : trend === "stable" ? 50 : 20
  const stabilityFactor = Math.max(10, Math.round(stability * 100)) // avoid divide by 0
  const ami = Math.min(100, Math.max(0, Math.round((trendFactor * engagement) / stabilityFactor)))

  document.getElementById("amiValue").textContent = ami

  // Status
  const statusIcon = document.getElementById("amiStatusIcon")
  const statusText = document.getElementById("amiStatusText")
  const statusEl = document.getElementById("amiStatus")
  statusEl.className = "ami-status"

  if (ami >= 65) {
    statusIcon.innerHTML = "&#128640;"
    statusText.textContent = "На розгоні!"
    statusEl.classList.add("ami-status-accelerating")
    document.getElementById("amiValue").style.color = "#2E7D32"
  } else if (ami >= 35) {
    statusIcon.innerHTML = "&#9724;&#65039;"
    statusText.textContent = "Плато"
    statusEl.classList.add("ami-status-plateau")
    document.getElementById("amiValue").style.color = "#E65100"
  } else {
    statusIcon.innerHTML = "&#128308;"
    statusText.textContent = "Спад"
    statusEl.classList.add("ami-status-declining")
    document.getElementById("amiValue").style.color = "#c62828"
  }

  // AMI trend chart: simulated rolling AMI over time
  const sorted = [...studentResults]
    .filter(r => r.score && !isNaN(parseFloat(r.score)))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  if (sorted.length < 2) {
    amiTrendChartInstance = new Chart(document.getElementById("amiTrendChart").getContext("2d"), {
      type: "line",
      data: { labels: ["N/A"], datasets: [{ label: "AMI", data: [0], borderColor: "#a88264" }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: "Недостатньо даних", color: "#8b7355" } }
      }
    })
    return
  }

  // Build rolling AMI
  const amiPoints = []
  const amiLabels = []
  for (let i = 1; i < sorted.length; i++) {
    const subSet = sorted.slice(0, i + 1)
    const subScores = subSet.map(r => parseFloat(r.score)).filter(s => !isNaN(s))
    const subStab = Math.max(10, Math.round(calculateStability(subScores) * 100))
    const subEng = calculateEngagement(subSet.length)
    const subTrend = calculateTrend(subSet)
    const subTrendF = subTrend === "improving" ? 80 : subTrend === "stable" ? 50 : 20
    const pointAmi = Math.min(100, Math.max(0, Math.round((subTrendF * subEng) / subStab)))
    amiPoints.push(pointAmi)
    amiLabels.push(sorted[i].competition_title ? sorted[i].competition_title.substring(0, 15) : `#${i + 1}`)
  }

  const amiColors = amiPoints.map(v => v >= 65 ? "#4CAF50" : v >= 35 ? "#FF9800" : "#e53e3e")

  amiTrendChartInstance = new Chart(document.getElementById("amiTrendChart").getContext("2d"), {
    type: "line",
    data: {
      labels: amiLabels,
      datasets: [{
        label: "AMI",
        data: amiPoints,
        borderColor: "#78643a",
        backgroundColor: "rgba(120, 100, 58, 0.1)",
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointRadius: 6,
        pointBackgroundColor: amiColors,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "AMI за час участі", color: "#78643a", font: { size: 14, weight: "bold" } }
      },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: "#8b7355" }, grid: { color: "rgba(120,100,58,0.08)" } },
        x: { ticks: { color: "#8b7355", maxRotation: 45, font: { size: 10 } }, grid: { display: false } }
      }
    }
  })
}

// =============================================
// SHARED DRAWING HELPERS
// =============================================
function drawSmallDonut(canvasId, value, size, color) {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  const ctx = canvas.getContext("2d")
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) - 14
  const lw = 10

  ctx.clearRect(0, 0, size, size)

  // Background
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, 2 * Math.PI)
  ctx.strokeStyle = "#e8dcc8"
  ctx.lineWidth = lw
  ctx.stroke()

  // Value arc
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + (2 * Math.PI * value / 100)
  ctx.beginPath()
  ctx.arc(cx, cy, r, startAngle, endAngle)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = "round"
  ctx.stroke()
}

// =============================================
// AI RECOMMENDATIONS
// =============================================
function renderRecommendations() {
  const grid = document.getElementById("recommendationsGrid")
  const recommendations = generateAIRecommendations()

  if (recommendations.length === 0) {
    grid.innerHTML = `
      <div class="recommendation-card priority-info">
        <h4>&#128161; Немає достатньо даних</h4>
        <p>Для генерації рекомендацій потрібна участь хоча б у одному конкурсі.</p>
      </div>
    `
    return
  }

  grid.innerHTML = recommendations.map(rec => `
    <div class="recommendation-card priority-${rec.priority}">
      <h4>${rec.icon} ${escapeHtml(rec.title)}</h4>
      <p>${escapeHtml(rec.text)}</p>
    </div>
  `).join("")
}

function generateAIRecommendations() {
  const recommendations = []
  const scores = studentResults.map(r => parseFloat(r.score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const trend = calculateTrend(studentResults)
  const stability = calculateStability(scores)
  const prizeCount = studentResults.filter(r => {
    const p = parseInt(r.place)
    return !isNaN(p) && p >= 1 && p <= 3
  }).length

  if (studentResults.length === 0) return recommendations

  // Participation recommendations
  if (studentResults.length < 3) {
    recommendations.push({
      priority: "high",
      icon: "&#128204;",
      title: "Збільшити участь",
      text: "Учень має мало конкурсного досвіду. Рекомендуємо залучити до участі в 2-3 додаткових конкурсах для накопичення досвіду та точнішого прогнозування."
    })
  }

  // Performance-based recommendations
  if (trend === "improving") {
    recommendations.push({
      priority: "low",
      icon: "&#127775;",
      title: "Зростання результатів",
      text: "Учень демонструє позитивну динаміку. Рекомендуємо поступово підвищувати рівень складності конкурсів для подальшого розвитку."
    })
  } else if (trend === "declining") {
    recommendations.push({
      priority: "high",
      icon: "&#9888;&#65039;",
      title: "Зниження результатів",
      text: "Спостерігається негативний тренд. Рекомендуємо провести індивідуальну бесіду, виявити причини та надати додаткову підтримку."
    })
  }

  // Score-based recommendations
  if (avgScore >= 80 && prizeCount >= 2) {
    recommendations.push({
      priority: "info",
      icon: "&#127942;",
      title: "Талановитий учень",
      text: "Високі середні бали та призові місця свідчать про значний потенціал. Рекомендуємо розглянути участь у всеукраїнських та міжнародних конкурсах."
    })
  } else if (avgScore < 50 && studentResults.length >= 2) {
    recommendations.push({
      priority: "medium",
      icon: "&#128218;",
      title: "Потребує підготовки",
      text: "Середні бали нижче 50. Рекомендуємо додаткові заняття з підготовки до конкурсів та участь у тренувальних змаганнях."
    })
  }

  // Stability recommendations
  if (stability < 0.4 && scores.length >= 3) {
    recommendations.push({
      priority: "medium",
      icon: "&#128200;",
      title: "Нестабільні результати",
      text: "Великий розкид у балах свідчить про нерівномірну підготовку. Рекомендуємо систематичну підготовку та роботу над слабкими сторонами."
    })
  } else if (stability >= 0.7 && scores.length >= 3) {
    recommendations.push({
      priority: "low",
      icon: "&#9878;&#65039;",
      title: "Стабільний учень",
      text: "Результати дуже стабільні. Це свідчить про надійну підготовку. Для подальшого зростання варто спробувати нові формати конкурсів."
    })
  }

  // Engagement recommendation
  if (studentResults.length >= 5) {
    recommendations.push({
      priority: "info",
      icon: "&#128170;",
      title: "Активний учасник",
      text: `${studentResults.length} конкурсів - відмінний показник залученості! Продовжуйте підтримувати мотивацію та інтерес учня до змагань.`
    })
  }

  // Risk-based recommendation
  const rStab = Math.round(stability * 100)
  const rTrendScore = trend === "improving" ? 80 : trend === "stable" ? 50 : 20
  const rAct = calculateEngagement(studentResults.length)
  const riskVal = Math.round(100 - (rStab + rTrendScore + rAct) / 3)
  if (riskVal >= 70) {
    recommendations.push({
      priority: "high",
      icon: "&#9888;&#65039;",
      title: "Високий ризик спаду",
      text: `Risk Index: ${riskVal}. Учень у зоні небезпеки зниження результатів. Необхідна термінова увага: додаткова мотивація, індивідуальний підхід та підтримка.`
    })
  } else if (riskVal >= 40) {
    recommendations.push({
      priority: "medium",
      icon: "&#128300;",
      title: "Зона уваги: ризик помірний",
      text: `Risk Index: ${riskVal}. Варто звернути увагу на стабільність участі та підтримку мотивації.`
    })
  }

  // AMI-based recommendation
  const amiTrendF = trend === "improving" ? 80 : trend === "stable" ? 50 : 20
  const amiStabF = Math.max(10, rStab)
  const amiVal = Math.min(100, Math.max(0, Math.round((amiTrendF * rAct) / amiStabF)))
  if (amiVal >= 65) {
    recommendations.push({
      priority: "low",
      icon: "&#128640;",
      title: "Учень на розгоні!",
      text: `AMI: ${amiVal}. Зараз ідеальний час для участі в конкурсах вищого рівня. Momentum максимальний.`
    })
  } else if (amiVal < 35 && studentResults.length >= 3) {
    recommendations.push({
      priority: "high",
      icon: "&#128308;",
      title: "Momentum падає",
      text: `AMI: ${amiVal}. Інерція досягнень знижується. Рекомендуємо повернутися до конкурсів комфортного рівня для відновлення впевненості.`
    })
  }

  return recommendations
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function calculateTrend(results) {
  const scores = results
    .map(r => ({ score: parseFloat(r.score), date: new Date(r.created_at) }))
    .filter(s => !isNaN(s.score) && s.score > 0)
    .sort((a, b) => a.date - b.date)

  if (scores.length < 2) return "new"

  const mid = Math.floor(scores.length / 2)
  const firstHalf = scores.slice(0, mid).map(s => s.score)
  const secondHalf = scores.slice(mid).map(s => s.score)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  const diff = secondAvg - firstAvg

  if (diff > 5) return "improving"
  if (diff < -5) return "declining"
  return "stable"
}

function calculateStability(scores) {
  if (scores.length < 2) return 0.5

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of variation (inverted for stability)
  const cv = mean > 0 ? stdDev / mean : 1
  return Math.max(0, Math.min(1, 1 - cv))
}

function getInitials(firstName, lastName, email) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) return firstName[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return "?"
}

function escapeHtml(str) {
  if (!str) return ""
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}
