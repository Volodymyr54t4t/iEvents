const express = require("express")
const router = express.Router()
const notificationController = require("../controllers/notificationController")
const authMiddleware = require("../middleware/authMiddleware")

// All authenticated users can access notifications
router.get("/", authMiddleware, notificationController.getNotifications)

router.patch("/:id/read", authMiddleware, notificationController.markAsRead)

router.patch("/read-all", authMiddleware, notificationController.markAllAsRead)

module.exports = router