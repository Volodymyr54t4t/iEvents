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

const formatDateTime = (dateTime) => {
    // Implement your date and time formatting logic here
    return new Date(dateTime).toLocaleString()
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

// Load dashboard data
async function loadDashboardData() {
    try {
        const data = await apiRequest("/methodist/dashboard", {
            method: "GET",
        })

        // Update statistics
        document.getElementById("totalContests").textContent = data.stats.total_contests
        document.getElementById("activeContests").textContent = data.stats.active_contests
        document.getElementById("totalParticipants").textContent = data.stats.total_participants
        document.getElementById("pendingParticipants").textContent = data.stats.pending_participants
        document.getElementById("totalTeachers").textContent = data.stats.total_teachers
        document.getElementById("totalStudents").textContent = data.stats.total_students

        // Load recent contests
        loadRecentContests(data.recent_contests)

        // Load pending participants
        loadPendingParticipants(data.pending_participants)

        // Load recent activity
        loadRecentActivity(data.recent_activity)
    } catch (error) {
        console.error("Error loading dashboard:", error)
    }
}

function loadRecentContests(contests) {
    const tbody = document.getElementById("recentContests")

    if (!contests || contests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Немає конкурсів</td></tr>'
        return
    }

    tbody.innerHTML = contests
        .map(
            (contest) => `
        <tr>
            <td>${contest.name}</td>
            <td>${formatDate(contest.contest_date)}</td>
            <td>${contest.participant_count || 0}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(contest.status)}">
                    ${getStatusText(contest.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewContest(${contest.id})" class="btn btn-secondary">Переглянути</button>
                </div>
            </td>
        </tr>
    `,
        )
        .join("")
}

function loadPendingParticipants(participants) {
    const tbody = document.getElementById("pendingParticipantsTable")

    if (!participants || participants.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" style="text-align: center;">Немає учасників, що очікують підтвердження</td></tr>'
        return
    }

    tbody.innerHTML = participants
        .map(
            (p) => `
        <tr>
            <td>${p.student_name}</td>
            <td>${p.contest_name}</td>
            <td>${p.teacher_name}</td>
            <td>${formatDate(p.registered_at)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="approveParticipant(${p.id})" class="btn btn-success">Підтвердити</button>
                    <button onclick="rejectParticipant(${p.id})" class="btn btn-danger">Відхилити</button>
                </div>
            </td>
        </tr>
    `,
        )
        .join("")
}

function loadRecentActivity(activities) {
    const container = document.getElementById("recentActivity")

    if (!activities || activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Немає активності</p>'
        return
    }

    container.innerHTML = activities
        .map(
            (activity) => `
        <div style="padding: 12px; border-bottom: 1px solid var(--border);">
            <p style="margin-bottom: 4px;">${activity.description}</p>
            <p style="font-size: 12px; color: var(--text-secondary);">${formatDateTime(activity.created_at)}</p>
        </div>
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

function viewContest(contestId) {
    window.location.href = `contest-details.html?id=${contestId}`
}

async function approveParticipant(participantId) {
    try {
        await apiRequest(`/participants/${participantId}/approve`, {
            method: "PUT",
        })
        loadDashboardData()
    } catch (error) {
        alert("Помилка при підтвердженні учасника: " + error.message)
    }
}

async function rejectParticipant(participantId) {
    if (!confirm("Ви впевнені, що хочете відхилити цього учасника?")) {
        return
    }

    try {
        await apiRequest(`/participants/${participantId}/reject`, {
            method: "PUT",
        })
        loadDashboardData()
    } catch (error) {
        alert("Помилка при відхиленні учасника: " + error.message)
    }
}

// Load data on page load
loadDashboardData()