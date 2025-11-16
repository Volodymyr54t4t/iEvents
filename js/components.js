// Header component with role-based navigation
function renderHeader() {
  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail")
  const userRole = localStorage.getItem("userRole")

  const header = document.getElementById("header")
  if (!header) return

  if (!userId) {
    header.innerHTML = `
      <header class="site-header">
        <div class="header-container">
          <a href="index.html" class="logo">🎯 iEvents</a>
          <nav class="nav">
            <a href="index.html" class="nav-link">Головна</a>
            <button class="btn-login" onclick="window.location.href='auth.html'">Вхід / Реєстрація</button>
          </nav>
          <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
    `
    return
  }

  let navLinks = `<a href="index.html" class="nav-link">Головна</a>`

  switch (userRole) {
    case "учень":
      navLinks += `
        <a href="competitionsP.html" class="nav-link">Конкурси</a>
        <a href="profile.html" class="nav-link">Профіль</a>
      `
      break
    case "вчитель":
      navLinks += `
        <a href="competitionsT.html" class="nav-link">Конкурси</a>
        <a href="results.html" class="nav-link">Результати</a>
        <a href="statistics.html" class="nav-link">Статистика</a>
        <a href="predictions.html" class="nav-link">Прогнози</a>
        <a href="profileT.html" class="nav-link">Профіль</a>
      `
      break
    case "методист":
      navLinks += `
        <a href="competitionsT.html" class="nav-link">Конкурси</a>
        <a href="results.html" class="nav-link">Результати</a>
        <a href="statistics.html" class="nav-link">Статистика</a>
        <a href="predictions.html" class="nav-link">Прогнози</a>
        <a href="profileT.html" class="nav-link">Профіль</a>
        <a href="admin.html" class="nav-link">Адмін</a>
      `
      break
    default:
      navLinks += `<a href="profile.html" class="nav-link">Профіль</a>`
  }

  header.innerHTML = `
    <header class="site-header">
      <div class="header-container">
        <a href="index.html" class="logo">🎯 iEvents</a>
        <nav class="nav" id="mainNav">
          ${navLinks}
          <div class="user-info">
            <span class="user-email">${userEmail}</span>
            <span class="user-role">${userRole}</span>
          </div>
          <button class="btn-logout" onclick="logout()">Вийти</button>
        </nav>
        <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  `
}

// Footer component
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

// Toggle mobile menu
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

// Logout function
function logout() {
  localStorage.clear()
  window.location.href = "auth.html"
}

renderHeader()
renderFooter()