const ADMIN_PASSWORD = "319560"
let currentUserId = null
let isSuperMethodist = false
let currentEditingCompetitionId = null
let currentEditingResultId = null
let allUsers = []
let allCompetitions = []
let allResults = []
let competitionParticipants = []

// Admin authentication
document.getElementById("adminAuthForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const password = document.getElementById("adminPassword").value
  const errorDiv = document.getElementById("authError")

  const loggedInUserId = localStorage.getItem("userId")
  if (loggedInUserId) {
    try {
      const response = await fetch(`http://localhost:3000/api/user/is-super-methodist/${loggedInUserId}`)
      const data = await response.json()
      isSuperMethodist = data.isSuperMethodist

      if (isSuperMethodist) {
        document.getElementById("superMethodistBadge").style.display = "block"
      }
    } catch (error) {
      console.error("Error checking super methodist status:", error)
    }
  }

  if (password === ADMIN_PASSWORD) {
    document.getElementById("adminAuth").style.display = "none"
    document.getElementById("adminContent").style.display = "block"
    await initializeAdminPanel()
  } else {
    errorDiv.textContent = "Невірний пароль"
    errorDiv.classList.add("show")
  }
})

async function initializeAdminPanel() {
  await Promise.all([loadUsers(), loadCompetitions(), loadResults()])
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab

    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

    btn.classList.add("active")
    document.getElementById(`${tab}-section`).classList.add("active")

    if (tab === "statistics") {
      loadAllStatistics()
    }
  })
})

async function loadUsers() {
  try {
    const response = await fetch("http://localhost:3000/api/admin/users")
    const data = await response.json()

    if (response.ok) {
      allUsers = data.users
      displayUsers(allUsers)
      updateDashboardStats(allUsers)
    }
  } catch (error) {
    console.error("Error loading users:", error)
  }
}

function displayUsers(users) {
  const tbody = document.getElementById("usersTableBody")
  tbody.innerHTML = ""

  users.forEach((user) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td>${user.first_name || ""} ${user.last_name || ""}</td>
      <td>${user.phone || "-"}</td>
      <td>${user.telegram || "-"}</td>
      <td><span class="role-badge ${user.role}">${user.role}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString("uk-UA")}</td>
      <td>
        <button class="btn-action btn-edit" onclick="openRoleModal(${user.id}, '${user.email}', '${user.role}')">
          Змінити роль
        </button>
        <button class="btn-action btn-view" onclick="viewUserProfile(${user.id})">
          Профіль
        </button>
      </td>
    `
    tbody.appendChild(row)
  })
}

async function updateDashboardStats(users) {
  document.getElementById("totalUsers").textContent = users.length
  document.getElementById("totalStudents").textContent = users.filter((u) => u.role === "учень").length
  document.getElementById("totalTeachers").textContent = users.filter((u) => u.role === "вчитель").length
  document.getElementById("totalMethodists").textContent = users.filter((u) => u.role === "методист").length

  try {
    const response = await fetch("http://localhost:3000/api/admin/all-participants")
    const data = await response.json()
    if (response.ok) {
      document.getElementById("totalParticipations").textContent = data.participants.length
    }
  } catch (error) {
    console.error("Error loading participations count:", error)
  }

  try {
    const response = await fetch("http://localhost:3000/api/competitions")
    const data = await response.json()
    if (response.ok) {
      document.getElementById("totalCompetitions").textContent = data.competitions.length
    }
  } catch (error) {
    console.error("Error loading competitions count:", error)
  }
}

document.getElementById("userSearch")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase()
  const filtered = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchTerm)),
  )
  displayUsers(filtered)
})

async function loadCompetitions() {
  try {
    const response = await fetch("http://localhost:3000/api/competitions")
    const data = await response.json()

    if (response.ok) {
      allCompetitions = data.competitions
      displayCompetitions(allCompetitions)
      populateCompetitionFilters()
    }
  } catch (error) {
    console.error("Error loading competitions:", error)
    showNotification("Помилка завантаження конкурсів", "error")
  }
}

function displayCompetitions(competitions) {
  const tbody = document.getElementById("competitionsTableBody")
  tbody.innerHTML = ""

  if (competitions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-text">Конкурсів поки немає</div>
          <div class="empty-state-subtext">Натисніть "Додати конкурс" щоб створити перший конкурс</div>
        </td>
      </tr>
    `
    return
  }

  competitions.forEach((comp) => {
    const status = comp.manual_status || getCompetitionStatus(comp.start_date, comp.end_date)
    const row = document.createElement("tr")
    row.innerHTML = `
      <td><span class="id-badge">${comp.id}</span></td>
      <td><strong class="comp-title">${comp.title}</strong></td>
      <td><span class="comp-description">${comp.description ? (comp.description.length > 60 ? comp.description.substring(0, 60) + "..." : comp.description) : "-"}</span></td>
      <td><span class="date-badge">${new Date(comp.start_date).toLocaleDateString("uk-UA")}</span></td>
      <td><span class="date-badge">${new Date(comp.end_date).toLocaleDateString("uk-UA")}</span></td>
      <td><span class="participant-count">${comp.participants_count || 0} учнів</span></td>
      <td><span class="status-badge ${status}">${status}</span></td>
      <td class="action-cell">
        <button class="btn-action btn-edit" onclick="editCompetition(${comp.id})" title="Редагувати конкурс">Редагувати</button>
        <button class="btn-action btn-delete" onclick="deleteCompetition(${comp.id}, '${comp.title.replace(/'/g, "\\'")}')">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

function getCompetitionStatus(startDate, endDate) {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end < now) return "завершений"
  if (start > now) return "майбутній"
  return "активний"
}

function openRoleModal(userId, email, currentRole) {
  currentUserId = userId
  document.getElementById("modalUserInfo").textContent = `Користувач: ${email} (Поточна роль: ${currentRole})`

  const methodistBtn = document.querySelector('.role-btn[data-role="методист"]')
  if (methodistBtn) {
    methodistBtn.style.display = isSuperMethodist ? "inline-block" : "none"
  }

  document.getElementById("roleModal").classList.add("show")
}

function closeRoleModal() {
  document.getElementById("roleModal").classList.remove("show")
  currentUserId = null
}

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const newRole = btn.dataset.role

    if (newRole === "методист" && !isSuperMethodist) {
      alert("Тільки головний методист може призначати роль методиста")
      return
    }

    try {
      const response = await fetch("http://localhost:3000/api/admin/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, role: newRole }),
      })

      if (response.ok) {
        const loggedInUserId = localStorage.getItem("userId")

        if (currentUserId.toString() === loggedInUserId) {
          localStorage.setItem("userRole", newRole)

          if (typeof window.renderHeader === "function") {
            window.renderHeader(newRole)
          }
        }

        closeRoleModal()
        await loadUsers()
        alert(`Роль успішно змінено на: ${newRole}`)
      }
    } catch (error) {
      console.error("Error changing role:", error)
      alert("Помилка зміни ролі")
    }
  })
})

function openAddCompetitionModal() {
  currentEditingCompetitionId = null
  document.getElementById("competitionModalTitle").textContent = "Додати конкурс"
  document.getElementById("compTitle").value = ""
  document.getElementById("compDescription").value = ""
  const today = new Date().toISOString().split("T")[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  document.getElementById("compStartDate").value = today
  document.getElementById("compEndDate").value = nextMonth
  document.getElementById("compStatus").value = "auto"
  document.getElementById("competitionModal").classList.add("show")
}

async function editCompetition(id) {
  const comp = allCompetitions.find((c) => c.id === id)
  if (!comp) return

  currentEditingCompetitionId = id
  document.getElementById("competitionModalTitle").textContent = "Редагувати конкурс"
  document.getElementById("compTitle").value = comp.title
  document.getElementById("compDescription").value = comp.description || ""
  document.getElementById("compStartDate").value = comp.start_date.split("T")[0]
  document.getElementById("compEndDate").value = comp.end_date.split("T")[0]
  document.getElementById("compStatus").value = comp.manual_status || "auto"
  document.getElementById("competitionModal").classList.add("show")
}

function closeCompetitionModal() {
  document.getElementById("competitionModal").classList.remove("show")
  currentEditingCompetitionId = null
}

document.getElementById("competitionForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const startDate = document.getElementById("compStartDate").value
  const endDate = document.getElementById("compEndDate").value

  if (new Date(endDate) < new Date(startDate)) {
    showNotification("Дата закінчення не може бути раніше дати початку", "error")
    return
  }

  const statusValue = document.getElementById("compStatus").value
  const data = {
    title: document.getElementById("compTitle").value,
    description: document.getElementById("compDescription").value,
    startDate: startDate,
    endDate: endDate,
    manualStatus: statusValue === "auto" ? null : statusValue,
    createdBy: localStorage.getItem("userId"),
  }

  try {
    const url = currentEditingCompetitionId
      ? `http://localhost:3000/api/competitions/${currentEditingCompetitionId}`
      : "http://localhost:3000/api/competitions"

    const method = currentEditingCompetitionId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const message = currentEditingCompetitionId ? "Конкурс успішно оновлено" : "Конкурс успішно створено"
      showNotification(message, "success")
      closeCompetitionModal()
      await loadCompetitions()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка збереження конкурсу", "error")
    }
  } catch (error) {
    console.error("Error saving competition:", error)
    showNotification("Помилка збереження конкурсу", "error")
  }
})

async function deleteCompetition(id, title) {
  if (
    !confirm(
      `⚠️ Видалити конкурс "${title}"?\n\nУвага: Це також видалить:\n• Всіх учасників конкурсу\n• Всі результати конкурсу\n\nЦю дію неможливо скасувати!`,
    )
  )
    return

  try {
    const response = await fetch(`http://localhost:3000/api/competitions/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Конкурс успішно видалено", "success")
      await loadCompetitions()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка видалення конкурсу", "error")
    }
  } catch (error) {
    console.error("Error deleting competition:", error)
    showNotification("Помилка видалення конкурсу", "error")
  }
}

function viewUserProfile(userId) {
  window.open(`profile.html?userId=${userId}`, "_blank")
}

function openAddUserModal() {
  document.getElementById("newUserEmail").value = ""
  document.getElementById("newUserPassword").value = ""
  document.getElementById("newUserFirstName").value = ""
  document.getElementById("newUserLastName").value = ""
  document.getElementById("newUserRole").value = "учень"
  document.getElementById("newUserPhone").value = ""
  document.getElementById("newUserTelegram").value = ""

  const methodistOption = document.getElementById("methodistOption")
  if (methodistOption) {
    methodistOption.style.display = isSuperMethodist ? "block" : "none"
  }

  document.getElementById("addUserModal").classList.add("show")
}

function closeAddUserModal() {
  document.getElementById("addUserModal").classList.remove("show")
}

document.getElementById("addUserForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const role = document.getElementById("newUserRole").value

  if (role === "методист" && !isSuperMethodist) {
    alert("Тільки головний методист може створювати користувачів з роллю методиста")
    return
  }

  const userData = {
    email: document.getElementById("newUserEmail").value,
    password: document.getElementById("newUserPassword").value,
    firstName: document.getElementById("newUserFirstName").value,
    lastName: document.getElementById("newUserLastName").value,
    role: role,
    phone: document.getElementById("newUserPhone").value,
    telegram: document.getElementById("newUserTelegram").value,
  }

  try {
    const response = await fetch("http://localhost:3000/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })

    const data = await response.json()

    if (response.ok) {
      alert("Користувача успішно створено!")
      closeAddUserModal()
      await loadUsers()
    } else {
      alert(data.error || "Помилка створення користувача")
    }
  } catch (error) {
    console.error("Error creating user:", error)
    alert("Помилка створення користувача")
  }
})

function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification")
  if (existing) existing.remove()

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message

  document.body.appendChild(notification)

  setTimeout(() => notification.classList.add("show"), 10)

  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

document.getElementById("resultCompetition")?.addEventListener("change", async (e) => {
  const competitionId = e.target.value
  const studentSelect = document.getElementById("resultStudent")

  if (!competitionId) {
    studentSelect.innerHTML = '<option value="">Спочатку оберіть конкурс</option>'
    return
  }

  try {
    const response = await fetch(`http://localhost:3000/api/competitions/${competitionId}/participants-with-results`)
    const data = await response.json()

    if (response.ok) {
      competitionParticipants = data.participants
      studentSelect.innerHTML = '<option value="">Оберіть учня</option>'

      if (competitionParticipants.length === 0) {
        studentSelect.innerHTML = '<option value="">Немає учасників у цьому конкурсі</option>'
        return
      }

      const uniqueStudents = new Map()
      competitionParticipants.forEach((participant) => {
        if (!uniqueStudents.has(participant.student_id)) {
          uniqueStudents.set(participant.student_id, participant)
        }
      })

      uniqueStudents.forEach((participant) => {
        const studentName =
          participant.first_name && participant.last_name
            ? `${participant.last_name} ${participant.first_name} (${participant.grade || "клас не вказано"})`
            : participant.email

        const option = document.createElement("option")
        option.value = participant.student_id
        option.textContent = studentName
        studentSelect.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error loading participants:", error)
    showNotification("Помилка завантаження учасників", "error")
  }
})

async function loadResults() {
  try {
    const response = await fetch("http://localhost:3000/api/admin/all-results")
    const data = await response.json()

    if (response.ok) {
      allResults = data.results
      displayResults(allResults)
    }
  } catch (error) {
    console.error("Error loading results:", error)
    showNotification("Помилка завантаження результатів", "error")
  }
}

function displayResults(results) {
  const tbody = document.getElementById("resultsTableBody")
  tbody.innerHTML = ""

  if (results.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">Результатів поки немає</div>
          <div class="empty-state-subtext">Натисніть "Додати результат" щоб створити перший результат</div>
        </td>
      </tr>
    `
    return
  }

  results.forEach((result) => {
    const studentName =
      result.first_name && result.last_name ? `${result.last_name} ${result.first_name}` : result.email

    const row = document.createElement("tr")
    row.innerHTML = `
      <td><span class="id-badge">${result.id}</span></td>
      <td><strong class="comp-title">${result.competition_title}</strong></td>
      <td>${studentName}</td>
      <td><span class="grade-badge">${result.grade || "-"}</span></td>
      <td>${result.place ? `<span class="place-badge place-${result.place}">${result.place} місце</span>` : "-"}</td>
      <td>${result.score ? `<span class="score-badge">${result.score}</span>` : "-"}</td>
      <td><span class="achievement-badge ${result.achievement ? result.achievement.toLowerCase() : ""}">${result.achievement || "-"}</span></td>
      <td><span class="notes-text">${result.notes ? (result.notes.length > 40 ? result.notes.substring(0, 40) + "..." : result.notes) : "-"}</span></td>
      <td><span class="date-badge">${new Date(result.added_at).toLocaleDateString("uk-UA")}</span></td>
      <td class="action-cell">
        <button class="btn-action btn-edit" onclick="editResult(${result.id})" title="Редагувати результат">Редагувати</button>
        <button class="btn-action btn-delete" onclick="deleteResult(${result.id}, '${studentName.replace(/'/g, "\\'")}', '${result.competition_title.replace(/'/g, "\\'")}')">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

function populateCompetitionFilters() {
  const filterSelect = document.getElementById("resultCompetitionFilter")
  if (!filterSelect) return

  filterSelect.innerHTML = '<option value="all">Всі конкурси</option>'

  allCompetitions.forEach((comp) => {
    const option = document.createElement("option")
    option.value = comp.id
    option.textContent = comp.title
    filterSelect.appendChild(option)
  })
}

async function openAddResultModal() {
  currentEditingResultId = null
  document.getElementById("resultModalTitle").textContent = "Додати результат"

  const compSelect = document.getElementById("resultCompetition")
  compSelect.innerHTML = '<option value="">Оберіть конкурс</option>'
  allCompetitions.forEach((comp) => {
    const option = document.createElement("option")
    option.value = comp.id
    option.textContent = comp.title
    compSelect.appendChild(option)
  })

  document.getElementById("resultCompetition").value = ""
  document.getElementById("resultStudent").innerHTML = '<option value="">Спочатку оберіть конкурс</option>'
  document.getElementById("resultPlace").value = ""
  document.getElementById("resultScore").value = ""
  document.getElementById("resultNotes").value = ""

  document.getElementById("resultModal").classList.add("show")
}

document.getElementById("resultSearch")?.addEventListener("input", () => {
  applyResultFilters()
})

document.getElementById("resultCompetitionFilter")?.addEventListener("change", () => {
  applyResultFilters()
})

document.getElementById("resultPlaceFilter")?.addEventListener("change", () => {
  applyResultFilters()
})

document.getElementById("resultGradeFilter")?.addEventListener("change", () => {
  applyResultFilters()
})

document.getElementById("resultAchievementFilter")?.addEventListener("change", () => {
  applyResultFilters()
})

function applyResultFilters() {
  const searchTerm = document.getElementById("resultSearch")?.value.toLowerCase() || ""
  const competitionId = document.getElementById("resultCompetitionFilter")?.value || "all"
  const placeFilter = document.getElementById("resultPlaceFilter")?.value || "all"
  const gradeFilter = document.getElementById("resultGradeFilter")?.value || "all"
  const achievementFilter = document.getElementById("resultAchievementFilter")?.value || "all"

  let filtered = allResults

  if (searchTerm) {
    filtered = filtered.filter(
      (result) =>
        result.competition_title.toLowerCase().includes(searchTerm) ||
        (result.first_name && result.first_name.toLowerCase().includes(searchTerm)) ||
        (result.last_name && result.last_name.toLowerCase().includes(searchTerm)) ||
        result.email.toLowerCase().includes(searchTerm) ||
        (result.achievement && result.achievement.toLowerCase().includes(searchTerm)) ||
        (result.notes && result.notes.toLowerCase().includes(searchTerm)),
    )
  }

  if (competitionId !== "all") {
    filtered = filtered.filter((result) => result.competition_id === Number.parseInt(competitionId))
  }

  if (placeFilter !== "all") {
    if (placeFilter === "other") {
      filtered = filtered.filter((result) => result.place && result.place > 3)
    } else {
      filtered = filtered.filter((result) => result.place === Number.parseInt(placeFilter))
    }
  }

  if (gradeFilter !== "all") {
    filtered = filtered.filter((result) => {
      const resultGrade = result.grade ? Number.parseInt(result.grade) : null
      const filterGrade = Number.parseInt(gradeFilter)
      return resultGrade === filterGrade
    })
  }

  if (achievementFilter !== "all") {
    filtered = filtered.filter((result) => result.achievement === achievementFilter)
  }

  displayResults(filtered)
}

function closeResultModal() {
  document.getElementById("resultModal").classList.remove("show")
  currentEditingResultId = null
}

document.getElementById("resultForm")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const place = document.getElementById("resultPlace").value
  const score = document.getElementById("resultScore").value

  if (!place && !score) {
    showNotification("Вкажіть хоча б місце або бали", "error")
    return
  }

  const data = {
    competitionId: document.getElementById("resultCompetition").value,
    studentId: document.getElementById("resultStudent").value,
    place: place || null,
    score: score || null,
    achievement: document.getElementById("resultAchievement").value,
    notes: document.getElementById("resultNotes").value,
    addedBy: localStorage.getItem("userId"),
  }

  try {
    const url = currentEditingResultId
      ? `http://localhost:3000/api/results/${currentEditingResultId}`
      : "http://localhost:3000/api/results"

    const method = currentEditingResultId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const message = currentEditingResultId ? "Результат успішно оновлено" : "Результат успішно додано"
      showNotification(message, "success")
      closeResultModal()
      await loadResults()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка збереження результату", "error")
    }
  } catch (error) {
    console.error("Error saving result:", error)
    showNotification("Помилка збереження результату", "error")
  }
})

async function deleteResult(id, studentName, competitionTitle) {
  if (!confirm(`Видалити результат учня "${studentName}" у конкурсі "${competitionTitle}"?`)) return

  try {
    const response = await fetch(`http://localhost:3000/api/results/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Результат успішно видалено", "success")
      await loadResults()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка видалення результату", "error")
    }
  } catch (error) {
    console.error("Error deleting result:", error)
    showNotification("Помилка видалення результату", "error")
  }
}

async function editResult(id) {
  const result = allResults.find((r) => r.id === id)
  if (!result) return

  currentEditingResultId = id
  document.getElementById("resultModalTitle").textContent = "Редагувати результат"

  const compSelect = document.getElementById("resultCompetition")
  compSelect.innerHTML = '<option value="">Оберіть конкурс</option>'
  allCompetitions.forEach((comp) => {
    const option = document.createElement("option")
    option.value = comp.id
    option.textContent = comp.title
    if (comp.id === result.competition_id) option.selected = true
    compSelect.appendChild(option)
  })

  try {
    const response = await fetch(
      `http://localhost:3000/api/competitions/${result.competition_id}/participants-with-results`,
    )
    const data = await response.json()

    if (response.ok) {
      const studentSelect = document.getElementById("resultStudent")
      studentSelect.innerHTML = '<option value="">Оберіть учня</option>'

      const uniqueStudents = new Map()
      data.participants.forEach((participant) => {
        if (!uniqueStudents.has(participant.student_id)) {
          uniqueStudents.set(participant.student_id, participant)
        }
      })

      uniqueStudents.forEach((participant) => {
        const studentName =
          participant.first_name && participant.last_name
            ? `${participant.last_name} ${participant.first_name} (${participant.grade || "клас не вказано"})`
            : participant.email

        const option = document.createElement("option")
        option.value = participant.student_id
        option.textContent = studentName
        if (participant.student_id === result.user_id) option.selected = true
        studentSelect.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error loading participants:", error)
  }

  document.getElementById("resultPlace").value = result.place || ""
  document.getElementById("resultScore").value = result.score || ""
  document.getElementById("resultAchievement").value = result.achievement || ""
  document.getElementById("resultNotes").value = result.notes || ""

  document.getElementById("resultModal").classList.add("show")
}

function filterCompetitionsByStatus(status) {
  if (status === "all") {
    displayCompetitions(allCompetitions)
  } else {
    const filtered = allCompetitions.filter((comp) => {
      const compStatus = comp.manual_status || getCompetitionStatus(comp.start_date, comp.end_date)
      return compStatus === status
    })
    displayCompetitions(filtered)
  }
}

document.getElementById("competitionSearch")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase()
  const filtered = allCompetitions.filter(
    (comp) =>
      comp.title.toLowerCase().includes(searchTerm) ||
      (comp.description && comp.description.toLowerCase().includes(searchTerm)),
  )
  displayCompetitions(filtered)
})

async function loadAllStatistics() {
  try {
    await Promise.all([
      loadOverviewStatistics(),
      loadParticipationRate(),
      loadStatsByGrade(),
      loadTopStudents(),
      loadCompetitionStatistics(),
      loadParticipationTimeline(),
      loadSchoolStatistics(),
    ])
  } catch (error) {
    console.error("Error loading statistics:", error)
    showNotification("Помилка завантаження статистики", "error")
  }
}

async function loadOverviewStatistics() {
  try {
    const response = await fetch("http://localhost:3000/api/statistics/overview")
    const data = await response.json()

    if (response.ok) {
      document.getElementById("statsStudents").textContent = data.students
      document.getElementById("statsCompetitions").textContent = data.competitions
      document.getElementById("statsParticipations").textContent = data.participations
      document.getElementById("statsActiveCompetitions").textContent = data.activeCompetitions
      document.getElementById("statsUpcomingCompetitions").textContent = data.upcomingCompetitions
      document.getElementById("statsCompletedCompetitions").textContent = data.completedCompetitions
    }
  } catch (error) {
    console.error("Error loading overview statistics:", error)
  }
}

async function loadParticipationRate() {
  try {
    const response = await fetch("http://localhost:3000/api/statistics/participation-rate")
    const data = await response.json()

    if (response.ok) {
      document.getElementById("participationRate").textContent = `${data.rate}%`
      document.getElementById("participatingStudents").textContent = data.participatingStudents
      document.getElementById("totalStudentsForRate").textContent = data.totalStudents
    }
  } catch (error) {
    console.error("Error loading participation rate:", error)
  }
}

async function loadStatsByGrade() {
  try {
    console.log("[v0] Loading statistics by grade...")
    const response = await fetch("http://localhost:3000/api/statistics/class-details")

    console.log("[v0] Response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Server error response:", errorText)
      showNotification(`Помилка завантаження статистики по класах: ${response.status}`, "error")
      return
    }

    const data = await response.json()
    console.log("[v0] Statistics by grade response:", data)

    const tbody = document.getElementById("statsByGradeTable")
    tbody.innerHTML = ""

    if (!data.classes || data.classes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">Немає даних по класах</td>
        </tr>
      `
      return
    }

    data.classes.forEach((classData) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td><span class="grade-badge">${classData.grade} клас</span></td>
        <td>${classData.students_count}</td>
        <td>${classData.participations_count}</td>
        <td><span class="score-badge">${classData.average_score || "N/A"}</span></td>
        <td><span class="participation-badge">${classData.participation_rate || 0}%</span></td>
      `
      tbody.appendChild(row)
    })
    console.log("[v0] Statistics by grade loaded successfully")
  } catch (error) {
    console.error("[v0] Error loading stats by grade:", error)
    console.error("[v0] Error details:", error.message, error.stack)
    showNotification(`Помилка завантаження статистики по класах: ${error.message}`, "error")
  }
}

async function loadTopStudents() {
  try {
    const response = await fetch("http://localhost:3000/api/statistics/top-students?limit=10")
    const data = await response.json()

    if (response.ok) {
      const tbody = document.getElementById("topStudentsTable")
      tbody.innerHTML = ""

      if (data.students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">Немає даних про учнів</td>
          </tr>
        `
        return
      }

      data.students.forEach((student, index) => {
        const studentName =
          student.first_name && student.last_name ? `${student.last_name} ${student.first_name}` : student.email

        const placeClass = index < 3 ? `place-${index + 1}` : ""

        const row = document.createElement("tr")
        row.innerHTML = `
          <td><span class="place-badge ${placeClass}">${index + 1}</span></td>
          <td><strong>${studentName}</strong></td>
          <td><span class="grade-badge">${student.grade || "-"}</span></td>
          <td>${student.email}</td>
          <td><span class="participation-count">${student.participations_count}</span></td>
        `
        tbody.appendChild(row)
      })
    }
  } catch (error) {
    console.error("Error loading top students:", error)
  }
}

async function loadCompetitionStatistics() {
  try {
    console.log("[v0] Loading competition statistics...")
    const response = await fetch("http://localhost:3000/api/statistics/competitions-detailed")

    console.log("[v0] Response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Server error response:", errorText)
      showNotification(`Помилка завантаження статистики конкурсів: ${response.status}`, "error")
      return
    }

    const data = await response.json()
    console.log("[v0] Competition statistics response:", data)

    const tbody = document.getElementById("competitionStatsTable")
    tbody.innerHTML = ""

    if (!data.competitions || data.competitions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">Немає даних про конкурси</td>
        </tr>
      `
      return
    }

    data.competitions.forEach((comp) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td><strong>${comp.title}</strong></td>
        <td><span class="date-badge">${new Date(comp.start_date).toLocaleDateString("uk-UA")}</span></td>
        <td><span class="date-badge">${new Date(comp.end_date).toLocaleDateString("uk-UA")}</span></td>
        <td>${comp.participants_count}</td>
        <td><span class="score-badge">${comp.average_score || "N/A"}</span></td>
        <td><span class="status-badge ${comp.status}">${comp.status}</span></td>
      `
      tbody.appendChild(row)
    })
    console.log("[v0] Competition statistics loaded successfully")
  } catch (error) {
    console.error("[v0] Error loading competition statistics:", error)
    console.error("[v0] Error details:", error.message, error.stack)
    showNotification(`Помилка завантаження статистики конкурсів: ${error.message}`, "error")
  }
}

async function loadParticipationTimeline() {
  try {
    const response = await fetch("http://localhost:3000/api/statistics/participation-timeline")
    const data = await response.json()

    if (response.ok) {
      const container = document.getElementById("participationTimeline")
      container.innerHTML = ""

      if (data.timeline.length === 0) {
        container.innerHTML = '<p class="empty-state">Немає даних про участь</p>'
        return
      }

      const maxCount = Math.max(...data.timeline.map((t) => Number.parseInt(t.participations_count)))

      data.timeline.forEach((item) => {
        const percentage = (Number.parseInt(item.participations_count) / maxCount) * 100

        const bar = document.createElement("div")
        bar.className = "timeline-bar"
        bar.innerHTML = `
          <div class="timeline-label">${item.month}</div>
          <div class="timeline-bar-container">
            <div class="timeline-bar-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="timeline-value">${item.participations_count}</div>
        `
        container.appendChild(bar)
      })
    }
  } catch (error) {
    console.error("Error loading participation timeline:", error)
  }
}

async function loadSchoolStatistics() {
  try {
    const response = await fetch("http://localhost:3000/api/statistics/by-school")
    const data = await response.json()

    if (response.ok) {
      const tbody = document.getElementById("schoolStatsTable")
      tbody.innerHTML = ""

      if (data.schools.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">Немає даних про школи</td>
          </tr>
        `
        return
      }

      data.schools.forEach((school, index) => {
        const placeClass = index < 3 ? `place-${index + 1}` : ""

        const row = document.createElement("tr")
        row.innerHTML = `
          <td><span class="place-badge ${placeClass}">${index + 1}</span></td>
          <td><strong>${school.school}</strong></td>
          <td>${school.students_count}</td>
          <td><span class="participation-count">${school.participations_count}</span></td>
        `
        tbody.appendChild(row)
      })
    }
  } catch (error) {
    console.error("Error loading school statistics:", error)
  }
}
