let currentUserId = null
let allRehearsals = []
let allCompetitions = []

// Ініціалізація сторінки
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserData()
  await loadCompetitions()
  await loadRehearsals()
  setupFilters()
  loadHeaderAndFooter()
})

// Завантаження header та footer
function loadHeaderAndFooter() {
  try {
    // Припускаємо, що функції в components.js називаються саме так:
    if (typeof renderHeader === 'function' && typeof renderFooter === 'function') {
      renderHeader("header"); // Передаємо ID контейнера
      renderFooter("footer"); // Передаємо ID контейнера
    } else {
      console.error("Функції рендерингу не знайдені в components.js");
    }
  } catch (error) {
    console.error("Помилка завантаження компонентів:", error);
  }
}

async function loadUserData() {
  currentUserId = localStorage.getItem("userId")

  if (!currentUserId) {
    alert("Помилка: ви не авторизовані")
    window.location.href = "auth.html"
    return
  }

  try {
    const response = await fetch(`${window.API_URL}/api/user/role/${currentUserId}`)
    const data = await response.json()

    if (!response.ok || data.role !== "учень") {
      alert("Доступ заборонено. Ця сторінка тільки для учнів.")
      window.location.href = "index.html"
    }
  } catch (error) {
    console.error("Помилка завантаження даних користувача:", error)
    alert("Помилка завантаження даних користувача")
  }
}

async function loadCompetitions() {
  try {
    const response = await fetch(`${window.API_URL}/api/competitions`)
    const data = await response.json()

    if (response.ok) {
      allCompetitions = data.competitions || []

      // Завантажити конкурси в фільтр
      const filterCompetition = document.getElementById("filterCompetition")

      allCompetitions.forEach((comp) => {
        const option = document.createElement("option")
        option.value = comp.id
        option.textContent = comp.title
        filterCompetition.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Помилка завантаження конкурсів:", error)
  }
}

async function loadRehearsals() {
  try {
    const response = await fetch(`${window.API_URL}/api/rehearsals/student/${currentUserId}`)
    const data = await response.json()

    if (response.ok) {
      allRehearsals = data.rehearsals || []
      displayRehearsals(allRehearsals)
    } else {
      throw new Error(data.error || "Помилка завантаження репетицій")
    }
  } catch (error) {
    console.error("Помилка завантаження репетицій:", error)
    document.getElementById("rehearsalsList").innerHTML = `
      <div class="empty-state">
        <h3>Помилка завантаження</h3>
        <p>${error.message}</p>
      </div>
    `
  }
}

// Відображення репетицій
function displayRehearsals(rehearsals) {
  const container = document.getElementById("rehearsalsList")

  if (rehearsals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Репетицій поки немає</h3>
        <p>Репетиції з'являться тут, коли вчитель їх створить</p>
      </div>
    `
    return
  }

  container.innerHTML = rehearsals
    .map((rehearsal) => {
      const date = new Date(rehearsal.rehearsal_date)
      const isToday = isDateToday(date)
      const isPast = date < new Date()

      const typeLabel = rehearsal.is_personal ? "Особиста" : "Групова"
      const typeClass = rehearsal.is_personal ? "type-personal" : "type-group"

      const formatLabel = rehearsal.is_online ? "Онлайн" : "Офлайн"
      const formatClass = rehearsal.is_online ? "format-online" : "format-offline"

      let dateClass, dateLabel
      if (isPast) {
        dateClass = "date-past"
        dateLabel = "Завершено"
      } else if (isToday) {
        dateClass = "date-today"
        dateLabel = "Сьогодні"
      } else {
        dateClass = "date-upcoming"
        dateLabel = formatDate(date)
      }

      return `
        <div class="rehearsal-item" style="${isPast ? "opacity: 0.7;" : ""}">
          ${
            isToday && !isPast
              ? `
            <div class="rehearsal-alert">
              <strong>⚠️ Сьогодні репетиція!</strong>
            </div>
          `
              : ""
          }

          <div class="rehearsal-header">
            <div class="rehearsal-title">${rehearsal.title}</div>
            <div class="rehearsal-competition">Конкурс: ${rehearsal.competition_title}</div>
            <div class="rehearsal-teacher">Вчитель: ${rehearsal.teacher_name}</div>
          </div>

          <div class="rehearsal-badges">
            <span class="type-badge ${typeClass}">${typeLabel}</span>
            <span class="format-badge ${formatClass}">${formatLabel}</span>
            <span class="date-badge ${dateClass}">${dateLabel}</span>
          </div>

          <div class="rehearsal-details">
            <div class="detail-item">
              <strong>📅 Дата:</strong> ${formatDateTime(date)}
            </div>
            ${
              rehearsal.duration
                ? `
              <div class="detail-item">
                <strong>⏱️ Тривалість:</strong> ${rehearsal.duration} хв
              </div>
            `
                : ""
            }
            ${
              rehearsal.location
                ? `
              <div class="detail-item">
                <strong>📍 Місце:</strong> ${rehearsal.location}
              </div>
            `
                : ""
            }
          </div>

          ${
            rehearsal.description
              ? `
            <div class="rehearsal-description">${rehearsal.description}</div>
          `
              : ""
          }

          ${
            rehearsal.notes
              ? `
            <div class="rehearsal-details">
              <div class="detail-item">
                <strong>📝 Нотатки:</strong> ${rehearsal.notes}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `
    })
    .join("")
}

// Фільтрація репетицій
function setupFilters() {
  const searchInput = document.getElementById("searchRehearsals")
  const filterCompetition = document.getElementById("filterCompetition")
  const filterType = document.getElementById("filterType")
  const filterDate = document.getElementById("filterDate")

  searchInput.addEventListener("input", applyFilters)
  filterCompetition.addEventListener("change", applyFilters)
  filterType.addEventListener("change", applyFilters)
  filterDate.addEventListener("change", applyFilters)
}

function applyFilters() {
  const searchTerm = document.getElementById("searchRehearsals").value.toLowerCase()
  const competitionFilter = document.getElementById("filterCompetition").value
  const typeFilter = document.getElementById("filterType").value
  const dateFilter = document.getElementById("filterDate").value

  let filtered = [...allRehearsals]

  // Пошук
  if (searchTerm) {
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(searchTerm) ||
        r.competition_title.toLowerCase().includes(searchTerm) ||
        r.teacher_name.toLowerCase().includes(searchTerm),
    )
  }

  // Фільтр по конкурсу
  if (competitionFilter) {
    filtered = filtered.filter((r) => r.competition_id == competitionFilter)
  }

  // Фільтр по типу
  if (typeFilter === "personal") {
    filtered = filtered.filter((r) => r.is_personal)
  } else if (typeFilter === "group") {
    filtered = filtered.filter((r) => !r.is_personal)
  }

  // Фільтр по даті
  if (dateFilter) {
    filtered = filtered.filter((r) => {
      const date = new Date(r.rehearsal_date)
      switch (dateFilter) {
        case "today":
          return isDateToday(date)
        case "tomorrow":
          return isDateTomorrow(date)
        case "week":
          return isDateThisWeek(date)
        case "month":
          return isDateThisMonth(date)
        default:
          return true
      }
    })
  }

  // Сортування за датою (найближчі спочатку)
  filtered.sort((a, b) => new Date(a.rehearsal_date) - new Date(b.rehearsal_date))

  displayRehearsals(filtered)
}

// Утилітні функції
function formatDate(date) {
  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDateTime(date) {
  return date.toLocaleString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isDateToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isDateTomorrow(date) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  )
}

function isDateThisWeek(date) {
  const today = new Date()
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  return date >= today && date <= weekFromNow
}

function isDateThisMonth(date) {
  const today = new Date()
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
}
