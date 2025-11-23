// 🔧 Визначаємо BASE_URL
let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-o8nm.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

// Перевірка доступу
if (!userId || userRole !== "адміністратор_громади") {
  console.error("Немає доступу або невірна роль")
  window.location.href = "auth.html"
}

let avatarFile = null

async function loadCities() {
  try {
    console.log("[v0] 🌍 Початок завантаження міст з БД")
    console.log("[v0] Запит до:", `${BASE_URL}/api/cities`)

    const response = await fetch(`${BASE_URL}/api/cities`)
    console.log("[v0] Статус відповіді:", response.status, response.statusText)

    const rawText = await response.text()
    console.log("[v0] Сира відповідь сервера:", rawText)

    let data
    try {
      data = JSON.parse(rawText)
    } catch (parseError) {
      console.error("[v0] ❌ Помилка парсингу JSON:", parseError)
      console.error("[v0] Текст відповіді:", rawText)
      console.log("[v0] Переходимо на резервну ліст міст")
      await loadCitiesFromFallback()
      return
    }

    console.log("[v0] Отримані дані:", data)

    const citiesList = (data && data.cities) || (Array.isArray(data) ? data : [])

    if (Array.isArray(citiesList) && citiesList.length > 0) {
      const citySelect = document.getElementById("city")
      const currentCity = citySelect.dataset.currentValue || ""

      // Очищуємо попередні опції (крім першої)
      citySelect.innerHTML = '<option value="">Оберіть місто або громаду</option>'

      console.log("[v0] Кількість міст для додавання:", citiesList.length)

      // Додаємо міста з БД
      citiesList.forEach((city, index) => {
        const option = document.createElement("option")
        option.value = city.name || city
        option.textContent = city.name ? `${city.name}${city.region ? ` (${city.region})` : ""}` : city
        if ((city.name || city) === currentCity) {
          option.selected = true
          console.log("[v0] Вибране місто:", city.name || city)
        }
        citySelect.appendChild(option)
      })

      console.log("[v0] ✅ Завантажено міст:", citiesList.length)
    } else {
      console.error("[v0] ⚠️ Отримана порожня ліст міст, завантажуємо резервну ліст")
      await loadCitiesFromFallback()
    }
  } catch (error) {
    console.error("[v0] ❌ Помилка з'єднання при завантаженні міст:", error)
    console.error("[v0] Тип помилки:", error.name)
    console.error("[v0] Повідомлення:", error.message)
    await loadCitiesFromFallback()
  }
}

async function loadCitiesFromFallback() {
  try {
    const fallbackCities = [
      { name: "Київ", region: "м. Київ" },
      { name: "Харків", region: "Харківська" },
      { name: "Одеса", region: "Одеська" },
      { name: "Дніпро", region: "Дніпропетровська" },
      { name: "Донецьк", region: "Донецька" },
      { name: "Запоріжжя", region: "Запорізька" },
      { name: "Львів", region: "Львівська" },
      { name: "Кривий Ріг", region: "Дніпропетровська" },
      { name: "Миколаїв", region: "Миколаївська" },
      { name: "Маріуполь", region: "Донецька" },
      { name: "Луганськ", region: "Луганська" },
      { name: "Вінниця", region: "Вінницька" },
      { name: "Севастополь", region: "м. Севастополь" },
      { name: "Макіївка", region: "Донецька" },
      { name: "Сімферополь", region: "Автономна Республіка Крим" },
      { name: "Херсон", region: "Херсонська" },
      { name: "Полтава", region: "Полтавська" },
      { name: "Чернігів", region: "Чернігівська" },
      { name: "Черкаси", region: "Черкаська" },
      { name: "Житомир", region: "Житомирська" },
      { name: "Суми", region: "Сумська" },
      { name: "Хмельницький", region: "Хмельницька" },
      { name: "Чернівці", region: "Чернівецька" },
      { name: "Рівне", region: "Рівненська" },
      { name: "Кам'янське", region: "Дніпропетровська" },
      { name: "Кропивницький", region: "Кіровоградська" },
      { name: "Івано-Франківськ", region: "Івано-Франківська" },
      { name: "Кременчук", region: "Полтавська" },
      { name: "Тернопіль", region: "Тернопільська" },
      { name: "Луцьк", region: "Волинська" },
      { name: "Біла Церква", region: "Київська" },
      { name: "Кам'янець-Подільський", region: "Хмельницька" },
      { name: "Керч", region: "Автономна Республіка Крим" },
      { name: "Нікополь", region: "Дніпропетровська" },
      { name: "Слов'янськ", region: "Донецька" },
      { name: "Ужгород", region: "Закарпатська" },
      { name: "Бердянськ", region: "Запорізька" },
      { name: "Алчевськ", region: "Луганська" },
      { name: "Павлоград", region: "Дніпропетровська" },
      { name: "Євпаторія", region: "Автономна Республіка Крим" },
      { name: "Лисичанськ", region: "Луганська" },
      { name: "Мукачево", region: "Закарпатська" },
    ]

    const citySelect = document.getElementById("city")
    const currentCity = citySelect.dataset.currentValue || ""

    citySelect.innerHTML = '<option value="">Оберіть місто або громаду</option>'

    fallbackCities.forEach((city) => {
      const option = document.createElement("option")
      option.value = city.name
      option.textContent = `${city.name} (${city.region})`
      if (city.name === currentCity) {
        option.selected = true
      }
      citySelect.appendChild(option)
    })

    console.log("[v0] ✅ Завантажено резервної ліст міст:", fallbackCities.length)
  } catch (error) {
    console.error("[v0] ❌ Помилка завантаження резервної ліст:", error)
  }
}

// Завантаження даних профілю
async function loadProfile() {
  try {
    console.log("[v0] Завантаження профілю адміністратора громади, userId:", userId)

    const response = await fetch(`${BASE_URL}/api/profile/${userId}`)
    const data = await response.json()

    if (response.ok && data.profile) {
      const profile = data.profile

      document.getElementById("firstName").value = profile.first_name || ""
      document.getElementById("lastName").value = profile.last_name || ""
      document.getElementById("middleName").value = profile.middle_name || ""
      document.getElementById("telegram").value = profile.telegram || ""
      document.getElementById("phone").value = profile.phone || ""
      document.getElementById("bio").value = profile.bio || ""

      const citySelect = document.getElementById("city")
      citySelect.dataset.currentValue = profile.city || ""

      // Завантажуємо міста після встановлення поточного значення
      await loadCities()

      // Аватар
      const avatarPreview = document.getElementById("avatarPreview")
      if (profile.avatar) {
        const avatarUrl = `${profile.avatar}?t=${Date.now()}`
        avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`
        document.getElementById("clearAvatarBtn").style.display = "block"
      } else {
        avatarPreview.innerHTML = '<span class="avatar-placeholder">🏛️</span>'
      }
    } else {
      console.error("Помилка завантаження профілю:", data.error)
      // Все одно завантажуємо міста
      await loadCities()
    }
  } catch (error) {
    console.error("Помилка з'єднання:", error)
    // Все одно завантажуємо міста
    await loadCities()
  }
}

// Обробка вибору аватара
document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
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
      document.getElementById("avatarPreview").innerHTML = `<img src="${e.target.result}" alt="Avatar">`
      document.getElementById("clearAvatarBtn").style.display = "block"
    }
    reader.readAsDataURL(file)
  }
})

// Очистити аватар
function clearAvatar() {
  avatarFile = null
  document.getElementById("avatarPreview").innerHTML = '<span class="avatar-placeholder">🏛️</span>'
  document.getElementById("avatarInput").value = ""
  document.getElementById("clearAvatarBtn").style.display = "none"
}

// Збереження профілю
document.getElementById("profileCommunityForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const messageDiv = document.getElementById("profileMessage")
  messageDiv.style.display = "none"

  console.log("[v0] Збереження профілю адміністратора громади")

  const formData = new FormData()
  formData.append("userId", userId)
  formData.append("firstName", document.getElementById("firstName").value.trim())
  formData.append("lastName", document.getElementById("lastName").value.trim())
  formData.append("middleName", document.getElementById("middleName").value.trim())
  formData.append("telegram", document.getElementById("telegram").value.trim())
  formData.append("phone", document.getElementById("phone").value.trim())
  formData.append("city", document.getElementById("city").value.trim())
  formData.append("bio", document.getElementById("bio").value.trim())

  if (avatarFile) {
    formData.append("avatar", avatarFile)
  }

  try {
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()

    if (response.ok) {
      messageDiv.textContent = "✅ Профіль успішно збережено!"
      messageDiv.className = "message success"
      messageDiv.style.display = "block"

      avatarFile = null
      document.getElementById("avatarInput").value = ""

      setTimeout(() => {
        loadProfile()
      }, 500)

      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    } else {
      messageDiv.textContent = data.error || "❌ Помилка збереження профілю"
      messageDiv.className = "message error"
      messageDiv.style.display = "block"
    }
  } catch (error) {
    console.error("[v0] Помилка збереження:", error)
    messageDiv.textContent = "❌ Помилка з'єднання з сервером"
    messageDiv.className = "message error"
    messageDiv.style.display = "block"
  }
})

// Завантажити профіль при завантаженні сторінки
loadProfile()
