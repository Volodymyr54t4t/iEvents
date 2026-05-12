// Calendar state
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

const currentDate = new Date()
let currentMonth = currentDate.getMonth()
let currentYear = currentDate.getFullYear()
let competitions = []
let filteredCompetitions = []
let selectedDate = null

// DOM elements
const calendarGrid = document.getElementById("calendarGrid")
const currentMonthEl = document.getElementById("currentMonth")
const prevMonthBtn = document.getElementById("prevMonth")
const nextMonthBtn = document.getElementById("nextMonth")
const todayBtn = document.getElementById("todayBtn")
const eventsPanel = document.getElementById("eventsPanel")
const eventsList = document.getElementById("eventsList")
const selectedDateTitle = document.getElementById("selectedDateTitle")
const closePanel = document.getElementById("closePanel")
const filterSubject = document.getElementById("filterSubject")
const filterLevel = document.getElementById("filterLevel")
const filterStatus = document.getElementById("filterStatus")
const upcomingGrid = document.getElementById("upcomingGrid")

// Ukrainian month names
const monthNames = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
]

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadCompetitions()
  await loadSubjects()
  renderCalendar()
  renderUpcomingEvents()
  setupEventListeners()
})

// Load competitions from API filtered by user role
async function loadCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/competitions`)
    const data = await response.json()

    if (data.competitions) {
      let allCompetitions = data.competitions

      if (userRole === "учень" && userId) {
        // Student: only competitions they are a participant in
        const studentCompIds = await loadStudentCompetitionIds()
        allCompetitions = allCompetitions.filter(c => studentCompIds.has(c.id))
      } else if (userRole === "вчитель" && userId) {
        // Teacher: only competitions they are subscribed to
        const teacherSubIds = await loadTeacherSubscriptionIds()
        allCompetitions = allCompetitions.filter(c => teacherSubIds.has(c.id))
      }
      // Methodist: sees all competitions, no filter needed

      competitions = allCompetitions
      filteredCompetitions = [...competitions]
    }
  } catch (error) {
    console.error("Error loading competitions:", error)
    competitions = []
    filteredCompetitions = []
  }
}

// Load competition IDs the student is a participant in
async function loadStudentCompetitionIds() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions/user/${userId}`)
    const data = await response.json()
    if (response.ok && data.competitions) {
      return new Set(data.competitions.map(c => c.id))
    }
  } catch (error) {
    console.error("Error loading student competitions:", error)
  }
  return new Set()
}

// Load competition IDs the teacher is subscribed to
async function loadTeacherSubscriptionIds() {
  try {
    const response = await fetch(`${BASE_URL}/api/teacher/${userId}/competition-subscriptions`)
    const data = await response.json()
    if (response.ok && data.subscriptions) {
      return new Set(data.subscriptions.map(s => s.competition_id))
    }
  } catch (error) {
    console.error("Error loading teacher subscriptions:", error)
  }
  return new Set()
}

// Load subjects for filter
async function loadSubjects() {
  try {
    const response = await fetch("/api/subjects")
    const data = await response.json()

    if (data.subjects) {
      filterSubject.innerHTML = '<option value="">Всі предмети</option>'
      data.subjects.forEach((subject) => {
        filterSubject.innerHTML += `<option value="${subject.id}">${subject.name}</option>`
      })
    }
  } catch (error) {
    console.error("Error loading subjects:", error)
  }
}

// Setup event listeners
function setupEventListeners() {
  prevMonthBtn.addEventListener("click", () => {
    currentMonth--
    if (currentMonth < 0) {
      currentMonth = 11
      currentYear--
    }
    renderCalendar()
  })

  nextMonthBtn.addEventListener("click", () => {
    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
    renderCalendar()
  })

  todayBtn.addEventListener("click", () => {
    const today = new Date()
    currentMonth = today.getMonth()
    currentYear = today.getFullYear()
    renderCalendar()
  })

  closePanel.addEventListener("click", () => {
    eventsPanel.classList.remove("active")
    if (selectedDate) {
      const prevSelected = document.querySelector(".calendar-day.selected")
      if (prevSelected) prevSelected.classList.remove("selected")
      selectedDate = null
    }
  })

  // Filters
  filterSubject.addEventListener("change", applyFilters)
  filterLevel.addEventListener("change", applyFilters)
  filterStatus.addEventListener("change", applyFilters)

  // Close panel on outside click
  document.addEventListener("click", (e) => {
    if (
      !eventsPanel.contains(e.target) &&
      !e.target.closest(".calendar-day") &&
      eventsPanel.classList.contains("active")
    ) {
      eventsPanel.classList.remove("active")
    }
  })
}

// Apply filters
function applyFilters() {
  const subjectId = filterSubject.value
  const level = filterLevel.value
  const status = filterStatus.value

  filteredCompetitions = competitions.filter((comp) => {
    // Subject filter
    if (subjectId && comp.subject_id != subjectId) return false

    // Level filter
    if (level && comp.level !== level) return false

    // Status filter
    if (status) {
      const compStatus = getCompetitionStatus(comp)
      if (status !== compStatus) return false
    }

    return true
  })

  renderCalendar()
  renderUpcomingEvents()
}

// Get competition status
function getCompetitionStatus(competition) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(competition.start_date)
  const endDate = new Date(competition.end_date)

  if (competition.manual_status) {
    return competition.manual_status
  }

  if (today < startDate) return "upcoming"
  if (today > endDate) return "completed"
  return "active"
}

// Render calendar
function renderCalendar() {
  currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startDay = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = lastDay.getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let html = ""
  let dayCount = 1
  let nextMonthDay = 1

  // Calculate total cells needed (6 weeks max)
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7

  for (let i = 0; i < totalCells; i++) {
    let day,
      month,
      year,
      isOtherMonth = false

    if (i < startDay) {
      // Previous month days
      day = daysInPrevMonth - startDay + i + 1
      month = currentMonth - 1
      year = currentYear
      if (month < 0) {
        month = 11
        year--
      }
      isOtherMonth = true
    } else if (dayCount > daysInMonth) {
      // Next month days
      day = nextMonthDay++
      month = currentMonth + 1
      year = currentYear
      if (month > 11) {
        month = 0
        year++
      }
      isOtherMonth = true
    } else {
      // Current month days
      day = dayCount++
      month = currentMonth
      year = currentYear
    }

    const dateObj = new Date(year, month, day)
    const dateStr = formatDateISO(dateObj)
    const isToday = dateObj.getTime() === today.getTime()
    const isWeekend = i % 7 >= 5
    const events = getEventsForDate(dateObj)
    const hasEvents = events.length > 0

    const classes = ["calendar-day"]
    if (isOtherMonth) classes.push("other-month")
    if (isToday) classes.push("today")
    if (isWeekend) classes.push("weekend")
    if (hasEvents) classes.push("has-events")

    html += `
            <div class="${classes.join(" ")}" data-date="${dateStr}">
                <div class="day-number">${day}</div>
                <div class="day-events">
                    ${renderDayEvents(events)}
                </div>
            </div>
        `
  }

  calendarGrid.innerHTML = html

  // Add click handlers
  document.querySelectorAll(".calendar-day").forEach((dayEl) => {
    dayEl.addEventListener("click", () => handleDayClick(dayEl))
  })
}

// Format date to ISO string (YYYY-MM-DD)
function formatDateISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Get events for a specific date
function getEventsForDate(date) {
  const dateStr = formatDateISO(date)
  const events = []

  filteredCompetitions.forEach((comp) => {
    const startDate = comp.start_date?.split("T")[0]
    const endDate = comp.end_date?.split("T")[0]
    const deadline = comp.registration_deadline?.split("T")[0]

    // Start date
    if (startDate === dateStr) {
      events.push({
        ...comp,
        eventType: "start",
        eventLabel: "Початок",
      })
    }

    // End date
    if (endDate === dateStr && endDate !== startDate) {
      events.push({
        ...comp,
        eventType: "end",
        eventLabel: "Закінчення",
      })
    }

    // Registration deadline
    if (deadline === dateStr && deadline !== startDate && deadline !== endDate) {
      events.push({
        ...comp,
        eventType: "deadline",
        eventLabel: "Дедлайн реєстрації",
      })
    }

    // Active period (between start and end, not on start/end/deadline days)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (date > start && date < end && dateStr !== deadline) {
        // Only show one active event per competition per day
        if (!events.find((e) => e.id === comp.id)) {
          events.push({
            ...comp,
            eventType: "active",
            eventLabel: "Активний",
          })
        }
      }
    }
  })

  return events
}

// Render events for a day cell
function renderDayEvents(events) {
  if (events.length === 0) return ""

  const maxVisible = 3
  let html = ""

  events.slice(0, maxVisible).forEach((event) => {
    html += `
            <div class="day-event event-${event.eventType}" title="${event.title} - ${event.eventLabel}">
                ${event.title}
            </div>
        `
  })

  if (events.length > maxVisible) {
    html += `<div class="more-events">+${events.length - maxVisible} ще</div>`
  }

  return html
}

// Handle day click
function handleDayClick(dayEl) {
  const dateStr = dayEl.dataset.date
  const date = new Date(dateStr)

  // Remove previous selection
  const prevSelected = document.querySelector(".calendar-day.selected")
  if (prevSelected) prevSelected.classList.remove("selected")

  // Add selection to clicked day
  dayEl.classList.add("selected")
  selectedDate = date

  // Show events panel
  showEventsPanel(date)
}

// Show events panel
function showEventsPanel(date) {
  const events = getEventsForDate(date)
  const formattedDate = formatDateUkrainian(date)

  selectedDateTitle.textContent = formattedDate

  if (events.length === 0) {
    eventsList.innerHTML = '<p class="no-events">Немає подій на цю дату</p>'
  } else {
    eventsList.innerHTML = events
      .map(
        (event) => `
            <div class="event-card" onclick="goToCompetition(${event.id})">
                <div class="event-card-header">
                    <div class="event-card-title">${event.title}</div>
                    <span class="event-card-type type-${event.eventType}">${event.eventLabel}</span>
                </div>
                <div class="event-card-info">
                    <span>${formatDateUkrainian(new Date(event.start_date))} - ${formatDateUkrainian(new Date(event.end_date))}</span>
                    ${event.location ? `<span>${event.location}</span>` : ""}
                    ${event.organizer ? `<span>${event.organizer}</span>` : ""}
                </div>
                <div class="event-card-badges">
                    ${event.level ? `<span class="event-badge">${event.level}</span>` : ""}
                    ${event.is_online ? '<span class="event-badge">Онлайн</span>' : ""}
                </div>
            </div>
        `,
      )
      .join("")
  }

  eventsPanel.classList.add("active")
}

// Format date in Ukrainian
function formatDateUkrainian(date) {
  const day = date.getDate()
  const month = monthNames[date.getMonth()].toLowerCase()
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Go to competition page
function goToCompetition(competitionId) {
  const userRole = localStorage.getItem("userRole")
  if (userRole === "вчитель" || userRole === "методист") {
    window.location.href = `competitionsT.html?id=${competitionId}`
  } else {
    window.location.href = `competitionsP.html?id=${competitionId}`
  }
}

// Render upcoming events
function renderUpcomingEvents() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get upcoming and active competitions
  const upcoming = filteredCompetitions
    .filter((comp) => {
      const startDate = new Date(comp.start_date)
      const endDate = new Date(comp.end_date)
      return endDate >= today
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 6)

  if (upcoming.length === 0) {
    upcomingGrid.innerHTML =
      '<p class="no-events" style="grid-column: 1/-1; text-align: center;">Немає найближчих конкурсів</p>'
    return
  }

  upcomingGrid.innerHTML = upcoming
    .map((comp) => {
      const startDate = new Date(comp.start_date)
      const endDate = new Date(comp.end_date)
      const status = getCompetitionStatus(comp)

      // Calculate days left
      let daysLeft, daysLeftClass, daysLeftText
      if (status === "active") {
        const daysToEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
        daysLeft = daysToEnd
        daysLeftText = `${daysToEnd} дн. до кінця`
        daysLeftClass = daysLeft <= 3 ? "urgent" : daysLeft <= 7 ? "soon" : "normal"
      } else {
        const daysToStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
        daysLeft = daysToStart
        daysLeftText = daysToStart === 0 ? "Сьогодні!" : `${daysToStart} дн. до початку`
        daysLeftClass = daysLeft <= 3 ? "urgent" : daysLeft <= 7 ? "soon" : "normal"
      }

      return `
            <div class="upcoming-card" onclick="goToCompetition(${comp.id})">
                <div class="upcoming-card-header">
                    <div class="upcoming-card-title">${comp.title}</div>
                    <span class="days-left ${daysLeftClass}">${daysLeftText}</span>
                </div>
                <div class="upcoming-card-dates">
                    <div class="date-row">
                        <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="#2d5f3f" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Початок: <strong>${formatDateUkrainian(startDate)}</strong></span>
                    </div>
                    <div class="date-row">
                        <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="#c41e3a" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Закінчення: <strong>${formatDateUkrainian(endDate)}</strong></span>
                    </div>
                    ${comp.registration_deadline
          ? `
                    <div class="date-row">
                        <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="#d4a574" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="6" x2="12" y2="12"/>
                            <line x1="12" y1="12" x2="16" y2="14"/>
                        </svg>
                        <span>Дедлайн: <strong>${formatDateUkrainian(new Date(comp.registration_deadline))}</strong></span>
                    </div>
                    `
          : ""
        }
                </div>
                <div class="upcoming-card-badges">
                    <span class="status-badge status-${status}">${status === "active" ? "Активний" : "Очікується"}</span>
                    ${comp.level ? `<span class="level-badge">${comp.level}</span>` : ""}
                    ${comp.is_online ? '<span class="level-badge">Онлайн</span>' : ""}
                </div>
            </div>
        `
    })
    .join("")
}
