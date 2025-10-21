// Declare necessary variables and functions
const isAuthenticated = () => localStorage.getItem("token") !== null
const getUserData = () => JSON.parse(localStorage.getItem("userData"))
const redirectToDashboard = (role) => {
    window.location.href = `/dashboard/${role}`
}
const apiRequest = async (url, options) => {
    const response = await fetch(url, options)
    if (!response.ok) {
        throw new Error("Network response was not ok")
    }
    return response.json()
}
const showError = (elementId, message) => {
    document.getElementById(elementId).textContent = message
}

// Check if already logged in
if (isAuthenticated()) {
    const userData = getUserData()
    if (userData && userData.role) {
        redirectToDashboard(userData.role)
    }
}

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    try {
        const data = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            }),
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