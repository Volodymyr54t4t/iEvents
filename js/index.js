let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

// Load results on page load
document.addEventListener("DOMContentLoaded", () => {
  loadResults()

  const form = document.getElementById("resultForm")
  form.addEventListener("submit", handleSubmit)
})

async function handleSubmit(e) {
  e.preventDefault()

  const studentName = document.getElementById("studentName").value.trim()
  const competitionName = document.getElementById("competitionName").value.trim()
  const resultValue = document.getElementById("resultValue").value.trim()
  const place = document.getElementById("place").value.trim()
  const points = document.getElementById("points").value.trim()
  const notes = document.getElementById("notes").value.trim()

  if (!studentName || !competitionName || !resultValue) {
    showMessage("Будь ласка, заповніть всі обов'язкові поля", "error")
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        competitionId: 1, // Default competition ID
        studentId: 1, // Default student ID
        place: place ? Number.parseInt(place) : null,
        score: points || null,
        achievement: resultValue, // Main result/achievement
        notes: notes || null,
        addedBy: null,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Помилка додавання результату")
    }

    showMessage("Результат успішно додано!", "success")
    document.getElementById("resultForm").reset()
    loadResults()
  } catch (error) {
    console.error("Error submitting result:", error)
    showMessage(error.message, "error")
  }
}

async function loadResults() {
  const resultsList = document.getElementById("resultsList")
  resultsList.innerHTML = '<div class="loading">Завантаження результатів...</div>'

  try {
    const response = await fetch(`${BASE_URL}/api/results/1`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Помилка завантаження результатів")
    }

    if (data.results.length === 0) {
      resultsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">Поки що немає результатів. Будьте першим!</div>
        </div>
      `
      return
    }

    resultsList.innerHTML = data.results
      .map(
        (result) => `
      <div class="result-item">
        <div class="result-header">
          <div>
            <div class="result-student">${escapeHtml(result.first_name || "")} ${escapeHtml(result.last_name || "")}</div>
            <div class="result-competition">${escapeHtml(result.email)}</div>
          </div>
          <div class="result-value">${escapeHtml(result.achievement)}</div>
        </div>
        <div class="result-details">
          ${result.place ? `<div class="result-detail"><strong>Місце:</strong> ${escapeHtml(result.place)}</div>` : ""}
          ${result.score ? `<div class="result-detail"><strong>Бали:</strong> ${result.score}</div>` : ""}
          <div class="result-detail"><strong>Клас:</strong> ${escapeHtml(result.grade || "не вказано")}</div>
          <div class="result-detail"><strong>Додано:</strong> ${formatDate(result.added_at)}</div>
        </div>
        ${result.notes ? `<div class="result-notes">${escapeHtml(result.notes)}</div>` : ""}
      </div>
    `,
      )
      .join("")
  } catch (error) {
    console.error("Error loading results:", error)
    resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Помилка завантаження результатів</div>
      </div>
    `
  }
}

function showMessage(text, type) {
  const message = document.getElementById("message")
  message.textContent = text
  message.className = `message ${type}`
  message.classList.remove("hidden")

  setTimeout(() => {
    message.classList.add("hidden")
  }, 5000)
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "щойно"
  if (diffMins < 60) return `${diffMins} хв тому`
  if (diffHours < 24) return `${diffHours} год тому`
  if (diffDays < 7) return `${diffDays} дн тому`

  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}