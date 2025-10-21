const pool = require("../db/pool")

// Teacher dashboard
const getTeacherDashboard = async (req, res) => {
    const client = await pool.connect()

    try {
        const teacher_id = req.user.id

        // Get teacher's classes
        const classesResult = await client.query(
            `SELECT c.*, 
              (SELECT COUNT(*) FROM students_classes WHERE class_id = c.id) as student_count
       FROM classes c
       WHERE c.teacher_id = $1
       ORDER BY c.created_at DESC`,
            [teacher_id],
        )

        // Get students registered by this teacher
        const studentsResult = await client.query(
            `SELECT DISTINCT u.id, u.name, u.email,
              (SELECT COUNT(*) FROM contest_participants WHERE student_id = u.id AND teacher_id = $1) as registrations_count
       FROM users u
       JOIN contest_participants cp ON u.id = cp.student_id
       WHERE cp.teacher_id = $1 AND u.role = 'student'
       ORDER BY u.name`,
            [teacher_id],
        )

        // Get active contests
        const contestsResult = await client.query(
            `
      SELECT c.*,
             (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id AND teacher_id = $1) as my_registrations
      FROM contests c
      WHERE c.status = 'active' AND c.deadline > NOW()
      ORDER BY c.deadline ASC
    `,
            [teacher_id],
        )

        // Get registrations made by this teacher
        const registrationsResult = await client.query(
            `SELECT cp.*, c.title as contest_title, u.name as student_name
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       JOIN users u ON cp.student_id = u.id
       WHERE cp.teacher_id = $1
       ORDER BY cp.registered_at DESC
       LIMIT 20`,
            [teacher_id],
        )

        // Statistics
        const statsResult = await client.query(
            `SELECT 
         COUNT(DISTINCT cp.student_id) as total_students_registered,
         COUNT(DISTINCT cp.contest_id) as contests_participated,
         COUNT(DISTINCT CASE WHEN cp.status = 'approved' THEN cp.id END) as approved_registrations,
         COUNT(DISTINCT CASE WHEN cp.status = 'pending' THEN cp.id END) as pending_registrations
       FROM contest_participants cp
       WHERE cp.teacher_id = $1`,
            [teacher_id],
        )

        res.json({
            classes: classesResult.rows,
            students: studentsResult.rows,
            activeContests: contestsResult.rows,
            recentRegistrations: registrationsResult.rows,
            statistics: statsResult.rows[0],
        })
    } catch (error) {
        console.error("Teacher dashboard error:", error)
        res.status(500).json({
            error: "Failed to load dashboard"
        })
    } finally {
        client.release()
    }
}

// Get teacher's students
const getTeacherStudents = async (req, res) => {
    const client = await pool.connect()

    try {
        const teacher_id = req.user.id

        const result = await client.query(
            `SELECT DISTINCT u.id, u.name, u.email, u.telegram_id,
              (SELECT COUNT(*) FROM contest_participants WHERE student_id = u.id) as total_participations,
              (SELECT AVG(score) FROM results WHERE student_id = u.id) as average_score
       FROM users u
       JOIN students_classes sc ON u.id = sc.student_id
       JOIN classes c ON sc.class_id = c.id
       WHERE c.teacher_id = $1 AND u.role = 'student'
       ORDER BY u.name`,
            [teacher_id],
        )

        res.json({
            students: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get teacher students error:", error)
        res.status(500).json({
            error: "Failed to get students"
        })
    } finally {
        client.release()
    }
}

// Create a class
const createClass = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            name
        } = req.body
        const teacher_id = req.user.id

        if (!name) {
            return res.status(400).json({
                error: "Class name is required"
            })
        }

        const result = await client.query(`INSERT INTO classes (name, teacher_id) VALUES ($1, $2) RETURNING *`, [
            name,
            teacher_id,
        ])

        res.status(201).json({
            message: "Class created successfully",
            class: result.rows[0],
        })
    } catch (error) {
        console.error("Create class error:", error)
        res.status(500).json({
            error: "Failed to create class"
        })
    } finally {
        client.release()
    }
}

// Add student to class
const addStudentToClass = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            class_id,
            student_id
        } = req.body
        const teacher_id = req.user.id

        // Verify class belongs to teacher
        const classCheck = await client.query(`SELECT id FROM classes WHERE id = $1 AND teacher_id = $2`, [
            class_id,
            teacher_id,
        ])

        if (classCheck.rows.length === 0) {
            return res.status(403).json({
                error: "Class not found or access denied"
            })
        }

        // Verify student exists
        const studentCheck = await client.query(`SELECT id FROM users WHERE id = $1 AND role = 'student'`, [student_id])

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Student not found"
            })
        }

        // Add student to class
        const result = await client.query(
            `INSERT INTO students_classes (student_id, class_id) VALUES ($1, $2) RETURNING *`,
            [student_id, class_id],
        )

        res.status(201).json({
            message: "Student added to class successfully",
            enrollment: result.rows[0],
        })
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Student already in this class"
            })
        }
        console.error("Add student to class error:", error)
        res.status(500).json({
            error: "Failed to add student to class"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    getTeacherDashboard,
    getTeacherStudents,
    createClass,
    addStudentToClass,
}