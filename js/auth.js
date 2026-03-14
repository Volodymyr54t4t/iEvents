// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

// Обмеження спроб входу (подібно до Google)
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME_MS = 5 * 60 * 1000 // 5 хвилин

function getLoginLockKey(email) {
  // зберігаємо окремо для кожної пошти
  return `loginLock:${email.toLowerCase()}`
}

function getLoginLockState(email) {
  if (!email) return null
  try {
    const raw = localStorage.getItem(getLoginLockKey(email))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setLoginLockState(email, state) {
  if (!email) return
  localStorage.setItem(getLoginLockKey(email), JSON.stringify(state))
}

function clearLoginLockState(email) {
  if (!email) return
  localStorage.removeItem(getLoginLockKey(email))
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes} хв ${seconds.toString().padStart(2, "0")} с`
  }
  return `${seconds} с`
}

let lockCountdownIntervalId = null

function applyLockUI(lockInfoElem, submitBtn, remainingMs, email) {
  if (!lockInfoElem || !submitBtn) return
  if (lockCountdownIntervalId) {
    clearInterval(lockCountdownIntervalId)
    lockCountdownIntervalId = null
  }
  submitBtn.disabled = true
  const updateLockText = (remaining) => {
    const text = `Забагато невдалих спроб входу. Спробуй ще раз через ${formatRemainingTime(remaining)}.`
    lockInfoElem.textContent = text
    const tip = document.querySelector(".overlay-tip")
    if (tip && loginOverlay.classList.contains("lock-overlay")) tip.textContent = text
  }
  updateLockText(remainingMs)
  lockInfoElem.classList.add("show")
  showLockOverlay(remainingMs)

  // Таймер у реальному часі: оновлення щосекунди
  lockCountdownIntervalId = setInterval(() => {
    const state = email ? getLoginLockState(email) : null
    const lockedUntil = state && state.lockedUntil ? state.lockedUntil : 0
    const remaining = lockedUntil - Date.now()
    if (remaining <= 0) {
      clearInterval(lockCountdownIntervalId)
      lockCountdownIntervalId = null
      clearLoginLockState(email)
      submitBtn.disabled = false
      lockInfoElem.classList.remove("show")
      return
    }
    updateLockText(remaining)
  }, 1000)
}

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

const loginForm = document.getElementById("loginForm")
const loginSubmitBtn = document.getElementById("loginSubmit")
const loginLockInfo = document.getElementById("loginLockInfo")
const loginOverlay = document.getElementById("loginOverlay")
const overlayMessageElem = document.getElementById("overlayMessage")

const FAIL_OVERLAY_DURATION_MS = 5500   // час показу червоного екрану після помилки (щоб встигнути прочитати)
const LOCK_OVERLAY_DURATION_MS = 8000   // час показу червоного екрану при блокуванні

function showFailOverlay(attemptsLeft) {
  if (!loginOverlay || !overlayMessageElem) return
  const attemptsText =
    attemptsLeft != null
      ? `Залишилось спроб: ${attemptsLeft} з ${MAX_LOGIN_ATTEMPTS}.`
      : ""
  overlayMessageElem.textContent =
    `Це нормально помилятися — перевір email і пароль ще раз. ${attemptsText}`.trim()
  loginOverlay.classList.add("show")
  setTimeout(() => {
    loginOverlay.classList.remove("show")
  }, FAIL_OVERLAY_DURATION_MS)
}

function showLockOverlay(remainingMs) {
  if (!loginOverlay || !overlayMessageElem) return
  const overlayTitle = document.getElementById("overlayTitle")
  const tip = document.querySelector(".overlay-tip")
  if (overlayTitle) overlayTitle.textContent = "🔒 Вхід тимчасово заблоковано"
  overlayMessageElem.textContent = ""
  if (tip) tip.textContent = `Забагато невдалих спроб входу. Спробуй ще раз через ${formatRemainingTime(remainingMs)}.`
  loginOverlay.classList.add("show", "lock-overlay")
  setTimeout(() => {
    loginOverlay.classList.remove("show", "lock-overlay")
    if (overlayTitle) overlayTitle.textContent = "❌ Невдала спроба входу"
    if (tip) tip.textContent = "Маленькі кроки ведуть до великих результатів. Ти впораєшся 💪"
  }, LOCK_OVERLAY_DURATION_MS)
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("loginEmail").value.trim()
  const password = document.getElementById("loginPassword").value
  const errorDiv = document.getElementById("loginError")
  errorDiv.classList.remove("show")

  // Перевіряємо, чи не заблокований вхід для цієї пошти
  const lockState = getLoginLockState(email)
  if (lockState && lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
    const remaining = lockState.lockedUntil - Date.now()
    applyLockUI(loginLockInfo, loginSubmitBtn, remaining, email)
    return
  } else {
    // якщо час блокування минув — очищаємо
    if (lockState && lockState.lockedUntil && Date.now() >= lockState.lockedUntil) {
      clearLoginLockState(email)
      loginSubmitBtn.disabled = false
      loginLockInfo.classList.remove("show")
    }
  }

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
      // успішний вхід — очищаємо лічильник
      clearLoginLockState(email)
      loginSubmitBtn.disabled = false
      loginLockInfo.classList.remove("show")

      localStorage.setItem("userId", data.userId)
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userRole", data.role)
      window.location.href = "index.html"
    } else {
      // невдала спроба входу
      const current = getLoginLockState(email) || { attempts: 0, lockedUntil: null }
      current.attempts += 1

      if (current.attempts >= MAX_LOGIN_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCK_TIME_MS
        setLoginLockState(email, current)
        applyLockUI(loginLockInfo, loginSubmitBtn, LOCK_TIME_MS, email)
        errorDiv.textContent = "Невірні дані для входу."
        errorDiv.classList.add("show")
      } else {
        setLoginLockState(email, current)
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - current.attempts
        errorDiv.textContent =
          data.error ||
          `Помилка входу. Залишилось спроб: ${remainingAttempts} з ${MAX_LOGIN_ATTEMPTS}.`
        errorDiv.classList.add("show")
        // показуємо анімований оверлей при кожній невдалій спробі
        showFailOverlay(remainingAttempts)
      }
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
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(() => console.log("Service Worker зареєстровано"))
    .catch(err => console.log("SW error:", err));
}
