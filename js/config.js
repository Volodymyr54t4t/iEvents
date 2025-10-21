const API_URL = "http://localhost:3000/api"

// Helper function to get token
function getToken() {
    return localStorage.getItem("token")
}

// Helper function to get user data
function getUserData() {
    const userData = localStorage.getItem("userData")
    return userData ? JSON.parse(userData) : null
}

// Helper function to check if user is authenticated
function isAuthenticated() {
    return !!getToken()
}

// Helper function to redirect based on role
function redirectToDashboard(role) {
    const dashboards = {
        methodist: "methodist-dashboard.html",
        teacher: "teacher-dashboard.html",
        student: "student-dashboard.html",
    }
    window.location.href = dashboards[role] || "index.html"
}

// Helper function to logout
function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("userData")
    window.location.href = "index.html"
}

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
    const token = getToken()
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.message || "Щось пішло не так")
        }

        return data
    } catch (error) {
        console.error("API Error:", error)
        throw error
    }
}

// Helper function to show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId)
    if (errorElement) {
        errorElement.textContent = message
        errorElement.classList.add("show")
        setTimeout(() => {
            errorElement.classList.remove("show")
        }, 5000)
    }
}

// Helper function to show success message
function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId)
    if (successElement) {
        successElement.textContent = message
        successElement.classList.add("show")
        setTimeout(() => {
            successElement.classList.remove("show")
        }, 5000)
    }
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("uk-UA", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

// Helper function to format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString("uk-UA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}