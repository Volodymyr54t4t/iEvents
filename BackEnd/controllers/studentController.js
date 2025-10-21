const pool = require("../db/pool")

// Student dashboard
const getStudentDashboard = async (req, res) => {
    const client = await pool.connect()

    try {
        const student_id = req.user.id

        // Get student's contest registrations
        const registrationsResult = await client.query(
            `SELECT cp.*, c.title, c.description, c.deadline, c.status as contest_status
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       WHERE cp.student_id = $1
       ORDER BY cp.registered_at DESC`,
            [student_id],
        )

        // Get student's results
        const resultsResult = await client.query(
            `SELECT r.*, c.title as contest_title, c.deadline
       FROM results r
       JOIN contests c ON r.contest_id = c.id
       WHERE r.student_id = $1
       ORDER BY r.created_at DESC`,
            [student_id],
        )

        // Get available contests (not registered yet)
        const availableContestsResult = await client.query(
            `SELECT c.*
       FROM contests c
       WHERE c.status = 'active' 
         AND c.deadline > NOW()
         AND c.id NOT IN (
           SELECT contest_id FROM contest_participants WHERE student_id = $1
         )
       ORDER BY c.deadline ASC`,
            [student_id],
        )

        // Get notifications
        const notificationsResult = await client.query(
            `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
            [student_id],
        )

        // Statistics
        const statsResult = await client.query(
            `SELECT 
         COUNT(DISTINCT cp.contest_id) as total_registrations,
         COUNT(DISTINCT CASE WHEN cp.status = 'approved' THEN cp.contest_id END) as approved_contests,
         COUNT(DISTINCT r.contest_id) as completed_contests,
         AVG(r.score) as average_score,
         MAX(r.score) as best_score
       FROM contest_participants cp
       LEFT JOIN results r ON cp.contest_id = r.contest_id AND r.student_id = cp.student_id
       WHERE cp.student_id = $1`,
            [student_id],
        )

        // Get predictions
        const predictionsResult = await client.query(
            `SELECT p.*, c.title as contest_title
       FROM predictions p
       JOIN contests c ON p.contest_id = c.id
       WHERE p.student_id = $1
       ORDER BY p.created_at DESC`,
            [student_id],
        )

        res.json({
            registrations: registrationsResult.rows,
            results: resultsResult.rows,
            availableContests: availableContestsResult.rows,
            notifications: notificationsResult.rows,
            statistics: statsResult.rows[0],
            predictions: predictionsResult.rows,
        })
    } catch (error) {
        console.error("Student dashboard error:", error)
        res.status(500).json({
            error: "Failed to load dashboard"
        })
    } finally {
        client.release()
    }
}

// Get student's performance history
const getStudentPerformance = async (req, res) => {
    const client = await pool.connect()

    try {
        const student_id = req.user.id

        const result = await client.query(
            `SELECT r.*, c.title as contest_title, c.deadline,
              (SELECT COUNT(*) FROM results WHERE contest_id = r.contest_id) as total_participants
       FROM results r
       JOIN contests c ON r.contest_id = c.id
       WHERE r.student_id = $1
       ORDER BY c.deadline DESC`,
            [student_id],
        )

        res.json({
            performance: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get student performance error:", error)
        res.status(500).json({
            error: "Failed to get performance data"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    getStudentDashboard,
    getStudentPerformance,
}