const ADMIN_PASSWORD = "319560"
let currentUserId = null
let isSuperMethodist = false
let currentEditingCompetitionId = null
let allUsers = []
let allCompetitions = []

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
  await Promise.all([loadUsers(), loadCompetitions()])
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab

    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

    btn.classList.add("active")
    document.getElementById(`${tab}-section`).classList.add("active")
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

  // Load participations count
  try {
    const response = await fetch("http://localhost:3000/api/admin/all-participants")
    const data = await response.json()
    if (response.ok) {
      document.getElementById("totalParticipations").textContent = data.participants.length
    }
  } catch (error) {
    console.error("Error loading participations count:", error)
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

      document.getElementById("totalCompetitions").textContent = allCompetitions.length
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

const competitionSearchInput = document.createElement("input")
competitionSearchInput.type = "text"
competitionSearchInput.id = "competitionSearch"
competitionSearchInput.placeholder = "Пошук конкурсів..."
competitionSearchInput.className = "search-input"

competitionSearchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase()
  const filtered = allCompetitions.filter(
    (comp) =>
      comp.title.toLowerCase().includes(searchTerm) ||
      (comp.description && comp.description.toLowerCase().includes(searchTerm)),
  )
  displayCompetitions(filtered)
})

function filterCompetitionsByStatus(status) {
  if (status === "all") {
    displayCompetitions(allCompetitions)
  } else {
    const filtered = allCompetitions.filter((comp) => {
      const compStatus = getCompetitionStatus(comp.start_date, comp.end_date)
      return compStatus === status
    })
    displayCompetitions(filtered)
  }
}
