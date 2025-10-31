const API_URL = window.location.hostname === "localhost" ? "http://localhost:3000/api" : `${window.location.origin}/api`

// Перевірка авторизації та прав доступу
const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

if (!userId) {
  window.location.href = "auth.html"
}

if (userRole !== "вчитель" && userRole !== "методист") {
  alert("У вас немає прав для доступу до цієї сторінки")
  window.location.href = "index.html"
}

let currentCompetitionId = null
let currentParticipants = []

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadCompetitions()
})

// Завантаження списку конкурсів
async function loadCompetitions() {
  const select = document.getElementById("competitionSelect")

  try {
    const response = await fetch(`${API_URL}/competitions`)
    const data = await response.json()

    if (response.ok && data.competitions.length > 0) {
      select.innerHTML =
        '<option value="">Виберіть конкурс</option>' +
        data.competitions
          .map((comp) => `<option value="${comp.id}">${comp.title} (${comp.participants_count} учасників)</option>`)
          .join("")
    } else {
      select.innerHTML = '<option value="">Конкурсів не знайдено</option>'
    }
  } catch (error) {
    console.error("Помилка завантаження конкурсів:", error)
    select.innerHTML = '<option value="">Помилка завантаження</option>'
  }
}

// Завантаження учасників конкурсу
async function loadCompetitionParticipants() {
  const select = document.getElementById("competitionSelect")
  currentCompetitionId = select.value

  const card = document.getElementById("participantsCard")
  const container = document.getElementById("participantsList")

  if (!currentCompetitionId) {
    card.style.display = "none"
    return
  }

  card.style.display = "block"
  container.innerHTML = '<div class="loading">Завантаження учасників...</div>'

  try {
    const response = await fetch(`${API_URL}/competitions/${currentCompetitionId}/participants-with-results`)
    const data = await response.json()

    if (response.ok) {
      currentParticipants = data.participants
      displayParticipants(data.participants)
    } else {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>Помилка завантаження</h3>
                    <p>${data.error || "Спробуйте пізніше"}</p>
                </div>
            `
    }
  } catch (error) {
    console.error("Помилка:", error)
    container.innerHTML = `
            <div class="empty-state">
                <h3>Помилка завантаження</h3>
                <p>Перевірте підключення до інтернету</p>
            </div>
        `
  }
}

// Відображення учасників
function displayParticipants(participants) {
  const container = document.getElementById("participantsList")

  if (participants.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <h3>Учасників не знайдено</h3>
                <p>Додайте учнів на цей конкурс</p>
            </div>
        `
    return
  }

  container.innerHTML = participants
    .map((participant) => {
      const fullName = [participant.last_name, participant.first_name].filter(Boolean).join(" ") || participant.email

      const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()

      const hasResult = participant.result_id !== null

      return `
            <div class="participant-item ${hasResult ? "has-result" : ""}">
                <div class="participant-info">
                    <div class="participant-avatar">
                        ${
                          participant.avatar
                            ? `<img src="${participant.avatar}" alt="${fullName}">`
                            : `<span>${initials}</span>`
                        }
                    </div>
                    <div class="participant-details">
                        <div class="participant-name">${fullName}</div>
                        <div class="participant-grade">${participant.grade || "Клас не вказано"}</div>
                    </div>
                </div>
                
                ${
                  hasResult
                    ? `
                    <div class="result-info">
                        ${
                          participant.score !== null
                            ? `
                            <div class="result-badge">
                                <span class="result-label">Бали</span>
                                <span class="result-value score">${participant.score}</span>
                            </div>
                        `
                            : ""
                        }
                        ${
                          participant.place !== null
                            ? `
                            <div class="result-badge">
                                <span class="result-label">Місце</span>
                                <span class="result-value place">${participant.place}</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `
                    : `
                    <span class="no-result-badge">Без результату</span>
                `
                }
                
                <div class="participant-actions">
                    ${
                      hasResult
                        ? `
                        <button class="btn btn-warning" onclick="editResult(${participant.student_id})">
                            Редагувати
                        </button>
                        <button class="btn btn-danger" onclick="deleteResult(${participant.result_id})">
                            Видалити
                        </button>
                    `
                        : `
                        <button class="btn btn-primary" onclick="addResultForStudent(${participant.student_id})">
                            Додати результат
                        </button>
                    `
                    }
                </div>
            </div>
        `
    })
    .join("")
}

// Відкриття модального вікна для додавання результату
function openAddResultModal() {
  const modal = document.getElementById("resultModal")
  const studentSelect = document.getElementById("studentSelect")

  // Фільтруємо тільки учнів без результатів
  const studentsWithoutResults = currentParticipants.filter((p) => p.result_id === null)

  if (studentsWithoutResults.length === 0) {
    alert("Всі учасники вже мають результати")
    return
  }

  studentSelect.innerHTML =
    '<option value="">Виберіть учня</option>' +
    studentsWithoutResults
      .map((p) => {
        const fullName = [p.last_name, p.first_name].filter(Boolean).join(" ") || p.email
        return `<option value="${p.student_id}">${fullName} (${p.grade || "Без класу"})</option>`
      })
      .join("")

  document.getElementById("modalTitle").textContent = "Додати результат"
  document.getElementById("editMode").value = "false"
  document.getElementById("resultForm").reset()

  modal.classList.add("active")
}

// Додавання результату для конкретного учня
function addResultForStudent(studentId) {
  const modal = document.getElementById("resultModal")
  const studentSelect = document.getElementById("studentSelect")

  const participant = currentParticipants.find((p) => p.student_id === studentId)
  const fullName = [participant.last_name, participant.first_name].filter(Boolean).join(" ") || participant.email

  studentSelect.innerHTML = `<option value="${studentId}">${fullName}</option>`
  studentSelect.disabled = true

  document.getElementById("modalTitle").textContent = "Додати результат"
  document.getElementById("editMode").value = "false"
  document.getElementById("resultForm").reset()

  modal.classList.add("active")
}

// Редагування результату
function editResult(studentId) {
  const participant = currentParticipants.find((p) => p.student_id === studentId)

  if (!participant || !participant.result_id) {
    alert("Результат не знайдено")
    return
  }

  const modal = document.getElementById("resultModal")
  const studentSelect = document.getElementById("studentSelect")

  const fullName = [participant.last_name, participant.first_name].filter(Boolean).join(" ") || participant.email

  studentSelect.innerHTML = `<option value="${studentId}">${fullName}</option>`
  studentSelect.disabled = true

  document.getElementById("modalTitle").textContent = "Редагувати результат"
  document.getElementById("editMode").value = "true"
  document.getElementById("resultId").value = participant.result_id
  document.getElementById("score").value = participant.score || ""
  document.getElementById("place").value = participant.place || ""
  document.getElementById("notes").value = participant.notes || ""

  modal.classList.add("active")
}

// Закриття модального вікна
function closeResultModal() {
  const modal = document.getElementById("resultModal")
  modal.classList.remove("active")

  const studentSelect = document.getElementById("studentSelect")
  studentSelect.disabled = false

  document.getElementById("resultForm").reset()
}

// Збереження результату
async function saveResult() {
  const studentId = document.getElementById("studentSelect").value
  const score = document.getElementById("score").value
  const place = document.getElementById("place").value
  const notes = document.getElementById("notes").value
  const editMode = document.getElementById("editMode").value === "true"
  const resultId = document.getElementById("resultId").value

  if (!studentId) {
    alert("Виберіть учня")
    return
  }

  if (!score && !place) {
    alert("Введіть хоча б бали або місце")
    return
  }

  const resultData = {
    competitionId: currentCompetitionId,
    studentId: Number.parseInt(studentId),
    score: score ? Number.parseFloat(score) : null,
    place: place ? Number.parseInt(place) : null,
    notes: notes || null,
    addedBy: Number.parseInt(userId),
  }

  try {
    let response

    if (editMode) {
      // Оновлення існуючого результату
      response = await fetch(`${API_URL}/results/${resultId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resultData),
      })
    } else {
      // Створення нового результату
      response = await fetch(`${API_URL}/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resultData),
      })
    }

    const data = await response.json()

    if (response.ok) {
      alert(editMode ? "Результат успішно оновлено!" : "Результат успішно додано!")
      closeResultModal()
      loadCompetitionParticipants()
    } else {
      alert(data.error || "Помилка збереження результату")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка збереження результату")
  }
}

// Видалення результату
async function deleteResult(resultId) {
  if (!confirm("Ви впевнені, що хочете видалити цей результат?")) {
    return
  }

  try {
    const response = await fetch(`${API_URL}/results/${resultId}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (response.ok) {
      alert("Результат успішно видалено")
      loadCompetitionParticipants()
    } else {
      alert(data.error || "Помилка видалення результату")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка видалення результату")
  }
}
