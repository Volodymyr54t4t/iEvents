const express = require("express")
const router = express.Router()
const studentController = require("../controllers/studentController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Student only routes
router.get("/dashboard", authMiddleware, roleMiddleware("student"), studentController.getStudentDashboard)

router.get("/performance", authMiddleware, roleMiddleware("student"), studentController.getStudentPerformance)

module.exports = router