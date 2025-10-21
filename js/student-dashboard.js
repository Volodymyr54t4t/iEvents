// Declare necessary variables and functions
const isAuthenticated = () => {
    // Implement your authentication logic here
    return true // Placeholder for authentication check
}

const getUserData = () => {
    // Implement your user data retrieval logic here
    return {
        role: "student",
        full_name: "Alex Johnson"
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

// Check authentication
if (!isAuthenticated()) {
    window.location.href = "index.html"
}

const userData = getUserData()
if (userData.role !== "student") {
    redirectToDashboard(userData.role)
}

// Display user name
document.getElementById("userName").textContent = userData.full_name

// Load dashboard data
async function loadDashboardData() {
    try {
        const data = await apiRequest("/student/dashboard", {
            method: "GET",
        })

        // Update statistics
        document.getElementById("totalParticipations").textContent = data.stats.total_participations
        document.getElementById("ongoingParticipations").textContent = data.stats.ongoing_participations
        document.getElementById("averageScore").textContent = data.stats.average_score ?
            data.stats.average_score.toFixed(1) :
            "0"
        document.getElementById("bestScore").textContent = data.stats.best_score || "0"
        document.getElementById("ranking").textContent = data.stats.class_ranking || "-"

        // Update score change
        const scoreChangeElement = document.getElementById("scoreChange")
        if (data.stats.score_change) {
            const change = data.stats.score_change
            scoreChangeElement.textContent = `${change > 0 ? "+" : ""}${change.toFixed(1)}`
            scoreChangeElement.className = change >= 0 ? "stat-card-change" : "stat-card-change negative"
        }

        // Load my contests
        loadMyContests(data.my_contests)

        // Load progress chart
        loadProgressChart(data.progress)

        // Load recommendations
        loadRecommendations(data.recommendations)
    } catch (error) {
        console.error("Error loading dashboard:", error)
    }
}

function loadMyContests(contests) {
    const tbody = document.getElementById("myContestsTable")

    if (!contests || contests.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" style="text-align: center;">Ви ще не зареєстровані на жодний конкурс</td></tr>'
        return
    }

    tbody.innerHTML = contests
        .map(
            (contest) => `
        <tr>
            <td>${contest.contest_name}</td>
            <td>${formatDate(contest.contest_date)}</td>
            <td>
                <span class="badge ${getParticipantStatusBadgeClass(contest.status)}">
                    ${getParticipantStatusText(contest.status)}
                </span>
            </td>
            <td>${contest.score !== null ? contest.score : "-"}</td>
            <td>${contest.predicted_score !== null ? contest.predicted_score.toFixed(1) : "-"}</td>
        </tr>
    `,
        )
        .join("")
}

function loadProgressChart(progress) {
    const container = document.getElementById("progressChart")

    if (!progress || progress.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; color: var(--text-secondary);">Недостатньо даних для відображення прогресу</p>'
        return
    }

    // Simple text-based progress display
    container.innerHTML = progress
        .map(
            (item) => `
        <div style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
            <span>${item.month}</span>
            <span style="font-weight: 600;">${item.average_score.toFixed(1)}</span>
        </div>
    `,
        )
        .join("")
}

function loadRecommendations(recommendations) {
    const container = document.getElementById("recommendations")

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Немає рекомендацій</p>'
        return
    }

    container.innerHTML = recommendations
        .map(
            (rec) => `
        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
            <h3 style="font-size: 16px; margin-bottom: 8px;">${rec.title}</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">${rec.description}</p>
        </div>
    `,
        )
        .join("")
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
        pending: "Очікує підтвердження",
        approved: "Підтверджено",
        rejected: "Відхилено",
    }
    return texts[status] || status
}

// Load data on page load
loadDashboardData()