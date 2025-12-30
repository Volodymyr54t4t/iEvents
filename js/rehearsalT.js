let currentUserId = null
let allRehearsals = []
let allCompetitions = []

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.AppConfig || !window.AppConfig.API_URL) {
    console.error("AppConfig не завантажився")
    alert("Помилка завантаження конфігурації. Спробуйте оновити сторінку.")
    return
  }

  try {
    await Promise.all([loadUserData(), loadCompetitions()])

    await loadRehearsals()
    setupFilters()
  } catch (error) {
    console.error("Помилка ініціалізації:", error)
    alert("Помилка завантаження сторінки. Спробуйте оновити.")
  }
})

async function loadUserData() {
  currentUserId = localStorage.getItem("userId")

  if (!currentUserId) {
    alert("Помилка: ви не авторизовані")
    window.location.href = "auth.html"
    return
  }

  try {
    const response = await fetch(`${window.AppConfig.API_URL}/api/user/role/${currentUserId}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!["вчитель", "методист"].includes(data.role)) {
      alert("Доступ заборонено. Ця сторінка тільки для вчителів та методистів.")
      window.location.href = "index.html"
    }
  } catch (error) {
    console.error("Помилка завантаження даних користувача:", error)
    alert("Помилка завантаження даних користувача")
    window.location.href = "index.html"
  }
}

async function loadCompetitions() {
  try {
    const response = await fetch(`${window.AppConfig.API_URL}/api/competitions`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    allCompetitions = data.competitions || []

    const filterCompetition = document.getElementById("filterCompetition")
    const competitionSelect = document.getElementById("competition")

    allCompetitions.forEach((comp) => {
      const option1 = document.createElement("option")
      option1.value = comp.id
      option1.textContent = comp.title
      filterCompetition.appendChild(option1)

      const option2 = document.createElement("option")
      option2.value = comp.id
      option2.textContent = comp.title
      competitionSelect.appendChild(option2)
    })
  } catch (error) {
    console.error("Помилка завантаження конкурсів:", error)
  }
}

async function loadRehearsals() {
  try {
    const response = await fetch(`${window.AppConfig.API_URL}/api/rehearsals/teacher/${currentUserId}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    allRehearsals = data.rehearsals || []
    displayRehearsals(allRehearsals)
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
        <p>Створіть першу репетицію для своїх учнів</p>
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

      const isOwner = rehearsal.teacher_id === Number.parseInt(currentUserId)

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
            ${!isOwner ? '<span class="owner-badge">Створено іншим вчителем</span>' : ""}
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
            rehearsal.student_name
              ? `
            <div class="rehearsal-student">
              <strong>👤 Учень:</strong> ${rehearsal.student_name}
            </div>
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

          <div class="rehearsal-actions">
            ${
              isOwner
                ? `
              <button class="btn btn-secondary" onclick="editRehearsal(${rehearsal.id})">
                Редагувати
              </button>
              <button class="btn btn-danger" onclick="deleteRehearsal(${rehearsal.id})">
                Видалити
              </button>
            `
                : `
              <button class="btn btn-secondary" onclick="viewAllRehearsals()">
                Всі репетиції
              </button>
              <p class="info-text">Ви можете тільки переглядати цю репетицію</p>
            `
            }
          </div>
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

  searchInput.addEventListener("input", applyFilters)
  filterCompetition.addEventListener("change", applyFilters)
  filterType.addEventListener("change", applyFilters)
  filterDate.addEventListener("change", applyFilters)
  sortBy.addEventListener("change", applyFilters)
}

function applyFilters() {
  const searchTerm = document.getElementById("searchRehearsals").value.toLowerCase()
  const competitionFilter = document.getElementById("filterCompetition").value
  const typeFilter = document.getElementById("filterType").value
  const dateFilter = document.getElementById("filterDate").value
  const sortBy = document.getElementById("sortBy").value

  let filtered = [...allRehearsals]

  if (searchTerm) {
    filtered = filtered.filter(
      (r) =>
      r.title.toLowerCase().includes(searchTerm) ||
      r.competition_title.toLowerCase().includes(searchTerm) ||
      (r.student_name && r.student_name.toLowerCase().includes(searchTerm)),
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

function openCreateRehearsalModal() {
  document.getElementById("createRehearsalModal").classList.add("active")
  document.getElementById("modalTitle").textContent = "Створити репетицію"
  document.getElementById("createRehearsalForm").reset()
  document.getElementById("editRehearsalId").value = ""
  document.getElementById("studentSelectGroup").style.display = "none"
}

function closeCreateRehearsalModal() {
  document.getElementById("createRehearsalModal").classList.remove("active")
}

async function loadCompetitionParticipants() {
  const competitionId = document.getElementById("competition").value
  const studentSelect = document.getElementById("student")

  if (!competitionId) {
    studentSelect.innerHTML = '<option value="">Спочатку оберіть конкурс</option>'
    return
  }

  try {
    const response = await fetch(`${window.AppConfig.API_URL}/api/competitions/${competitionId}/participants`)
    const data = await response.json()

    if (response.ok) {
      const participants = data.participants || []
      studentSelect.innerHTML = '<option value="">Оберіть учня</option>'

      participants.forEach((participant) => {
        const option = document.createElement("option")
        option.value = participant.id
        option.textContent = `${participant.first_name || ""} ${participant.last_name || ""} ${participant.email ? "(" + participant.email + ")" : ""}`
        studentSelect.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Помилка завантаження учасників:", error)
    studentSelect.innerHTML = '<option value="">Помилка завантаження учасників</option>'
  }
}

function toggleStudentSelect() {
  const isPersonal = document.getElementById("isPersonal").checked
  const studentSelectGroup = document.getElementById("studentSelectGroup")

  if (isPersonal) {
    studentSelectGroup.style.display = "block"
    document.getElementById("student").required = true
  } else {
    studentSelectGroup.style.display = "none"
    document.getElementById("student").required = false
    document.getElementById("student").value = ""
  }
}

async function saveRehearsal() {
  const form = document.getElementById("createRehearsalForm")

  if (!form.checkValidity()) {
    form.reportValidity()
    return
  }

  const rehearsalId = document.getElementById("editRehearsalId").value
  const competitionId = document.getElementById("competition").value
  const title = document.getElementById("title").value
  const description = document.getElementById("description").value
  const rehearsalDate = document.getElementById("rehearsalDate").value
  const duration = document.getElementById("duration").value
  const location = document.getElementById("location").value
  const isOnline = document.getElementById("isOnline").value === "true"
  const isPersonal = document.getElementById("isPersonal").checked
  const studentId = isPersonal ? document.getElementById("student").value : null
  const notes = document.getElementById("notes").value

  if (isPersonal && !studentId) {
    alert("Оберіть учня для особистої репетиції")
    return
  }

  const rehearsalData = {
    competitionId,
    teacherId: currentUserId,
    studentId,
    title,
    description,
    rehearsalDate,
    duration: duration ? Number.parseInt(duration) : null,
    location,
    isOnline,
    notes,
  }

  try {
    const url = rehearsalId ?
      `${window.AppConfig.API_URL}/api/rehearsals/${rehearsalId}` :
      `${window.AppConfig.API_URL}/api/rehearsals`
    const method = rehearsalId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rehearsalData),
    })

    const data = await response.json()

    if (response.ok) {
      alert(rehearsalId ? "Репетицію оновлено!" : "Репетицію створено!")
      closeCreateRehearsalModal()
      await loadRehearsals()
    } else {
      throw new Error(data.error || "Помилка збереження репетиції")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка: " + error.message)
  }
}

async function deleteRehearsal(rehearsalId) {
  const rehearsal = allRehearsals.find((r) => r.id === rehearsalId)
  if (!rehearsal) {
    alert("Репетицію не знайдено")
    return
  }

  if (rehearsal.teacher_id !== Number.parseInt(currentUserId)) {
    alert("Ви не можете видаляти репетиції інших вчителів")
    return
  }

  if (!confirm("Ви впевнені, що хочете видалити цю репетицію?")) return

  try {
    const response = await fetch(`${window.AppConfig.API_URL}/api/rehearsals/${rehearsalId}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (response.ok) {
      alert("Репетицію видалено!")
      await loadRehearsals()
    } else {
      throw new Error(data.error || "Помилка видалення")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка видалення: " + error.message)
  }
}

async function editRehearsal(rehearsalId) {
  const rehearsal = allRehearsals.find((r) => r.id === rehearsalId)
  if (!rehearsal) return

  if (rehearsal.teacher_id !== Number.parseInt(currentUserId)) {
    alert("Ви не можете редагувати репетиції інших вчителів")
    return
  }

  openCreateRehearsalModal()
  document.getElementById("modalTitle").textContent = "Редагувати репетицію"
  document.getElementById("editRehearsalId").value = rehearsal.id
  document.getElementById("competition").value = rehearsal.competition_id
  document.getElementById("title").value = rehearsal.title
  document.getElementById("description").value = rehearsal.description || ""
  document.getElementById("rehearsalDate").value = formatDateTimeForInput(new Date(rehearsal.rehearsal_date))
  document.getElementById("duration").value = rehearsal.duration || ""
  document.getElementById("location").value = rehearsal.location || ""
  document.getElementById("isOnline").value = rehearsal.is_online ? "true" : "false"
  document.getElementById("notes").value = rehearsal.notes || ""

  if (rehearsal.student_id) {
    document.getElementById("isPersonal").checked = true
    await loadCompetitionParticipants()
    document.getElementById("student").value = rehearsal.student_id
    toggleStudentSelect()
  }
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

function formatDateTimeForInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
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

function viewAllRehearsals() {
  window.location.href = "rehearsals.html"
} // Centralized API configuration
// This file must be loaded BEFORE any other JS files in HTML

window.AppConfig = (() => {
  // Determine the correct API URL based on environment
  const getApiUrl = () => {
    const hostname = window.location.hostname
    const protocol = window.location.protocol

    // Check if we're on localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000"
    }

    // Production environment - use the production URL
    return "https://ievents-qf5k.onrender.com"
  }

  const API_URL = getApiUrl()

  console.log("[Config] Ініціалізація AppConfig...")
  console.log("[Config] API URL:", API_URL)

  // Public API
  return {
    API_URL: API_URL,
    getApiUrl: () => API_URL,

    // Helper method for making authenticated requests
    async fetch(endpoint, options = {}) {
      const token = localStorage.getItem("token")
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`

      return fetch(url, {
        ...options,
        headers,
      })
    },
  }
})()

// Make API_URL available globally for backward compatibility
window.API_URL = window.AppConfig.API_URL

window.dispatchEvent(new Event("configReady"))

console.log("[Config] AppConfig готовий до використання")