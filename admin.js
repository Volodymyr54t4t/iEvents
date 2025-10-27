const ADMIN_PASSWORD = "319560"
let currentUserId = null

// Admin authentication
document.getElementById("adminAuthForm").addEventListener("submit", (e) => {
  e.preventDefault()
  const password = document.getElementById("adminPassword").value
  const errorDiv = document.getElementById("authError")

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

    try {
      const response = await fetch("http://localhost:3000/api/admin/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, role: newRole }),
      })

      if (response.ok) {
        closeRoleModal()
        loadUsers()
      }
    } catch (error) {
      console.error("Error changing role:", error)
    }
  })
})
