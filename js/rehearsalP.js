let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("Pidklyuchennia do:", BASE_URL)

window.API_URL = BASE_URL

let currentUserId = null
let allRehearsals = []
let allCompetitions = []

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserData()
  await loadCompetitions()
  await loadRehearsals()
  setupFilters()
})

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

    // Перевіряємо що роль саме "учень"
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

      const filterCompetition = document.getElementById("filterCompetition")
      if (filterCompetition) {
        allCompetitions.forEach((comp) => {
          const option = document.createElement("option")
          option.value = comp.id
          option.textContent = comp.title
          filterCompetition.appendChild(option)
        })
      }
    }
  } catch (error) {
    console.error("Помилка завантаження конкурсів:", error)
  }
}

async function loadRehearsals() {
  try {
    // Використовуємо endpoint для учня
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

function displayRehearsals(rehearsals) {
  const container = document.getElementById("rehearsalsList")

  if (rehearsals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Репетицій поки немає</h3>
        <p>Вас ще не додано до жодної репетиції</p>
      </div>
    `
    return
  }

  container.innerHTML = rehearsals
    .map((rehearsal) => {
      const date = new Date(rehearsal.rehearsal_date)
      const isToday = isDateToday(date)
      const isPast = date < new Date()

      const typeLabel = rehearsal.student_name ? "Особиста" : "Групова"
      const typeClass = rehearsal.student_name ? "type-personal" : "type-group"

      const formatLabel = rehearsal.is_online ? "Онлайн" : "Офлайн"
      const formatClass = rehearsal.is_online ? "format-online" : "format-offline"

      const dateClass = isToday ? "date-today" : "date-upcoming"
      const dateLabel = isToday ? "Сьогодні" : formatDate(date)

      return `
        <div class="rehearsal-item" style="${isPast ? "opacity: 0.6;" : ""}">
          <div class="rehearsal-header">
            <div class="rehearsal-title">${rehearsal.title}</div>
            <div class="rehearsal-competition">Конкурс: ${rehearsal.competition_title}</div>
          </div>

          <div class="rehearsal-badges">
            <span class="type-badge ${typeClass}">${typeLabel}</span>
            <span class="format-badge ${formatClass}">${formatLabel}</span>
            <span class="date-badge ${dateClass}">${dateLabel}</span>
          </div>

          <div class="rehearsal-details">
            <div class="detail-item">
              <strong>Дата:</strong> ${formatDateTime(date)}
            </div>
            ${
              rehearsal.duration
                ? `
              <div class="detail-item">
                <strong>Тривалість:</strong> ${rehearsal.duration} хв
              </div>
            `
                : ""
            }
            ${
              rehearsal.location
                ? `
              <div class="detail-item">
                <strong>Місце:</strong> ${rehearsal.location}
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
            rehearsal.teacher_name
              ? `
            <div class="rehearsal-teacher">
              <strong>Вчитель:</strong> ${rehearsal.teacher_name}
            </div>
          `
              : ""
          }

          ${
            rehearsal.notes
              ? `
            <div class="rehearsal-details">
              <div class="detail-item">
                <strong>Нотатки:</strong> ${rehearsal.notes}
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

function setupFilters() {
  const searchInput = document.getElementById("searchRehearsals")
  const filterCompetition = document.getElementById("filterCompetition")
  const filterType = document.getElementById("filterType")
  const filterDate = document.getElementById("filterDate")
  const sortBy = document.getElementById("sortBy")

  if (searchInput) searchInput.addEventListener("input", applyFilters)
  if (filterCompetition) filterCompetition.addEventListener("change", applyFilters)
  if (filterType) filterType.addEventListener("change", applyFilters)
  if (filterDate) filterDate.addEventListener("change", applyFilters)
  if (sortBy) sortBy.addEventListener("change", applyFilters)
}

function applyFilters() {
  const searchInput = document.getElementById("searchRehearsals")
  const filterCompetition = document.getElementById("filterCompetition")
  const filterType = document.getElementById("filterType")
  const filterDate = document.getElementById("filterDate")
  const sortByEl = document.getElementById("sortBy")

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : ""
  const competitionFilter = filterCompetition ? filterCompetition.value : ""
  const typeFilter = filterType ? filterType.value : ""
  const dateFilter = filterDate ? filterDate.value : ""
  const sortBy = sortByEl ? sortByEl.value : "date_asc"

  let filtered = [...allRehearsals]

  if (searchTerm) {
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(searchTerm) ||
        r.competition_title.toLowerCase().includes(searchTerm) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(searchTerm)),
    )
  }

  if (competitionFilter) {
    filtered = filtered.filter((r) => r.competition_id == competitionFilter)
  }

  if (typeFilter === "personal") {
    filtered = filtered.filter((r) => r.student_id !== null)
  } else if (typeFilter === "group") {
    filtered = filtered.filter((r) => r.student_id === null)
  }

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

  filtered.sort((a, b) => {
    switch (sortBy) {
      case "date_asc":
        return new Date(a.rehearsal_date) - new Date(b.rehearsal_date)
      case "date_desc":
        return new Date(b.rehearsal_date) - new Date(a.rehearsal_date)
      case "title_asc":
        return a.title.localeCompare(b.title)
      case "title_desc":
        return b.title.localeCompare(a.title)
      default:
        return 0
    }
  })

  displayRehearsals(filtered)
}

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