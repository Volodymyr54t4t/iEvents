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

// Load contests
async function loadContests() {
    const status = document.getElementById("statusFilter").value
    const search = document.getElementById("searchInput").value

    try {
        let url = "/contests"
        const params = new URLSearchParams()
        if (status) params.append("status", status)
        if (search) params.append("search", search)
        if (params.toString()) url += `?${params.toString()}`

        const data = await apiRequest(url, {
            method: "GET",
        })

        displayContests(data.contests)
    } catch (error) {
        console.error("Error loading contests:", error)
    }
}

function displayContests(contests) {
    const tbody = document.getElementById("contestsTable")

    if (!contests || contests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Немає конкурсів</td></tr>'
        return
    }

    tbody.innerHTML = contests
        .map(
            (contest) => `
        <tr>
            <td>${contest.name}</td>
            <td>${contest.description.substring(0, 50)}${contest.description.length > 50 ? "..." : ""}</td>
            <td>${formatDate(contest.contest_date)}</td>
            <td>${formatDate(contest.registration_deadline)}</td>
            <td>${contest.participant_count || 0}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(contest.status)}">
                    ${getStatusText(contest.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="editContest(${contest.id})" class="btn btn-secondary">Редагувати</button>
                    <button onclick="deleteContest(${contest.id})" class="btn btn-danger">Видалити</button>
                </div>
            </td>
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

// Modal functions
function showCreateModal() {
    document.getElementById("modalTitle").textContent = "Створити конкурс"
    document.getElementById("contestForm").reset()
    document.getElementById("contestId").value = ""
    document.getElementById("contestModal").classList.add("show")
}

function closeContestModal() {
    document.getElementById("contestModal").classList.remove("show")
}

async function editContest(contestId) {
    try {
        const data = await apiRequest(`/contests/${contestId}`, {
            method: "GET",
        })

        document.getElementById("modalTitle").textContent = "Редагувати конкурс"
        document.getElementById("contestId").value = data.contest.id
        document.getElementById("contestName").value = data.contest.name
        document.getElementById("contestDescription").value = data.contest.description
        document.getElementById("contestDate").value = data.contest.contest_date.split("T")[0]
        document.getElementById("registrationDeadline").value = data.contest.registration_deadline.split("T")[0]

        document.getElementById("contestModal").classList.add("show")
    } catch (error) {
        alert("Помилка при завантаженні конкурсу: " + error.message)
    }
}

async function deleteContest(contestId) {
    if (!confirm("Ви впевнені, що хочете видалити цей конкурс?")) {
        return
    }

    try {
        await apiRequest(`/contests/${contestId}`, {
            method: "DELETE",
        })
        loadContests()
    } catch (error) {
        alert("Помилка при видаленні конкурсу: " + error.message)
    }
}

// Handle form submission
document.getElementById("contestForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const contestId = document.getElementById("contestId").value
    const formData = {
        name: document.getElementById("contestName").value,
        description: document.getElementById("contestDescription").value,
        contest_date: document.getElementById("contestDate").value,
        registration_deadline: document.getElementById("registrationDeadline").value,
    }

    try {
        if (contestId) {
            // Update existing contest
            await apiRequest(`/contests/${contestId}`, {
                method: "PUT",
                body: JSON.stringify(formData),
            })
        } else {
            // Create new contest
            await apiRequest("/contests", {
                method: "POST",
                body: JSON.stringify(formData),
            })
        }

        closeContestModal()
        loadContests()
    } catch (error) {
        showError("modalError", error.message)
    }
})

// Load contests on page load
loadContests()