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

// Перевірка авторизації
const userId = localStorage.getItem("userId")

if (!userId) {
  window.location.href = "auth.html"
}

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadMyCompetitions()
  loadMyResults()
})

// Завантаження конкурсів користувача
async function loadMyCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const data = await response.json()

    if (response.ok) {
      const active = data.competitions.filter((c) => c.status === "активний")
      const upcoming = data.competitions.filter((c) => c.status === "майбутній")
      const inactive = data.competitions.filter((c) => c.status === "неактивний")

      displayCompetitions("activeCompetitions", active, "active")
      displayCompetitions("upcomingCompetitions", upcoming, "upcoming")
      displayCompetitions("inactiveCompetitions", inactive, "inactive")
    } else {
      console.error("Помилка завантаження конкурсів:", data.error)
      showError("activeCompetitions")
      showError("upcomingCompetitions")
      showError("inactiveCompetitions")
    }
  } catch (error) {
    console.error("Помилка:", error)
    showError("activeCompetitions")
    showError("upcomingCompetitions")
    showError("inactiveCompetitions")
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

  container.innerHTML = competitions
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
          daysInfo = `<div class="days-remaining">Залишилось днів: ${daysLeft}</div>`
        }
      } else if (type === "upcoming") {
        statusText = "Майбутній"
        statusClass = "upcoming"
        const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
        if (daysUntil > 0) {
          daysInfo = `<div class="days-remaining">Почнеться через ${daysUntil} днів</div>`
        }
      } else {
        statusText = "Завершено"
        statusClass = "inactive"
      }

      return `
        <div class="competition-card ${statusClass}">
          <h3 class="competition-title">${competition.title}</h3>
          <span class="status-badge status-${statusClass}">${statusText}</span>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          <div class="competition-dates">
            <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
            <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
          </div>
          ${daysInfo}
          ${
            type === "active" || type === "upcoming"
              ? `<button class="btn-upload" onclick="openUploadModal(${competition.id})">
              📎 Завантажити файл
            </button>`
              : ""
          }
        </div>
      `
    })
    .join("")
}

// Відображення помилки
function showError(containerId) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
    <div class="empty-state">
      <h3>Помилка завантаження</h3>
      <p>Спробуйте оновити сторінку</p>
    </div>
  `
}

async function loadMyResults() {
  const container = document.getElementById("myResults")
  container.innerHTML = '<div class="loading">Завантаження результатів...</div>'

  try {
    // Get all competitions the student participates in
    const competitionsResponse = await fetch(`${BASE_URL}/api/competitions/my/${userId}`)
    const competitionsData = await competitionsResponse.json()

    if (!competitionsResponse.ok || competitionsData.competitions.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>У вас поки немає результатів</p></div>'
      return
    }

    // Get results for each competition
    const allResults = []
    for (const competition of competitionsData.competitions) {
      try {
        const resultsResponse = await fetch(`${BASE_URL}/api/results/${competition.id}`)
        const resultsData = await resultsResponse.json()

        if (resultsResponse.ok && resultsData.results.length > 0) {
          // Filter results for current user
          const myResult = resultsData.results.find((r) => r.user_id === Number.parseInt(userId))
          if (myResult) {
            allResults.push({
              ...myResult,
              competition_title: competition.title,
              competition_date: competition.end_date,
            })
          }
        }
      } catch (error) {
        console.error(`Помилка завантаження результатів для конкурсу ${competition.id}:`, error)
      }
    }

    if (allResults.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>У вас поки немає результатів</p></div>'
      return
    }

    // Sort by date (newest first)
    allResults.sort((a, b) => new Date(b.competition_date) - new Date(a.competition_date))

    container.innerHTML = `
            <div class="results-grid">
                ${allResults
                  .map((result) => {
                    const date = new Date(result.competition_date).toLocaleDateString("uk-UA")
                    const placeEmoji =
                      result.place === 1 ? "🥇" : result.place === 2 ? "🥈" : result.place === 3 ? "🥉" : "🏅"

                    return `
                        <div class="result-card">
                            <div class="result-header">
                                <h3>${result.competition_title}</h3>
                                <span class="result-date">${date}</span>
                            </div>
                            <div class="result-body">
                                ${result.place ? `<div class="result-place">${placeEmoji} Місце: ${result.place}</div>` : ""}
                                ${result.score ? `<div class="result-score">📊 Бали: ${result.score}</div>` : ""}
                                <div class="result-achievement">🏆 ${result.achievement}</div>
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
    container.innerHTML = '<div class="empty-state"><p>Помилка завантаження результатів</p></div>'
  }
}

function openUploadModal(competitionId) {
  document.getElementById("uploadCompetitionId").value = competitionId
  document.getElementById("uploadFileModal").classList.add("active")
  document.getElementById("fileInput").value = ""
  document.getElementById("fileDescription").value = ""
  document.getElementById("uploadProgress").style.display = "none"
  loadMyDocuments(competitionId)
}

function closeUploadModal() {
  document.getElementById("uploadFileModal").classList.remove("active")
}

async function uploadFile() {
  const competitionId = document.getElementById("uploadCompetitionId").value
  const fileInput = document.getElementById("fileInput")
  const description = document.getElementById("fileDescription").value
  const file = fileInput.files[0]

  if (!file) {
    alert("Будь ласка, оберіть файл")
    return
  }

  // Перевірка розміру файлу (50MB)
  if (file.size > 50 * 1024 * 1024) {
    alert("Файл занадто великий. Максимальний розмір: 50 МБ")
    return
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("userId", userId)
  formData.append("description", description)

  const progressDiv = document.getElementById("uploadProgress")
  const progressFill = document.getElementById("progressFill")
  const progressText = document.getElementById("progressText")

  progressDiv.style.display = "block"
  progressText.textContent = "Завантаження..."
  progressFill.style.width = "0%"

  try {
    const xhr = new XMLHttpRequest()

    // Відстеження прогресу
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100
        progressFill.style.width = percentComplete + "%"
        progressText.textContent = `Завантаження... ${Math.round(percentComplete)}%`
      }
    })

    // Обробка завершення
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        progressText.textContent = "Файл успішно завантажено!"
        progressFill.style.width = "100%"

        setTimeout(() => {
          progressDiv.style.display = "none"
          fileInput.value = ""
          document.getElementById("fileDescription").value = ""
          loadMyDocuments(competitionId)
        }, 1500)
      } else {
        const error = JSON.parse(xhr.responseText)
        alert(`Помилка: ${error.error || "Не вдалося завантажити файл"}`)
        progressDiv.style.display = "none"
      }
    })

    // Обробка помилок
    xhr.addEventListener("error", () => {
      alert("Помилка завантаження файлу")
      progressDiv.style.display = "none"
    })

    xhr.open("POST", `${BASE_URL}/api/competitions/${competitionId}/documents/upload`)
    xhr.send(formData)
  } catch (error) {
    console.error("Помилка завантаження файлу:", error)
    alert("Помилка завантаження файлу")
    progressDiv.style.display = "none"
  }
}

async function loadMyDocuments(competitionId) {
  const container = document.getElementById("myDocumentsList")
  container.innerHTML = '<div class="loading">Завантаження...</div>'

  try {
    const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}/documents/my/${userId}`)
    const data = await response.json()

    if (!response.ok) {
      container.innerHTML = '<div class="empty-state"><p>Помилка завантаження файлів</p></div>'
      return
    }

    if (data.documents.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Ви ще не завантажили жодного файлу</p></div>'
      return
    }

    container.innerHTML = data.documents
      .map((doc) => {
        const uploadDate = new Date(doc.uploaded_at).toLocaleDateString("uk-UA")
        const fileSize = (doc.file_size / 1024 / 1024).toFixed(2)

        return `
          <div class="document-item">
            <div class="document-info">
              <div class="document-name">📄 ${doc.original_name}</div>
              <div class="document-meta">
                <span>📅 ${uploadDate}</span>
                <span>💾 ${fileSize} МБ</span>
              </div>
              ${doc.description ? `<div class="document-description">${doc.description}</div>` : ""}
            </div>
            <div class="document-actions">
              <button class="btn btn-sm btn-primary" onclick="window.open('${BASE_URL}${doc.file_path}', '_blank')">
                Завантажити
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteDocument(${doc.id}, ${competitionId})">
                Видалити
              </button>
            </div>
          </div>
        `
      })
      .join("")
  } catch (error) {
    console.error("Помилка завантаження документів:", error)
    container.innerHTML = '<div class="empty-state"><p>Помилка завантаження файлів</p></div>'
  }
}

async function deleteDocument(documentId, competitionId) {
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
        userRole: "учень",
      }),
    })

    if (response.ok) {
      alert("Файл успішно видалено")
      loadMyDocuments(competitionId)
    } else {
      const data = await response.json()
      alert(`Помилка: ${data.error || "Не вдалося видалити файл"}`)
    }
  } catch (error) {
    console.error("Помилка видалення файлу:", error)
    alert("Помилка видалення файлу")
  }
}