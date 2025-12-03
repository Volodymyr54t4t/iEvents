// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

// Перевірка авторизації та ролі
const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

if (!userId) {
  window.location.href = "auth.html"
}

// Перевірка, що це учень
if (userRole !== "учень") {
  alert("Доступ заборонено. Ця сторінка тільки для учнів.")
  window.location.href = "index.html"
}

let currentUserData = null

// Завантаження всіх даних при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadPersonalInfo()
  loadCompetitions()
  loadResults()
  setupTabs()
  setupPasswordForm()
  setupPersonalForm()
})

// Завантаження персональної інформації
async function loadPersonalInfo() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`)
    const data = await response.json()

    if (response.ok && data.profile) {
      currentUserData = data.profile
      displayPersonalInfo(data.profile)
    } else {
      showError("personalInfo", "Помилка завантаження даних")
    }
  } catch (error) {
    console.error("Помилка завантаження профілю:", error)
    showError("personalInfo", "Помилка з'єднання")
  }
}

// Відображення персональної інформації
function displayPersonalInfo(profile) {
  const container = document.getElementById("personalInfo")
  
  const email = localStorage.getItem("userEmail") || "Не вказано"
  
  container.innerHTML = `
    <div class="info-item">
      <div class="info-label">Email</div>
      <div class="info-value">${email}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Прізвище</div>
      <div class="info-value ${!profile.last_name ? 'empty' : ''}">${profile.last_name || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Ім'я</div>
      <div class="info-value ${!profile.first_name ? 'empty' : ''}">${profile.first_name || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">По батькові</div>
      <div class="info-value ${!profile.middle_name ? 'empty' : ''}">${profile.middle_name || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Телефон</div>
      <div class="info-value ${!profile.phone ? 'empty' : ''}">${profile.phone || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Telegram</div>
      <div class="info-value ${!profile.telegram ? 'empty' : ''}">${profile.telegram || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Місто</div>
      <div class="info-value ${!profile.city ? 'empty' : ''}">${profile.city || "Не вказано"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Клас</div>
      <div class="info-value ${!profile.grade ? 'empty' : ''}">${profile.grade || "Не вказано"}</div>
    </div>
  `
}

// Перемикання режиму редагування
function toggleEditMode(section) {
  if (section === "personal") {
    const infoSection = document.getElementById("personalInfo")
    const formSection = document.getElementById("personalForm")
    const btn = document.getElementById("editPersonalBtn")

    if (formSection.style.display === "none") {
      // Показати форму
      infoSection.style.display = "none"
      formSection.style.display = "block"
      btn.textContent = "👁️ Переглянути"
      
      // Заповнити форму поточними даними
      document.getElementById("editFirstName").value = currentUserData.first_name || ""
      document.getElementById("editLastName").value = currentUserData.last_name || ""
      document.getElementById("editMiddleName").value = currentUserData.middle_name || ""
      document.getElementById("editPhone").value = currentUserData.phone || ""
      document.getElementById("editTelegram").value = currentUserData.telegram || ""
      document.getElementById("editCity").value = currentUserData.city || ""
    } else {
      // Показати інформацію
      infoSection.style.display = "grid"
      formSection.style.display = "none"
      btn.textContent = "✏️ Редагувати"
    }
  }
}

// Скасування редагування
function cancelEdit(section) {
  toggleEditMode(section)
}

// Налаштування форми персональних даних
function setupPersonalForm() {
  const form = document.getElementById("personalForm")
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    
    const formData = new FormData()
    formData.append("userId", userId)
    formData.append("firstName", document.getElementById("editFirstName").value.trim())
    formData.append("lastName", document.getElementById("editLastName").value.trim())
    formData.append("middleName", document.getElementById("editMiddleName").value.trim())
    formData.append("phone", document.getElementById("editPhone").value.trim())
    formData.append("telegram", document.getElementById("editTelegram").value.trim())
    formData.append("city", document.getElementById("editCity").value.trim())

    try {
      const response = await fetch(`${BASE_URL}/api/profile`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        await loadPersonalInfo()
        toggleEditMode("personal")
        showMessage("Дані успішно оновлено!", "success")
      } else {
        showMessage(data.error || "Помилка збереження даних", "error")
      }
    } catch (error) {
      console.error("Помилка збереження:", error)
      showMessage("Помилка з'єднання з сервером", "error")
    }
  })
}

// Налаштування форми зміни пароля
function setupPasswordForm() {
  const form = document.getElementById("passwordForm")
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    
    const currentPassword = document.getElementById("currentPassword").value
    const newPassword = document.getElementById("newPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value
    const messageDiv = document.getElementById("passwordMessage")

    // Валідація
    if (newPassword.length < 6) {
      showPasswordMessage("Новий пароль повинен містити мінімум 6 символів", "error")
      return
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage("Паролі не співпадають", "error")
      return
    }

    try {
      const response = await fetch(`${BASE_URL}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showPasswordMessage("Пароль успішно змінено!", "success")
        form.reset()
      } else {
        showPasswordMessage(data.error || "Помилка зміни пароля", "error")
      }
    } catch (error) {
      console.error("Помилка зміни пароля:", error)
      showPasswordMessage("Помилка з'єднання з сервером", "error")
    }
  })
}

// Показати повідомлення для пароля
function showPasswordMessage(text, type) {
  const messageDiv = document.getElementById("passwordMessage")
  messageDiv.textContent = text
  messageDiv.className = `message ${type}`
  messageDiv.style.display = "block"
  
  setTimeout(() => {
    messageDiv.style.display = "none"
  }, 5000)
}

// Завантаження конкурсів
async function loadCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const data = await response.json()

    if (response.ok) {
      const active = data.competitions.filter((c) => c.status === "активний")
      const upcoming = data.competitions.filter((c) => c.status === "майбутній")
      const completed = data.competitions.filter((c) => c.status === "неактивний")

      displayCompetitions("activeTab", active, "active")
      displayCompetitions("upcomingTab", upcoming, "upcoming")
      displayCompetitions("completedTab", completed, "completed")
    } else {
      console.error("Помилка завантаження конкурсів:", data.error)
      showError("activeTab", "Помилка завантаження конкурсів")
      showError("upcomingTab", "Помилка завантаження конкурсів")
      showError("completedTab", "Помилка завантаження конкурсів")
    }
  } catch (error) {
    console.error("Помилка:", error)
    showError("activeTab", "Помилка з'єднання")
    showError("upcomingTab", "Помилка з'єднання")
    showError("completedTab", "Помилка з'єднання")
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

  const gridHtml = `
    <div class="competitions-grid">
      ${competitions
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
              daysInfo = `<div class="days-remaining">⏰ Залишилось днів: ${daysLeft}</div>`
            }
          } else if (type === "upcoming") {
            statusText = "Майбутній"
            statusClass = "upcoming"
            const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
            if (daysUntil > 0) {
              daysInfo = `<div class="days-remaining">📅 Почнеться через ${daysUntil} днів</div>`
            }
          } else {
            statusText = "Завершено"
            statusClass = "completed"
          }

          return `
            <div class="competition-card ${statusClass}">
              <span class="status-badge ${statusClass}">${statusText}</span>
              <h3 class="competition-title">${competition.title}</h3>
              ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
              <div class="competition-dates">
                <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
                <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
              </div>
              ${daysInfo}
            </div>
          `
        })
        .join("")}
    </div>
  `
  
  container.innerHTML = gridHtml
}

// Завантаження результатів
async function loadResults() {
  const container = document.getElementById("resultsContainer")
  container.innerHTML = '<div class="loading">Завантаження результатів...</div>'

  try {
    // Отримати всі конкурси учня
    const competitionsResponse = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const competitionsData = await competitionsResponse.json()

    if (!competitionsResponse.ok || competitionsData.competitions.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>У вас поки немає результатів</h3></div>'
      return
    }

    // Отримати всі результати
    const allResultsResponse = await fetch(`${BASE_URL}/api/admin/all-results`)
    const allResultsData = await allResultsResponse.json()

    if (!allResultsResponse.ok || !allResultsData.results) {
      container.innerHTML = '<div class="empty-state"><h3>Помилка завантаження результатів</h3></div>'
      return
    }

    // Фільтрувати результати тільки для поточного учня
    const myResults = allResultsData.results.filter((r) => r.user_id === parseInt(userId))

    if (myResults.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>У вас поки немає результатів</h3></div>'
      return
    }

    // Сортування за датою (найновіші першими)
    myResults.sort((a, b) => new Date(b.added_at) - new Date(a.added_at))

    container.innerHTML = `
      <div class="results-grid">
        ${myResults
          .map((result) => {
            const date = new Date(result.added_at).toLocaleDateString("uk-UA")
            const placeEmoji = result.place == 1 ? "🥇" : result.place == 2 ? "🥈" : result.place == 3 ? "🥉" : "🏅"

            return `
              <div class="result-card">
                <div class="result-header">
                  <h3>${result.competition_title}</h3>
                  <span class="result-date">📅 ${date}</span>
                </div>
                <div class="result-body">
                  ${result.place ? `<div class="result-place">${placeEmoji} Місце: ${result.place}</div>` : ""}
                  ${result.score ? `<div class="result-score">📊 Бали: ${result.score}</div>` : ""}
                  <div class="result-achievement">🏆 ${result.achievement || "Участь"}</div>
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
    container.innerHTML = '<div class="empty-state"><h3>Помилка завантаження результатів</h3></div>'
  }
}

// Налаштування вкладок
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn")
  
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab
      
      // Видалити активний клас у всіх кнопок
      tabBtns.forEach((b) => b.classList.remove("active"))
      
      // Додати активний клас до натиснутої кнопки
      btn.classList.add("active")
      
      // Приховати всі вкладки
      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active")
      })
      
      // Показати обрану вкладку
      const tabId = `${tabName}Tab`
      document.getElementById(tabId).classList.add("active")
    })
  })
}

// Показати помилку
function showError(containerId, message) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
    <div class="empty-state">
      <h3>${message}</h3>
      <p>Спробуйте оновити сторінку</p>
    </div>
  `
}

// Показати повідомлення
function showMessage(text, type) {
  const message = document.createElement("div")
  message.className = `message ${type}`
  message.textContent = text
  message.style.position = "fixed"
  message.style.top = "20px"
  message.style.right = "20px"
  message.style.zIndex = "9999"
  message.style.minWidth = "300px"
  
  document.body.appendChild(message)
  
  setTimeout(() => {
    message.remove()
  }, 3000)
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(() => console.log("Service Worker зареєстровано"))
    .catch(err => console.log("SW error:", err));
}
