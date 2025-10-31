// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-o8nm.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

// Tab switching
const tabs = document.querySelectorAll(".tab")
const forms = document.querySelectorAll(".auth-form")

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab

    tabs.forEach((t) => t.classList.remove("active"))
    forms.forEach((f) => f.classList.remove("active"))

    tab.classList.add("active")
    document.getElementById(`${tabName}Form`).classList.add("active")
  })
})

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("loginEmail").value.trim()
  const password = document.getElementById("loginPassword").value
  const errorDiv = document.getElementById("loginError")

  if (!email || !password) {
    errorDiv.textContent = "Заповніть всі поля"
    errorDiv.classList.add("show")
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      }),
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("userId", data.userId)
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userRole", data.role)
      window.location.href = "index.html"
    } else {
      errorDiv.textContent = data.error || "Помилка входу"
      errorDiv.classList.add("show")
    }
  } catch (error) {
    console.error("Login error:", error)
    errorDiv.textContent = "Помилка з'єднання з сервером"
    errorDiv.classList.add("show")
  }
})

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("registerEmail").value.trim()
  const password = document.getElementById("registerPassword").value
  const confirmPassword = document.getElementById("registerConfirmPassword").value
  const errorDiv = document.getElementById("registerError")

  if (!email || !password || !confirmPassword) {
    errorDiv.textContent = "Заповніть всі поля"
    errorDiv.classList.add("show")
    return
  }

  if (password.length < 6) {
    errorDiv.textContent = "Пароль повинен містити мінімум 6 символів"
    errorDiv.classList.add("show")
    return
  }

  if (password !== confirmPassword) {
    errorDiv.textContent = "Паролі не співпадають"
    errorDiv.classList.add("show")
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      }),
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("userId", data.userId)
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userRole", data.role)
      window.location.href = "index.html"
    } else {
      errorDiv.textContent = data.error || "Помилка реєстрації"
      errorDiv.classList.add("show")
    }
  } catch (error) {
    console.error("Registration error:", error)
    errorDiv.textContent = "Помилка з'єднання з сервером"
    errorDiv.classList.add("show")
  }
})