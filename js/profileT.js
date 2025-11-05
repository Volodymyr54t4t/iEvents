let BASE_URL
if (window.location.hostname === "localhost") {
    BASE_URL = "http://localhost:3000"
} else {
    BASE_URL = "https://ievents-o8nm.onrender.com"
}

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole") || "вчитель"

if (!userId || userId === "undefined" || userId === "null") {
    console.error("Invalid userId, redirecting to auth")
    window.location.href = "auth.html"
}

function toggleFieldsByRole() {
    const isMethodist = userRole === "методист"

    document.getElementById("teacherSection").style.display = isMethodist ? "none" : "block"
    document.getElementById("methodistSection").style.display = isMethodist ? "block" : "none"

    if (isMethodist) {
        document.getElementById("methodistArea").required = false
    }
}

async function loadSchools() {
    try {
        const response = await fetch(`${BASE_URL}/api/schools`)
        const data = await response.json()

        if (response.ok && data.schools) {
            const select = document.getElementById("schoolSelect")
            select.innerHTML = '<option value="">Оберіть заклад...</option>'
            data.schools.forEach((school) => {
                const option = document.createElement("option")
                option.value = school.id // school.id should be a number
                option.textContent = `${school.name}`
                console.log("[v0] Adding school option:", school.id, school.name)
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

            if (profile.birth_date) {
                const date = new Date(profile.birth_date)
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, "0")
                const day = String(date.getDate()).padStart(2, "0")
                document.getElementById("birthDate").value = `${year}-${month}-${day}`
            }

            document.getElementById("city").value = profile.city || ""

            if (profile.school_id) {
                const schoolSelect = document.getElementById("schoolSelect")
                schoolSelect.value = String(profile.school_id)
                console.log("[v0] Teacher school_id loaded:", profile.school_id, "Set select to:", schoolSelect.value)
            }

            document.getElementById("experienceYears").value = profile.experience_years || ""
            document.getElementById("gradesCatering").value = profile.grades_catering || ""
            document.getElementById("specialization").value = profile.specialization || ""
            document.getElementById("awards").value = profile.awards || ""

            document.getElementById("bio").value = profile.bio || ""
            document.getElementById("interests").value = profile.interests || ""

            if (profile.subjects_ids) {
                const subjectIds = profile.subjects_ids.split(",").map((id) => id.trim())
                const subjectsSelect = document.getElementById("subjectsSelect")
                Array.from(subjectsSelect.options).forEach((option) => {
                    option.selected = subjectIds.includes(option.value)
                })
            }

            if (userRole === "методист") {
                document.getElementById("methodistArea").value = profile.methodist_area || ""

                if (profile.consultation_areas) {
                    const areas = profile.consultation_areas.split(",").map((a) => a.trim())
                    const consultationSelect = document.getElementById("consultationAreasSelect")
                    Array.from(consultationSelect.options).forEach((option) => {
                        option.selected = areas.includes(option.value)
                    })
                }
            }

            const roleValue = document.getElementById("roleValue")
            roleValue.textContent = userRole === "методист" ? "Методист" : "Вчитель"
        } else {
            console.error("Failed to load profile:", data.error)
        }
    } catch (error) {
        console.error("Error loading profile:", error)
    }
}

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
    console.log("[v0] Submitting profile with school_id:", schoolId, "type:", typeof schoolId)

    const profileData = {
        userId: userId,
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        middleName: document.getElementById("middleName").value.trim(),
        telegram: document.getElementById("telegram").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        birthDate: document.getElementById("birthDate").value,
        city: document.getElementById("city").value.trim(),
        schoolId: schoolId ? Number.parseInt(schoolId, 10) : null, // Convert to integer
        experienceYears: document.getElementById("experienceYears").value,
        subjectsIds: selectedSubjects,
        gradesCatering: document.getElementById("gradesCatering").value.trim(),
        specialization: document.getElementById("specialization").value.trim(),
        awards: document.getElementById("awards").value.trim(),
        bio: document.getElementById("bio").value.trim(),
        interests: document.getElementById("interests").value.trim(),
        userRole: userRole,
    }

    if (userRole === "методист") {
        profileData.methodistArea = document.getElementById("methodistArea").value.trim()
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
            messageDiv.textContent = "Профіль успішно збережено!"
            messageDiv.className = "message success"
            messageDiv.style.display = "block"

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
        console.error("Error saving profile:", error)
        messageDiv.textContent = "Помилка з'єднання з сервером"
        messageDiv.className = "message error"
        messageDiv.style.display = "block"
    }
})

function viewStudents() {
    window.location.href = `students-list.html?teacher_id=${userId}`
}

toggleFieldsByRole()
loadSchools()
loadSubjects()
loadProfile()