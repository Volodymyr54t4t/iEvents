// Universal API_URL constant at the beginning
const API_URL = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://ievents-qf5k.onrender.com"

// Role management and dynamic header rendering

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
    "competitions.html": ["учень", "вчитель", "методист"],
    "profile.html": ["учень", "вчитель", "методист"],
    "admin.html": ["методист"],
    "results.html": ["вчитель", "методист"],
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

function renderHeader(role) {
  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail")
  const header = document.getElementById("header")

  if (!header) return

  if (!userId) {
    header.innerHTML = `
      <header class="site-header">
        <div class="header-container">
          <a href="index.html" class="logo">🎯 iEvents</a>
          <nav class="nav">
            <a href="auth.html" class="btn btn-primary">Вхід</a>
            <a href="auth.html" class="btn btn-secondary">Реєстрація</a>
          </nav>
          <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
    `
    addHeaderStyles()
    return
  }

  let navLinks = ""

  switch (role) {
    case "учень":
      navLinks = `
        <a href="index.html" class="nav-link">Головна</a>
        <a href="competitions.html" class="nav-link">Мої конкурси</a>
        <a href="profile.html" class="nav-link">Профіль</a>
      `
      break
    case "вчитель":
      navLinks = `
        <a href="index.html" class="nav-link">Головна</a>
        <a href="competitionsT.html" class="nav-link">Конкурси</a>
        <a href="results.html" class="nav-link">Результати</a>
        <a href="statistics.html" class="nav-link">Статистика</a>
        <a href="profile.html" class="nav-link">Профіль</a>
      `
      break
    case "методист":
      navLinks = `
        <a href="index.html" class="nav-link">Головна</a>
        <a href="competitionsT.html" class="nav-link">Конкурси</a>
        <a href="results.html" class="nav-link">Результати</a>
        <a href="statistics.html" class="nav-link">Статистика</a>
        <a href="profile.html" class="nav-link">Профіль</a>
        <a href="admin.html" class="nav-link">Адмін</a>
      `
      break
    default:
      navLinks = `
        <a href="index.html" class="nav-link">Головна</a>
        <a href="profile.html" class="nav-link">Профіль</a>
      `
  }

  header.innerHTML = `
    <header class="site-header">
      <div class="header-container">
        <a href="index.html" class="logo">🎯 iEvents</a>
        <nav class="nav" id="mainNav">
          ${navLinks}
          <div class="user-info">
            <span class="user-email">${userEmail}</span>
            <span class="user-role">${role}</span>
          </div>
          <button class="btn-logout" onclick="logout()">Вихід</button>
        </nav>
        <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  `

  addHeaderStyles()
}

function addHeaderStyles() {
  if (document.getElementById("header-styles")) return

  const style = document.createElement("style")
  style.id = "header-styles"
  style.textContent = `
    .site-header {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #2d3748;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .logo:hover {
      color: #667eea;
    }
    
    .nav {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    
    .nav-link {
      color: #4a5568;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
      white-space: nowrap;
    }
    
    .nav-link:hover {
      color: #667eea;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      padding: 8px 12px;
      background: #f7fafc;
      border-radius: 8px;
    }
    
    .user-email {
      font-size: 14px;
      color: #2d3748;
      font-weight: 500;
    }
    
    .user-role {
      font-size: 12px;
      color: #718096;
      padding: 2px 8px;
      background: #e2e8f0;
      border-radius: 4px;
    }
    
    .btn-logout {
      padding: 8px 16px;
      background: #fc8181;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .btn-logout:hover {
      background: #f56565;
      transform: translateY(-1px);
    }
    
    .btn-primary {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    
    .btn-primary:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      padding: 8px 16px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    
    .btn-secondary:hover {
      background: #667eea;
      color: white;
      transform: translateY(-1px);
    }
    
    .mobile-menu-toggle {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }
    
    .mobile-menu-toggle span {
      width: 24px;
      height: 3px;
      background: #2d3748;
      border-radius: 2px;
      transition: all 0.3s;
    }
    
    .mobile-menu-toggle.active span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
      opacity: 0;
    }
    
    .mobile-menu-toggle.active span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -6px);
    }
    
    @media (max-width: 768px) {
      .header-container {
        padding: 12px 16px;
      }
      
      .mobile-menu-toggle {
        display: flex;
      }
      
      .nav {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        flex-direction: column;
        gap: 0;
        padding: 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .nav.active {
        max-height: 500px;
        padding: 16px;
      }
      
      .nav-link {
        padding: 12px 16px;
        width: 100%;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .user-info {
        width: 100%;
        align-items: flex-start;
        margin: 8px 0;
      }
      
      .btn-logout {
        width: 100%;
        margin-top: 8px;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        text-align: center;
        margin: 4px 0;
      }
    }
    
    @media (max-width: 480px) {
      .logo {
        font-size: 20px;
      }
      
      .user-email {
        font-size: 12px;
      }
    }
  `
  document.head.appendChild(style)
}

function toggleMobileMenu() {
  const nav = document.getElementById("mainNav")
  const toggle = document.querySelector(".mobile-menu-toggle")

  if (nav) {
    nav.classList.toggle("active")
  }

  if (toggle) {
    toggle.classList.toggle("active")
  }
}

async function initializeRoleAndHeader() {
  const role = await fetchAndUpdateRole()
  await checkPageAccess()
  renderHeader(role)
}

window.addEventListener("storage", (e) => {
  if (e.key === "userRole") {
    console.log("Роль змінена в storage, оновлення хедера та перевірка доступу")
    checkPageAccess()
    renderHeader(e.newValue)
  }
})

setInterval(async () => {
  const currentRole = localStorage.getItem("userRole")
  const newRole = await fetchAndUpdateRole()

  if (newRole && newRole !== currentRole) {
    console.log("Роль змінена з", currentRole, "на", newRole)
    await checkPageAccess()
    renderHeader(newRole)
  }
}, 30000)

document.addEventListener("DOMContentLoaded", initializeRoleAndHeader)
