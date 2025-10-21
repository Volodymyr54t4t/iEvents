const pool = require("../db/pool")

// Register students for a contest (teacher only)
const registerStudents = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id: contest_id
        } = req.params
        const {
            student_ids
        } = req.body
        const teacher_id = req.user.id

        // Validation
        if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
            return res.status(400).json({
                error: "student_ids must be a non-empty array",
            })
        }

        // Check if contest exists and is active
        const contestCheck = await client.query("SELECT id, title, status, deadline FROM contests WHERE id = $1", [
            contest_id,
        ])

        if (contestCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Contest not found"
            })
        }

        const contest = contestCheck.rows[0]

        if (contest.status !== "active") {
            return res.status(400).json({
                error: "Contest is not active"
            })
        }

        if (new Date(contest.deadline) < new Date()) {
            return res.status(400).json({
                error: "Contest deadline has passed"
            })
        }

        // Verify all students exist and are students
        const studentsCheck = await client.query(`SELECT id, name FROM users WHERE id = ANY($1) AND role = 'student'`, [
            student_ids,
        ])

        if (studentsCheck.rows.length !== student_ids.length) {
            return res.status(400).json({
                error: "Some student IDs are invalid or not students",
            })
        }

        // Register students
        const registered = []
        const alreadyRegistered = []

        await client.query("BEGIN")

        for (const student_id of student_ids) {
            try {
                const result = await client.query(
                    `INSERT INTO contest_participants (contest_id, student_id, teacher_id, status) 
           VALUES ($1, $2, $3, 'pending') 
           RETURNING *`,
                    [contest_id, student_id, teacher_id],
                )

                registered.push(result.rows[0])

                // Create notification for student
                await client.query(
                    `INSERT INTO notifications (user_id, message) 
           VALUES ($1, $2)`,
                    [student_id, `Вас зареєстровано на конкурс: ${contest.title}`],
                )
            } catch (error) {
                if (error.code === "23505") {
                    // Unique constraint violation
                    alreadyRegistered.push(student_id)
                } else {
                    throw error
                }
            }
        }

        await client.query("COMMIT")

        res.status(201).json({
            message: "Students registered successfully",
            registered,
            alreadyRegistered,
            registeredCount: registered.length,
        })
    } catch (error) {
        await client.query("ROLLBACK")
        console.error("Register students error:", error)
        res.status(500).json({
            error: "Failed to register students"
        })
    } finally {
        client.release()
    }
}

// Get participants for a contest
const getContestParticipants = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id: contest_id
        } = req.params
        const {
            status
        } = req.query

        let query = `
      SELECT cp.*, 
             s.name as student_name, s.email as student_email,
             t.name as teacher_name, t.email as teacher_email
      FROM contest_participants cp
      JOIN users s ON cp.student_id = s.id
      LEFT JOIN users t ON cp.teacher_id = t.id
      WHERE cp.contest_id = $1
    `
        const params = [contest_id]

        if (status) {
            query += ` AND cp.status = $2`
            params.push(status)
        }

        query += ` ORDER BY cp.registered_at DESC`

        const result = await client.query(query, params)

        res.json({
            participants: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get participants error:", error)
        res.status(500).json({
            error: "Failed to get participants"
        })
    } finally {
        client.release()
    }
}

// Approve or reject participant (methodist only)
const updateParticipantStatus = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id: contest_id,
            participantId
        } = req.params
        const {
            status
        } = req.body

        // Validation
        if (!status || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                error: "Invalid status",
                validStatuses: ["approved", "rejected"],
            })
        }

        // Check if participant exists
        const participantCheck = await client.query(
            `SELECT cp.*, c.title as contest_title 
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       WHERE cp.id = $1 AND cp.contest_id = $2`,
            [participantId, contest_id],
        )

        if (participantCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Participant not found"
            })
        }

        const participant = participantCheck.rows[0]

        // Update status
        const result = await client.query(
            `UPDATE contest_participants 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
            [status, participantId],
        )

        // Create notification for student
        const message =
            status === "approved" ?
            `Вашу участь у конкурсі "${participant.contest_title}" підтверджено!` :
            `Вашу заявку на участь у конкурсі "${participant.contest_title}" відхилено`

        await client.query(
            `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2)`,
            [participant.student_id, message],
        )

        res.json({
            message: `Participant ${status} successfully`,
            participant: result.rows[0],
        })
    } catch (error) {
        console.error("Update participant status error:", error)
        res.status(500).json({
            error: "Failed to update participant status"
        })
    } finally {
        client.release()
    }
}

// Get student's registrations
const getStudentRegistrations = async (req, res) => {
    const client = await pool.connect()

    try {
        const student_id = req.user.role === "student" ? req.user.id : req.query.student_id

        if (!student_id) {
            return res.status(400).json({
                error: "student_id is required"
            })
        }

        const result = await client.query(
            `SELECT cp.*, c.title, c.description, c.deadline, c.status as contest_status
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       WHERE cp.student_id = $1
       ORDER BY cp.registered_at DESC`,
            [student_id],
        )

        res.json({
            registrations: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get student registrations error:", error)
        res.status(500).json({
            error: "Failed to get registrations"
        })
    } finally {
        client.release()
    }
}

// Cancel registration (student or teacher)
const cancelRegistration = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id: contest_id,
            participantId
        } = req.params
        const userId = req.user.id
        const userRole = req.user.role

        // Get participant info
        const participantCheck = await client.query(
            `SELECT * FROM contest_participants 
       WHERE id = $1 AND contest_id = $2`,
            [participantId, contest_id],
        )

        if (participantCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Registration not found"
            })
        }

        const participant = participantCheck.rows[0]

        // Check permissions
        if (userRole === "student" && participant.student_id !== userId) {
            return res.status(403).json({
                error: "You can only cancel your own registration"
            })
        }

        if (userRole === "teacher" && participant.teacher_id !== userId) {
            return res.status(403).json({
                error: "You can only cancel registrations you created"
            })
        }

        // Delete registration
        await client.query(`DELETE FROM contest_participants WHERE id = $1`, [participantId])

        res.json({
            message: "Registration cancelled successfully",
        })
    } catch (error) {
        console.error("Cancel registration error:", error)
        res.status(500).json({
            error: "Failed to cancel registration"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    registerStudents,
    getContestParticipants,
    updateParticipantStatus,
    getStudentRegistrations,
    cancelRegistration,
}