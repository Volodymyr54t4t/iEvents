const express = require("express")
const cors = require("cors")
require("dotenv").config()

const {
    initTelegramBot
} = require("./services/telegramBot")

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
)
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
    next()
})

// Routes
const authRoutes = require("./routes/authRoutes")
const contestRoutes = require("./routes/contestRoutes")
const participantRoutes = require("./routes/participantRoutes")
const methodistRoutes = require("./routes/methodistRoutes")
const teacherRoutes = require("./routes/teacherRoutes")
const studentRoutes = require("./routes/studentRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const predictionRoutes = require("./routes/predictionRoutes")

app.use("/api/auth", authRoutes)
app.use("/api/contests", contestRoutes)
app.use("/api/contests", participantRoutes)
app.use("/api/methodist", methodistRoutes)
app.use("/api/teacher", teacherRoutes)
app.use("/api/student", studentRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/predictions", predictionRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Server is running"
    })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found"
    })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error("Error:", err)
    res.status(err.status || 500).json({
        error: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack
        }),
    })
})

initTelegramBot()

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`)
    console.log(`📝 Environment: ${process.env.NODE_ENV}`)
})

module.exports = app