const express = require("express")
const router = express.Router()
const predictionController = require("../controllers/predictionController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Generate prediction for a student
router.post("/", authMiddleware, roleMiddleware("methodist", "teacher"), predictionController.generatePrediction)

// Get predictions for a student
router.get("/student", authMiddleware, predictionController.getStudentPredictions)

// Generate predictions for all students in a contest
router.post(
    "/contest/:contest_id",
    authMiddleware,
    roleMiddleware("methodist"),
    predictionController.generateContestPredictions,
)

module.exports = router