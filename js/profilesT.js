let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-o8nm.onrender.com"
}

const userIdFromStorage = localStorage.getItem("userId")
const userId = userIdFromStorage ? Number.parseInt(userIdFromStorage, 10) : null
const userRole = localStorage.getItem("userRole") || "вчитель"

if (!userId || Number.isNaN(userId)) {
  console.error("[v0] Invalid userId:", userIdFromStorage)
  window.location.href = "auth.html"
}

console.log("[v0] Loaded userId:", userId, "Role:", userRole)

let avatarFile = null
let originalImage = null
let imageState = {
  scale: 1,
  rotate: 0,
  flipH: false,
  flipV: false,
  offsetX: 0,
  offsetY: 0,
}

let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartOffsetX = 0
let dragStartOffsetY = 0

function toggleFieldsByRole() {
  const isMethodist = userRole === "методист"
  document.getElementById("teacherSection").style.display = isMethodist ? "none" : "block"
  document.getElementById("methodistSection").style.display = isMethodist ? "block" : "none"
  document.getElementById("roleValue").textContent = isMethodist ? "Методист" : "Вчитель"
}

async function loadSchools() {
  try {
    const response = await fetch(`${BASE_URL}/api/schools`)
    const data = await response.json()

    if (response.ok && data.schools) {
      const select = document.getElementById("schoolSelect")
      select.innerHTML = '<option value="">Виберіть заклад...</option>'
      data.schools.forEach((school) => {
        const option = document.createElement("option")
        option.value = school.id
        option.textContent = school.name
        select.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error loading schools:", error)
  }
}

async function loadSubjects() {
  try {
    const response = await fetch(`${BASE_URL}/api/subjects`)
    const data = await response.json()

    if (response.ok && data.subjects) {
      const select = document.getElementById("subjectsSelect")
      select.innerHTML = ""
      data.subjects.forEach((subject) => {
        const option = document.createElement("option")
        option.value = subject.id
        option.textContent = subject.name
        select.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error loading subjects:", error)
  }
}

async function loadProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/teacher/${userId}`)
    const data = await response.json()

    if (response.ok && data.profile) {
      const profile = data.profile

      document.getElementById("firstName").value = profile.first_name || ""
      document.getElementById("lastName").value = profile.last_name || ""
      document.getElementById("middleName").value = profile.middle_name || ""
      document.getElementById("telegram").value = profile.telegram || ""
      document.getElementById("phone").value = profile.phone || ""
      document.getElementById("experienceYears").value = profile.experience_years || ""
      document.getElementById("gradesCatering").value = profile.grades_catering || ""
      document.getElementById("bio").value = profile.bio || ""

      if (profile.school_id) {
        document.getElementById("schoolSelect").value = String(profile.school_id)
      }

      if (profile.subjects_ids) {
        const subjectIds = profile.subjects_ids.split(",").map((id) => id.trim())
        const subjectsSelect = document.getElementById("subjectsSelect")
        Array.from(subjectsSelect.options).forEach((option) => {
          option.selected = subjectIds.includes(String(option.value))
        })
      }

      if (userRole === "методист" && profile.consultation_areas) {
        const areas = profile.consultation_areas.split(",").map((a) => a.trim())
        const consultationSelect = document.getElementById("consultationAreasSelect")
        Array.from(consultationSelect.options).forEach((option) => {
          option.selected = areas.includes(option.value)
        })
      }

      const avatarPreview = document.getElementById("avatarPreview")
      if (profile.avatar) {
        const avatarUrl = `${profile.avatar}?t=${Date.now()}`
        avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.innerHTML='<span class=\\'avatar-placeholder\\'>👨‍🏫</span>';">`
        document.getElementById("clearAvatarBtn").style.display = "block"
      } else {
        avatarPreview.innerHTML = '<span class="avatar-placeholder">👨‍🏫</span>'
        document.getElementById("clearAvatarBtn").style.display = "none"
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error)
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const messageDiv = document.getElementById("profileMessage")
  messageDiv.style.display = "none"

  const formData = new FormData()
  formData.append("userId", String(userId))
  formData.append("firstName", document.getElementById("firstName").value.trim())
  formData.append("lastName", document.getElementById("lastName").value.trim())
  formData.append("middleName", document.getElementById("middleName").value.trim())
  formData.append("telegram", document.getElementById("telegram").value.trim())
  formData.append("phone", document.getElementById("phone").value.trim())

  const schoolId = document.getElementById("schoolSelect").value
  formData.append("schoolId", schoolId || "")

  formData.append("experienceYears", document.getElementById("experienceYears").value || "0")
  formData.append("gradesCatering", document.getElementById("gradesCatering").value.trim())
  formData.append("bio", document.getElementById("bio").value.trim())
  formData.append("userRole", userRole)

  const subjectsSelect = document.getElementById("subjectsSelect")
  const selectedSubjects = Array.from(subjectsSelect.selectedOptions)
    .map((opt) => opt.value)
    .join(",")
  formData.append("subjectsIds", selectedSubjects)

  if (userRole === "методист") {
    const consultationSelect = document.getElementById("consultationAreasSelect")
    const consultationAreas = Array.from(consultationSelect.selectedOptions)
      .map((opt) => opt.value)
      .join(",")
    formData.append("consultationAreas", consultationAreas)
  }

  if (avatarFile) {
    formData.append("avatar", avatarFile)
  }

  try {
    console.log("[v0] Sending profile update for userId:", userId)
    const response = await fetch(`${BASE_URL}/api/profile/teacher`, {
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

      setTimeout(async () => {
        await loadProfile()
      }, 500)

      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    } else {
      messageDiv.textContent = "❌ " + (data.error || "Помилка збереження")
      messageDiv.className = "message error"
      messageDiv.style.display = "block"
      console.error("[v0] Server error:", data)
    }
  } catch (error) {
    console.error("[v0] Error saving profile:", error)
    messageDiv.textContent = "❌ Помилка з'єднання з сервером"
    messageDiv.className = "message error"
    messageDiv.style.display = "block"
  }
})

function viewStudents() {
  window.location.href = `students-list.html?teacher_id=${userId}`
}

function openAvatarEditor() {
  if (!avatarFile) {
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

  if (imageState.rotate !== 0) {
    ctx.rotate((imageState.rotate * Math.PI) / 180)
  }

  if (imageState.flipH || imageState.flipV) {
    ctx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1)
  }

  const scale = imageState.scale
  const w = (img.width * scale) / 2
  const h = (img.height * scale) / 2

  ctx.drawImage(img, -w, -h, img.width * scale, img.height * scale)
  ctx.restore()

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
    offsetY: 0,
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
      imageState.scale = Number.parseFloat(e.target.value)
      updateSliderValues()
      redrawCanvas()
    })
  }

  if (rotateSlider) {
    rotateSlider.addEventListener("input", (e) => {
      imageState.rotate = Number.parseInt(e.target.value)
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
    const file = new File([blob], "avatar.png", {
      type: "image/png"
    })
    avatarFile = file

    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById("avatarPreview").innerHTML =
        `<img src="${e.target.result}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      document.getElementById("clearAvatarBtn").style.display = "block"
    }
    reader.readAsDataURL(blob)

    closeAvatarEditor()
  }, "image/png")
}

function clearAvatar() {
  avatarFile = null
  originalImage = null
  document.getElementById("avatarPreview").innerHTML = '<span class="avatar-placeholder">👨‍🏫</span>'
  document.getElementById("avatarInput").value = ""
  document.getElementById("clearAvatarBtn").style.display = "none"
  imageState = {
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0,
  }
}

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
      const img = new Image()
      img.onload = () => {
        originalImage = img
        imageState = {
          scale: 1,
          rotate: 0,
          flipH: false,
          flipV: false,
          offsetX: 0,
          offsetY: 0,
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

toggleFieldsByRole()
loadSchools()
loadSubjects()
loadProfile()