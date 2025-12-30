// Header component
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
                <a href="index.html" class="logo">iEvents</a>
                <nav class="nav">
                    <a href="auth.html" class="btn btn-primary">Увійти / Зареєструватися</a>
                </nav>
            </div>
        </header>
    `
    return
  }

  checkAdminPageAccess(userRole)

  const notificationButton = '<div id="notificationContainer"></div>'

  if (userRole === "адміністратор_громади") {
    header.innerHTML = `
        <header class="site-header">
            <div class="header-container">
                <button class="hamburger" id="hamburger" aria-label="Меню">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <a href="index.html" class="logo">iEvents</a>
                <nav class="nav">
                    <a href="index.html" class="nav-link">Головна</a>
                    <a href="profileCommunity.html" class="nav-link">Профіль</a>
                    <a href="adminCommunity.html" class="nav-link">🏛️ Адмін панель</a>
                    ${notificationButton}
                    <div class="user-info">
                        <span class="user-email">${userEmail}</span>
                        <span class="user-role">${userRole}</span>
                    </div>
                    <button class="btn-logout" onclick="logout()">Вийти</button>
                </nav>
                <aside class="sidebar" id="sidebar">
                    <a href="index.html" class="sidebar-link">Головна</a>
                    <a href="profileCommunity.html" class="sidebar-link">Профіль</a>
                    <a href="adminCommunity.html" class="sidebar-link">🏛️ Адмін панель</a>
                    <hr style="border: none; border-top: 1px solid #e8dcc8; margin: 12px 0;">
                    <div style="padding: 16px 24px;">
                        <p style="font-size: 12px; color: #78643a; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase;">Профіль</p>
                        <p style="font-size: 13px; color: #78643a; margin: 0 0 4px 0; word-break: break-word;">${userEmail}</p>
                        <span style="font-size: 12px; color: white; padding: 3px 10px; background: linear-gradient(135deg, #a88264 0%, #8b7355 100%); border-radius: 12px; font-weight: 500; display: inline-block; margin-top: 8px; text-transform: capitalize;">${userRole}</span>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e8dcc8; margin: 12px 0;">
                    <button class="sidebar-link" onclick="logout()" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: 16px 24px; color: #78643a; font-weight: 500; font-size: 14px;">Вийти</button>
                </aside>
            </div>
        </header>
    `
    setupMenuToggle()
    initNotifications()
    return
  }

  const competitionsLink =
    userRole === "вчитель" || userRole === "методист" ?
    '<a href="competitionsT.html" class="nav-link">Конкурси</a>' :
    '<a href="competitionsP.html" class="nav-link">Конкурси</a>'

  const rehearsalLink =
    userRole === "вчитель" || userRole === "методист" ?
    '<a href="rehearsalT.html" class="nav-link">Репетиції</a>' :
    userRole === "учень" ?
    '<a href="rehearsalP.html" class="nav-link">Репетиції</a>' :
    ""

  const resultsLink =
    userRole === "вчитель" || userRole === "методист" ? '<a href="results.html" class="nav-link">Результати</a>' : ""

  const statisticsLink = '<a href="statistics.html" class="nav-link">Статистика</a>'
  const predictionsLink = '<a href="predictions.html" class="nav-link">Прогнози</a>'
  const calendarLink = '<a href="calendar.html" class="nav-link">Календар</a>'
  const adminLink = userRole === "методист" ? '<a href="admin.html" class="nav-link">Адмін</a>' : ""
  const studentAdminLink =
    userRole === "учень" ? '<a href="adminUser.html" class="nav-link">Особистий кабінет</a>' : ""
  const teacherAdminLink =
    userRole === "вчитель" ? '<a href="adminTeacher.html" class="nav-link">Адмінка вчителя</a>' : ""

  let profileLink = '<a href="profile.html" class="nav-link">Профіль</a>'
  if (userRole === "вчитель" || userRole === "методист") {
    profileLink = '<a href="profilesT.html" class="nav-link">Профіль</a>'
  }

  header.innerHTML = `
        <header class="site-header">
            <div class="header-container">
                <button class="hamburger" id="hamburger" aria-label="Меню">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <a href="index.html" class="logo">iEvents</a>
                <nav class="nav">
                    <a href="index.html" class="nav-link">Головна</a>
                    ${competitionsLink}
                    ${rehearsalLink}
                    ${calendarLink}
                    ${resultsLink}
                    ${statisticsLink}
                    ${predictionsLink}
                    ${studentAdminLink}
                    ${teacherAdminLink}
                    ${profileLink}
                    ${adminLink}
                    ${notificationButton}
                    <div class="user-info">
                        <span class="user-email">${userEmail}</span>
                        <span class="user-role">${userRole}</span>
                    </div>
                    <button class="btn-logout" onclick="logout()">Вийти</button>
                </nav>
                <aside class="sidebar" id="sidebar">
                    <a href="index.html" class="sidebar-link">Головна</a>
                    ${competitionsLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${rehearsalLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${calendarLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${resultsLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${statisticsLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${predictionsLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${studentAdminLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${teacherAdminLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${profileLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    ${adminLink.replace('class="nav-link"', 'class="sidebar-link"')}
                    <hr style="border: none; border-top: 1px solid #e8dcc8; margin: 12px 0;">
                    <div style="padding: 16px 24px;">
                        <p style="font-size: 12px; color: #78643a; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase;">Профіль</p>
                        <p style="font-size: 13px; color: #78643a; margin: 0 0 4px 0; word-break: break-word;">${userEmail}</p>
                        <span style="font-size: 12px; color: white; padding: 3px 10px; background: linear-gradient(135deg, #a88264 0%, #8b7355 100%); border-radius: 12px; font-weight: 500; display: inline-block; margin-top: 8px; text-transform: capitalize;">${userRole}</span>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e8dcc8; margin: 12px 0;">
                    <button class="sidebar-link" onclick="logout()" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: 16px 24px; color: #78643a; font-weight: 500; font-size: 14px;">Вийти</button>
                </aside>
            </div>
        </header>
    `
  setupMenuToggle()
  initNotifications()
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
                    <a href="about.html">Про нас</a>
                    <a href="contacts.html">Контакти</a>
                    <a href="#">Підтримка</a>
                </div>
            </div>
        </footer>
    `
}

// Logout function
function logout() {
  localStorage.clear()
  window.location.href = "auth.html"
}

function checkAdminPageAccess(userRole) {
  if (userRole !== "адміністратор_громади") return

  const currentPage = window.location.pathname.split("/").pop() || "index.html"
  const allowedPages = ["index.html", "profileCommunity.html", "adminCommunity.html"]

  if (!allowedPages.includes(currentPage) && currentPage !== "") {
    console.warn(`[v0] Admin user tried to access unauthorized page: ${currentPage}. Redirecting to index.html`)
    window.location.href = "index.html"
  }
}

function setupMenuToggle() {
  const hamburger = document.getElementById("hamburger")
  const sidebar = document.getElementById("sidebar")

  if (!hamburger || !sidebar) return

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation()
    hamburger.classList.toggle("active")
    sidebar.classList.toggle("active")
  })

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".sidebar") && !e.target.closest(".hamburger")) {
      hamburger.classList.remove("active")
      sidebar.classList.remove("active")
    }
  })

  // Close sidebar when clicking on a link
  const sidebarLinks = sidebar.querySelectorAll(".sidebar-link")
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active")
      sidebar.classList.remove("active")
    })
  })
}

async function initNotifications() {
  const container = document.getElementById("notificationContainer")
  if (!container) return

  if (!window.notificationSystem) {
    console.warn("[v0] Notification system not loaded yet")
    return
  }

  // Ініціалізувати систему сповіщень
  await window.notificationSystem.init()

  // Встановити callback для оновлення UI
  window.notificationSystem.onUpdate = () => {
    container.innerHTML = window.notificationSystem.renderUI()
    window.notificationSystem.setupEventListeners()
  }

  // Перший рендер
  container.innerHTML = window.notificationSystem.renderUI()
  window.notificationSystem.setupEventListeners()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderHeader()
    renderFooter()
  })
} else {
  // DOM is already ready
  renderHeader()
  renderFooter()
}