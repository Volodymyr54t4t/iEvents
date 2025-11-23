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

let currentUserId = null
let allMethodists = []
let allTeachers = []
let communityAdminData = null

// Community Admin authentication
document.getElementById("communityAuthForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const email = document.getElementById("communityEmail").value
  const password = document.getElementById("communityPassword").value
  const errorDiv = document.getElementById("authError")

  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (response.ok && data.role === "адміністратор_громади") {
      localStorage.setItem("userId", data.userId)
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userRole", data.role)

      document.getElementById("communityAuth").style.display = "none"
      document.getElementById("communityContent").style.display = "block"

      currentUserId = data.userId
      await initializeCommunityAdminPanel()
    } else {
      errorDiv.textContent = "Невірні облікові дані або недостатньо прав"
      errorDiv.classList.add("show")
    }
  } catch (error) {
    console.error("Помилка входу:", error)
    errorDiv.textContent = "Помилка з'єднання з сервером"
    errorDiv.classList.add("show")
  }
})

async function initializeCommunityAdminPanel() {
  await loadCommunityAdminData()
  await loadMethodists()
  await loadTeachers()
  updateCommunityDashboardStats()
}

async function loadCommunityAdminData() {
  try {
    console.log("[v0] Завантаження даних адміністратора громади для userId:", currentUserId)

    const response = await fetch(`${BASE_URL}/api/community-admin/${currentUserId}`)
    const data = await response.json()

    console.log("[v0] Відповідь сервера:", { status: response.status, data })

    if (response.ok) {
      communityAdminData = data.admin
      console.log("[v0] Дані адміністратора завантажені:", communityAdminData)
      document.getElementById("adminName").textContent = communityAdminData.city || "Адміністратор громади"
    } else if (response.status === 404) {
      console.warn("[v0] Користувач не є адміністратором громади, показуємо форму створення")
      showMakeCommunityAdminPrompt()
    }
  } catch (error) {
    console.error("Помилка завантаження даних адміністратора:", error)
    alert("Помилка з'єднання з сервером")
  }
}

function showMakeCommunityAdminPrompt() {
  const promptHtml = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">❌ Ви не є адміністратором громади</h2>
        <p style="margin-bottom: 20px; color: #555;">
          Користувач з ID <strong>${currentUserId}</strong> не знайдений в таблиці адміністраторів громади.
        </p>
        <p style="margin-bottom: 20px; color: #555;">
          Введіть назву міста, щоб стати адміністратором громади:
        </p>
        <input type="text" id="cityInput" placeholder="Наприклад: Житомир" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px;">
        <button id="makeMeAdminBtn" style="background: #27ae60; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
          Стати адміністратором
        </button>
        <button id="cancelBtn" style="background: #95a5a6; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
          Вийти
        </button>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", promptHtml)

  document.getElementById("makeMeAdminBtn").onclick = async () => {
    const city = document.getElementById("cityInput").value.trim()
    if (!city) {
      alert("Будь ласка, введіть назву міста")
      return
    }
    await makeMeCommunityAdmin(city)
  }

  document.getElementById("cancelBtn").onclick = () => {
    logout()
  }
}

async function makeMeCommunityAdmin(city) {
  try {
    const response = await fetch(`${BASE_URL}/api/make-community-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, city: city }),
    })

    const data = await response.json()

    if (response.ok) {
      alert(`✅ Успіх! Ви тепер адміністратор громади для міста ${city}. Сторінка буде перезавантажена.`)
      location.reload()
    } else {
      alert(`❌ Помилка: ${data.error || "Не вдалося створити адміністратора громади"}`)
    }
  } catch (error) {
    console.error("Помилка створення адміністратора:", error)
    alert("❌ Помилка з'єднання з сервером")
  }
}

async function loadMethodists() {
  console.log("[v0] Завантаження методистів для користувача:", currentUserId)
  const tbody = document.getElementById("methodistsTableBody")

  try {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Завантаження...</td></tr>'

    const response = await fetch(`${BASE_URL}/api/community-admin/${currentUserId}/methodists`)
    console.log("[v0] Статус відповіді для методистів:", response.status)

    const data = await response.json()
    console.log("[v0] Дані методистів:", data)

    if (!response.ok) {
      if (response.status === 404) {
        console.error("[v0] Адміністратора громади не знайдено в базі даних")
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ff6b6b; padding: 20px;">
          ⚠️ Помилка: ${data.error}<br><br>
          Користувач з ID ${currentUserId} не доданий в таблицю community_admins.<br>
          Використайте кнопку "Стати адміністратором громади" або виконайте SQL запит вручну.
        </td></tr>`
      } else {
        console.error("[v0] Помилка відповіді:", data.error, data.details)
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Помилка: ${data.error}</td></tr>`
      }
      return
    }

    allMethodists = data.methodists || []
    console.log("[v0] Кількість методистів:", allMethodists.length)

    if (allMethodists.length > 0) {
      console.log("[v0] Приклад структури методиста:", allMethodists[0])
    }

    renderMethodistsTable(allMethodists)
  } catch (error) {
    console.error("[v0] Помилка завантаження методистів:", error)
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Помилка завантаження даних</td></tr>'
  }
}

async function loadTeachers() {
  console.log("[v0] Завантаження вчителів для користувача:", currentUserId)
  const tbody = document.getElementById("teachersTableBody")

  try {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Завантаження...</td></tr>'

    const response = await fetch(`${BASE_URL}/api/community-admin/${currentUserId}/teachers`)
    console.log("[v0] Статус відповіді для вчителів:", response.status)

    const data = await response.json()
    console.log("[v0] Дані вчителів:", data)

    if (response.ok) {
      allTeachers = data.teachers || []
      console.log("[v0] Кількість вчителів:", allTeachers.length)

      if (allTeachers.length > 0) {
        console.log("[v0] Приклад структури вчителя:", allTeachers[0])
      }

      renderTeachersTable(allTeachers)
    } else if (response.status === 404) {
      console.error("[v0] Помилка 404: Адміністратора громади не знайдено")
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ff6b6b; padding: 20px;">
        ⚠️ Помилка: ${data.error}<br><br>
        Користувач з ID ${currentUserId} не доданий в таблицю community_admins.<br>
        Використайте кнопку "Стати адміністратором громади" або виконайте SQL запит вручну.
      </td></tr>`
    } else {
      console.error("[v0] Помилка відповіді:", data.error, data.details)
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Помилка: ${data.error}</td></tr>`
    }
  } catch (error) {
    console.error("[v0] Помилка завантаження вчителів:", error)
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Помилка завантаження даних</td></tr>'
  }
}

function renderMethodistsTable(methodists) {
  const tbody = document.getElementById("methodistsTableBody")
  tbody.innerHTML = ""

  console.log("[v0] Рендеринг методистів:", methodists.length)

  if (!methodists || methodists.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Методистів не знайдено</td></tr>'
    return
  }

  methodists.forEach((methodist) => {
    const row = document.createElement("tr")
    const fullName = [methodist.first_name, methodist.last_name].filter(Boolean).join(" ") || "Не вказано"

    row.innerHTML = `
      <td>${methodist.user_id || methodist.id || "-"}</td>
      <td>${methodist.email || "-"}</td>
      <td>${fullName}</td>
      <td>${methodist.phone || "-"}</td>
      <td>${methodist.methodist_area || "-"}</td>
      <td>${methodist.created_at ? new Date(methodist.created_at).toLocaleDateString("uk-UA") : "-"}</td>
      <td>
        <button class="btn-action btn-view" onclick="viewMethodistProfile(${methodist.user_id || methodist.id})">
          Профіль
        </button>
        <button class="btn-action btn-edit" onclick="openEditMethodistModal(${methodist.user_id || methodist.id})">
          Редагувати
        </button>
      </td>
    `
    tbody.appendChild(row)
  })
}

function renderTeachersTable(teachers) {
  const tbody = document.getElementById("teachersTableBody")
  tbody.innerHTML = ""

  console.log("[v0] Рендеринг вчителів:", teachers.length)

  if (!teachers || teachers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Вчителів не знайдено</td></tr>'
    return
  }

  teachers.forEach((teacher) => {
    const row = document.createElement("tr")
    const fullName = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ") || "Не вказано"
    const subjectsCount = teacher.subjects_ids ? teacher.subjects_ids.split(",").length : 0

    row.innerHTML = `
      <td>${teacher.user_id || teacher.id || "-"}</td>
      <td>${teacher.email || "-"}</td>
      <td>${fullName}</td>
      <td>${teacher.phone || "-"}</td>
      <td>${teacher.school || "-"}</td>
      <td>${subjectsCount}</td>
      <td>${teacher.created_at ? new Date(teacher.created_at).toLocaleDateString("uk-UA") : "-"}</td>
      <td>
        <button class="btn-action btn-view" onclick="viewTeacherProfile(${teacher.user_id || teacher.id})">
          Профіль
        </button>
        <button class="btn-action btn-edit" onclick="openEditTeacherModal(${teacher.user_id || teacher.id})">
          Редагувати
        </button>
      </td>
    `
    tbody.appendChild(row)
  })
}

function updateCommunityDashboardStats() {
  document.getElementById("totalMethodists").textContent = allMethodists.length
  document.getElementById("totalTeachers").textContent = allTeachers.length
  document.getElementById("totalUsers").textContent = allMethodists.length + allTeachers.length
}

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab

    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

    btn.classList.add("active")
    document.getElementById(`${tabName}-section`).classList.add("active")
  })
})

// Search functions
document.getElementById("methodistSearch").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase()
  const filtered = allMethodists.filter(
    (m) =>
      m.email.toLowerCase().includes(query) ||
      m.first_name?.toLowerCase().includes(query) ||
      m.last_name?.toLowerCase().includes(query),
  )
  renderMethodistsTable(filtered)
})

document.getElementById("teacherSearch").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase()
  const filtered = allTeachers.filter(
    (t) =>
      t.email.toLowerCase().includes(query) ||
      t.first_name?.toLowerCase().includes(query) ||
      t.last_name?.toLowerCase().includes(query),
  )
  renderTeachersTable(filtered)
})

// Modal functions
function openEditMethodistModal(methodistId) {
  const methodist = allMethodists.find((m) => m.user_id === methodistId || m.id === methodistId)
  if (!methodist) {
    console.error("[v0] Методиста не знайдено:", methodistId)
    return
  }

  console.log("[v0] Відкриття модального вікна для методиста:", methodist)

  document.getElementById("editMethodistId").value = methodist.user_id || methodist.id
  document.getElementById("editMethodistFirstName").value = methodist.first_name || ""
  document.getElementById("editMethodistLastName").value = methodist.last_name || ""
  document.getElementById("editMethodistPhone").value = methodist.phone || ""
  document.getElementById("editMethodistArea").value = methodist.methodist_area || ""
  document.getElementById("editMethodistConsultation").value = methodist.consultation_areas || ""

  document.getElementById("editMethodistModal").classList.add("show")
}

function closeEditMethodistModal() {
  document.getElementById("editMethodistModal").classList.remove("show")
}

function openEditTeacherModal(teacherId) {
  const teacher = allTeachers.find((t) => t.user_id === teacherId || t.id === teacherId)
  if (!teacher) {
    console.error("[v0] Вчителя не знайдено:", teacherId)
    return
  }

  console.log("[v0] Відкриття модального вікна для вчителя:", teacher)

  document.getElementById("editTeacherId").value = teacher.user_id || teacher.id
  document.getElementById("editTeacherFirstName").value = teacher.first_name || ""
  document.getElementById("editTeacherLastName").value = teacher.last_name || ""
  document.getElementById("editTeacherPhone").value = teacher.phone || ""
  document.getElementById("editTeacherSchool").value = teacher.school || ""

  document.getElementById("editTeacherModal").classList.add("show")
}

function closeEditTeacherModal() {
  document.getElementById("editTeacherModal").classList.remove("show")
}

// Save functions
document.getElementById("editMethodistForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const methodistId = document.getElementById("editMethodistId").value
  const data = {
    firstName: document.getElementById("editMethodistFirstName").value,
    lastName: document.getElementById("editMethodistLastName").value,
    phone: document.getElementById("editMethodistPhone").value,
    methodistArea: document.getElementById("editMethodistArea").value,
    consultationAreas: document.getElementById("editMethodistConsultation").value,
  }

  try {
    const response = await fetch(`${BASE_URL}/api/community-admin/methodists/${methodistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      closeEditMethodistModal()
      await loadMethodists()
      alert("Методист успішно оновлено")
    } else {
      const errorData = await response.json()
      alert(`Помилка: ${errorData.error}`)
    }
  } catch (error) {
    console.error("Помилка оновлення методиста:", error)
    alert("Помилка при збереженні")
  }
})

document.getElementById("editTeacherForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const teacherId = document.getElementById("editTeacherId").value
  const data = {
    firstName: document.getElementById("editTeacherFirstName").value,
    lastName: document.getElementById("editTeacherLastName").value,
    phone: document.getElementById("editTeacherPhone").value,
    school: document.getElementById("editTeacherSchool").value,
  }

  try {
    const response = await fetch(`${BASE_URL}/api/community-admin/teachers/${teacherId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      closeEditTeacherModal()
      await loadTeachers()
      alert("Вчитель успішно оновлено")
    } else {
      const errorData = await response.json()
      alert(`Помилка: ${errorData.error}`)
    }
  } catch (error) {
    console.error("Помилка оновлення вчителя:", error)
    alert("Помилка при збереженні")
  }
})

async function viewTeacherProfile(teacherId) {
  try {
    // Fetch teacher's students
    const response = await fetch(`${BASE_URL}/api/teacher/${teacherId}/students`)
    const data = await response.json()

    if (response.ok && data.success) {
      const students = data.students
      const schoolName = data.schoolName || "Не вказана"

      // Create modal with students list
      const modal = document.createElement("div")
      modal.className = "modal show"
      modal.id = "teacherStudentsModal"

      const studentsList =
        students.length > 0
          ? students
              .map(
                (s) => `
          <tr>
            <td>${s.id}</td>
            <td>${s.first_name || ""} ${s.last_name || ""}</td>
            <td>${s.email || "-"}</td>
            <td>${s.grade_number || "-"}${s.grade_letter || ""}</td>
            <td>${s.phone || "-"}</td>
          </tr>
        `,
              )
              .join("")
          : '<tr><td colspan="5" style="text-align: center;">Учнів не знайдено</td></tr>'

      modal.innerHTML = `
        <div class="modal-content modal-large">
          <h3>Учні вчителя (Школа: ${schoolName})</h3>
          <p>Всього учнів: <strong>${students.length}</strong></p>
          <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ПІБ</th>
                  <th>Email</th>
                  <th>Клас</th>
                  <th>Телефон</th>
                </tr>
              </thead>
              <tbody>
                ${studentsList}
              </tbody>
            </table>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeTeacherStudentsModal()">Закрити</button>
          </div>
        </div>
      `

      document.body.appendChild(modal)
    } else {
      alert(data.error || "Помилка завантаження учнів")
    }
  } catch (error) {
    console.error("Помилка завантаження учнів вчителя:", error)
    alert("Помилка завантаження даних")
  }
}

function closeTeacherStudentsModal() {
  const modal = document.getElementById("teacherStudentsModal")
  if (modal) {
    modal.remove()
  }
}

function viewMethodistProfile(methodistId) {
  const methodist = allMethodists.find((m) => m.user_id === methodistId || m.id === methodistId)
  if (!methodist) {
    alert("Методиста не знайдено")
    return
  }

  const modal = document.createElement("div")
  modal.className = "modal show"
  modal.id = "methodistProfileModal"

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <h3>Профіль методиста</h3>
      <div style="margin: 20px 0;">
        <p><strong>Email:</strong> ${methodist.email || "-"}</p>
        <p><strong>ПІБ:</strong> ${methodist.first_name || ""} ${methodist.middle_name || ""} ${methodist.last_name || ""}</p>
        <p><strong>Телефон:</strong> ${methodist.phone || "-"}</p>
        <p><strong>Область методиста:</strong> ${methodist.methodist_area || "-"}</p>
        <p><strong>Області консультування:</strong> ${methodist.consultation_areas || "-"}</p>
        <p><strong>Дата реєстрації:</strong> ${methodist.created_at ? new Date(methodist.created_at).toLocaleDateString("uk-UA") : "-"}</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeMethodistProfileModal()">Закрити</button>
      </div>
    </div>
  `

  document.body.appendChild(modal)
}

function closeMethodistProfileModal() {
  const modal = document.getElementById("methodistProfileModal")
  if (modal) {
    modal.remove()
  }
}

function openAddMethodistModal() {
  const modal = document.createElement("div")
  modal.className = "modal show"
  modal.id = "addMethodistModal"

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <h3>Додати методиста</h3>
      <form id="addMethodistForm">
        <div class="form-row">
          <div class="form-group">
            <label for="addMethodistEmail">Email *</label>
            <input type="email" id="addMethodistEmail" required>
          </div>
          <div class="form-group">
            <label for="addMethodistPassword">Пароль *</label>
            <input type="password" id="addMethodistPassword" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="addMethodistFirstName">Ім'я *</label>
            <input type="text" id="addMethodistFirstName" required>
          </div>
          <div class="form-group">
            <label for="addMethodistLastName">Прізвище *</label>
            <input type="text" id="addMethodistLastName" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="addMethodistPhone">Телефон</label>
            <input type="tel" id="addMethodistPhone">
          </div>
          <div class="form-group">
            <label for="addMethodistArea">Область методиста</label>
            <input type="text" id="addMethodistArea">
          </div>
        </div>
        <div class="form-group">
          <label for="addMethodistConsultation">Області консультування</label>
          <textarea id="addMethodistConsultation"></textarea>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">Додати</button>
          <button type="button" class="btn btn-secondary" onclick="closeAddMethodistModal()">Скасувати</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(modal)

  document.getElementById("addMethodistForm").addEventListener("submit", handleAddMethodist)
}

async function handleAddMethodist(e) {
  e.preventDefault()

  const data = {
    email: document.getElementById("addMethodistEmail").value,
    password: document.getElementById("addMethodistPassword").value,
    firstName: document.getElementById("addMethodistFirstName").value,
    lastName: document.getElementById("addMethodistLastName").value,
    phone: document.getElementById("addMethodistPhone").value,
    methodistArea: document.getElementById("addMethodistArea").value,
    consultationAreas: document.getElementById("addMethodistConsultation").value,
    city: communityAdminData.city,
  }

  try {
    const response = await fetch(`${BASE_URL}/api/community-admin/methodists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      closeAddMethodistModal()
      await loadMethodists()
      updateCommunityDashboardStats()
      alert("Методист успішно додано")
    } else {
      const errorData = await response.json()
      alert(`Помилка: ${errorData.error}`)
    }
  } catch (error) {
    console.error("Помилка додавання методиста:", error)
    alert("Помилка при додаванні")
  }
}

function closeAddMethodistModal() {
  const modal = document.getElementById("addMethodistModal")
  if (modal) {
    modal.remove()
  }
}

function openAddTeacherModal() {
  const modal = document.createElement("div")
  modal.className = "modal show"
  modal.id = "addTeacherModal"

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <h3>Додати вчителя</h3>
      <form id="addTeacherForm">
        <div class="form-row">
          <div class="form-group">
            <label for="addTeacherEmail">Email *</label>
            <input type="email" id="addTeacherEmail" required>
          </div>
          <div class="form-group">
            <label for="addTeacherPassword">Пароль *</label>
            <input type="password" id="addTeacherPassword" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="addTeacherFirstName">Ім'я *</label>
            <input type="text" id="addTeacherFirstName" required>
          </div>
          <div class="form-group">
            <label for="addTeacherLastName">Прізвище *</label>
            <input type="text" id="addTeacherLastName" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="addTeacherPhone">Телефон</label>
            <input type="tel" id="addTeacherPhone">
          </div>
          <div class="form-group">
            <label for="addTeacherSchool">Школа</label>
            <input type="text" id="addTeacherSchool">
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">Додати</button>
          <button type="button" class="btn btn-secondary" onclick="closeAddTeacherModal()">Скасувати</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(modal)

  document.getElementById("addTeacherForm").addEventListener("submit", handleAddTeacher)
}

async function handleAddTeacher(e) {
  e.preventDefault()

  const data = {
    email: document.getElementById("addTeacherEmail").value,
    password: document.getElementById("addTeacherPassword").value,
    firstName: document.getElementById("addTeacherFirstName").value,
    lastName: document.getElementById("addTeacherLastName").value,
    phone: document.getElementById("addTeacherPhone").value,
    school: document.getElementById("addTeacherSchool").value,
    city: communityAdminData.city,
  }

  try {
    const response = await fetch(`${BASE_URL}/api/community-admin/teachers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      closeAddTeacherModal()
      await loadTeachers()
      updateCommunityDashboardStats()
      alert("Вчитель успішно додано")
    } else {
      const errorData = await response.json()
      alert(`Помилка: ${errorData.error}`)
    }
  } catch (error) {
    console.error("Помилка додавання вчителя:", error)
    alert("Помилка при додаванні")
  }
}

function closeAddTeacherModal() {
  const modal = document.getElementById("addTeacherModal")
  if (modal) {
    modal.remove()
  }
}

// Logout function
function logout() {
  localStorage.clear()
  window.location.href = "auth.html"
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const loggedInUserId = localStorage.getItem("userId")
  const userRole = localStorage.getItem("userRole")

  if (userRole !== "адміністратор_громади") {
    document.getElementById("communityAuth").style.display = "flex"
    document.getElementById("communityContent").style.display = "none"
  } else {
    currentUserId = loggedInUserId
    document.getElementById("communityAuth").style.display = "none"
    document.getElementById("communityContent").style.display = "block"
    initializeCommunityAdminPanel()
  }
})

// Function to create a super-methodist
async function createSuperMethodist() {
  const email = "methodist@ievents.com"
  const password = "methodist2025"

  try {
    const response = await fetch(`${BASE_URL}/api/create-super-methodist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: password,
        fullName: "Головний методист",
        city: "Житомир",
        phone: "+380XXXXXXXXX",
        school: "Методичний центр",
        consultationAreas: "Усі предмети",
      }),
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ Методист створений успішно:`, data)
      alert(`✅ Методист створений!\nEmail: ${email}\nПароль: ${password}`)
    } else {
      console.error("❌ Помилка:", data.error)
      if (data.error.includes("вже існує")) {
        alert("ℹ️ Методист з таким email вже існує")
      } else {
        alert(`❌ Помилка: ${data.error}`)
      }
    }
  } catch (error) {
    console.error("Помилка створення методиста:", error)
    alert("❌ Помилка з'єднання з сервером")
  }
}

// Uncomment the line below to create a super-methodist once
// createSuperMethodist()
