// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" // 🖥️ Локальний сервер
    : "https://ievents-qf5k.onrender.com" // ☁️ Онлайн-сервер Render

// Перевірка авторизації
const userId = localStorage.getItem("userId")

if (!userId) {
  window.location.href = "auth.html"
}

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadMyCompetitions()
  loadMyResults()
})

// Завантаження конкурсів користувача
async function loadMyCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const data = await response.json()

    if (response.ok) {
      const active = data.competitions.filter((c) => c.status === "активний")
      const upcoming = data.competitions.filter((c) => c.status === "майбутній")
      const inactive = data.competitions.filter((c) => c.status === "неактивний")

      displayCompetitions("activeCompetitions", active, "active")
      displayCompetitions("upcomingCompetitions", upcoming, "upcoming")
      displayCompetitions("inactiveCompetitions", inactive, "inactive")
    } else {
      console.error("Помилка завантаження конкурсів:", data.error)
      showError("activeCompetitions")
      showError("upcomingCompetitions")
      showError("inactiveCompetitions")
    }
  } catch (error) {
    console.error("Помилка:", error)
    showError("activeCompetitions")
    showError("upcomingCompetitions")
    showError("inactiveCompetitions")
  }
}

// Відображення конкурсів
function displayCompetitions(containerId, competitions, type) {
  const container = document.getElementById(containerId)

  if (competitions.length === 0) {
    let message = ""
    if (type === "active") {
      message = "Наразі у вас немає активних конкурсів"
    } else if (type === "upcoming") {
      message = "Наразі у вас немає майбутніх конкурсів"
    } else {
      message = "У вас ще немає завершених конкурсів"
    }

    container.innerHTML = `
      <div class="empty-state">
        <h3>${message}</h3>
        <p>Очікуйте, поки викладач додасть вас на конкурс</p>
      </div>
    `
    return
  }

  container.innerHTML = competitions
    .map((competition) => {
      const startDate = new Date(competition.start_date)
      const endDate = new Date(competition.end_date)
      const today = new Date()

      let statusText = ""
      let statusClass = ""
      let daysInfo = ""

      if (type === "active") {
        statusText = "Активний"
        statusClass = "active"
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0) {
          daysInfo = `<div class="days-remaining">Залишилось днів: ${daysLeft}</div>`
        }
      } else if (type === "upcoming") {
        statusText = "Майбутній"
        statusClass = "upcoming"
        const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
        if (daysUntil > 0) {
          daysInfo = `<div class="days-remaining">Почнеться через ${daysUntil} днів</div>`
        }
      } else {
        statusText = "Завершено"
        statusClass = "inactive"
      }

      return `
        <div class="competition-card ${statusClass}">
          <h3 class="competition-title">${competition.title}</h3>
          <span class="status-badge status-${statusClass}">${statusText}</span>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          <div class="competition-dates">
            <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
            <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
          </div>
          ${daysInfo}
        </div>
      `
    })
    .join("")
}

// Відображення помилки
function showError(containerId) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
    <div class="empty-state">
      <h3>Помилка завантаження</h3>
      <p>Спробуйте оновити сторінку</p>
    </div>
  `
}

async function loadMyResults() {
  const container = document.getElementById("myResults")
  container.innerHTML = '<div class="loading">Завантаження результатів...</div>'

  try {
    // Get all competitions the student participates in
    const competitionsResponse = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const competitionsData = await competitionsResponse.json()

    if (!competitionsResponse.ok || competitionsData.competitions.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>У вас поки немає результатів</p></div>'
      return
    }

    // Get results for each competition
    const allResults = []
    for (const competition of competitionsData.competitions) {
      try {
        const resultsResponse = await fetch(`${BASE_URL}/api/results/${competition.id}`)
        const resultsData = await resultsResponse.json()

        if (resultsResponse.ok && resultsData.results.length > 0) {
          // Filter results for current user
          const myResult = resultsData.results.find((r) => r.user_id === Number.parseInt(userId))
          if (myResult) {
            allResults.push({
              ...myResult,
              competition_title: competition.title,
              competition_date: competition.end_date,
            })
          }
        }
      } catch (error) {
        console.error(`Помилка завантаження результатів для конкурсу ${competition.id}:`, error)
      }
    }

    if (allResults.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>У вас поки немає результатів</p></div>'
      return
    }

    // Sort by date (newest first)
    allResults.sort((a, b) => new Date(b.competition_date) - new Date(a.competition_date))

    container.innerHTML = `
            <div class="results-grid">
                ${allResults
                  .map((result) => {
                    const date = new Date(result.competition_date).toLocaleDateString("uk-UA")
                    const placeEmoji =
                      result.place === 1 ? "🥇" : result.place === 2 ? "🥈" : result.place === 3 ? "🥉" : "🏅"

                    return `
                        <div class="result-card">
                            <div class="result-header">
                                <h3>${result.competition_title}</h3>
                                <span class="result-date">${date}</span>
                            </div>
                            <div class="result-body">
                                ${result.place ? `<div class="result-place">${placeEmoji} Місце: ${result.place}</div>` : ""}
                                ${result.score ? `<div class="result-score">📊 Бали: ${result.score}</div>` : ""}
                                <div class="result-achievement">🏆 ${result.achievement}</div>
                                ${result.notes ? `<div class="result-notes">📝 ${result.notes}</div>` : ""}
                            </div>
                        </div>
                    `
                  })
                  .join("")}
            </div>
        `
  } catch (error) {
    console.error("Помилка завантаження результатів:", error)
    container.innerHTML = '<div class="empty-state"><p>Помилка завантаження результатів</p></div>'
  }
}
