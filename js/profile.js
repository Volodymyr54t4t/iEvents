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
const userRole = localStorage.getItem("userRole") || "учень"

if (!userId || userId === "undefined" || userId === "null") {
  console.error("Invalid userId, redirecting to auth")
  window.location.href = "auth.html"
}

let avatarFile = null
let originalImage = null
let imageState = {
  scale: 1,
  rotate: 0,
  flipH: false,
  flipV: false,
  offsetX: 0,
  offsetY: 0
}

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartOffsetX = 0
let dragStartOffsetY = 0

function toggleFieldsByRole() {
  const isStudent = userRole === "учень"

  // Показуємо/приховуємо поля для учнів
  document.getElementById("schoolSelectGroup").style.display = isStudent ? "block" : "none"
  document.getElementById("schoolTextGroup").style.display = isStudent ? "none" : "block"
  document.getElementById("gradeStudentGroup").style.display = isStudent ? "flex" : "none"
  document.getElementById("gradeTextGroup").style.display = isStudent ? "none" : "block"
  document.getElementById("clubGroup").style.display = isStudent ? "flex" : "none"

  // Встановлюємо required для полів учнів
  if (isStudent) {
    document.getElementById("schoolSelect").required = true
    document.getElementById("gradeNumber").required = true
    document.getElementById("school").required = false
    document.getElementById("grade").required = false
  } else {
    document.getElementById("schoolSelect").required = false
    document.getElementById("gradeNumber").required = false
    document.getElementById("school").required = false
    document.getElementById("grade").required = false
  }
}

async function loadSchools() {
  try {
    const response = await fetch(`${BASE_URL}/api/schools`)
    const data = await response.json()

    if (response.ok && data.schools) {
      const select = document.getElementById("schoolSelect")
      data.schools.forEach((school) => {
        const option = document.createElement("option")
        option.value = school.id
        option.textContent = `${school.id} – ${school.name}`
        select.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error loading schools:", error)
  }
}

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

      if (profile.birth_date) {
        const date = new Date(profile.birth_date)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        document.getElementById("birthDate").value = `${year}-${month}-${day}`
      } else {
        document.getElementById("birthDate").value = ""
      }

      document.getElementById("city").value = profile.city || ""

      if (userRole === "учень") {
        if (profile.school_id) {
          document.getElementById("schoolSelect").value = String(profile.school_id)
          console.log("[v0] Student school_id loaded:", profile.school_id)
        }
        document.getElementById("gradeNumber").value = profile.grade_number || ""
        document.getElementById("gradeLetter").value = profile.grade_letter || ""
        document.getElementById("clubInstitution").value = profile.club_institution || ""
        document.getElementById("clubName").value = profile.club_name || ""
      } else {
        document.getElementById("school").value = profile.school || ""
        document.getElementById("grade").value = profile.grade || ""
      }

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
      roleValue.textContent = userRole
    } else {
      console.error("Failed to load profile:", data.error)
    }
  } catch (error) {
    console.error("Error loading profile:", error)
  }
}

function openAvatarEditor() {
  const file = avatarFile
  if (!file) {
    alert("Спочатку завантажте фото")
    return
  }

  document.getElementById("avatarEditorModal").style.display = "flex"
  redrawCanvas()
}

function closeAvatarEditor() {
  document.getElementById("avatarEditorModal").style.display = "none"
  resetAvatarEditor()
}

function redrawCanvas() {
  if (!originalImage) return

  const canvas = document.getElementById("avatarCanvas")
  const ctx = canvas.getContext("2d")
  const img = originalImage

  canvas.width = 280
  canvas.height = 280

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)

  ctx.translate(imageState.offsetX, imageState.offsetY)

  // Поворот
  if (imageState.rotate !== 0) {
    ctx.rotate((imageState.rotate * Math.PI) / 180)
  }

  // Відзеркалення
  if (imageState.flipH || imageState.flipV) {
    ctx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1)
  }

  // Масштабування
  const scale = imageState.scale
  const w = (img.width * scale) / 2
  const h = (img.height * scale) / 2

  ctx.drawImage(img, -w, -h, img.width * scale, img.height * scale)
  ctx.restore()

  // Додаємо бордюр
  ctx.strokeStyle = "#7ec8e3"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(140, 140, 140, 0, Math.PI * 2)
  ctx.stroke()
}

function resetAvatarEditor() {
  imageState = {
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0
  }
  document.getElementById("scaleSlider").value = 1
  document.getElementById("rotateSlider").value = 0
  document.getElementById("flipHorizontal").checked = false
  document.getElementById("flipVertical").checked = false
  updateSliderValues()
  redrawCanvas()
}

function updateSliderValues() {
  document.getElementById("scaleValue").textContent = Math.round(imageState.scale * 100) + "%"
  document.getElementById("rotateValue").textContent = imageState.rotate + "°"
}

document.addEventListener("DOMContentLoaded", () => {
  const scaleSlider = document.getElementById("scaleSlider")
  const rotateSlider = document.getElementById("rotateSlider")
  const flipH = document.getElementById("flipHorizontal")
  const flipV = document.getElementById("flipVertical")
  const canvas = document.getElementById("avatarCanvas")

  if (scaleSlider) {
    scaleSlider.addEventListener("input", (e) => {
      imageState.scale = parseFloat(e.target.value)
      updateSliderValues()
      redrawCanvas()
    })
  }

  if (rotateSlider) {
    rotateSlider.addEventListener("input", (e) => {
      imageState.rotate = parseInt(e.target.value)
      updateSliderValues()
      redrawCanvas()
    })
  }

  if (flipH) {
    flipH.addEventListener("change", (e) => {
      imageState.flipH = e.target.checked
      redrawCanvas()
    })
  }

  if (flipV) {
    flipV.addEventListener("change", (e) => {
      imageState.flipV = e.target.checked
      redrawCanvas()
    })
  }

  if (canvas) {
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartOffsetX = imageState.offsetX
      dragStartOffsetY = imageState.offsetY
      canvas.style.cursor = "grabbing"
    })

    canvas.addEventListener("mousemove", (e) => {
      if (!isDragging) return

      const deltaX = e.clientX - dragStartX
      const deltaY = e.clientY - dragStartY

      imageState.offsetX = dragStartOffsetX + deltaX
      imageState.offsetY = dragStartOffsetY + deltaY

      redrawCanvas()
    })

    canvas.addEventListener("mouseup", () => {
      isDragging = false
      canvas.style.cursor = "grab"
    })

    canvas.addEventListener("mouseleave", () => {
      isDragging = false
      canvas.style.cursor = "grab"
    })

    canvas.style.cursor = "grab"
  }
})

function confirmAvatar() {
  const canvas = document.getElementById("avatarCanvas")
  canvas.toBlob((blob) => {
    const file = new File([blob], "avatar.png", { type: "image/png" })
    avatarFile = file
    
    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById("avatarPreview").innerHTML = `<img src="${e.target.result}" alt="Avatar">`
      document.getElementById("clearAvatarBtn").style.display = "block"
    }
    reader.readAsDataURL(blob)
    
    closeAvatarEditor()
  }, "image/png")
}

function clearAvatar() {
  avatarFile = null
  originalImage = null
  document.getElementById("avatarPreview").innerHTML = '<span class="avatar-placeholder">📷</span>'
  document.getElementById("avatarInput").value = ""
  document.getElementById("clearAvatarBtn").style.display = "none"
  imageState = {
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0
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
      const img = new Image()
      img.onload = () => {
        originalImage = img
        imageState = {
          scale: 1,
          rotate: 0,
          flipH: false,
          flipV: false,
          offsetX: 0,
          offsetY: 0
        }
        document.getElementById("scaleSlider").value = 1
        document.getElementById("rotateSlider").value = 0
        document.getElementById("flipHorizontal").checked = false
        document.getElementById("flipVertical").checked = false
        updateSliderValues()
        openAvatarEditor()
      }
      img.src = e.target.result
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
  formData.append("interests", document.getElementById("interests").value.trim())
  formData.append("bio", document.getElementById("bio").value.trim())

  if (userRole === "учень") {
    const schoolId = document.getElementById("schoolSelect").value
    formData.append("schoolId", schoolId ? Number.parseInt(schoolId, 10) : "")
    console.log("[v0] Submitting school_id:", schoolId)
    formData.append("gradeNumber", document.getElementById("gradeNumber").value.trim())
    formData.append("gradeLetter", document.getElementById("gradeLetter").value.trim())
    formData.append("clubInstitution", document.getElementById("clubInstitution").value.trim())
    formData.append("clubName", document.getElementById("clubName").value.trim())
  } else {
    formData.append("school", document.getElementById("school").value.trim())
    formData.append("grade", document.getElementById("grade").value.trim())
  }

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

toggleFieldsByRole()
loadSchools()
loadProfile()
