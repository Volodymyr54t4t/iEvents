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

const userId = localStorage.getItem("userId")

if (!userId || userId === "undefined" || userId === "null") {
  console.error("Invalid userId, redirecting to auth")
  window.location.href = "auth.html"
}

let avatarFile = null

async function loadProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`)
    const data = await response.json()

    if (response.ok && data.profile) {
      const profile = data.profile
      document.getElementById("firstName").value = profile.first_name || ""
      document.getElementById("lastName").value = profile.last_name || ""
      document.getElementById("middleName").value = profile.middle_name || ""
      document.getElementById("telegram").value = profile.telegram || ""
      document.getElementById("phone").value = profile.phone || ""
      document.getElementById("birthDate").value = profile.birth_date || ""
      document.getElementById("city").value = profile.city || ""
      document.getElementById("school").value = profile.school || ""
      document.getElementById("grade").value = profile.grade || ""
      document.getElementById("interests").value = profile.interests || ""
      document.getElementById("bio").value = profile.bio || ""

      const avatarPreview = document.getElementById("avatarPreview")
      if (profile.avatar) {
        console.log("Завантаження аватара з бази даних:", profile.avatar)
        const avatarUrl = `${profile.avatar}?t=${Date.now()}`
        avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="console.error('Помилка завантаження аватара'); this.parentElement.innerHTML='<span class=\\'avatar-placeholder\\'>📷</span>'">`
      } else {
        console.log("Аватар не знайдено в базі даних")
        avatarPreview.innerHTML = '<span class="avatar-placeholder">📷</span>'
      }

      const roleValue = document.getElementById("roleValue")
      const userRole = localStorage.getItem("userRole") || "учень"
      roleValue.textContent = userRole
    } else {
      console.error("Failed to load profile:", data.error)
    }
  } catch (error) {
    console.error("Error loading profile:", error)
  }
}

document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    console.log("Вибрано файл аватара:", file.name, file.size, "байт")

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл занадто великий. Максимальний розмір: 5MB")
      e.target.value = ""
      return
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      alert("Дозволені тільки зображення (JPEG, PNG, GIF, WebP)")
      e.target.value = ""
      return
    }

    avatarFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      console.log("Попередній перегляд аватара завантажено")
      document.getElementById("avatarPreview").innerHTML = `<img src="${e.target.result}" alt="Avatar">`
    }
    reader.onerror = (error) => {
      console.error("Помилка читання файлу:", error)
      alert("Помилка читання файлу")
    }
    reader.readAsDataURL(file)
  }
})

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const messageDiv = document.getElementById("profileMessage")
  messageDiv.style.display = "none"

  console.log("=== Початок збереження профілю ===")
  console.log("Файл аватара для завантаження:", avatarFile ? avatarFile.name : "немає")

  const formData = new FormData()
  formData.append("userId", userId)
  formData.append("firstName", document.getElementById("firstName").value.trim())
  formData.append("lastName", document.getElementById("lastName").value.trim())
  formData.append("middleName", document.getElementById("middleName").value.trim())
  formData.append("telegram", document.getElementById("telegram").value.trim())
  formData.append("phone", document.getElementById("phone").value.trim())
  formData.append("birthDate", document.getElementById("birthDate").value)
  formData.append("city", document.getElementById("city").value.trim())
  formData.append("school", document.getElementById("school").value.trim())
  formData.append("grade", document.getElementById("grade").value.trim())
  formData.append("interests", document.getElementById("interests").value.trim())
  formData.append("bio", document.getElementById("bio").value.trim())

  if (avatarFile) {
    formData.append("avatar", avatarFile)
    console.log("Аватар додано до FormData")
  }

  try {
    console.log("Відправка запиту на сервер...")
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: "POST",
      body: formData,
    })

    console.log("Статус відповіді:", response.status)
    const data = await response.json()
    console.log("Дані відповіді:", data)

    if (response.ok) {
      messageDiv.textContent = "Профіль успішно збережено!"
      messageDiv.className = "message success"
      messageDiv.style.display = "block"

      avatarFile = null
      document.getElementById("avatarInput").value = ""

      console.log("Перезавантаження профілю з бази даних...")
      setTimeout(async () => {
        await loadProfile()
      }, 500)

      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    } else {
      messageDiv.textContent = data.error || "Помилка збереження профілю"
      messageDiv.className = "message error"
      messageDiv.style.display = "block"
    }
  } catch (error) {
    console.error("Помилка збереження профілю:", error)
    messageDiv.textContent = "Помилка з'єднання з сервером"
    messageDiv.className = "message error"
    messageDiv.style.display = "block"
  }

  console.log("=== Кінець збереження профілю ===")
})

loadProfile()