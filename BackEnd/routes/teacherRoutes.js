const express = require("express")
const router = express.Router()
const teacherController = require("../controllers/teacherController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Teacher only routes
router.get("/dashboard", authMiddleware, roleMiddleware("teacher"), teacherController.getTeacherDashboard)

router.get("/students", authMiddleware, roleMiddleware("teacher"), teacherController.getTeacherStudents)

router.post("/classes", authMiddleware, roleMiddleware("teacher"), teacherController.createClass)

router.post("/classes/students", authMiddleware, roleMiddleware("teacher"), teacherController.addStudentToClass)

module.exports = router