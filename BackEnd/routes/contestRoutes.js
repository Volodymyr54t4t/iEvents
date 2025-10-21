const express = require("express")
const router = express.Router()
const contestController = require("../controllers/contestController")
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

// Public routes (authenticated users)
router.get("/", authMiddleware, contestController.getAllContests)
router.get("/:id", authMiddleware, contestController.getContestById)
router.get("/:id/results", authMiddleware, contestController.getContestResults)

// Methodist only routes
router.post("/", authMiddleware, roleMiddleware("methodist"), contestController.createContest)

router.patch("/:id", authMiddleware, roleMiddleware("methodist"), contestController.updateContest)

router.delete("/:id", authMiddleware, roleMiddleware("methodist"), contestController.deleteContest)

router.post("/:id/results", authMiddleware, roleMiddleware("methodist"), contestController.addContestResult)

module.exports = router