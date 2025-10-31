const API_URL = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://ievents-qf5k.onrender.com"

let currentCompetitionId = null
let allStudents = []
const currentResultsCompetitionId = null

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

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadCompetitions()
  loadStudents()
})

// Обробка форми ст��орення конкурсу
document.getElementById("createCompetitionForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const formData = {
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    createdBy: userId,
  }

  // Валідація дат
  if (new Date(formData.endDate) < new Date(formData.startDate)) {
    alert("Дата закінчення не може бути раніше дати початку")
    return
  }

  try {
    const response = await fetch(`${API_URL}/api/competitions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })

    const data = await response.json()

    if (response.ok) {
      alert("Конкурс успішно створено!")
      document.getElementById("createCompetitionForm").reset()
      loadCompetitions()
    } else {
      alert(data.error || "Помилка створення конкурсу")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка створення конкурсу")
  }
})

// Завантаження списку конкурсів
async function loadCompetitions() {
  const container = document.getElementById("competitionsList")
  container.innerHTML = '<div class="loading">Завантаження...</div>'

  try {
    const response = await fetch(`${API_URL}/api/competitions`)
    const data = await response.json()

    if (response.ok) {
      if (data.competitions.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>Конкурсів поки немає</h3>
            <p>Створіть перший конкурс за допомогою форми вище</p>
          </div>
        `
        return
      }

      container.innerHTML = data.competitions
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

          return `
            <div class="competition-item">
              <div class="competition-header">
                <div>
                  <h3 class="competition-title">${competition.title}</h3>
                  <span class="status-badge status-${status}">${statusText}</span>
                </div>
                <div class="competition-actions">
                  <button class="btn btn-info" onclick="window.location.href='results.html'">
                    📊 Результати
                  </button>
                  <button class="btn btn-success" onclick="openAddStudentsModal(${competition.id})">
                    Додати учнів
                  </button>
                </div>
              </div>
              ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
              <div class="competition-meta">
                <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
                <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
                <span>👥 Учасників: ${competition.participants_count}</span>
              </div>
            </div>
          `
        })
        .join("")
    } else {
      container.innerHTML = '<div class="empty-state"><p>Помилка завантаження конкурсів</p></div>'
    }
  } catch (error) {
    console.error("Помилка:", error)
    container.innerHTML = '<div class="empty-state"><p>Помилка завантаження конкурсів</p></div>'
  }
}

// Завантаження списку учнів
async function loadStudents() {
  try {
    const response = await fetch(`${API_URL}/api/students`)
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
    const response = await fetch(`${API_URL}/api/competitions/${currentCompetitionId}/participants`, {
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
