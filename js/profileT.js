let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-o8nm.onrender.com"
}

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole") || "вчитель"

if (!userId || userId === "undefined" || userId === "null") {
  window.location.href = "auth.html"
}

// Toggle sections based on role
function toggleFieldsByRole() {
  const isMethodist = userRole === "методист"
  document.getElementById("teacherSection").style.display = isMethodist ? "none" : "block"
  document.getElementById("methodistSection").style.display = isMethodist ? "block" : "none"
  document.getElementById("roleValue").textContent = isMethodist ? "Методист" : "Вчитель"
}

// Load schools from database
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
    } else {
      document.getElementById("schoolSelect").innerHTML = '<option value="">Помилка завантаження</option>'
    }
  } catch (error) {
    console.error("Error loading schools:", error)
    document.getElementById("schoolSelect").innerHTML = '<option value="">Помилка завантаження</option>'
  }
}

// Load subjects from database
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
    } else {
      document.getElementById("subjectsSelect").innerHTML = "<option>Помилка завантаження</option>"
    }
  } catch (error) {
    console.error("Error loading subjects:", error)
    document.getElementById("subjectsSelect").innerHTML = "<option>Помилка завантаження</option>"
  }
}

// Load teacher profile from database
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

      // Set school
      if (profile.school_id) {
        document.getElementById("schoolSelect").value = String(profile.school_id)
      }

      // Set subjects
      if (profile.subjects_ids) {
        const subjectIds = profile.subjects_ids.split(",").map((id) => id.trim())
        const subjectsSelect = document.getElementById("subjectsSelect")
        Array.from(subjectsSelect.options).forEach((option) => {
          option.selected = subjectIds.includes(String(option.value))
        })
      }

      // Methodist fields
      if (userRole === "методист") {
        if (profile.consultation_areas) {
          const areas = profile.consultation_areas.split(",").map((a) => a.trim())
          const consultationSelect = document.getElementById("consultationAreasSelect")
          Array.from(consultationSelect.options).forEach((option) => {
            option.selected = areas.includes(option.value)
          })
        }
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error)
  }
}

// Save profile to database
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const messageDiv = document.getElementById("profileMessage")
  messageDiv.style.display = "none"

  const subjectsSelect = document.getElementById("subjectsSelect")
  const selectedSubjects = Array.from(subjectsSelect.selectedOptions)
    .map((opt) => opt.value)
    .join(",")

  let consultationAreas = ""
  if (userRole === "методист") {
    const consultationSelect = document.getElementById("consultationAreasSelect")
    consultationAreas = Array.from(consultationSelect.selectedOptions)
      .map((opt) => opt.value)
      .join(",")
  }

  const schoolId = document.getElementById("schoolSelect").value

  const profileData = {
    userId: userId,
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    middleName: document.getElementById("middleName").value.trim(),
    telegram: document.getElementById("telegram").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    schoolId: schoolId ? Number.parseInt(schoolId, 10) : null,
    experienceYears: document.getElementById("experienceYears").value || 0,
    subjectsIds: selectedSubjects,
    gradesCatering: document.getElementById("gradesCatering").value.trim(),
    bio: document.getElementById("bio").value.trim(),
    userRole: userRole,
  }

  if (userRole === "методист") {
    profileData.consultationAreas = consultationAreas
  }

  try {
    const response = await fetch(`${BASE_URL}/api/profile/teacher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    })

    const data = await response.json()

    if (response.ok) {
      messageDiv.textContent = "✅ Профіль успішно збережено!"
      messageDiv.className = "message success"
      messageDiv.style.display = "block"

      setTimeout(() => {
        messageDiv.style.display = "none"
      }, 3000)
    } else {
      messageDiv.textContent = "❌ " + (data.error || "Помилка збереження")
      messageDiv.className = "message error"
      messageDiv.style.display = "block"
    }
  } catch (error) {
    console.error("Error saving profile:", error)
    messageDiv.textContent = "❌ Помилка з'єднання з сервером"
    messageDiv.className = "message error"
    messageDiv.style.display = "block"
  }
})

// Navigate to students list
function viewStudents() {
  window.location.href = `students-list.html?teacher_id=${userId}`
}

// Initialize
toggleFieldsByRole()
loadSchools()
loadSubjects()
loadProfile()