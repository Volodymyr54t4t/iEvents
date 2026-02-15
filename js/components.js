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
                    <a href="adminCommunity.html" class="nav-link">Admin</a>
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
                    <a href="adminCommunity.html" class="sidebar-link">Admin</a>
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

  // Build role-specific links
  const competitionsHref =
    userRole === "вчитель" ? "competitionsT.html" :
      userRole === "методист" ? "competitionsM.html" :
        "competitionsP.html"

  const rehearsalHref =
    (userRole === "вчитель" || userRole === "методист") ? "rehearsalT.html" :
      userRole === "учень" ? "rehearsalP.html" : null

  const newsHref =
    (userRole === "вчитель" || userRole === "методист") ? "newsT.html" : "newsP.html"

  const resultsHref =
    (userRole === "вчитель" || userRole === "методист") ? "results.html" : null

  const profileHref =
    (userRole === "вчитель" || userRole === "методист") ? "profilesT.html" : "profile.html"

  const adminHref =
    userRole === "методист" ? "admin.html" :
      userRole === "вчитель" ? "adminTeacher.html" :
        userRole === "учень" ? "adminUser.html" : null

  const adminLabel =
    userRole === "методист" ? "Адмін" :
      userRole === "вчитель" ? "Адмінка" :
        userRole === "учень" ? "Е-кабінет" : ""

  // Build dropdown items for Events
  let eventsItems = `<a href="${competitionsHref}" class="dropdown-item">Конкурси</a>`
  if (rehearsalHref) eventsItems += `<a href="${rehearsalHref}" class="dropdown-item">Репетиції</a>`
  eventsItems += `<a href="calendar.html" class="dropdown-item">Календар</a>`
  if (resultsHref) eventsItems += `<a href="${resultsHref}" class="dropdown-item">Результати</a>`
  eventsItems += `<a href="predictions.html" class="dropdown-item">Прогнози</a>`

  // Build dropdown items for Info
  const infoItems = `
    <a href="${newsHref}" class="dropdown-item">Новини</a>
    <a href="about.html" class="dropdown-item">Про нас</a>
    <a href="contacts.html" class="dropdown-item">Контакти</a>
  `

  // Build dropdown items for Communication
  const commItems = `
    <a href="chat.html" class="dropdown-item">Чат</a>
    <a href="question.html" class="dropdown-item">Задати питання</a>
    <a href="support.html" class="dropdown-item">Підтримка</a>
  `

  // Build dropdown items for Account
  let accountItems = `<a href="${profileHref}" class="dropdown-item">Профіль</a>`
  if (adminHref) accountItems += `<a href="${adminHref}" class="dropdown-item">${adminLabel}</a>`

  // Build sidebar items for mobile (grouped with headers)
  let sidebarEventsItems = `<a href="${competitionsHref}" class="sidebar-link">Конкурси</a>`
  if (rehearsalHref) sidebarEventsItems += `<a href="${rehearsalHref}" class="sidebar-link">Репетиції</a>`
  sidebarEventsItems += `<a href="calendar.html" class="sidebar-link">Календар</a>`
  if (resultsHref) sidebarEventsItems += `<a href="${resultsHref}" class="sidebar-link">Результати</a>`
  sidebarEventsItems += `<a href="predictions.html" class="sidebar-link">Прогнози</a>`

  let sidebarAccountItems = `<a href="${profileHref}" class="sidebar-link">Профіль</a>`
  if (adminHref) sidebarAccountItems += `<a href="${adminHref}" class="sidebar-link">${adminLabel}</a>`

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
                    <div class="nav-dropdown">
                        <button class="nav-link dropdown-toggle">Події <svg class="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        <div class="dropdown-menu">${eventsItems}</div>
                    </div>
                    <a href="statistics.html" class="nav-link">Статистика</a>
                    <div class="nav-dropdown">
                        <button class="nav-link dropdown-toggle">Інформація <svg class="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        <div class="dropdown-menu">${infoItems}</div>
                    </div>
                    <div class="nav-dropdown">
                        <button class="nav-link dropdown-toggle">Комунікація <svg class="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        <div class="dropdown-menu">${commItems}</div>
                    </div>
                    <div class="nav-dropdown">
                        <button class="nav-link dropdown-toggle">Акаунт <svg class="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                        <div class="dropdown-menu">${accountItems}</div>
                    </div>
                    ${notificationButton}
                    <div class="user-info">
                        <span class="user-email">${userEmail}</span>
                        <span class="user-role">${userRole}</span>
                    </div>
                    <button class="btn-logout" onclick="logout()">Вийти</button>
                </nav>
                <aside class="sidebar" id="sidebar">
                    <a href="index.html" class="sidebar-link">Головна</a>
                    <div class="sidebar-group-label">Події</div>
                    ${sidebarEventsItems}
                    <div class="sidebar-group-label">Аналітика</div>
                    <a href="statistics.html" class="sidebar-link">Статистика</a>
                    <div class="sidebar-group-label">Інформація</div>
                    <a href="${newsHref}" class="sidebar-link">Новини</a>
                    <a href="about.html" class="sidebar-link">Про нас</a>
                    <a href="contacts.html" class="sidebar-link">Контакти</a>
                    <div class="sidebar-group-label">Комунікація</div>
                    <a href="chat.html" class="sidebar-link">Чат</a>
                    <a href="question.html" class="sidebar-link">Задати питання</a>
                    <a href="support.html" class="sidebar-link">Підтримка</a>
                    <div class="sidebar-group-label">Акаунт</div>
                    ${sidebarAccountItems}
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
                <div class="footer-left">
                    <p class="footer-copyright">&copy; 2025 iEvents. Всі права захищені.</p>
                    <p class="footer-info">Платформа для організації та управління навчальними подіями</p>
                </div>
                <div class="footer-right">
                    <a href="privacy-policy.html" class="footer-link">Політика конфіденційності</a>
                    <button class="btn-scroll-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" aria-label="Прокрутити догори">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                        <span>Догори</span>
                    </button>
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

  // Setup header dropdown toggles (click-based)
  setupDropdowns()
}

function setupDropdowns() {
  const dropdowns = document.querySelectorAll(".nav-dropdown")
  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(".dropdown-toggle")
    if (!toggle) return

    toggle.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Close all other dropdowns first
      dropdowns.forEach((other) => {
        if (other !== dropdown) other.classList.remove("open")
      })

      dropdown.classList.toggle("open")
    })
  })

  // Close all dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-dropdown")) {
      dropdowns.forEach((d) => d.classList.remove("open"))
    }
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
