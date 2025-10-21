const express = require("express")
const router = express.Router()
const methodistController = require("../controllers/methodistController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Methodist only routes
router.get("/dashboard", authMiddleware, roleMiddleware("methodist"), methodistController.getMethodistDashboard)

router.get("/statistics", authMiddleware, roleMiddleware("methodist"), methodistController.getStatistics)

module.exports = router