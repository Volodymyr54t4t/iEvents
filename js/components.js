// Статичний хедер з роль-залежною навігацією
function renderHeader() {
  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail")
  const userRole = localStorage.getItem("userRole")

  const header = document.getElementById("header")
  if (!header) {
    console.error("[v0] Header element not found")
    return
  }

  if (!userId) {
    header.innerHTML = `
      <header class="site-header">
        <div class="header-container">
          <a href="index.html" class="logo">🎯 iEvents</a>
          <nav class="nav">
            <a href="auth.html" class="nav-link">Увійти</a>
          </nav>
        </div>
      </header>
    `
    return
  }

  // Навігаційні посилання в залежності від ролі
  const navLinks = {
    home: '<a href="index.html" class="nav-link">Головна</a>',
    competitions: {
      student: '<a href="competitionsP.html" class="nav-link">Конкурси</a>',
      teacher: '<a href="competitionsT.html" class="nav-link">Конкурси</a>',
      methodist: '<a href="competitionsT.html" class="nav-link">Конкурси</a>',
    },
    results: '<a href="results.html" class="nav-link">Результати</a>',
    statistics: '<a href="statistics.html" class="nav-link">Статистика</a>',
    predictions: '<a href="predictions.html" class="nav-link">Прогнози</a>',
    profile: {
      student: '<a href="profile.html" class="nav-link">Профіль</a>',
      teacher: '<a href="profilesT.html" class="nav-link">Профіль</a>',
      methodist: '<a href="profilesT.html" class="nav-link">Профіль</a>',
    },
    adminUser: '<a href="adminUser.html" class="nav-link">Адмін панель користувача</a>',
    adminTeacher: '<a href="adminTeacher.html" class="nav-link">Адмін панель вчителя</a>',
    admin: '<a href="admin.html" class="nav-link">Адмін панель методиста</a>',
  }

  let navigationHTML = navLinks.home

  if (userRole === "учень") {
    navigationHTML += navLinks.competitions.student
    navigationHTML += navLinks.adminUser
    navigationHTML += navLinks.profile.student
  } else if (userRole === "вчитель") {
    navigationHTML += navLinks.competitions.teacher
    navigationHTML += navLinks.results
    navigationHTML += navLinks.statistics
    navigationHTML += navLinks.predictions
    navigationHTML += navLinks.adminTeacher
    navigationHTML += navLinks.profile.teacher
  } else if (userRole === "методист") {
    navigationHTML += navLinks.competitions.methodist
    navigationHTML += navLinks.results
    navigationHTML += navLinks.statistics
    navigationHTML += navLinks.predictions
    navigationHTML += navLinks.profile.methodist
    navigationHTML += navLinks.admin
  }

  header.innerHTML = `
    <header class="site-header">
      <div class="header-container">
        <a href="index.html" class="logo">🎯 iEvents</a>
        <nav class="nav">
          ${navigationHTML}
          <div class="user-info">
            <span class="user-email">${userEmail}</span>
            <span class="user-role">${userRole}</span>
          </div>
          <button class="btn-logout" onclick="logout()">Вийти</button>
        </nav>
      </div>
    </header>
  `
}

// Футер компонент
function renderFooter() {
  const footer = document.getElementById("footer")
  if (!footer) return

  footer.innerHTML = `
    <footer class="site-footer">
      <div class="footer-container">
        <p>&copy; 2025 iEvents. Всі права захищені.</p>
        <div class="footer-links">
          <a href="#">Про нас</a>
          <a href="#">Контакти</a>
          <a href="#">Підтримка</a>
        </div>
      </div>
    </footer>
  `
}

// Функція виходу
function logout() {
  localStorage.clear()
  window.location.href = "auth.html"
}

function initComponents() {
  renderHeader()
  renderFooter()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initComponents)
} else {
  // DOM вже готовий
  initComponents()
}

setTimeout(initComponents, 100)