// Universal API_URL constant
const API_URL = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://ievents-qf5k.onrender.com"

// Role management and access control

async function fetchAndUpdateRole() {
  const userId = localStorage.getItem("userId")

  if (!userId) {
    console.log("Немає userId, користувач не авторизований")
    return null
  }

  try {
    const response = await fetch(`${API_URL}/api/user/role/${userId}`)

    if (response.ok) {
      const data = await response.json()
      const newRole = data.role

      localStorage.setItem("userRole", newRole)
      console.log("Роль оновлено з сервера:", newRole)

      return newRole
    } else {
      console.error("Не вдалося отримати роль:", response.status)
      return localStorage.getItem("userRole")
    }
  } catch (error) {
    console.error("Помилка отримання ролі:", error)
    return localStorage.getItem("userRole")
  }
}

async function checkPageAccess() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html"
  const userId = localStorage.getItem("userId")

  let userRole = localStorage.getItem("userRole")
  if (userId && !userRole) {
    console.log("Роль не знайдена в localStorage, отримуємо з сервера...")
    userRole = await fetchAndUpdateRole()
  }

  console.log("Перевірка доступу до сторінки:", currentPage, "Роль:", userRole)

  const pageAccess = {
    "index.html": ["учень", "вчитель", "методист", null],
    "competitionsP.html": ["учень"],
    "competitionsT.html": ["вчитель", "методист"],
    "profile.html": ["учень"],
    "profilesT.html": ["вчитель", "методист"],
    "admin.html": ["методист"],
    "results.html": ["вчитель", "методист"],
    "statistics.html": ["вчитель", "методист"],
    "predictions.html": ["вчитель", "методист"],
    "auth.html": [null],
  }

  const allowedRoles = pageAccess[currentPage]

  if (!allowedRoles) {
    console.log("Сторінка не в списку контролю доступу, дозволяємо доступ")
    return true
  }

  if (!userId) {
    if (allowedRoles.includes(null)) {
      console.log("Гостьовий доступ дозволено")
      return true
    } else {
      console.log("Доступ заборонено: потрібна авторизація")
      alert("Будь ласка, увійдіть в систему")
      window.location.href = "auth.html"
      return false
    }
  }

  if (allowedRoles.includes(userRole)) {
    console.log("Доступ дозволено для ролі:", userRole)
    return true
  } else {
    console.log("Доступ заборонено: недостатньо прав")
    alert(`У вас немає доступу до цієї сторінки. Ваша роль: ${userRole}`)
    window.location.href = "index.html"
    return false
  }
}

async function initializeRoleAndAccess() {
  const role = await fetchAndUpdateRole()
  await checkPageAccess()
}

// Watch for role changes
window.addEventListener("storage", (e) => {
  if (e.key === "userRole") {
    console.log("Роль змінена в storage, оновлення хедера та перевірка доступу")
    checkPageAccess()
    if (typeof renderHeader === "function") {
      renderHeader()
    }
  }
})

// Poll for role updates every 30 seconds
setInterval(async () => {
  const currentRole = localStorage.getItem("userRole")
  const newRole = await fetchAndUpdateRole()

  if (newRole && newRole !== currentRole) {
    console.log("Роль змінена з", currentRole, "на", newRole)
    await checkPageAccess()
    if (typeof renderHeader === "function") {
      renderHeader()
    }
  }
}, 30000)

document.addEventListener("DOMContentLoaded", initializeRoleAndAccess)