const ADMIN_PASSWORD = "319560"
let currentUserId = null
let isSuperMethodist = false

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
      console.log("[v0] Is super methodist:", isSuperMethodist)

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
    loadUsers()
  } else {
    errorDiv.textContent = "Невірний пароль"
    errorDiv.classList.add("show")
  }
})

// Load all users
async function loadUsers() {
  try {
    const response = await fetch("http://localhost:3000/api/admin/users")
    const data = await response.json()

    if (response.ok) {
      displayUsers(data.users)
      updateStats(data.users)
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
            <td>
                <button class="btn btn-change-role" onclick="openRoleModal(${user.id}, '${user.email}', '${user.role}')">
                    Змінити роль
                </button>
            </td>
        `
    tbody.appendChild(row)
  })
}

function updateStats(users) {
  document.getElementById("totalUsers").textContent = users.length
  document.getElementById("totalStudents").textContent = users.filter((u) => u.role === "учень").length
  document.getElementById("totalTeachers").textContent = users.filter((u) => u.role === "вчитель").length
  document.getElementById("totalMethodists").textContent = users.filter((u) => u.role === "методист").length
}

function openRoleModal(userId, email, currentRole) {
  currentUserId = userId
  document.getElementById("modalUserInfo").textContent = `Користувач: ${email} (Поточна роль: ${currentRole})`

  const methodistBtn = document.querySelector('.role-btn[data-role="методист"]')
  if (methodistBtn) {
    if (isSuperMethodist) {
      methodistBtn.style.display = "inline-block"
    } else {
      methodistBtn.style.display = "none"
    }
  }

  document.getElementById("roleModal").classList.add("show")
}

function closeRoleModal() {
  document.getElementById("roleModal").classList.remove("show")
  currentUserId = null
}

// Role change buttons
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
          console.log("[v0] Current user's role changed to:", newRole)

          if (typeof window.renderHeader === "function") {
            window.renderHeader(newRole)
          }
        }

        closeRoleModal()
        loadUsers()

        alert(`Роль успішно змінено на: ${newRole}`)
      }
    } catch (error) {
      console.error("Error changing role:", error)
      alert("Помилка зміни ролі")
    }
  })
})
