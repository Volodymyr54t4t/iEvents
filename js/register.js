// Declare necessary variables and functions
const isAuthenticated = () => {
    // Implementation for checking if user is authenticated
    return localStorage.getItem("token") !== null
}

const getUserData = () => {
    // Implementation for getting user data
    return JSON.parse(localStorage.getItem("userData"))
}

const redirectToDashboard = (role) => {
    // Implementation for redirecting to dashboard based on role
    window.location.href = `/dashboard/${role}`
}

const apiRequest = async (url, options) => {
    // Implementation for making API requests
    const response = await fetch(url, options)
    if (!response.ok) {
        throw new Error("Network response was not ok")
    }
    return response.json()
}

const showError = (elementId, message) => {
    // Implementation for showing error messages
    document.getElementById(elementId).textContent = message
}

// Check if already logged in
if (isAuthenticated()) {
    const userData = getUserData()
    if (userData && userData.role) {
        redirectToDashboard(userData.role)
    }
}

// Show/hide conditional fields based on role
document.getElementById("role").addEventListener("change", (e) => {
    const role = e.target.value
    const teacherFields = document.getElementById("teacherFields")
    const studentFields = document.getElementById("studentFields")

    teacherFields.style.display = role === "teacher" ? "block" : "none"
    studentFields.style.display = role === "student" ? "block" : "none"
})

// Handle registration form submission
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = {
        full_name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value,
    }

    // Add role-specific fields
    if (formData.role === "teacher") {
        formData.subject = document.getElementById("subject").value
    } else if (formData.role === "student") {
        formData.grade = Number.parseInt(document.getElementById("grade").value)
        const telegramId = document.getElementById("telegramId").value
        if (telegramId) {
            formData.telegram_id = telegramId
        }
    }

    try {
        const data = await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify(formData),
        })

        // Save token and user data
        localStorage.setItem("token", data.token)
        localStorage.setItem("userData", JSON.stringify(data.user))

        // Redirect to appropriate dashboard
        redirectToDashboard(data.user.role)
    } catch (error) {
        showError("errorMessage", error.message)
    }
})