const pool = require("../db/pool")

// Get user notifications
const getNotifications = async (req, res) => {
    const client = await pool.connect()

    try {
        const user_id = req.user.id
        const {
            is_read
        } = req.query

        let query = `SELECT * FROM notifications WHERE user_id = $1`
        const params = [user_id]

        if (is_read !== undefined) {
            query += ` AND is_read = $2`
            params.push(is_read === "true")
        }

        query += ` ORDER BY created_at DESC LIMIT 50`

        const result = await client.query(query, params)

        res.json({
            notifications: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get notifications error:", error)
        res.status(500).json({
            error: "Failed to get notifications"
        })
    } finally {
        client.release()
    }
}

// Mark notification as read
const markAsRead = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params
        const user_id = req.user.id

        const result = await client.query(
            `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
            [id, user_id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Notification not found"
            })
        }

        res.json({
            message: "Notification marked as read",
            notification: result.rows[0],
        })
    } catch (error) {
        console.error("Mark as read error:", error)
        res.status(500).json({
            error: "Failed to mark notification as read"
        })
    } finally {
        client.release()
    }
}

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    const client = await pool.connect()

    try {
        const user_id = req.user.id

        await client.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [user_id])

        res.json({
            message: "All notifications marked as read",
        })
    } catch (error) {
        console.error("Mark all as read error:", error)
        res.status(500).json({
            error: "Failed to mark all notifications as read"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
}