const userId = localStorage.getItem("userId")

if (!userId || userId === "undefined" || userId === "null") {
  console.error("Invalid userId, redirecting to auth")
  window.location.href = "auth.html"
}

let avatarFile = null

// Load profile data
async function loadProfile() {
  try {
    const response = await fetch(`http://localhost:3000/api/profile/${userId}`)
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

      if (profile.avatar) {
        document.getElementById("avatarPreview").innerHTML = `<img src="${profile.avatar}" alt="Avatar">`
      }

      // Update role display
      const roleValue = document.getElementById("roleValue")
      roleValue.textContent = profile.role || "учень"
    } else {
      console.error("Failed to load profile:", data.error)
    }
  } catch (error) {
    console.error("Error loading profile:", error)
  }
}

// Avatar upload
document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    avatarFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById("avatarPreview").innerHTML = `<img src="${e.target.result}" alt="Avatar">`
    }
    reader.readAsDataURL(file)
  }
})

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const messageDiv = document.getElementById("profileMessage")
  messageDiv.style.display = "block"

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
  }

  try {
    const response = await fetch("http://localhost:3000/api/profile", {
      method: "POST",
      body: formData,
    })

    const data = await response.json()

    if (response.ok) {
      messageDiv.textContent = "Профіль успішно збережено!"
      messageDiv.className = "message success"
      messageDiv.style.display = "block"

      // Reload profile to show updated data
      await loadProfile()

      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    } else {
      messageDiv.textContent = data.error || "Помилка збереження профілю"
      messageDiv.className = "message error"
      messageDiv.style.display = "block"
    }
  } catch (error) {
    console.error("Profile save error:", error)
    messageDiv.textContent = "Помилка з'єднання з сервером"
    messageDiv.className = "message error"
    messageDiv.style.display = "block"
  }
})

loadProfile()