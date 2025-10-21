// Declare necessary variables and functions
const isAuthenticated = () => {
    // Implement your authentication logic here
    return true // Placeholder for authentication check
}

const getUserData = () => {
    // Implement your user data retrieval logic here
    return {
        role: "methodist",
        full_name: "John Doe"
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
if (userData.role !== "methodist") {
    redirectToDashboard(userData.role)
}

// Display user name
document.getElementById("userName").textContent = userData.full_name

// Get contest ID from URL
const urlParams = new URLSearchParams(window.location.search)
const contestId = urlParams.get("id")

if (!contestId) {
    window.location.href = "contests.html"
}

// Load contest details
async function loadContestDetails() {
    try {
        const data = await apiRequest(`/contests/${contestId}`, {
            method: "GET",
        })

        const contest = data.contest

        document.getElementById("contestName").textContent = contest.name
        document.getElementById("contestDescription").textContent = contest.description
        document.getElementById("contestDate").textContent = formatDate(contest.contest_date)
        document.getElementById("registrationDeadline").textContent = formatDate(contest.registration_deadline)
        document.getElementById("participantCount").textContent = contest.participant_count || 0
        document.getElementById("contestStatus").textContent = getStatusText(contest.status)

        loadParticipants()
    } catch (error) {
        console.error("Error loading contest details:", error)
    }
}

async function loadParticipants() {
    try {
        const data = await apiRequest(`/contests/${contestId}/participants`, {
            method: "GET",
        })

        displayParticipants(data.participants)
    } catch (error) {
        console.error("Error loading participants:", error)
    }
}

function displayParticipants(participants) {
    const tbody = document.getElementById("participantsTable")

    if (!participants || participants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Немає учасників</td></tr>'
        return
    }

    tbody.innerHTML = participants
        .map(
            (p) => `
        <tr>
            <td>${p.student_name}</td>
            <td>${p.grade}</td>
            <td>${p.teacher_name}</td>
            <td>
                <span class="badge ${getParticipantStatusBadgeClass(p.status)}">
                    ${getParticipantStatusText(p.status)}
                </span>
            </td>
            <td>${p.score !== null ? p.score : "-"}</td>
            <td>
                <div class="action-buttons">
                    ${
                      p.status === "approved"
                        ? `<button onclick="editResult(${p.id}, ${p.score})" class="btn btn-secondary">Редагувати результат</button>`
                        : ""
                    }
                </div>
            </td>
        </tr>
    `,
        )
        .join("")
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
async function showAddResultModal() {
    try {
        const data = await apiRequest(`/contests/${contestId}/participants`, {
            method: "GET",
        })

        const select = document.getElementById("participantSelect")
        select.innerHTML = '<option value="">Оберіть учасника</option>'

        data.participants
            .filter((p) => p.status === "approved")
            .forEach((p) => {
                const option = document.createElement("option")
                option.value = p.id
                option.textContent = `${p.student_name} (${p.grade} клас)`
                select.appendChild(option)
            })

        document.getElementById("participantId").value = ""
        document.getElementById("score").value = ""
        document.getElementById("resultModal").classList.add("show")
    } catch (error) {
        alert("Помилка при завантаженні учасників: " + error.message)
    }
}

function closeResultModal() {
    document.getElementById("resultModal").classList.remove("show")
}

function editResult(participantId, currentScore) {
    document.getElementById("participantId").value = participantId
    document.getElementById("participantSelect").value = participantId
    document.getElementById("score").value = currentScore
    document.getElementById("resultModal").classList.add("show")
}

// Handle result form submission
document.getElementById("resultForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const participantId =
        document.getElementById("participantId").value || document.getElementById("participantSelect").value
    const score = Number.parseInt(document.getElementById("score").value)

    try {
        await apiRequest(`/contests/${contestId}/results`, {
            method: "POST",
            body: JSON.stringify({
                participant_id: Number.parseInt(participantId),
                score: score,
            }),
        })

        closeResultModal()
        loadParticipants()
    } catch (error) {
        showError("modalError", error.message)
    }
})

// Load data on page load
loadContestDetails()