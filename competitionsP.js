// Перевірка авторизації
const userId = localStorage.getItem("userId")

if (!userId) {
    window.location.href = "auth.html"
}

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
    loadMyCompetitions()
})

// Завантаження конкурсів користувача
async function loadMyCompetitions() {
    try {
        const response = await fetch(`http://localhost:3000/api/competitions/my/${userId}`)
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