// Header component
function renderHeader() {
  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail")
  const userRole = localStorage.getItem("userRole")

  if (!userId) return

  const header = document.getElementById("header")
  if (!header) return

  checkAdminPageAccess(userRole)

  if (userRole === "адміністратор_громади") {
    header.innerHTML = `
        <header class="site-header">
            <div class="header-container">
                <a href="index.html" class="logo">🎯 iEvents</a>
                <nav class="nav">
                    <a href="index.html" class="nav-link">Головна</a>
                    <a href="profileCommunity.html" class="nav-link">Профіль</a>
                    <a href="adminCommunity.html" class="nav-link">🏛️ Адмін панель</a>
                    <div class="user-info">
                        <span class="user-email">${userEmail}</span>
                        <span class="user-role">${userRole}</span>
                    </div>
                    <button class="btn-logout" onclick="logout()">Вийти</button>
                </nav>
            </div>
        </header>
    `
    return
  }

  const competitionsLink =
    userRole === "вчитель" || userRole === "методист"
      ? '<a href="competitionsT.html" class="nav-link">Конкурси</a>'
      : '<a href="competitionsP.html" class="nav-link">Конкурси</a>'

  const resultsLink =
    userRole === "вчитель" || userRole === "методист" ? '<a href="results.html" class="nav-link">Результати</a>' : ""

  const statisticsLink = '<a href="statistics.html" class="nav-link">Статистика</a>'
  const predictionsLink = '<a href="predictions.html" class="nav-link">Прогнози</a>'

  const adminLink = userRole === "методист" ? '<a href="admin.html" class="nav-link">Адмін</a>' : ""

  const studentAdminLink =
    userRole === "учень" ? '<a href="adminUser.html" class="nav-link">📋 Особистий кабінет</a>' : ""

  const teacherAdminLink =
    userRole === "вчитель" ? '<a href="adminTeacher.html" class="nav-link">👨‍🏫 Адмінка вчителя</a>' : ""

  let profileLink = '<a href="profile.html" class="nav-link">Профіль</a>'
  if (userRole === "вчитель" || userRole === "методист") {
    profileLink = '<a href="profilesT.html" class="nav-link">Профіль</a>'
  }

  header.innerHTML = `
        <header class="site-header">
            <div class="header-container">
                <a href="index.html" class="logo">🎯 iEvents</a>
                <nav class="nav">
                    <a href="index.html" class="nav-link">Головна</a>
                    ${competitionsLink}
                    ${resultsLink}
                    ${statisticsLink}
                    ${predictionsLink}
                    ${studentAdminLink}
                    ${teacherAdminLink}
                    ${profileLink}
                    ${adminLink}
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
