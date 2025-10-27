// Check authentication
const userId = localStorage.getItem("userId")
if (!userId) {
  window.location.href = "auth.html"
}
