// Check authentication
const userId = localStorage.getItem("userId")
if (!userId) {
  window.location.href = "auth.html"
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(() => console.log("Service Worker зареєстровано"))
    .catch((err) => console.error("SW помилка:", err));
}
