// Declare necessary variables and functions
const isAuthenticated = () => {
    // Implement your authentication logic here
    return true // Placeholder for authentication check
}

const getUserData = () => {
    // Implement your user data retrieval logic here
    return {
        role: "teacher",
        full_name: "Jane Smith"
    } // Placeholder for user data
}

const redirectToDashboard = (role) => {
    // Implement your redirection logic here
    window.location.href = `${role}-dashboard.html`
}

const apiRequest = async (url, options) => {
    // Implement your API request logic here
    const response = await fetch(url, options)
    return response.json()
}

const formatDate = (date) => {
    // Implement your date formatting logic here
    return new Date(date).toLocaleDateString()
}

const showError = (elementId, message) => {
    // Implement your error display logic here
    const element = document.getElementById(elementId)
    if (element) {
        element.textContent = message
        element.classList.add("show")
    }
}

// Check authentication
if (!isAuthenticated()) {
    window.location.href = "index.html"
}

const userData = getUserData()
if (userData.role !== "teacher") {
    redirectToDashboard(userData.role)
}

// Display user name
document.getElementById("userName").textContent = userData.full_name

// Load dashboard data
async function loadDashboardData() {
    try {
        const data = await apiRequest("/teacher/dashboard", {
            method: "GET",
        })

        // Update statistics
        document.getElementById("totalStudents").textContent = data.stats.total_students
        document.getElementById("activeStudents").textContent = data.stats.active_students
        document.getElementById("totalRegistrations").textContent = data.stats.total_registrations
        document.getElementById("approvedRegistrations").textContent = data.stats.approved_registrations
        document.getElementById("availableContests").textContent = data.stats.available_contests
        document.getElementById("averageScore").textContent = data.stats.average_score.toFixed(1)

        // Load available contests
        loadAvailableContests(data.available_contests)

        // Load my registrations
        loadMyRegistrations(data.my_registrations)

        // Load top students
        loadTopStudents(data.top_students)
    } catch (error) {
        console.error("Error loading dashboard:", error)
    }
}

function loadAvailableContests(contests) {
    const tbody = document.getElementById("availableContestsTable")

    if (!contests || contests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Немає доступних конкурсів</td></tr>'
        return
    }

    tbody.innerHTML = contests
        .map(
            (contest) => `
        <tr>
            <td>${contest.name}</td>
            <td>${formatDate(contest.contest_date)}</td>
            <td>${formatDate(contest.registration_deadline)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(contest.status)}">
                    ${getStatusText(contest.status)}
                </span>
            </td>
            <td>
                <button onclick="registerForContest(${contest.id})" class="btn btn-primary">Зареєструвати</button>
            </td>
        </tr>
    `,
        )
        .join("")
}

function loadMyRegistrations(registrations) {
    const tbody = document.getElementById("myRegistrationsTable")

    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Немає реєстрацій</td></tr>'
        return
    }

    tbody.innerHTML = registrations
        .map(
            (reg) => `
        <tr>
            <td>${reg.student_name}</td>
            <td>${reg.contest_name}</td>
            <td>${formatDate(reg.registered_at)}</td>
            <td>
                <span class="badge ${getParticipantStatusBadgeClass(reg.status)}">
                    ${getParticipantStatusText(reg.status)}
                </span>
            </td>
            <td>${reg.score !== null ? reg.score : "-"}</td>
        </tr>
    `,
        )
        .join("")
}

function loadTopStudents(students) {
    const tbody = document.getElementById("topStudentsTable")

    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Немає даних</td></tr>'
        return
    }

    tbody.innerHTML = students
        .map(
            (student) => `
        <tr>
            <td>${student.full_name}</td>
            <td>${student.grade}</td>
            <td>${student.participation_count}</td>
            <td>${student.average_score ? student.average_score.toFixed(1) : "-"}</td>
        </tr>
    `,
        )
        .join("")
}

function getStatusBadgeClass(status) {
    const classes = {
        upcoming: "badge-info",
        ongoing: "badge-success",
        completed: "badge-warning",
    }
    return classes[status] || "badge-info"
}

function getStatusText(status) {
    const texts = {
        upcoming: "Майбутній",
        ongoing: "Поточний",
        completed: "Завершений",
    }
    return texts[status] || status
}

function getParticipantStatusBadgeClass(status) {
    const classes = {
        pending: "badge-warning",
        approved: "badge-success",
        rejected: "badge-error",
    }
    return classes[status] || "badge-info"
}

function getParticipantStatusText(status) {
    const texts = {
        pending: "Очікує",
        approved: "Підтверджено",
        rejected: "Відхилено",
    }
    return texts[status] || status
}

// Modal functions
function showRegisterModal() {
    loadModalData()
    document.getElementById("registerModal").classList.add("show")
}

function closeRegisterModal() {
    document.getElementById("registerModal").classList.remove("show")
    document.getElementById("registerForm").reset()
}

function registerForContest(contestId) {
    document.getElementById("contestSelect").value = contestId
    showRegisterModal()
}

async function loadModalData() {
    try {
        // Load contests
        const contestsData = await apiRequest("/contests", {
            method: "GET",
        })
        const contestSelect = document.getElementById("contestSelect")
        contestSelect.innerHTML = '<option value="">Оберіть конкурс</option>'
        contestsData.contests.forEach((contest) => {
            const option = document.createElement("option")
            option.value = contest.id
            option.textContent = `${contest.name} - ${formatDate(contest.contest_date)}`
            contestSelect.appendChild(option)
        })

        // Load students
        const studentsData = await apiRequest("/teacher/students", {
            method: "GET",
        })
        const studentSelect = document.getElementById("studentSelect")
        studentSelect.innerHTML = '<option value="">Оберіть учня</option>'
        studentsData.students.forEach((student) => {
            const option = document.createElement("option")
            option.value = student.id
            option.textContent = `${student.full_name} (${student.grade} клас)`
            studentSelect.appendChild(option)
        })
    } catch (error) {
        console.error("Error loading modal data:", error)
    }
}

// Handle registration form submission
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const contestId = document.getElementById("contestSelect").value
    const studentId = document.getElementById("studentSelect").value

    try {
        await apiRequest("/participants/register", {
            method: "POST",
            body: JSON.stringify({
                contest_id: Number.parseInt(contestId),
                student_id: Number.parseInt(studentId),
            }),
        })

        closeRegisterModal()
        loadDashboardData()
    } catch (error) {
        showError("modalError", error.message)
    }
})

// Load data on page load
loadDashboardData()