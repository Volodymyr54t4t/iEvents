const express = require("express")
const router = express.Router()
const participantController = require("../controllers/participantController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Register students for contest (teacher only)
router.post("/:id/register", authMiddleware, roleMiddleware("teacher"), participantController.registerStudents)

// Get participants for a contest
router.get("/:id/participants", authMiddleware, participantController.getContestParticipants)

// Update participant status (methodist only)
router.patch(
    "/:id/participants/:participantId",
    authMiddleware,
    roleMiddleware("methodist"),
    participantController.updateParticipantStatus,
)

// Get student registrations
router.get("/registrations", authMiddleware, participantController.getStudentRegistrations)

// Cancel registration
router.delete(
    "/:id/participants/:participantId",
    authMiddleware,
    roleMiddleware("student", "teacher"),
    participantController.cancelRegistration,
)

module.exports = router