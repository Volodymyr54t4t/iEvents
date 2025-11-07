// Header component
function renderHeader() {
  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail") || "Гість"
  const userRole = localStorage.getItem("userRole") || "учень"

  const header = document.getElementById("header")
  if (!header) return

  const isGuest = !userId
  const displayRole = isGuest ? "учень" : userRole

  const competitionsLink =
    displayRole === "вчитель" || displayRole === "методист" ?
    '<a href="competitionsT.html" class="nav-link">Конкурси</a>' :
    '<a href="competitionsP.html" class="nav-link">Конкурси</a>'

  const resultsLink =
    displayRole === "вчитель" || displayRole === "методист" ?
    '<a href="results.html" class="nav-link">Результати</a>' :
    ""

  const statisticsLink =
    displayRole === "вчитель" || displayRole === "методист" ?
    '<a href="statistics.html" class="nav-link">Статистика</a>' :
    ""

  const predictionsLink =
    displayRole === "вчитель" || displayRole === "методист" ?
    '<a href="predictions.html" class="nav-link">Прогнози</a>' :
    ""

  const adminLink = displayRole === "методист" ? '<a href="admin.html" class="nav-link">Адмін</a>' : ""

  const profileLink =
    displayRole === "вчитель" || displayRole === "методист" ?
    '<a href="profileT.html" class="nav-link">Профіль</a>' :
    '<a href="profile.html" class="nav-link">Профіль</a>'

  const authButton = userId ?
    '<button class="btn-logout" onclick="logout()">Вийти</button>' :
    '<a href="auth.html" class="btn-login">Увійти</a>'

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
                    ${profileLink}
                    ${adminLink}
                    ${
                      userId
                        ? `<div class="user-info">
                        <span class="user-email">${userEmail}</span>
                        <span class="user-role">${userRole}</span>
                    </div>`
                        : ""
                    }
                    ${authButton}
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

renderHeader()
renderFooter()