// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

let currentCompetitionId = null
let allStudents = []
let allCompetitions = []
let allSubjects = []
const currentResultsCompetitionId = null

let dynamicFieldCount = 0

// Перевірка авторизації
const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

if (!userId) {
  window.location.href = "auth.html"
}

if (userRole !== "вчитель" && userRole !== "методист") {
  alert("У вас немає доступу до цієї сторінки")
  window.location.href = "index.html"
}

document.addEventListener("DOMContentLoaded", () => {
  loadSubjects()
  loadCompetitions()
  loadStudents()

  // Додаємо обробники для фільтрів
  document.getElementById("searchCompetitions").addEventListener("input", filterAndSortCompetitions)
  document.getElementById("filterSubject").addEventListener("change", filterAndSortCompetitions)
  document.getElementById("filterLevel").addEventListener("change", filterAndSortCompetitions)
  document.getElementById("filterStatus").addEventListener("change", filterAndSortCompetitions)
  document.getElementById("filterOwnership").addEventListener("change", filterAndSortCompetitions)
  document.getElementById("sortBy").addEventListener("change", filterAndSortCompetitions)
})

async function loadSubjects() {
  try {
    const response = await fetch(`${BASE_URL}/api/subjects`)
    const data = await response.json()

    if (response.ok) {
      allSubjects = data.subjects
      const subjectSelect = document.getElementById("subject")
      const filterSubjectSelect = document.getElementById("filterSubject")

      allSubjects.forEach((subject) => {
        const option = new Option(subject.name, subject.id)
        subjectSelect.add(option.cloneNode(true))
        filterSubjectSelect.add(option)
      })
    }
  } catch (error) {
    console.error("Помилка завантаження предметів:", error)
  }
}

// Обробка форми створення конкурсу
document.getElementById("createCompetitionForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  if (userRole !== "методист") {
    alert("Тільки методисти можуть створювати конкурси")
    return
  }

  saveCompetition()
})

function openCreateCompetitionModal() {
  document.getElementById("modalTitle").textContent = "Створити новий конкурс"
  document.getElementById("editCompetitionId").value = ""
  document.getElementById("createCompetitionForm").reset()
  dynamicFieldCount = 0
  document.getElementById("dynamicFieldsContainer").innerHTML = ""
  document.getElementById("createCompetitionModal").classList.add("active")
}

function closeCreateCompetitionModal() {
  document.getElementById("createCompetitionModal").classList.remove("active")
  document.getElementById("createCompetitionForm").reset()
  dynamicFieldCount = 0
  document.getElementById("dynamicFieldsContainer").innerHTML = ""
}

function addDynamicField() {
  dynamicFieldCount++
  const container = document.getElementById("dynamicFieldsContainer")

  const fieldWrapper = document.createElement("div")
  fieldWrapper.className = "dynamic-field-wrapper"
  fieldWrapper.id = `field-${dynamicFieldCount}`
  fieldWrapper.setAttribute("data-field-index", dynamicFieldCount)

  fieldWrapper.innerHTML = `
    <div class="dynamic-field-row">
      <input type="text" class="dynamic-field-label" placeholder="Назва поля (напр. Вимоги)" required>
      <textarea class="dynamic-field-value" placeholder="Значення поля..." rows="2"></textarea>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeDynamicField(${dynamicFieldCount})">✕ Видалити</button>
    </div>
  `

  container.appendChild(fieldWrapper)

  setTimeout(() => {
    fieldWrapper.classList.add("animate-in")
  }, 10)
}

function removeDynamicField(fieldId) {
  const fieldElement = document.getElementById(`field-${fieldId}`)
  if (fieldElement) {
    fieldElement.classList.add("animate-out")
    setTimeout(() => {
      fieldElement.remove()
    }, 300)
  }
}

function openEditCompetitionModal(competition) {
  document.getElementById("modalTitle").textContent = "Редагувати конкурс"
  document.getElementById("editCompetitionId").value = competition.id
  document.getElementById("title").value = competition.title
  document.getElementById("subject").value = competition.subject_id || ""
  document.getElementById("level").value = competition.level || ""
  document.getElementById("organizer").value = competition.organizer || ""
  document.getElementById("description").value = competition.description || ""
  document.getElementById("startDate").value = competition.start_date?.split("T")[0] || ""
  document.getElementById("endDate").value = competition.end_date?.split("T")[0] || ""
  document.getElementById("registrationDeadline").value = competition.registration_deadline?.split("T")[0] || ""
  document.getElementById("location").value = competition.location || ""
  document.getElementById("maxParticipants").value = competition.max_participants || ""
  document.getElementById("isOnline").value = competition.is_online ? "true" : "false"
  document.getElementById("requirements").value = competition.requirements || ""
  document.getElementById("prizes").value = competition.prizes || ""
  document.getElementById("contactInfo").value = competition.contact_info || ""
  document.getElementById("websiteUrl").value = competition.website_url || ""

  dynamicFieldCount = 0
  const container = document.getElementById("dynamicFieldsContainer")
  container.innerHTML = ""

  if (competition.custom_fields) {
    try {
      const customFields =
        typeof competition.custom_fields === "string"
          ? JSON.parse(competition.custom_fields)
          : competition.custom_fields

      if (Array.isArray(customFields)) {
        customFields.forEach((field) => {
          dynamicFieldCount++
          const fieldWrapper = document.createElement("div")
          fieldWrapper.className = "dynamic-field-wrapper"
          fieldWrapper.id = `field-${dynamicFieldCount}`
          fieldWrapper.setAttribute("data-field-index", dynamicFieldCount)

          fieldWrapper.innerHTML = `
            <div class="dynamic-field-row">
              <input type="text" class="dynamic-field-label" placeholder="Назва поля" value="${(field.label || "").replace(/"/g, "&quot;")}" required>
              <textarea class="dynamic-field-value" placeholder="Значення поля..." rows="2">${(field.value || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
              <button type="button" class="btn btn-danger btn-sm" onclick="removeDynamicField(${dynamicFieldCount})">✕ Видалити</button>
            </div>
          `
          container.appendChild(fieldWrapper)
        })
      }
    } catch (e) {
      console.error("Помилка парсування custom_fields:", e)
    }
  }

  document.getElementById("createCompetitionModal").classList.add("active")
}

async function saveCompetition() {
  const competitionId = document.getElementById("editCompetitionId").value
  const isEdit = !!competitionId

  const customFields = []
  document.querySelectorAll(".dynamic-field-wrapper").forEach((wrapper) => {
    const label = wrapper.querySelector(".dynamic-field-label").value.trim()
    const value = wrapper.querySelector(".dynamic-field-value").value.trim()

    if (label || value) {
      customFields.push({ label, value })
    }
  })

  const formData = {
    title: document.getElementById("title").value,
    subjectId: document.getElementById("subject").value,
    level: document.getElementById("level").value,
    organizer: document.getElementById("organizer").value,
    description: document.getElementById("description").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    registrationDeadline: document.getElementById("registrationDeadline").value || null,
    location: document.getElementById("location").value,
    maxParticipants: document.getElementById("maxParticipants").value || null,
    isOnline: document.getElementById("isOnline").value === "true",
    requirements: document.getElementById("requirements").value,
    prizes: document.getElementById("prizes").value,
    contactInfo: document.getElementById("contactInfo").value,
    websiteUrl: document.getElementById("websiteUrl").value,
    createdBy: userId,
    customFields: JSON.stringify(customFields),
  }

  // Валідація дат
  if (new Date(formData.endDate) < new Date(formData.startDate)) {
    alert("Дата закінчення не може бути раніше дати початку")
    return
  }

  try {
    const url = isEdit ? `${BASE_URL}/api/competitions/${competitionId}` : `${BASE_URL}/api/competitions`
    const method = isEdit ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })

    const data = await response.json()

    if (response.ok) {
      alert(isEdit ? "Конкурс успішно оновлено!" : "Конкурс успішно створено!")
      closeCreateCompetitionModal()
      loadCompetitions()
    } else {
      alert(data.error || "Помилка збереження конкурсу")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка збереження конкурсу")
  }
}

async function loadCompetitions() {
  const container = document.getElementById("competitionsList")
  container.innerHTML = '<div class="loading">Завантаження...</div>'

  try {
    const response = await fetch(`${BASE_URL}/api/competitions`)
    const data = await response.json()

    if (response.ok) {
      allCompetitions = data.competitions
      filterAndSortCompetitions()
    } else {
      container.innerHTML = '<div class="empty-state"><p>Помилка завантаження конкурсів</p></div>'
    }
  } catch (error) {
    console.error("Помилка:", error)
    container.innerHTML = '<div class="empty-state"><p>Помилка завантаження конкурсів</p></div>'
  }
}

function filterAndSortCompetitions() {
  const searchTerm = document.getElementById("searchCompetitions").value.toLowerCase()
  const filterSubject = document.getElementById("filterSubject").value
  const filterLevel = document.getElementById("filterLevel").value
  const filterStatus = document.getElementById("filterStatus").value
  const filterOwnership = document.getElementById("filterOwnership").value
  const sortBy = document.getElementById("sortBy").value

  const filtered = allCompetitions.filter((competition) => {
    // Пошук
    const matchesSearch =
      !searchTerm ||
      competition.title.toLowerCase().includes(searchTerm) ||
      (competition.description || "").toLowerCase().includes(searchTerm)

    // Фільтр по предмету
    const matchesSubject = !filterSubject || competition.subject_id == filterSubject

    // Фільтр по рівню
    const matchesLevel = !filterLevel || competition.level === filterLevel

    // Фільтр по статусу
    let matchesStatus = true
    if (filterStatus) {
      const today = new Date()
      const startDate = new Date(competition.start_date)
      const endDate = new Date(competition.end_date)

      if (filterStatus === "active") {
        matchesStatus = startDate <= today && endDate >= today
      } else if (filterStatus === "upcoming") {
        matchesStatus = startDate > today
      } else if (filterStatus === "inactive") {
        matchesStatus = endDate < today
      }
    }

    // Фільтр по власності
    const matchesOwnership = filterOwnership === "all" || (filterOwnership === "my" && competition.created_by == userId)

    return matchesSearch && matchesSubject && matchesLevel && matchesStatus && matchesOwnership
  })

  // Сортування
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "date_desc":
        return new Date(b.created_at) - new Date(a.created_at)
      case "date_asc":
        return new Date(a.created_at) - new Date(b.created_at)
      case "title_asc":
        return a.title.localeCompare(b.title)
      case "title_desc":
        return b.title.localeCompare(a.title)
      case "participants_desc":
        return (b.participants_count || 0) - (a.participants_count || 0)
      default:
        return 0
    }
  })

  displayCompetitions(filtered)
}

function displayCompetitions(competitions) {
  const container = document.getElementById("competitionsList")

  if (competitions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Конкурсів не знайдено</h3>
        <p>Спробуйте змінити фільтри або створіть новий конкурс</p>
      </div>
    `
    return
  }

  container.innerHTML = competitions
    .map((competition) => {
      const startDate = new Date(competition.start_date)
      const endDate = new Date(competition.end_date)
      const today = new Date()

      let status = "inactive"
      let statusText = "Неактивний"

      if (endDate < today) {
        status = "inactive"
        statusText = "Завершено"
      } else if (startDate > today) {
        status = "upcoming"
        statusText = "Майбутній"
      } else {
        status = "active"
        statusText = "Активний"
      }

      const subjectName = allSubjects.find((s) => s.id == competition.subject_id)?.name || "Не вказано"
      const isOwner = competition.created_by == userId

      return `
        <div class="competition-item">
          <div class="competition-header">
            <div>
              <h3 class="competition-title">${competition.title}</h3>
              <div class="competition-badges">
                <span class="status-badge status-${status}">${statusText}</span>
                ${competition.level ? `<span class="level-badge">${competition.level}</span>` : ""}
                <span class="subject-badge">${subjectName}</span>
                ${competition.is_online ? '<span class="online-badge">Онлайн</span>' : ""}
              </div>
            </div>
            <div class="competition-actions">
              <button class="btn btn-info" onclick="window.location.href='results.html'">
                📊 Результати
              </button>
              <button class="btn btn-success" onclick="openAddStudentsModal(${competition.id})">
                Додати учнів
              </button>
              ${
                isOwner || userRole === "методист"
                  ? `
                <button class="btn btn-primary btn-sm" onclick='openEditCompetitionModal(${JSON.stringify(competition).replace(/'/g, "&#39;")})'>
                  ✏️ Редагувати
                </button>
              `
                  : ""
              }
            </div>
          </div>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          <div class="competition-meta">
            <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
            <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
            <span>👥 Учасників: ${competition.participants_count || 0}</span>
            ${competition.max_participants ? `<span>📊 Ліміт: ${competition.max_participants}</span>` : ""}
          </div>
          ${competition.organizer ? `<div class="competition-organizer">🏛️ Організатор: ${competition.organizer}</div>` : ""}
        </div>
      `
    })
    .join("")
}

// Завантаження списку учнів
async function loadStudents() {
  try {
    const response = await fetch(`${BASE_URL}/api/students`)
    const data = await response.json()

    if (response.ok) {
      allStudents = data.students
    }
  } catch (error) {
    console.error("Помилка завантаження учнів:", error)
  }
}

// Відкриття модального вікна для додавання учнів
function openAddStudentsModal(competitionId) {
  currentCompetitionId = competitionId
  const modal = document.getElementById("addStudentsModal")
  modal.classList.add("active")
  displayStudents(allStudents)
}

// Закриття модального вікна
function closeAddStudentsModal() {
  const modal = document.getElementById("addStudentsModal")
  modal.classList.remove("active")
  currentCompetitionId = null
  document.getElementById("studentSearch").value = ""
}

// Відображення списку учнів
function displayStudents(students) {
  const container = document.getElementById("studentsList")

  if (students.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Учнів не знайдено</p></div>'
    return
  }

  // Групування по класах
  const groupedByGrade = students.reduce((acc, student) => {
    const grade = student.grade || "Без класу"
    if (!acc[grade]) {
      acc[grade] = []
    }
    acc[grade].push(student)
    return acc
  }, {})

  container.innerHTML = Object.entries(groupedByGrade)
    .sort(([a], [b]) => {
      if (a === "Без класу") return 1
      if (b === "Без класу") return -1
      return a.localeCompare(b)
    })
    .map(([grade, students]) => {
      return `
        <div class="grade-group">
          <h4 style="margin: 16px 0 8px 0; color: #4a5568;">${grade}</h4>
          ${students
            .map((student) => {
              const fullName = [student.last_name, student.first_name].filter(Boolean).join(" ") || student.email
              const initials = fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()

              return `
                <div class="student-item" onclick="toggleStudent(${student.id})">
                  <input type="checkbox" class="student-checkbox" id="student-${student.id}" value="${student.id}">
                  <div class="student-avatar">
                    ${student.avatar ? `<img src="${student.avatar}" alt="${fullName}">` : `<span>${initials}</span>`}
                  </div>
                  <div class="student-info">
                    <div class="student-name">${fullName}</div>
                    <div class="student-grade">${student.grade || "Клас не вказано"}</div>
                  </div>
                </div>
              `
            })
            .join("")}
        </div>
      `
    })
    .join("")
}

// Перемикання вибору учня
function toggleStudent(studentId) {
  const checkbox = document.getElementById(`student-${studentId}`)
  const item = checkbox.closest(".student-item")

  checkbox.checked = !checkbox.checked

  if (checkbox.checked) {
    item.classList.add("selected")
  } else {
    item.classList.remove("selected")
  }
}

// Пошук учнів
document.getElementById("studentSearch").addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase()

  if (!searchTerm) {
    displayStudents(allStudents)
    return
  }

  const filtered = allStudents.filter((student) => {
    const fullName = [student.last_name, student.first_name].filter(Boolean).join(" ").toLowerCase()
    const grade = (student.grade || "").toLowerCase()
    return fullName.includes(searchTerm) || grade.includes(searchTerm)
  })

  displayStudents(filtered)
})

// Додавання вибраних учнів на конкурс
async function addSelectedStudents() {
  const checkboxes = document.querySelectorAll(".student-checkbox:checked")
  const studentIds = Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))

  if (studentIds.length === 0) {
    alert("Виберіть хоча б одного учня")
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/competitions/${currentCompetitionId}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentIds,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      alert(data.message)
      closeAddStudentsModal()
      loadCompetitions()
    } else {
      alert(data.error || "Помилка додавання учнів")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка додавання учнів")
  }
}
