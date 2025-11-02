// Centralized API configuration
// This file must be loaded BEFORE any other JS files in HTML

const AppConfig = (() => {
  // Determine the correct API URL based on environment
  const getApiUrl = () => {
    const hostname = window.location.hostname
    const protocol = window.location.protocol

    // Check if we're on localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000"
    }

    // Production environment - use the production URL
    return "https://ievents-qf5k.onrender.com"
  }

  const API_URL = getApiUrl()

  // Public API
  return {
    API_URL: API_URL,
    getApiUrl: () => API_URL,

    // Helper method for making authenticated requests
    async fetch(endpoint, options = {}) {
      const token = localStorage.getItem("token")
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`

      return fetch(url, {
        ...options,
        headers,
      })
    },
  }
})()

// Make API_URL available globally for backward compatibility
window.API_URL = AppConfig.API_URL

console.log("[Config] API URL configured:", AppConfig.API_URL)
