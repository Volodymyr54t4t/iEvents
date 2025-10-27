// Header component
function renderHeader() {
    const userId = localStorage.getItem("userId")
    const userEmail = localStorage.getItem("userEmail")
    const userRole = localStorage.getItem("userRole")

    if (!userId) return

    const header = document.getElementById("header")
    if (!header) return

    const competitionsLink =
        userRole === "вчитель" || userRole === "методист" ?
        '<a href="competitionsT.html" class="nav-link">Конкурси</a>' :
        '<a href="competitionsP.html" class="nav-link">Конкурси</a>'

    const adminLink = userRole === "методист" ? '<a href="admin.html" class="nav-link">Адмін</a>' : ""

    header.innerHTML = `
        <header class="site-header">
            <div class="header-container">
                <a href="index.html" class="logo">🎯 iEvents</a>
                <nav class="nav">
                    <a href="index.html" class="nav-link">Головна</a>
                    ${competitionsLink}
                    <a href="profile.html" class="nav-link">Профіль</a>
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

    // Add header styles
    if (!document.getElementById("header-styles")) {
        const style = document.createElement("style")
        style.id = "header-styles"
        style.textContent = `
            .site-header {
                background: white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: sticky;
                top: 0;
                z-index: 100;
            }
            
            .header-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .logo {
                font-size: 24px;
                font-weight: 700;
                color: #2d3748;
                text-decoration: none;
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
            }
            
            .nav-link:hover {
                color: #667eea;
            }
            
            .user-info {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
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
            }
            
            .btn-logout:hover {
                background: #f56565;
            }
            
            @media (max-width: 768px) {
                .header-container {
                    flex-direction: column;
                    gap: 16px;
                }
                
                .nav {
                    flex-wrap: wrap;
                    justify-content: center;
                }
            }
        `
        document.head.appendChild(style)
    }
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

    // Add footer styles
    if (!document.getElementById("footer-styles")) {
        const style = document.createElement("style")
        style.id = "footer-styles"
        style.textContent = `
            .site-footer {
                background: #2d3748;
                color: white;
                margin-top: 60px;
            }
            
            .footer-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 32px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .footer-links {
                display: flex;
                gap: 24px;
            }
            
            .footer-links a {
                color: #cbd5e0;
                text-decoration: none;
                transition: color 0.2s;
            }
            
            .footer-links a:hover {
                color: white;
            }
            
            @media (max-width: 768px) {
                .footer-container {
                    flex-direction: column;
                    gap: 16px;
                    text-align: center;
                }
            }
        `
        document.head.appendChild(style)
    }
}

// Logout function
function logout() {
    localStorage.clear()
    window.location.href = "auth.html"
}

// Initialize components
document.addEventListener("DOMContentLoaded", () => {
    renderHeader()
    renderFooter()
})