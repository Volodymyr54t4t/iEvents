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

const ADMIN_PASSWORD = "319560"
let currentUserId = null
let isSuperMethodist = false
let currentEditingCompetitionId = null
let currentEditingResultId = null
const currentEditingSchoolId = null
const currentEditingSubjectId = null
let allUsers = []
let allCompetitions = []
let allResults = []
let allSchools = []
let allSubjects = []
let competitionParticipants = []

// Admin authentication
document.getElementById("adminAuthForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const password = document.getElementById("adminPassword").value
  const errorDiv = document.getElementById("authError")

  const loggedInUserId = localStorage.getItem("userId")
  if (loggedInUserId) {
    try {
      const response = await fetch(`${BASE_URL}/api/user/is-super-methodist/${loggedInUserId}`)
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
  await Promise.all([loadUsers(), loadCompetitions(), loadResults(), loadSchools(), loadSubjects()])
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

// ==================== USERS ====================
async function loadUsers() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users`)
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
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
    const row = document.createElement("tr")
    row.innerHTML = `
      <td><span class="id-badge">${user.id}</span></td>
      <td>${user.email}</td>
      <td>${fullName || "-"}</td>
      <td>${user.phone || "-"}</td>
      <td>${user.telegram || "-"}</td>
      <td><span class="role-badge ${user.role}">${user.role}</span></td>
      <td><span class="date-badge">${new Date(user.created_at).toLocaleDateString("uk-UA")}</span></td>
      <td class="action-cell">
        <button class="btn-action btn-edit" onclick="openRoleModal(${user.id}, '${user.email}', '${user.role}')">Змінити</button>
        <button class="btn-action btn-delete" onclick="deleteUser(${user.id}, '${user.email}')">Видалити</button>
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
    const response = await fetch(`${BASE_URL}/api/admin/all-participants`)
    const data = await response.json()
    if (response.ok) {
      document.getElementById("totalParticipations").textContent = data.participants.length
    }
  } catch (error) {
    console.error("Error loading participations count:", error)
  }

  try {
    const response = await fetch(`${BASE_URL}/api/competitions`)
    const data = await response.json()
    if (response.ok) {
      document.getElementById("totalCompetitions").textContent = data.competitions.length
    }
  } catch (error) {
    console.error("Error loading competitions count:", error)
  }
}

document.getElementById("filterUserEmail")?.addEventListener("input", applyUserFilters)
document.getElementById("filterUserName")?.addEventListener("input", applyUserFilters)
document.getElementById("filterUserPhone")?.addEventListener("input", applyUserFilters)
document.getElementById("filterUserTelegram")?.addEventListener("input", applyUserFilters)
document.getElementById("filterUserRole")?.addEventListener("change", applyUserFilters)

function applyUserFilters() {
  const emailFilter = document.getElementById("filterUserEmail")?.value.toLowerCase() || ""
  const nameFilter = document.getElementById("filterUserName")?.value.toLowerCase() || ""
  const phoneFilter = document.getElementById("filterUserPhone")?.value.toLowerCase() || ""
  const telegramFilter = document.getElementById("filterUserTelegram")?.value.toLowerCase() || ""
  const roleFilter = document.getElementById("filterUserRole")?.value || ""

  const filtered = allUsers.filter((user) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase()

    return (
      (emailFilter === "" || user.email.toLowerCase().includes(emailFilter)) &&
      (nameFilter === "" || fullName.includes(nameFilter)) &&
      (phoneFilter === "" || (user.phone || "").toLowerCase().includes(phoneFilter)) &&
      (telegramFilter === "" || (user.telegram || "").toLowerCase().includes(telegramFilter)) &&
      (roleFilter === "" || user.role === roleFilter)
    )
  })

  displayUsers(filtered)
}

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const newRole = btn.dataset.role

    if (newRole === "методист" && !isSuperMethodist) {
      alert("Тільки головний методист може призначати роль методиста")
      return
    }

    try {
      const response = await fetch(`${BASE_URL}/api/admin/change-role`, {
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

async function deleteUser(userId, email) {
  if (!confirm(`Видалити користувача ${email}?`)) return

  try {
    const response = await fetch(`${BASE_URL}/api/admin/delete-user/${userId}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Користувача видалено", "success")
      await loadUsers()
    } else {
      showNotification("Помилка видалення", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка видалення", "error")
  }
}

function openRoleModal(userId, email, currentRole) {
  currentUserId = userId
  document.getElementById("modalUserInfo").textContent = `${email} (Роль: ${currentRole})`

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
    alert("Тільки головний методист може створювати методистів")
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
    const response = await fetch(`${BASE_URL}/api/admin/create-user`, {
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

// ==================== COMPETITIONS ====================
async function loadCompetitions() {
  try {
    const response = await fetch(`${BASE_URL}/api/competitions`)
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
        <td colspan="10" class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-text">Конкурсів поки немає</div>
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
      <td><strong>${comp.title}</strong></td>
      <td><span class="badge">${comp.level || "-"}</span></td>
      <td>${comp.organizer || "-"}</td>
      <td><span class="date-badge">${new Date(comp.start_date).toLocaleDateString("uk-UA")}</span></td>
      <td><span class="date-badge">${new Date(comp.end_date).toLocaleDateString("uk-UA")}</span></td>
      <td><span class="participant-count">${comp.participants_count || 0}</span></td>
      <td>${comp.location || "-"}</td>
      <td><span class="status-badge ${status}">${status}</span></td>
      <td class="action-cell">
        <button class="btn-action btn-edit" onclick="editCompetition(${comp.id})">Редагувати</button>
        <button class="btn-action btn-delete" onclick="deleteCompetition(${comp.id})">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

document.getElementById("filterCompTitle")?.addEventListener("input", applyCompetitionFilters)
document.getElementById("filterCompStartDate")?.addEventListener("change", applyCompetitionFilters)
document.getElementById("filterCompEndDate")?.addEventListener("change", applyCompetitionFilters)
document.getElementById("filterCompStatus")?.addEventListener("change", applyCompetitionFilters)

function applyCompetitionFilters() {
  const titleFilter = document.getElementById("filterCompTitle")?.value.toLowerCase() || ""
  const startDateFilter = document.getElementById("filterCompStartDate")?.value || ""
  const endDateFilter = document.getElementById("filterCompEndDate")?.value || ""
  const statusFilter = document.getElementById("filterCompStatus")?.value || ""

  const filtered = allCompetitions.filter((comp) => {
    const compStatus = comp.manual_status || getCompetitionStatus(comp.start_date, comp.end_date)
    const compStartDate = comp.start_date.split("T")[0]
    const compEndDate = comp.end_date.split("T")[0]

    return (
      (titleFilter === "" || comp.title.toLowerCase().includes(titleFilter)) &&
      (startDateFilter === "" || compStartDate >= startDateFilter) &&
      (endDateFilter === "" || compEndDate <= endDateFilter) &&
      (statusFilter === "" || compStatus === statusFilter)
    )
  })

  displayCompetitions(filtered)
}

function getCompetitionStatus(startDate, endDate) {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end < now) return "завершений"
  if (start > now) return "майбутній"
  return "активний"
}

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
      ? `${BASE_URL}/api/competitions/${currentEditingCompetitionId}`
      : `${BASE_URL}/api/competitions`

    const method = currentEditingCompetitionId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const message = currentEditingCompetitionId ? "Конкурс оновлено" : "Конкурс створено"
      showNotification(message, "success")
      closeCompetitionModal()
      await loadCompetitions()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка", "error")
  }
})

async function deleteCompetition(id) {
  if (!confirm("Видалити конкурс? Це також видалить всіх учасників і результати.")) return

  try {
    const response = await fetch(`${BASE_URL}/api/competitions/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Конкурс видалено", "success")
      await loadCompetitions()
    } else {
      showNotification("Помилка видалення", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка видалення", "error")
  }
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

// ==================== RESULTS ====================
async function loadResults() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/all-results`)
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
        <td colspan="11" class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">Результатів поки немає</div>
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
      <td><strong>${result.competition_title}</strong></td>
      <td>${studentName}</td>
      <td><span class="grade-badge">${result.grade || "-"}</span></td>
      <td>${result.place ? `<span class="place-badge place-${result.place}">${result.place} місце</span>` : "-"}</td>
      <td>${result.score ? `<span class="score-badge">${result.score}</span>` : "-"}</td>
      <td><span class="achievement-badge">${result.achievement || "-"}</span></td>
      <td>${result.school || "-"}</td>
      <td><span class="notes-text">${result.notes ? (result.notes.length > 30 ? result.notes.substring(0, 30) + "..." : result.notes) : "-"}</span></td>
      <td><span class="date-badge">${new Date(result.added_at).toLocaleDateString("uk-UA")}</span></td>
      <td class="action-cell">
        <button class="btn-action btn-edit" onclick="editResult(${result.id})">Редагувати</button>
        <button class="btn-action btn-delete" onclick="deleteResult(${result.id})">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

document.getElementById("filterResultCompetition")?.addEventListener("input", applyResultFiltersNew)
document.getElementById("filterResultStudent")?.addEventListener("input", applyResultFiltersNew)
document.getElementById("filterResultPlace")?.addEventListener("change", applyResultFiltersNew)
document.getElementById("filterResultGrade")?.addEventListener("change", applyResultFiltersNew)
document.getElementById("filterResultAchievement")?.addEventListener("change", applyResultFiltersNew)

function applyResultFiltersNew() {
  const competitionFilter = document.getElementById("filterResultCompetition")?.value.toLowerCase() || ""
  const studentFilter = document.getElementById("filterResultStudent")?.value.toLowerCase() || ""
  const placeFilter = document.getElementById("filterResultPlace")?.value || ""
  const gradeFilter = document.getElementById("filterResultGrade")?.value || ""
  const achievementFilter = document.getElementById("filterResultAchievement")?.value || ""

  const filtered = allResults.filter((result) => {
    const studentName = `${result.first_name || ""} ${result.last_name || ""}`.toLowerCase()

    return (
      (competitionFilter === "" || result.competition_title.toLowerCase().includes(competitionFilter)) &&
      (studentFilter === "" ||
        studentName.includes(studentFilter) ||
        result.email.toLowerCase().includes(studentFilter)) &&
      (placeFilter === "" ||
        (placeFilter === "other" ? result.place && result.place > 3 : result.place === Number.parseInt(placeFilter))) &&
      (gradeFilter === "" || result.grade === gradeFilter) &&
      (achievementFilter === "" || result.achievement === achievementFilter)
    )
  })

  displayResults(filtered)
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

document.getElementById("resultCompetition")?.addEventListener("change", async (e) => {
  const competitionId = e.target.value
  const studentSelect = document.getElementById("resultStudent")

  if (!competitionId) {
    studentSelect.innerHTML = '<option value="">Спочатку оберіть конкурс</option>'
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/competitions/${competitionId}/participants-with-results`)
    const data = await response.json()

    if (response.ok) {
      competitionParticipants = data.participants
      studentSelect.innerHTML = '<option value="">Оберіть учня</option>'

      if (competitionParticipants.length === 0) {
        studentSelect.innerHTML = '<option value="">Немає учасників</option>'
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
    console.error("Error:", error)
    showNotification("Помилка завантаження учасників", "error")
  }
})

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
    const url = currentEditingResultId ? `${BASE_URL}/api/results/${currentEditingResultId}` : `${BASE_URL}/api/results`
    const method = currentEditingResultId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const message = currentEditingResultId ? "Результат оновлено" : "Результат додано"
      showNotification(message, "success")
      closeResultModal()
      await loadResults()
    } else {
      const errorData = await response.json()
      showNotification(errorData.error || "Помилка", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка", "error")
  }
})

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
    const response = await fetch(`${BASE_URL}/api/competitions/${result.competition_id}/participants-with-results`)
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
    console.error("Error:", error)
  }

  document.getElementById("resultPlace").value = result.place || ""
  document.getElementById("resultScore").value = result.score || ""
  document.getElementById("resultAchievement").value = result.achievement || ""
  document.getElementById("resultNotes").value = result.notes || ""

  document.getElementById("resultModal").classList.add("show")
}

async function deleteResult(id) {
  if (!confirm("Видалити результат?")) return

  try {
    const response = await fetch(`${BASE_URL}/api/results/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Результат видалено", "success")
      await loadResults()
    } else {
      showNotification("Помилка видалення", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка видалення", "error")
  }
}

// ==================== SCHOOLS ====================
async function loadSchools() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/schools`)
    const data = await response.json()

    if (response.ok) {
      allSchools = data.schools
      displaySchools(allSchools)
    }
  } catch (error) {
    console.error("Error loading schools:", error)
  }
}

function displaySchools(schools) {
  const tbody = document.getElementById("schoolsTableBody")
  if (!tbody) return

  tbody.innerHTML = ""

  schools.forEach((school) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td><span class="id-badge">${school.id}</span></td>
      <td>${school.name}</td>
      <td class="action-cell">
        <button class="btn-action btn-delete" onclick="deleteSchool(${school.id})">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

async function deleteSchool(id) {
  if (!confirm("Видалити школу?")) return

  try {
    const response = await fetch(`${BASE_URL}/api/admin/schools/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Школу видалено", "success")
      await loadSchools()
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка видалення", "error")
  }
}

// ==================== SUBJECTS ====================
async function loadSubjects() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/subjects`)
    const data = await response.json()

    if (response.ok) {
      allSubjects = data.subjects
      displaySubjects(allSubjects)
    }
  } catch (error) {
    console.error("Error loading subjects:", error)
  }
}

function displaySubjects(subjects) {
  const tbody = document.getElementById("subjectsTableBody")
  if (!tbody) return

  tbody.innerHTML = ""

  subjects.forEach((subject) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td><span class="id-badge">${subject.id}</span></td>
      <td>${subject.name}</td>
      <td class="action-cell">
        <button class="btn-action btn-delete" onclick="deleteSubject(${subject.id})">Видалити</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

async function deleteSubject(id) {
  if (!confirm("Видалити предмет?")) return

  try {
    const response = await fetch(`${BASE_URL}/api/admin/subjects/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      showNotification("Предмет видалено", "success")
      await loadSubjects()
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Помилка видалення", "error")
  }
}

// ==================== STATISTICS ====================
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
    const response = await fetch(`${BASE_URL}/api/statistics/overview`)
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
    console.error("Error:", error)
  }
}

async function loadParticipationRate() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/participation-rate`)
    const data = await response.json()

    if (response.ok) {
      document.getElementById("participationRate").textContent = `${data.rate}%`
      document.getElementById("participatingStudents").textContent = data.participatingStudents
      document.getElementById("totalStudentsForRate").textContent = data.totalStudents
    }
  } catch (error) {
    console.error("Error:", error)
  }
}

async function loadStatsByGrade() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/class-details`)

    if (!response.ok) {
      return
    }

    const data = await response.json()

    const tbody = document.getElementById("statsByGradeTable")
    tbody.innerHTML = ""

    if (!data.classes || data.classes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">Немає даних</td>
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
  } catch (error) {
    console.error("Error:", error)
  }
}

async function loadTopStudents() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/top-students?limit=10`)
    const data = await response.json()

    if (response.ok) {
      const tbody = document.getElementById("topStudentsTable")
      tbody.innerHTML = ""

      if (data.students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">Немає даних</td>
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
    console.error("Error:", error)
  }
}

async function loadCompetitionStatistics() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/competitions-detailed`)

    if (!response.ok) {
      return
    }

    const data = await response.json()

    const tbody = document.getElementById("competitionStatsTable")
    tbody.innerHTML = ""

    if (!data.competitions || data.competitions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">Немає даних</td>
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
  } catch (error) {
    console.error("Error:", error)
  }
}

async function loadParticipationTimeline() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/participation-timeline`)
    const data = await response.json()

    if (response.ok) {
      const container = document.getElementById("participationTimeline")
      container.innerHTML = ""

      if (data.timeline.length === 0) {
        container.innerHTML = '<p class="empty-state">Немає даних</p>'
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
    console.error("Error:", error)
  }
}

async function loadSchoolStatistics() {
  try {
    const response = await fetch(`${BASE_URL}/api/statistics/by-school`)
    const data = await response.json()

    if (response.ok) {
      const tbody = document.getElementById("schoolStatsTable")
      tbody.innerHTML = ""

      if (data.schools.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state">Немає даних</td>
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
    console.error("Error:", error)
  }
}

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
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(() => console.log("Service Worker зареєстровано"))
    .catch(err => console.log("SW error:", err));
}
