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
let allCompetitions = []
let allSubjects = []

let currentDocumentsCompetitionId = null
let allDocuments = []
let currentDocumentsStudents = []

let dynamicFieldCount = 0
let currentResponses = []

// Перевірка авторизації - тільки методист
const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

if (!userId) {
    window.location.href = "auth.html"
}

if (userRole !== "методист") {
    alert("Ця сторінка доступна тільки для методистів")
    window.location.href = "index.html"
}

document.addEventListener("DOMContentLoaded", () => {
    loadSubjects()
    loadCompetitions()

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
    saveCompetition()
})

function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active")
    })
    document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.remove("active")
    })

    const tabContent = document.getElementById(`tab-content-${tabName}`)
    const tabButton = document.getElementById(`tab-${tabName}`)
    if (tabContent) tabContent.classList.add("active")
    if (tabButton) tabButton.classList.add("active")
}

function openCreateCompetitionModal() {
    document.getElementById("modalTitle").textContent = "Створити новий конкурс"
    document.getElementById("editCompetitionId").value = ""
    document.getElementById("createCompetitionForm").reset()
    dynamicFieldCount = 0
    document.getElementById("dynamicFieldsContainer").innerHTML = ""

    switchTab("info")

    document.getElementById("createCompetitionModal").classList.add("active")
}

function closeCreateCompetitionModal() {
    document.getElementById("createCompetitionModal").classList.remove("active")
    document.getElementById("createCompetitionForm").reset()
    dynamicFieldCount = 0
    document.getElementById("dynamicFieldsContainer").innerHTML = ""
    currentResponses = []
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
      <input type="text" class="dynamic-field-label" placeholder="Назва поля (напр. Клас, Вік)" required>
      <select class="dynamic-field-type">
        <option value="text">Текст</option>
        <option value="email">Email</option>
        <option value="tel">Телефон</option>
        <option value="url">Посилання</option>
        <option value="number">Число</option>
        <option value="date">Дата</option>
        <option value="textarea">Багато тексту</option>
        <option value="file">Файл</option>
      </select>
      <input type="checkbox" class="dynamic-field-required" id="required-${dynamicFieldCount}">
      <label for="required-${dynamicFieldCount}">Обов'язкове</label>
      <input type="text" class="dynamic-field-placeholder" placeholder="Підказка (необов'язково)">
      <button type="button" class="btn btn-danger btn-sm" onclick="removeDynamicField(${dynamicFieldCount})">Видалити</button>
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
              <select class="dynamic-field-type">
                <option value="text" ${field.type === "text" ? "selected" : ""}>Текст</option>
                <option value="email" ${field.type === "email" ? "selected" : ""}>Email</option>
                <option value="tel" ${field.type === "tel" ? "selected" : ""}>Телефон</option>
                <option value="url" ${field.type === "url" ? "selected" : ""}>Посилання</option>
                <option value="number" ${field.type === "number" ? "selected" : ""}>Число</option>
                <option value="date" ${field.type === "date" ? "selected" : ""}>Дата</option>
                <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Багато тексту</option>
                <option value="file" ${field.type === "file" ? "selected" : ""}>Файл</option>
              </select>
              <input type="checkbox" class="dynamic-field-required" id="required-${dynamicFieldCount}" ${field.required ? "checked" : ""}>
              <label for="required-${dynamicFieldCount}">Обов'язкове</label>
              <input type="text" class="dynamic-field-placeholder" placeholder="Підказка" value="${(field.placeholder || "").replace(/"/g, "&quot;")}">
              <button type="button" class="btn btn-danger btn-sm" onclick="removeDynamicField(${dynamicFieldCount})">Видалити</button>
            </div>
          `
                    container.appendChild(fieldWrapper)
                })
            }
        } catch (e) {
            console.error("Помилка парсування custom_fields:", e)
        }
    }

    switchTab("info")

    document.getElementById("createCompetitionModal").classList.add("active")
}

async function saveCompetition() {
    const competitionId = document.getElementById("editCompetitionId").value
    const isEdit = !!competitionId

    const customFields = []
    document.querySelectorAll(".dynamic-field-wrapper").forEach((wrapper) => {
        const label = wrapper.querySelector(".dynamic-field-label").value.trim()
        const type = wrapper.querySelector(".dynamic-field-type").value
        const required = wrapper.querySelector(".dynamic-field-required").checked
        const placeholder = wrapper.querySelector(".dynamic-field-placeholder").value.trim()

        if (label) {
            customFields.push({
                label,
                type,
                required,
                placeholder: placeholder || null,
            })
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
            allCompetitions.forEach((comp) => {
                const subject = allSubjects.find((s) => s.id == comp.subject_id)
                comp.subject_name = subject ? subject.name : "Не вказано"
            })
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
        const matchesSearch =
            !searchTerm ||
            competition.title.toLowerCase().includes(searchTerm) ||
            (competition.description || "").toLowerCase().includes(searchTerm)

        const matchesSubject = !filterSubject || competition.subject_id == filterSubject
        const matchesLevel = !filterLevel || competition.level === filterLevel

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

        const matchesOwnership = filterOwnership === "all" || (filterOwnership === "my" && competition.created_by == userId)

        return matchesSearch && matchesSubject && matchesLevel && matchesStatus && matchesOwnership
    })

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

            const subjectName = competition.subject_name || "Не вказано"

            // Методист завжди може редагувати
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
              <button class="btn btn-info" onclick="openCompetitionDetailsModal(${competition.id})">
                Детальніше
              </button>
              <button class="btn btn-view-docs" onclick="openViewDocumentsModal(${competition.id})">
                Файли учнів
              </button>
              <button class="btn btn-info" onclick="window.location.href='results.html'">
                Результати
              </button>
              <button class="btn btn-secondary" onclick="openViewResponsesModal(${competition.id})">
                Відповіді учнів
              </button>
              <button class="btn btn-primary btn-sm" onclick='openEditCompetitionModal(${JSON.stringify(competition).replace(/'/g, "&#39;")})'>
                Редагувати
              </button>
            </div>
          </div>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          <div class="competition-meta">
            <span>Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
            <span>Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
            <span>Учасників: ${competition.participants_count || 0}</span>
            ${competition.max_participants ? `<span>Ліміт: ${competition.max_participants}</span>` : ""}
          </div>
          ${competition.organizer ? `<div class="competition-organizer">Організатор: ${competition.organizer}</div>` : ""}
        </div>
      `
        })
        .join("")
}

async function openCompetitionDetailsModal(competitionId) {
    const competition = allCompetitions.find((c) => c.id === competitionId)
    if (!competition) {
        alert("Конкурс не знайдено")
        return
    }

    let modal = document.getElementById("competitionDetailsModal")
    if (!modal) {
        modal = document.createElement("div")
        modal.id = "competitionDetailsModal"
        modal.className = "modal"
        modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Детальна інформація про конкурс</h2>
          <button class="modal-close" onclick="closeCompetitionDetailsModal()">&times;</button>
        </div>
        <div class="modal-body" id="competitionDetailsBody">
          <div class="loading">Завантаження...</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeCompetitionDetailsModal()">Закрити</button>
        </div>
      </div>
    `
        document.body.appendChild(modal)
    }

    modal.classList.add("active")
    const detailsBody = document.getElementById("competitionDetailsBody")
    detailsBody.innerHTML = '<div class="loading">Завантаження...</div>'

    try {
        let customFields = []
        if (competition.custom_fields) {
            try {
                customFields =
                    typeof competition.custom_fields === "string"
                        ? JSON.parse(competition.custom_fields)
                        : competition.custom_fields

                if (!Array.isArray(customFields)) {
                    customFields = []
                }
            } catch (e) {
                console.error("Помилка парсування custom_fields:", e)
                customFields = []
            }
        }

        const subjectName = competition.subject_name || "Не вказано"

        let detailsHTML = `
      <div class="competition-detail-section">
        <h3>${competition.title}</h3>
        ${competition.description ? `<p>${competition.description}</p>` : ""}

        <div class="detail-grid">
          <div class="detail-item">
            <div>
              <strong>Предмет:</strong>
              <span>${subjectName}</span>
            </div>
          </div>
          <div class="detail-item">
            <div>
              <strong>Рівень:</strong>
              <span>${competition.level || "Не вказано"}</span>
            </div>
          </div>
          <div class="detail-item">
            <div>
              <strong>Початок:</strong>
              <span>${new Date(competition.start_date).toLocaleDateString("uk-UA")}</span>
            </div>
          </div>
          <div class="detail-item">
            <div>
              <strong>Закінчення:</strong>
              <span>${new Date(competition.end_date).toLocaleDateString("uk-UA")}</span>
            </div>
          </div>
          ${competition.registration_deadline
                ? `
          <div class="detail-item">
            <div>
              <strong>Дедлайн реєстрації:</strong>
              <span>${new Date(competition.registration_deadline).toLocaleDateString("uk-UA")}</span>
            </div>
          </div>
          `
                : ""
            }
          <div class="detail-item">
            <div>
              <strong>Формат:</strong>
              <span>${competition.is_online ? "Онлайн" : "Офлайн"}</span>
            </div>
          </div>
          ${competition.location
                ? `
          <div class="detail-item">
            <div>
              <strong>Місце проведення:</strong>
              <span>${competition.location}</span>
            </div>
          </div>
          `
                : ""
            }
          ${competition.max_participants
                ? `
          <div class="detail-item">
            <div>
              <strong>Макс. учасників:</strong>
              <span>${competition.max_participants}</span>
            </div>
          </div>
          `
                : ""
            }
          <div class="detail-item">
            <div>
              <strong>Учасників зараз:</strong>
              <span>${competition.participants_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      ${competition.organizer
                ? `
      <div class="competition-detail-section">
        <h4>Організатор</h4>
        <p>${competition.organizer}</p>
      </div>
      `
                : ""
            }

      ${competition.requirements
                ? `
      <div class="competition-detail-section">
        <h4>Вимоги до учасників</h4>
        <p>${competition.requirements}</p>
      </div>
      `
                : ""
            }

      ${competition.prizes
                ? `
      <div class="competition-detail-section">
        <h4>Призи та нагороди</h4>
        <p>${competition.prizes}</p>
      </div>
      `
                : ""
            }

      ${customFields.length > 0
                ? `
      <div class="competition-detail-section">
        <h4>Додаткові поля для учнів</h4>
        <div class="custom-fields-list">
          ${customFields
                    .map((field) => {
                        const requiredMark = field.required ? '<span class="required-badge">Обов\'язкове</span>' : ""
                        return `
              <div class="custom-field-preview">
                <strong>${field.label}</strong> ${requiredMark}
                <span class="field-type-badge">${getFieldTypeLabel(field.type)}</span>
                ${field.placeholder ? `<div class="field-placeholder">Підказка: ${field.placeholder}</div>` : ""}
              </div>
            `
                    })
                    .join("")}
        </div>
      </div>
      `
                : ""
            }

      ${competition.contact_info || competition.website_url
                ? `
      <div class="competition-detail-section">
        <h4>Контактна інформація</h4>
        <div class="detail-grid">
          ${competition.contact_info
                    ? `
          <div class="detail-item">
            <div>
              <strong>Контакт:</strong>
              <span>${competition.contact_info}</span>
            </div>
          </div>
          `
                    : ""
                }
          ${competition.website_url
                    ? `
          <div class="detail-item">
            <div>
              <strong>Веб-сайт:</strong>
              <span><a href="${competition.website_url}" target="_blank">${competition.website_url}</a></span>
            </div>
          </div>
          `
                    : ""
                }
        </div>
      </div>
      `
                : ""
            }
    `

        if (customFields.length > 0) {
            try {
                const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}/form-responses`)
                const data = await response.json()

                if (response.ok && data.responses && data.responses.length > 0) {
                    detailsHTML += `
            <div class="competition-detail-section">
              <h4>Відповіді учнів (${data.responses.length})</h4>
              <div class="responses-container">
                ${data.responses
                            .map((resp) => {
                                const fullName =
                                    resp.first_name && resp.last_name
                                        ? `${resp.last_name} ${resp.first_name}`
                                        : resp.form_data?.fullName || resp.form_data?.["ПІБ"] || resp.email || "Невідомий учень"

                                let formData = {}
                                try {
                                    formData = typeof resp.form_data === "string" ? JSON.parse(resp.form_data) : resp.form_data || {}
                                } catch (e) {
                                    console.error("Помилка парсування form_data:", e)
                                    formData = resp.form_data || {}
                                }
                                const submittedDate = new Date(resp.submitted_at).toLocaleString("uk-UA")

                                return `
                    <div class="response-card">
                      <div class="response-header">
                        <div class="student-info">
                          ${resp.avatar
                                        ? `<img src="${resp.avatar}" alt="${fullName}" class="student-avatar-small">`
                                        : ""
                                    }
                          <div>
                            <strong>${fullName}</strong>
                            ${resp.grade ? `<span class="grade-badge-small">${resp.grade} клас</span>` : ""}
                          </div>
                        </div>
                        <div class="response-meta">
                          <small>${submittedDate}</small>
                        </div>
                      </div>
                      <div class="response-body">
                        ${Object.entries(formData)
                                        .map(([key, value]) => {
                                            return `
                            <div class="response-field">
                              <strong>${key}:</strong>
                              <span>${Array.isArray(value) ? value.join(", ") : value || "-"}</span>
                            </div>
                          `
                                        })
                                        .join("")}
                      </div>
                    </div>
                  `
                            })
                            .join("")}
              </div>
            </div>
          `
                } else if (customFields.length > 0) {
                    detailsHTML += `
            <div class="competition-detail-section">
              <div class="info-message" style="background: #fff3e0; border-color: #ff9800;">
                <p style="color: #e65100;">Учні ще не заповнили форму з додатковими полями</p>
              </div>
            </div>
          `
                }
            } catch (error) {
                console.error("Помилка завантаження відповідей:", error)
                detailsHTML += `
          <div class="competition-detail-section">
            <div class="info-message" style="background: #ffebee; border-color: #ef5350;">
              <p style="color: #c62828;">Помилка завантаження відповідей учнів</p>
            </div>
          </div>
        `
            }
        }

        detailsBody.innerHTML = detailsHTML
    } catch (error) {
        console.error("Помилка завантаження деталей конкурсу:", error)
        detailsBody.innerHTML = `
      <div class="error-message">
        <p>Помилка завантаження даних конкурсу</p>
        <button class="btn btn-primary" onclick="openCompetitionDetailsModal(${competitionId})">Спробувати ще раз</button>
      </div>
    `
    }
}

function closeCompetitionDetailsModal() {
    const modal = document.getElementById("competitionDetailsModal")
    if (modal) {
        modal.classList.remove("active")
    }
}

function getFieldTypeLabel(type) {
    const types = {
        text: "Текст",
        email: "Email",
        tel: "Телефон",
        url: "Посилання",
        number: "Число",
        date: "Дата",
        textarea: "Багато тексту",
    }
    return types[type] || "Текст"
}

// === Documents section ===

async function openViewDocumentsModal(competitionId) {
    currentDocumentsCompetitionId = competitionId
    const modal = document.getElementById("viewDocumentsModal")
    modal.classList.add("active")

    await loadCompetitionDocuments(competitionId)

    document.getElementById("searchDocuments").addEventListener("input", filterDocuments)
    document.getElementById("filterStudent").addEventListener("change", filterDocuments)
}

function closeViewDocumentsModal() {
    const modal = document.getElementById("viewDocumentsModal")
    modal.classList.remove("active")
    currentDocumentsCompetitionId = null
    allDocuments = []
    currentDocumentsStudents = []
    document.getElementById("searchDocuments").value = ""
    document.getElementById("filterStudent").innerHTML = '<option value="">Всі учні</option>'
    document.getElementById("teacherFileInput").value = ""
    document.getElementById("teacherFileDescription").value = ""
    document.getElementById("teacherFileStudent").value = ""
    document.getElementById("teacherUploadProgress").style.display = "none"
}

async function loadCompetitionDocuments(competitionId) {
    const container = document.getElementById("documentsContainer")
    container.innerHTML = '<div class="loading">Завантаження файлів...</div>'

    try {
        const docsResponse = await fetch(`${BASE_URL}/api/competitions/${competitionId}/documents`)
        const docsData = await docsResponse.json()

        const formResponse = await fetch(`${BASE_URL}/api/competitions/${competitionId}/form-responses`)
        const formData = await formResponse.json()

        if (docsResponse.ok) {
            allDocuments = docsData.documents

            if (formResponse.ok && formData.responses && formData.responses.length > 0) {
                formData.responses.forEach((response) => {
                    const fullName =
                        response.first_name && response.last_name
                            ? `${response.last_name} ${response.first_name}`
                            : response.form_data?.fullName || response.form_data?.["ПІБ"] || response.email || "Невідомий учень"

                    allDocuments.push({
                        id: `form-${response.user_id}`,
                        user_id: response.user_id,
                        original_name: "Відповіді на форму конкурсу",
                        file_type: "form-response",
                        file_size: 0,
                        uploaded_at: response.submitted_at,
                        description: "Заповнена форма учня",
                        email: response.email,
                        first_name: response.first_name,
                        last_name: response.last_name,
                        grade: response.grade,
                        avatar: response.avatar,
                        form_data: response.form_data,
                        file_path: null,
                    })
                })
            }

            const uniqueStudents = {}
            allDocuments.forEach((doc) => {
                if (!uniqueStudents[doc.user_id]) {
                    uniqueStudents[doc.user_id] = {
                        id: doc.user_id,
                        email: doc.email,
                        first_name: doc.first_name,
                        last_name: doc.last_name,
                        grade: doc.grade,
                        avatar: doc.avatar,
                    }
                }
            })

            currentDocumentsStudents = Object.values(uniqueStudents)

            const filterSelect = document.getElementById("filterStudent")
            filterSelect.innerHTML = '<option value="">Всі учні</option>'

            const teacherFileStudentSelect = document.getElementById("teacherFileStudent")
            teacherFileStudentSelect.innerHTML = '<option value="">-- Оберіть учня --</option>'

            currentDocumentsStudents
                .sort((a, b) => {
                    const nameA = [a.last_name, a.first_name].filter(Boolean).join(" ")
                    const nameB = [b.last_name, b.first_name].filter(Boolean).join(" ")
                    return nameA.localeCompare(nameB)
                })
                .forEach((student) => {
                    const fullName = [student.last_name, student.first_name].filter(Boolean).join(" ") || student.email
                    const option = document.createElement("option")
                    option.value = student.id
                    option.textContent = `${fullName}${student.grade ? ` (${student.grade})` : ""}`
                    filterSelect.appendChild(option.cloneNode(true))

                    const teacherOption = option.cloneNode(true)
                    teacherFileStudentSelect.appendChild(teacherOption)
                })

            displayDocuments(allDocuments)
        } else {
            container.innerHTML = '<div class="empty-state"><p>Помилка завантаження файлів</p></div>'
        }
    } catch (error) {
        console.error("Помилка завантаження документів:", error)
        container.innerHTML = '<div class="empty-state"><p>Помилка завантаження файлів</p></div>'
    }
}

function filterDocuments() {
    const searchTerm = document.getElementById("searchDocuments").value.toLowerCase()
    const selectedStudent = document.getElementById("filterStudent").value

    let filtered = allDocuments

    if (selectedStudent) {
        filtered = filtered.filter((doc) => doc.user_id == selectedStudent)
    }

    if (searchTerm) {
        filtered = filtered.filter((doc) => {
            const fullName =
                doc.first_name && doc.last_name
                    ? `${doc.last_name} ${doc.first_name}`
                    : (doc.form_data?.fullName || doc.form_data?.["ПІБ"] || doc.email || "").toLowerCase()

            const fileName = (doc.original_name || "").toLowerCase()
            const description = (doc.description || "").toLowerCase()

            return fullName.includes(searchTerm) || fileName.includes(searchTerm) || description.includes(searchTerm)
        })
    }

    displayDocuments(filtered)
}

function displayDocuments(documents) {
    const container = document.getElementById("documentsContainer")

    if (documents.length === 0) {
        container.innerHTML = `
      <div class="no-documents-message">
        <p><strong>Файлів не знайдено</strong></p>
        <p>Учні ще не завантажили жодного файлу для цього конкурсу</p>
      </div>
    `
        return
    }

    const groupedDocs = {}
    documents.forEach((doc) => {
        if (!groupedDocs[doc.user_id]) {
            groupedDocs[doc.user_id] = {
                student: {
                    id: doc.user_id,
                    email: doc.email,
                    first_name: doc.first_name,
                    last_name: doc.last_name,
                    grade: doc.grade,
                    avatar: doc.avatar,
                },
                documents: [],
            }
        }
        groupedDocs[doc.user_id].documents.push(doc)
    })

    const sortedGroups = Object.values(groupedDocs).sort((a, b) => {
        const nameA = [a.student.last_name, a.student.first_name].filter(Boolean).join(" ")
        const nameB = [b.student.last_name, b.student.first_name].filter(Boolean).join(" ")
        return nameA.localeCompare(nameB)
    })

    container.innerHTML = sortedGroups
        .map((group) => {
            const student = group.student
            const docs = group.documents
            const fullName = [student.last_name, student.first_name].filter(Boolean).join(" ") || student.email
            const initials = fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

            return `
      <div class="student-documents-group">
        <div class="student-group-header">
          <div class="student-avatar-large">
            ${student.avatar ? `<img src="${student.avatar}" alt="${fullName}">` : `<span>${initials}</span>`}
          </div>
          <div class="student-group-info">
            <div class="student-group-name">${fullName}</div>
            <div class="student-group-meta">
              ${student.grade ? `<span>Клас: ${student.grade}</span>` : ""}
              <span>${student.email}</span>
              <span class="file-count-badge">Файлів: ${docs.length}</span>
            </div>
          </div>
        </div>
        <div class="student-documents-list">
          ${docs
                    .map((doc) => {
                        const uploadDate = new Date(doc.uploaded_at).toLocaleString("uk-UA")
                        const fileSize = formatFileSize(doc.file_size)
                        const fileIcon = getFileIcon(doc.file_type)

                        if (doc.file_type === "form-response") {
                            return `
                <div class="teacher-document-item form-response-item">
                  <div class="document-icon">form</div>
                  <div class="teacher-document-info">
                    <div class="teacher-document-name">${doc.original_name}</div>
                    <div class="teacher-document-meta">
                      <span>${uploadDate}</span>
                      <span>Форма</span>
                    </div>
                    ${doc.description ? `<div class="teacher-document-description">${doc.description}</div>` : ""}
                  </div>
                  <div class="teacher-document-actions">
                    <button class="btn btn-view btn-sm" onclick='viewFormResponse(${JSON.stringify(doc.form_data)}, "${fullName}")'>
                      Переглянути відповіді
                    </button>
                  </div>
                </div>
              `
                        }

                        return `
              <div class="teacher-document-item">
                <div class="document-icon">${fileIcon}</div>
                <div class="teacher-document-info">
                  <div class="teacher-document-name">${doc.original_name}</div>
                  <div class="teacher-document-meta">
                    <span>${uploadDate}</span>
                    <span>${fileSize}</span>
                    ${doc.file_type ? `<span>${doc.file_type}</span>` : ""}
                  </div>
                  ${doc.description ? `<div class="teacher-document-description">${doc.description}</div>` : ""}
                </div>
                <div class="teacher-document-actions">
                  <button class="btn btn-view btn-sm" onclick="previewFile('${doc.file_path}', '${doc.original_name}', '${doc.file_type}')">
                    Переглянути
                  </button>
                  <button class="btn btn-download btn-sm" onclick="downloadDocument('${doc.file_path}', '${doc.original_name}')">
                    Завантажити
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deleteTeacherDocument(${doc.id})">
                    Видалити
                  </button>
                </div>
              </div>
            `
                    })
                    .join("")}
        </div>
      </div>
    `
        })
        .join("")
}

async function uploadFileByTeacher() {
    const competitionId = currentDocumentsCompetitionId
    const fileInput = document.getElementById("teacherFileInput")
    const fileDescription = document.getElementById("teacherFileDescription").value
    const studentId = document.getElementById("teacherFileStudent").value

    if (!fileInput.files[0]) {
        alert("Будь ласка, оберіть файл")
        return
    }

    if (!studentId) {
        alert("Будь ласка, оберіть учня")
        return
    }

    const maxSize = 50 * 1024 * 1024
    if (fileInput.files[0].size > maxSize) {
        alert("Файл занадто великий. Максимальний розмір: 50 МБ")
        return
    }

    const formData = new FormData()
    formData.append("file", fileInput.files[0])
    formData.append("userId", studentId)
    formData.append("description", fileDescription)
    formData.append("uploadedBy", userId)
    formData.append("uploadedByRole", userRole)

    try {
        const uploadBtn = document.querySelector("[onclick='uploadFileByTeacher()']")
        uploadBtn.disabled = true
        uploadBtn.textContent = "Завантаження..."

        const progressDiv = document.getElementById("teacherUploadProgress")
        progressDiv.style.display = "block"

        const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}/documents/upload-teacher`, {
            method: "POST",
            body: formData,
        })

        const data = await response.json()

        if (response.ok) {
            alert("Файл успішно завантажено!")
            document.getElementById("teacherFileInput").value = ""
            document.getElementById("teacherFileDescription").value = ""
            document.getElementById("teacherFileStudent").value = ""
            progressDiv.style.display = "none"
            await loadCompetitionDocuments(competitionId)
        } else {
            alert(`Помилка: ${data.error}`)
        }
    } catch (error) {
        console.error("Помилка завантаження файлу:", error)
        alert("Помилка завантаження файлу. Спробуйте ще раз.")
    } finally {
        const uploadBtn = document.querySelector("[onclick='uploadFileByTeacher()']")
        uploadBtn.disabled = false
        uploadBtn.textContent = "Завантажити файл"
        document.getElementById("teacherUploadProgress").style.display = "none"
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function getFileIcon(fileType) {
    if (!fileType) return "file"
    if (fileType.includes("pdf")) return "pdf"
    if (fileType.includes("word") || fileType.includes("document")) return "doc"
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "xls"
    if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "ppt"
    if (fileType.includes("image")) return "img"
    if (fileType.includes("video")) return "vid"
    if (fileType.includes("audio")) return "aud"
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive")) return "zip"
    if (fileType.includes("text")) return "txt"
    return "file"
}

function downloadDocument(filePath, originalName) {
    const link = document.createElement("a")
    link.href = `${BASE_URL}${filePath}`
    link.download = originalName
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

async function deleteTeacherDocument(documentId) {
    if (!confirm("Ви впевнені, що хочете видалити цей файл?")) {
        return
    }

    try {
        const response = await fetch(`${BASE_URL}/api/competitions/documents/${documentId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: userId,
                userRole: userRole,
            }),
        })

        const data = await response.json()

        if (response.ok) {
            alert(data.message)
            await loadCompetitionDocuments(currentDocumentsCompetitionId)
        } else {
            alert(data.error || "Помилка видалення файлу")
        }
    } catch (error) {
        console.error("Помилка видалення файлу:", error)
        alert("Помилка видалення файлу")
    }
}

function previewFile(filePath, fileName, fileType) {
    let modal = document.getElementById("filePreviewModal")
    if (!modal) {
        modal = document.createElement("div")
        modal.id = "filePreviewModal"
        modal.className = "modal"
        modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2 id="previewFileName">Перегляд файлу</h2>
          <button class="modal-close" onclick="closeFilePreview()">&times;</button>
        </div>
        <div class="modal-body" id="previewBody">
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="downloadPreviewBtn">Завантажити</button>
          <button class="btn btn-secondary" onclick="closeFilePreview()">Закрити</button>
        </div>
      </div>
    `
        document.body.appendChild(modal)
    }

    const previewBody = document.getElementById("previewBody")
    const fileNameElement = document.getElementById("previewFileName")
    const downloadBtn = document.getElementById("downloadPreviewBtn")

    fileNameElement.textContent = fileName
    modal.classList.add("active")

    downloadBtn.onclick = () => {
        downloadDocument(filePath, fileName)
    }
    downloadBtn.style.display = ""

    previewBody.innerHTML = ""

    if (fileType && fileType.includes("image")) {
        previewBody.innerHTML = `<img src="${BASE_URL}${filePath}" alt="${fileName}" class="file-preview-image">`
    } else if (fileType && fileType.includes("pdf")) {
        previewBody.innerHTML = `<iframe src="${BASE_URL}${filePath}" class="file-preview-iframe"></iframe>`
    } else if (
        fileType &&
        (fileType.includes("text") ||
            fileType.includes("javascript") ||
            fileType.includes("json") ||
            fileType.includes("xml"))
    ) {
        fetch(`${BASE_URL}${filePath}`)
            .then((response) => response.text())
            .then((text) => {
                previewBody.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f5f5f5; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${text}</pre>`
            })
            .catch((error) => {
                console.error("Error loading text file:", error)
                showUnsupportedPreview(fileName)
            })
    } else if (
        fileType &&
        (fileType.includes("word") ||
            fileType.includes("document") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet"))
    ) {
        previewBody.innerHTML = `<iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(
            BASE_URL + filePath,
        )}&embedded=true" class="file-preview-iframe"></iframe>`
    } else {
        showUnsupportedPreview(fileName)
    }
}

function showUnsupportedPreview(fileName) {
    const previewBody = document.getElementById("previewBody")
    previewBody.innerHTML = `
    <div class="file-preview-unsupported">
      <p><strong>${fileName}</strong></p>
      <p>Попередній перегляд недоступний для цього типу файлу</p>
      <p>Натисніть "Завантажити", щоб відкрити файл на вашому пристрої</p>
    </div>
  `
}

function closeFilePreview() {
    const modal = document.getElementById("filePreviewModal")
    if (modal) {
        modal.classList.remove("active")
        const downloadBtn = document.getElementById("downloadPreviewBtn")
        if (downloadBtn) downloadBtn.style.display = ""
    }
}

function viewFormResponse(formData, studentName) {
    let modal = document.getElementById("filePreviewModal")
    if (!modal) {
        modal = document.createElement("div")
        modal.id = "filePreviewModal"
        modal.className = "modal"
        modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2 id="previewFileName">Перегляд файлу</h2>
          <button class="modal-close" onclick="closeFilePreview()">&times;</button>
        </div>
        <div class="modal-body" id="previewBody">
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="downloadPreviewBtn" style="display:none;">Завантажити</button>
          <button class="btn btn-secondary" onclick="closeFilePreview()">Закрити</button>
        </div>
      </div>
    `
        document.body.appendChild(modal)
    }

    const previewBody = document.getElementById("previewBody")
    const fileNameElement = document.getElementById("previewFileName")
    const downloadBtn = document.getElementById("downloadPreviewBtn")

    fileNameElement.textContent = `Відповіді форми: ${studentName}`
    modal.classList.add("active")

    downloadBtn.style.display = "none"

    let responses = formData
    if (typeof formData === "string") {
        try {
            responses = JSON.parse(formData)
        } catch (e) {
            console.error("Error parsing form data:", e)
            responses = {}
        }
    }

    let formHTML = '<div class="form-response-view">'

    if (typeof responses === "object" && responses !== null) {
        formHTML += '<div class="form-responses-list">'
        for (const [label, value] of Object.entries(responses)) {
            formHTML += `
        <div class="form-response-field">
          <div class="form-response-label">${label}</div>
          <div class="form-response-value">${Array.isArray(value) ? value.join(", ") : value || "<em>Не заповнено</em>"}</div>
        </div>
      `
        }
        formHTML += "</div>"
    } else {
        formHTML += "<p>Немає даних відповідей</p>"
    }

    formHTML += "</div>"

    previewBody.innerHTML = formHTML
}

// === Responses section ===

function exportResponsesToExcel() {
    if (!currentResponses || currentResponses.length === 0) {
        alert("Немає відповідей для експорту")
        return
    }

    const headers = ["ПІБ учня", "Дата відправки"]
    const firstResponse = currentResponses[0]
    let formDataForHeaders = {}
    try {
        formDataForHeaders =
            typeof firstResponse.form_data === "string" ? JSON.parse(firstResponse.form_data) : firstResponse.form_data || {}
    } catch (e) {
        console.error("Помилка парсингу form_data для заголовків:", e)
    }

    Object.keys(formDataForHeaders).forEach((key) => {
        headers.push(key)
    })

    let csvContent = headers.join(",") + "\n"

    currentResponses.forEach((response) => {
        let data = {}
        try {
            data = typeof response.form_data === "string" ? JSON.parse(response.form_data) : response.form_data || {}
        } catch (e) {
            console.error("Помилка парсингу form_data для рядка:", e)
        }

        const fullName =
            response.first_name && response.last_name
                ? `${response.last_name} ${response.first_name}`
                : data.fullName || data["ПІБ"] || "Невідомий"

        const row = [fullName, new Date(response.submitted_at).toLocaleString("uk-UA")]

        Object.keys(formDataForHeaders).forEach((key) => {
            const cellValue = String(data[key] || "").replace(/"/g, '""')
            row.push(cellValue)
        })

        csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n"
    })

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `відповіді_${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

let currentResponsesCompetitionId = null

async function openViewResponsesModal(competitionId) {
    currentResponsesCompetitionId = competitionId
    const competition = allCompetitions.find((c) => c.id === competitionId)

    const modal = document.getElementById("viewResponsesModal")
    const titleElement = document.getElementById("responsesModalTitle")
    const container = document.getElementById("responsesModalContainer")

    titleElement.textContent = competition ? `Відповіді учнів: ${competition.title}` : "Відповіді учнів"

    modal.classList.add("active")
    container.innerHTML = '<div class="loading">Завантаження відповідей...</div>'

    try {
        const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}/form-responses`)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        currentResponses = data.responses || []
        displayFormResponsesModal(currentResponses)

        const searchInput = document.getElementById("searchResponsesModal")
        searchInput.value = ""
        searchInput.oninput = (e) => {
            const searchTerm = e.target.value.toLowerCase()
            const filtered = currentResponses.filter((response) =>
                (response.student_name || response.first_name || response.last_name || "").toLowerCase().includes(searchTerm)
            )
            displayFormResponsesModal(filtered)
        }
    } catch (error) {
        console.error("Помилка завантаження відповідей:", error)
        container.innerHTML = '<div class="empty-state"><p>Помилка завантаження відповідей</p></div>'
    }
}

function closeViewResponsesModal() {
    const modal = document.getElementById("viewResponsesModal")
    modal.classList.remove("active")
    currentResponsesCompetitionId = null
}

function displayFormResponsesModal(responses) {
    const container = document.getElementById("responsesModalContainer")

    if (!responses || responses.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <h3>Поки немає відповідей</h3>
        <p>Відповіді учнів з'являться тут після заповнення форми реєстрації на конкурс</p>
      </div>
    `
        return
    }

    container.innerHTML = responses
        .map((response) => {
            const submittedDate = new Date(response.submitted_at).toLocaleString("uk-UA")
            let formData = {}
            try {
                formData = typeof response.form_data === "string" ? JSON.parse(response.form_data) : response.form_data || {}
            } catch (e) {
                console.error("Помилка парсингу form_data:", e)
                formData = {}
            }

            const fullName =
                response.first_name && response.last_name
                    ? `${response.last_name} ${response.first_name}`
                    : formData.fullName || formData["ПІБ"] || response.email || "Невідомий учень"

            const initials = fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()

            return `
      <div class="response-item">
        <div class="response-header">
          <div class="response-student-info">
            ${response.avatar
                    ? `<img src="${response.avatar}" alt="Avatar" class="response-avatar-img">`
                    : `<div class="response-avatar">${initials}</div>`
                }
            <div class="response-student-details">
              <h4>${fullName}</h4>
              <p>${response.email || "Немає email"}</p>
              ${response.grade ? `<p>Клас: ${response.grade}</p>` : ""}
            </div>
          </div>
          <div class="response-date">
            ${submittedDate}
          </div>
        </div>
        <div class="response-body">
          <h4>Відповіді на форму:</h4>
          ${Object.entries(formData)
                    .map(
                        ([key, value]) => `
            <div class="response-field">
              <div class="response-field-label">${key}:</div>
              <div class="response-field-value">${Array.isArray(value) ? value.join(", ") : value || "-"}</div>
            </div>
          `
                    )
                    .join("")}
        </div>
      </div>
    `
        })
        .join("")
}
