const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Public routes
router.post("/register", authController.register)
router.post("/login", authController.login)

// Protected routes
router.get("/me", authMiddleware, authController.getMe)

// Admin routes
router.get("/users", authMiddleware, roleMiddleware("methodist"), authController.getAllUsers)

module.exports = router