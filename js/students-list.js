let BASE_URL
if (window.location.hostname === "localhost") {
  BASE_URL = "http://localhost:3000"
} else {
  BASE_URL = "https://ievents-qf5k.onrender.com"
}

console.log("[v0] Connecting to:", BASE_URL)

let allStudents = []
let filteredStudents = []
let currentViewMode = "list"

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")
const userSchoolId = localStorage.getItem("userSchoolId")

if (!userId) {
  window.location.href = "auth.html"
}

if (userRole !== "вчитель") {
  alert("У вас немає доступу до цієї сторінки")
  window.location.href = "index.html"
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadStudents()
  setupEventListeners()
  updateStats()
})

function setupEventListeners() {
  document.getElementById("searchStudents").addEventListener("input", filterStudents)
  document.getElementById("filterGrade").addEventListener("change", filterStudents)
  document.getElementById("filterStatus").addEventListener("change", filterStudents)
}

async function loadStudents() {
  const container = document.getElementById("studentsList")
  container.innerHTML = '<div class="loading">Завантаження учнів...</div>'

  try {
    console.log("[v0] Loading students for teacher ID:", userId)
    console.log("[v0] User school ID:", userSchoolId)

    const teacherResponse = await fetch(`${BASE_URL}/api/profile/teacher/${userId}`)
    const teacherData = await teacherResponse.json()

    if (!teacherResponse.ok) {
      throw new Error("Не вдалося завантажити профіль вчителя")
    }

    const teacherSchoolId = teacherData.profile?.school_id ? Number.parseInt(teacherData.profile.school_id, 10) : null
    console.log("[v0] Teacher school ID from profile:", teacherSchoolId, "type:", typeof teacherSchoolId)

    if (!teacherSchoolId) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Помилка</h3>
          <p>Будь ласка, заповніть свій профіль і вкажіть навчальний заклад</p>
          <a href="profileT.html" class="btn">Перейти до профіля</a>
        </div>
      `
      return
    }

    const response = await fetch(`${BASE_URL}/api/teacher/${userId}/students`)
    const data = await response.json()

    if (response.ok) {
      allStudents = (data.students || []).filter((student) => {
        const studentSchoolId = student.school_id ? Number.parseInt(student.school_id, 10) : null
        console.log("[v0] Comparing - Student school_id:", studentSchoolId, "Teacher school_id:", teacherSchoolId)
        return studentSchoolId === teacherSchoolId
      })

      console.log("[v0] Total students received:", data.students?.length)
      console.log("[v0] Filtered by school:", allStudents.length)

      filteredStudents = [...allStudents]

      populateGradeFilter()

      if (allStudents.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>Учнів у вашій школі поки немає</h3>
            <p>Учні з'являються тут, коли будуть зареєстровані в вашому закладі</p>
          </div>
        `
      } else {
        displayStudents(filteredStudents)
      }
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Помилка завантаження</h3>
          <p>${data.error || "Не вдалося завантажити список учнів"}</p>
        </div>
      `
    }
  } catch (error) {
    console.error("[v0] Error loading students:", error)
    container.innerHTML = `
      <div class="empty-state">
        <h3>Помилка з'єднання</h3>
        <p>${error.message || "Перевірте своє інтернет-з'єднання"}</p>
      </div>
    `
  }
}

function populateGradeFilter() {
  const grades = [...new Set(allStudents.map((s) => s.grade).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )

  const gradeSelect = document.getElementById("filterGrade")
  grades.forEach((grade) => {
    const option = document.createElement("option")
    option.value = grade
    option.textContent = grade
    gradeSelect.appendChild(option)
  })
}

function filterStudents() {
  const searchTerm = document.getElementById("searchStudents").value.toLowerCase()
  const filterGrade = document.getElementById("filterGrade").value
  const filterStatus = document.getElementById("filterStatus").value

  filteredStudents = allStudents.filter((student) => {
    const fullName = `${student.last_name || ""} ${student.first_name || ""}`.toLowerCase()
    const email = (student.email || "").toLowerCase()

    const matchesSearch = !searchTerm || fullName.includes(searchTerm) || email.includes(searchTerm)

    const matchesGrade = !filterGrade || student.grade === filterGrade

    const matchesStatus =
      !filterStatus ||
      (filterStatus === "active" && student.is_active) ||
      (filterStatus === "inactive" && !student.is_active)

    return matchesSearch && matchesGrade && matchesStatus
  })

  displayStudents(filteredStudents)
  updateStats()
}

function displayStudents(students) {
  const container = document.getElementById("studentsList")

  if (students.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Учнів не знайдено</h3>
        <p>Спробуйте змінити фільтри або параметри пошуку</p>
      </div>
    `
    return
  }

  container.innerHTML = students
    .map((student, index) => {
      const fullName = `${student.last_name || ""} ${student.first_name || ""}`.trim() || student.email
      const initials = fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()

      return `
        <div class="student-item" style="animation-delay: ${index * 0.05}s" onclick="openStudentModal(${student.id})">
          <div class="student-avatar">
            ${student.avatar ? `<img src="${student.avatar}" alt="${fullName}">` : initials}
          </div>
          <div class="student-info">
            <div class="student-name">${fullName}</div>
            <div class="student-meta">
              <span>📚 ${student.grade || "Клас -"}</span>
              <span>📧 ${student.email || "-"}</span>
              <span>${student.is_active ? "✅ Активний" : "❌ Неактивний"}</span>
            </div>
          </div>
          <div class="student-actions">
            <button class="btn-sm" onclick="event.stopPropagation(); openStudentModal(${student.id})">👁️ Переглянути</button>
          </div>
        </div>
      `
    })
    .join("")

  container.classList.remove("grid")
  if (currentViewMode === "grid") {
    container.classList.add("grid")
  }
}

function setViewMode(mode) {
  currentViewMode = mode
  const container = document.getElementById("studentsList")

  document.querySelectorAll(".view-btn").forEach((btn) => btn.classList.remove("active"))
  event.target.classList.add("active")

  container.classList.remove("grid")
  if (mode === "grid") {
    container.classList.add("grid")
  }
}

async function openStudentModal(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}`)
    const data = await response.json()

    if (response.ok) {
      const student = data.student
      const fullName = `${student.last_name || ""} ${student.first_name || ""}`.trim()

      document.getElementById("modalStudentName").textContent = fullName || student.email
      document.getElementById("detailFullName").textContent = fullName || "-"
      document.getElementById("detailEmail").textContent = student.email || "-"
      document.getElementById("detailPhone").textContent = student.phone || "-"
      document.getElementById("detailBirthDate").textContent = student.date_of_birth
        ? new Date(student.date_of_birth).toLocaleDateString("uk-UA")
        : "-"
      document.getElementById("detailCity").textContent = student.city || "-"
      document.getElementById("detailGrade").textContent = student.grade || "-"
      document.getElementById("detailSchool").textContent = student.school_name || "-"

      await loadStudentParticipations(studentId)

      document.getElementById("studentDetailModal").classList.add("active")
    }
  } catch (error) {
    console.error("[v0] Error loading student details:", error)
    alert("Помилка завантаження деталей учня")
  }
}

async function loadStudentParticipations(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/participations`)
    const data = await response.json()

    const participationList = document.getElementById("participationList")

    if (response.ok && data.participations && data.participations.length > 0) {
      participationList.innerHTML = data.participations
        .map(
          (p) => `
          <div class="participation-item">
            <strong>${p.competition_name}</strong>
            <br>
            <small>Результат: ${p.result_score || "Не оцінено"}</small>
          </div>
        `,
        )
        .join("")
    } else {
      participationList.innerHTML = "<p>Немає участей у конкурсах</p>"
    }
  } catch (error) {
    console.error("[v0] Error loading participations:", error)
    document.getElementById("participationList").innerHTML = "<p>Помилка завантаження</p>"
  }
}

function closeStudentModal() {
  document.getElementById("studentDetailModal").classList.remove("active")
}

function updateStats() {
  const totalStudents = filteredStudents.length
  const activeStudents = filteredStudents.filter((s) => s.is_active).length

  const gradesWithScores = filteredStudents.filter((s) => s.average_score)
  const averageGrade =
    gradesWithScores.length > 0
      ? (gradesWithScores.reduce((sum, s) => sum + (s.average_score || 0), 0) / gradesWithScores.length).toFixed(1)
      : "–"

  document.getElementById("totalStudents").textContent = totalStudents
  document.getElementById("activeStudents").textContent = activeStudents
  document.getElementById("averageGrade").textContent = averageGrade
}

function resetFilters() {
  document.getElementById("searchStudents").value = ""
  document.getElementById("filterGrade").value = ""
  document.getElementById("filterStatus").value = ""
  filterStudents()
}

window.addEventListener("click", (e) => {
  const modal = document.getElementById("studentDetailModal")
  if (e.target === modal) {
    closeStudentModal()
  }
})
