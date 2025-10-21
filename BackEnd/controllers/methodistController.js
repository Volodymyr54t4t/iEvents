const pool = require("../db/pool")

// Methodist dashboard - overview of all contests
const getMethodistDashboard = async (req, res) => {
    const client = await pool.connect()

    try {
        const methodist_id = req.user.id

        // Get contests created by this methodist
        const contestsResult = await client.query(
            `SELECT c.*, 
              (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id) as total_participants,
              (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id AND status = 'pending') as pending_participants,
              (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id AND status = 'approved') as approved_participants
       FROM contests c
       WHERE c.created_by = $1
       ORDER BY c.created_at DESC`,
            [methodist_id],
        )

        // Get statistics
        const statsResult = await client.query(
            `SELECT 
         COUNT(DISTINCT c.id) as total_contests,
         COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_contests,
         COUNT(DISTINCT cp.student_id) as total_students,
         COUNT(DISTINCT cp.id) as total_registrations
       FROM contests c
       LEFT JOIN contest_participants cp ON c.id = cp.contest_id
       WHERE c.created_by = $1`,
            [methodist_id],
        )

        // Get recent activity
        const activityResult = await client.query(
            `SELECT 'registration' as type, cp.registered_at as created_at, 
              u.name as student_name, c.title as contest_title
       FROM contest_participants cp
       JOIN users u ON cp.student_id = u.id
       JOIN contests c ON cp.contest_id = c.id
       WHERE c.created_by = $1
       ORDER BY cp.registered_at DESC
       LIMIT 10`,
            [methodist_id],
        )

        res.json({
            contests: contestsResult.rows,
            statistics: statsResult.rows[0],
            recentActivity: activityResult.rows,
        })
    } catch (error) {
        console.error("Methodist dashboard error:", error)
        res.status(500).json({
            error: "Failed to load dashboard"
        })
    } finally {
        client.release()
    }
}

// Get statistics overview
const getStatistics = async (req, res) => {
    const client = await pool.connect()

    try {
        // Overall statistics
        const overallStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') as total_teachers,
        (SELECT COUNT(*) FROM contests WHERE status = 'active') as active_contests,
        (SELECT COUNT(*) FROM contest_participants WHERE status = 'approved') as total_participations,
        (SELECT AVG(score) FROM results) as average_score
    `)

        // Top performing students
        const topStudents = await client.query(`
      SELECT u.id, u.name, u.email,
             COUNT(r.id) as contests_participated,
             AVG(r.score) as average_score,
             SUM(CASE WHEN r.rank <= 3 THEN 1 ELSE 0 END) as top_3_finishes
      FROM users u
      JOIN results r ON u.id = r.student_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email
      ORDER BY average_score DESC
      LIMIT 10
    `)

        // Contest participation by month
        const participationTrend = await client.query(`
      SELECT 
        DATE_TRUNC('month', registered_at) as month,
        COUNT(*) as registrations
      FROM contest_participants
      WHERE registered_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month DESC
    `)

        res.json({
            overall: overallStats.rows[0],
            topStudents: topStudents.rows,
            participationTrend: participationTrend.rows,
        })
    } catch (error) {
        console.error("Statistics error:", error)
        res.status(500).json({
            error: "Failed to get statistics"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    getMethodistDashboard,
    getStatistics,
}