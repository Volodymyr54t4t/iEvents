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
let allParticipants = []
let allClasses = new Set()
let teacherSubscribedIds = new Set()

document.addEventListener("DOMContentLoaded", () => {
    loadCompetitions()
})

async function loadTeacherSubscriptions() {
    if (userRole !== "вчитель") return
    try {
        const response = await fetch(`${BASE_URL}/api/teacher/${userId}/competition-subscriptions`)
        const data = await response.json()
        if (response.ok && data.subscriptions) {
            teacherSubscribedIds = new Set(data.subscriptions.map(s => s.competition_id))
        }
    } catch (error) {
        console.error("Помилка завантаження пiдписок:", error)
    }
}

async function loadCompetitions() {
    const select = document.getElementById("competitionFilter")

    try {
        // Спочатку завантажуємо пiдписки вчителя
        if (userRole === "вчитель") {
            await loadTeacherSubscriptions()
        }

        const response = await fetch(`${BASE_URL}/api/competitions`)
        const data = await response.json()

        if (response.ok && data.competitions.length > 0) {
            // Для вчителiв показуємо лише тi конкурси, на якi вони пiдписанi
            let filteredCompetitions = data.competitions
            if (userRole === "вчитель") {
                filteredCompetitions = data.competitions.filter(comp => teacherSubscribedIds.has(comp.id))
            }

            if (filteredCompetitions.length > 0) {
                select.innerHTML =
                    '<option value="">Оберiть конкурс</option>' +
                    filteredCompetitions
                        .map((comp) => `<option value="${comp.id}">${comp.title} (${comp.participants_count} учасникiв)</option>`)
                        .join("")

                document.getElementById("filtersSection").style.display = "block"
            } else {
                select.innerHTML = '<option value="">У вас немає пiдписок на конкурси</option>'
                document.getElementById("filtersSection").style.display = "block"
                document.getElementById("participantsCard").style.display = "none"
            }
        } else {
            select.innerHTML = '<option value="">Конкурсiв не знайдено</option>'
        }
    } catch (error) {
        console.error("Помилка завантаження конкурсiв:", error)
        select.innerHTML = '<option value="">Помилка завантаження</option>'
    }
}

async function loadCompetitionParticipants() {
    const select = document.getElementById("competitionFilter")
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
        const response = await fetch(`${BASE_URL}/api/competitions/${currentCompetitionId}/participants-with-results`)
        const data = await response.json()

        if (response.ok) {
            currentParticipants = data.participants
            allParticipants = data.participants

            allClasses = new Set(data.participants.map((p) => p.grade).filter(Boolean))
            const classFilter = document.getElementById("classFilter")
            classFilter.innerHTML =
                '<option value="">Всі класи</option>' +
                Array.from(allClasses)
                    .sort()
                    .map((grade) => `<option value="${grade}">${grade}</option>`)
                    .join("")

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

function applyFilters() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase()
    const placeFilter = document.getElementById("placeFilter").value
    const classFilter = document.getElementById("classFilter").value
    const sortBy = document.getElementById("sortBy").value

    let filtered = [...allParticipants]

    if (searchTerm) {
        filtered = filtered.filter((p) => {
            const fullName = [p.last_name, p.first_name].filter(Boolean).join(" ").toLowerCase()
            return fullName.includes(searchTerm)
        })
    }

    if (placeFilter) {
        if (placeFilter === "other") {
            filtered = filtered.filter((p) => p.place && !["АП", "1", "2", "3"].includes(p.place))
        } else {
            filtered = filtered.filter((p) => p.place === placeFilter)
        }
    }

    if (classFilter) {
        filtered = filtered.filter((p) => p.grade === classFilter)
    }

    filtered.sort((a, b) => {
        const aName = [a.last_name, a.first_name].filter(Boolean).join(" ")
        const bName = [b.last_name, b.first_name].filter(Boolean).join(" ")

        switch (sortBy) {
            case "name":
                return aName.localeCompare(bName, "uk")
            case "name-desc":
                return bName.localeCompare(aName, "uk")
            case "grade":
                return (a.grade || "").localeCompare(b.grade || "", "uk")
            case "score-desc":
                return (b.score || 0) - (a.score || 0)
            case "score-asc":
                return (a.score || 0) - (b.score || 0)
            case "place-asc":
                const aPlace = a.place === "АП" ? 0 : Number.parseInt(a.place) || 999
                const bPlace = b.place === "АП" ? 0 : Number.parseInt(b.place) || 999
                return aPlace - bPlace
            case "place-desc":
                const aPlaceDesc = a.place === "АП" ? 0 : Number.parseInt(a.place) || 999
                const bPlaceDesc = b.place === "АП" ? 0 : Number.parseInt(b.place) || 999
                return bPlaceDesc - aPlaceDesc
            default:
                return 0
        }
    })

    displayParticipants(filtered)
}

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
            const firstLetter = participant.first_name ? participant.first_name[0].toUpperCase() : fullName[0].toUpperCase()
            const hasResult = participant.result_id !== null
            const isConfirmed = participant.is_confirmed === true

            let placeDisplay = ""
            if (participant.place) {
                placeDisplay = participant.place === "АП" ? "АП" : participant.place
            }

            return `
        <div class="participant-item ${hasResult ? "has-result" : ""}">
          <div class="participant-info">
            <div class="participant-avatar">
              <span>${firstLetter}</span>
            </div>
            <div class="participant-details">
              <div class="participant-name">${fullName}</div>
              <div class="participant-grade">${participant.grade || "Клас не вказано"}</div>
            </div>
          </div>
          
          ${hasResult
                    ? `
            <div class="result-info">
              ${participant.score !== null
                        ? `
                <div class="result-badge">
                  <span class="result-label">Бали</span>
                  <span class="result-value score">${participant.score}</span>
                </div>
              `
                        : ""
                    }
              ${placeDisplay
                        ? `
                <div class="result-badge">
                  <span class="result-label">Місце</span>
                  <span class="result-value place">${placeDisplay}</span>
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
            ${hasResult
                    ? `
              ${userRole === "методист"
                        ? `
                <button class="btn btn-warning" onclick="editResult(${participant.student_id})">
                  Редагувати
                </button>
              `
                        : ""
                    }
              ${userRole === "методист"
                        ? `
                <button class="btn btn-danger" onclick="deleteResult(${participant.result_id})">
                  Видалити
                </button>
              `
                        : ""
                    }
              ${isConfirmed
                        ? `
                <span class="confirmed-badge">Підтверджено</span>
              `
                        : ""
                    }
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
    document.getElementById("customPlaceGroup").style.display = "none"
    document.getElementById("confirmBtn").style.display = "none"
    document.getElementById("saveBtn").textContent = "Зберегти"

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
    document.getElementById("customPlaceGroup").style.display = "none"
    document.getElementById("confirmBtn").style.display = "none"
    document.getElementById("saveBtn").textContent = "Зберегти"

    modal.classList.add("active")
}

// Редагування результату
function editResult(studentId) {
    const participant = currentParticipants.find((p) => p.student_id === studentId)

    if (!participant || !participant.result_id) {
        alert("Результат не знайдено")
        return
    }

    if (userRole === "вчитель" && participant.is_confirmed) {
        alert("Ви не можете редагувати підтверджений результат")
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

    const placeType = document.getElementById("placeType")
    const customPlace = document.getElementById("customPlace")
    const customPlaceGroup = document.getElementById("customPlaceGroup")

    if (participant.place === "АП") {
        placeType.value = "АП"
        customPlaceGroup.style.display = "none"
    } else if (participant.place === "1" || participant.place === "2" || participant.place === "3") {
        placeType.value = participant.place
        customPlaceGroup.style.display = "none"
    } else if (participant.place) {
        placeType.value = "custom"
        customPlace.value = participant.place
        customPlaceGroup.style.display = "block"
    }

    document.getElementById("notes").value = participant.notes || ""
    document.getElementById("isConfirmed").value = participant.is_confirmed ? "true" : "false"

    const confirmBtn = document.getElementById("confirmBtn")
    const saveBtn = document.getElementById("saveBtn")

    if (userRole === "вчитель" && !participant.is_confirmed) {
        confirmBtn.style.display = "inline-block"
        saveBtn.textContent = "Зберегти чернетку"
    } else {
        confirmBtn.style.display = "none"
        saveBtn.textContent = "Зберегти"
    }

    modal.classList.add("active")
}

// Закриття модального вікна
function closeResultModal() {
    const modal = document.getElementById("resultModal")
    modal.classList.remove("active")

    const studentSelect = document.getElementById("studentSelect")
    studentSelect.disabled = false

    document.getElementById("resultForm").reset()
    document.getElementById("customPlaceGroup").style.display = "none"
    document.getElementById("confirmBtn").style.display = "none"
    document.getElementById("saveBtn").textContent = "Зберегти"
}

async function saveResult(confirm = false) {
    const studentId = document.getElementById("studentSelect").value
    const score = document.getElementById("score").value
    const placeType = document.getElementById("placeType").value
    const customPlace = document.getElementById("customPlace").value
    const notes = document.getElementById("notes").value
    const editMode = document.getElementById("editMode").value === "true"
    const resultId = document.getElementById("resultId").value

    if (!studentId) {
        alert("Виберіть учня")
        return
    }

    if (!score && !placeType) {
        alert("Введіть хоча б бали або місце")
        return
    }

    let finalPlace = null
    if (placeType === "custom") {
        if (!customPlace) {
            alert("Вкажіть місце")
            return
        }
        finalPlace = customPlace
    } else if (placeType) {
        finalPlace = placeType
    }

    const resultData = {
        competitionId: currentCompetitionId,
        studentId: Number.parseInt(studentId),
        score: score ? Number.parseFloat(score) : null,
        place: finalPlace,
        notes: notes || null,
        addedBy: Number.parseInt(userId),
        isConfirmed: confirm || userRole === "методист",
    }

    try {
        let response

        if (editMode) {
            // Оновлення існуючого результату
            response = await fetch(`${BASE_URL}/api/results/${resultId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(resultData),
            })
        } else {
            // Створення нового результату
            response = await fetch(`${BASE_URL}/api/results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(resultData),
            })
        }

        const data = await response.json()

        if (response.ok) {
            if (confirm) {
                alert("Результат успішно підтверджено!")
            } else {
                alert(editMode ? "Результат успішно оновлено!" : "Результат успішно додано!")
            }
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
        const response = await fetch(`${BASE_URL}/api/results/${resultId}`, {
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

function handlePlaceTypeChange() {
    const placeType = document.getElementById("placeType").value
    const customPlaceGroup = document.getElementById("customPlaceGroup")

    if (placeType === "custom") {
        customPlaceGroup.style.display = "block"
    } else {
        customPlaceGroup.style.display = "none"
    }
}
