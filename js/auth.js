document.addEventListener("DOMContentLoaded", () => {
  // Verify AppConfig is loaded
  if (!window.AppConfig || !window.AppConfig.API_URL) {
    console.error("[v0] ERROR: AppConfig not loaded! Check if config.js is loaded before auth.js")
    alert("Помилка конфігурації. Будь ласка, перезавантажте сторінку.")
    return
  }

  console.log("[v0] Auth.js loaded, API URL:", window.AppConfig.API_URL)

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

    // Clear previous errors
    errorDiv.textContent = ""
    errorDiv.classList.remove("show")

    if (!email || !password) {
      errorDiv.textContent = "Заповніть всі поля"
      errorDiv.classList.add("show")
      return
    }

    console.log("[v0] Attempting login for:", email)
    console.log("[v0] Using API URL:", window.AppConfig.API_URL)

    try {
      const loginUrl = `${window.AppConfig.API_URL}/api/login`
      console.log("[v0] Login URL:", loginUrl)

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("[v0] Response status:", response.status)

      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (response.ok) {
        // Store user data in localStorage
        localStorage.setItem("userId", data.userId)
        localStorage.setItem("userEmail", data.email)
        localStorage.setItem("userRole", data.role)

        console.log("[v0] Login successful!")
        console.log("[v0] User ID:", data.userId)
        console.log("[v0] User role:", data.role)

        // Redirect based on role
        if (data.role === "адміністратор_громади") {
          console.log("[v0] Redirecting to community admin panel...")
          window.location.href = "adminCommunity.html"
        } else if (data.role === "адміністратор_платформи") {
          console.log("[v0] Redirecting to platform admin panel...")
          window.location.href = "admin.html"
        } else {
          console.log("[v0] Redirecting to main page...")
          window.location.href = "index.html"
        }
      } else {
        console.error("[v0] Login failed:", data.error)
        errorDiv.textContent = data.error || "Помилка входу"
        errorDiv.classList.add("show")
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      console.error("[v0] Error details:", error.message)
      errorDiv.textContent =
        "Помилка з'єднання з сервером. Перевірте підключення до інтернету або зверніться до адміністратора."
      errorDiv.classList.add("show")
    }
  })

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("registerEmail").value.trim()
    const password = document.getElementById("registerPassword").value
    const confirmPassword = document.getElementById("registerConfirmPassword").value
    const errorDiv = document.getElementById("registerError")

    // Clear previous errors
    errorDiv.textContent = ""
    errorDiv.classList.remove("show")

    if (!email || !password || !confirmPassword) {
      errorDiv.textContent = "Заповніть всі поля"
      errorDiv.classList.add("show")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errorDiv.textContent = "Введіть коректну email адресу"
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

    console.log("[v0] Attempting registration for:", email)
    console.log("[v0] Using API URL:", window.AppConfig.API_URL)

    try {
      const registerUrl = `${window.AppConfig.API_URL}/api/register`
      console.log("[v0] Register URL:", registerUrl)

      const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("[v0] Registration response status:", response.status)

      const data = await response.json()
      console.log("[v0] Registration response data:", data)

      if (response.ok) {
        // Store user data in localStorage
        localStorage.setItem("userId", data.userId)
        localStorage.setItem("userEmail", data.email)
        localStorage.setItem("userRole", data.role)

        console.log("[v0] Registration successful, redirecting to main page")
        window.location.href = "index.html"
      } else {
        console.error("[v0] Registration failed:", data.error)
        errorDiv.textContent = data.error || "Помилка реєстрації"
        errorDiv.classList.add("show")
      }
    } catch (error) {
      console.error("[v0] Registration error:", error)
      console.error("[v0] Error details:", error.message)
      errorDiv.textContent =
        "Помилка з'єднання з сервером. Перевірте підключення до інтернету або зверніться до адміністратора."
      errorDiv.classList.add("show")
    }
  })
})
