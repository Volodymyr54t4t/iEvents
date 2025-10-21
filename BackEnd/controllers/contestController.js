const pool = require("../db/pool")

// Create new contest (methodist only)
const createContest = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            title,
            description,
            rules,
            deadline
        } = req.body
        const created_by = req.user.id

        // Validation
        if (!title || !deadline) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["title", "deadline"],
            })
        }

        // Validate deadline is in the future
        const deadlineDate = new Date(deadline)
        if (deadlineDate <= new Date()) {
            return res.status(400).json({
                error: "Deadline must be in the future",
            })
        }

        // Insert contest
        const result = await client.query(
            `INSERT INTO contests (title, description, rules, deadline, created_by, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING *`,
            [title, description || null, rules || null, deadline, created_by],
        )

        const contest = result.rows[0]

        // Create notification for all teachers about new contest
        await client.query(
            `INSERT INTO notifications (user_id, message) 
       SELECT id, $1 
       FROM users 
       WHERE role = 'teacher'`,
            [`Новий конкурс створено: ${title}`],
        )

        res.status(201).json({
            message: "Contest created successfully",
            contest,
        })
    } catch (error) {
        console.error("Create contest error:", error)
        res.status(500).json({
            error: "Failed to create contest"
        })
    } finally {
        client.release()
    }
}

// Get all contests
const getAllContests = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            status
        } = req.query

        let query = `
      SELECT c.*, u.name as creator_name,
             (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id) as participants_count
      FROM contests c
      LEFT JOIN users u ON c.created_by = u.id
    `
        const params = []

        if (status) {
            query += ` WHERE c.status = $1`
            params.push(status)
        }

        query += ` ORDER BY c.created_at DESC`

        const result = await client.query(query, params)

        res.json({
            contests: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get contests error:", error)
        res.status(500).json({
            error: "Failed to get contests"
        })
    } finally {
        client.release()
    }
}

// Get single contest by ID
const getContestById = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params

        const result = await client.query(
            `SELECT c.*, u.name as creator_name,
              (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id) as participants_count,
              (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id AND status = 'approved') as approved_count
       FROM contests c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
            [id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Contest not found"
            })
        }

        res.json({
            contest: result.rows[0],
        })
    } catch (error) {
        console.error("Get contest error:", error)
        res.status(500).json({
            error: "Failed to get contest"
        })
    } finally {
        client.release()
    }
}

// Update contest (methodist only)
const updateContest = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params
        const {
            title,
            description,
            rules,
            deadline,
            status
        } = req.body

        // Check if contest exists
        const existingContest = await client.query("SELECT * FROM contests WHERE id = $1", [id])

        if (existingContest.rows.length === 0) {
            return res.status(404).json({
                error: "Contest not found"
            })
        }

        // Build update query dynamically
        const updates = []
        const values = []
        let paramCount = 1

        if (title !== undefined) {
            updates.push(`title = $${paramCount}`)
            values.push(title)
            paramCount++
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount}`)
            values.push(description)
            paramCount++
        }
        if (rules !== undefined) {
            updates.push(`rules = $${paramCount}`)
            values.push(rules)
            paramCount++
        }
        if (deadline !== undefined) {
            updates.push(`deadline = $${paramCount}`)
            values.push(deadline)
            paramCount++
        }
        if (status !== undefined) {
            updates.push(`status = $${paramCount}`)
            values.push(status)
            paramCount++
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: "No fields to update"
            })
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(id)

        const query = `UPDATE contests SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`

        const result = await client.query(query, values)

        res.json({
            message: "Contest updated successfully",
            contest: result.rows[0],
        })
    } catch (error) {
        console.error("Update contest error:", error)
        res.status(500).json({
            error: "Failed to update contest"
        })
    } finally {
        client.release()
    }
}

// Delete contest (methodist only)
const deleteContest = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params

        // Check if contest exists
        const existingContest = await client.query("SELECT * FROM contests WHERE id = $1", [id])

        if (existingContest.rows.length === 0) {
            return res.status(404).json({
                error: "Contest not found"
            })
        }

        // Archive instead of delete (soft delete)
        await client.query(`UPDATE contests SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id])

        res.json({
            message: "Contest archived successfully",
        })
    } catch (error) {
        console.error("Delete contest error:", error)
        res.status(500).json({
            error: "Failed to delete contest"
        })
    } finally {
        client.release()
    }
}

// Get contest results
const getContestResults = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params

        // Check if contest exists
        const contestCheck = await client.query("SELECT id, title FROM contests WHERE id = $1", [id])

        if (contestCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Contest not found"
            })
        }

        // Get results
        const result = await client.query(
            `SELECT r.*, u.name as student_name, u.email as student_email
       FROM results r
       JOIN users u ON r.student_id = u.id
       WHERE r.contest_id = $1
       ORDER BY r.rank ASC, r.score DESC`,
            [id],
        )

        res.json({
            contest: contestCheck.rows[0],
            results: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get results error:", error)
        res.status(500).json({
            error: "Failed to get contest results"
        })
    } finally {
        client.release()
    }
}

// Add or update result for a student
const addContestResult = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            id
        } = req.params // contest_id
        const {
            student_id,
            score,
            rank
        } = req.body

        if (!student_id || score === undefined) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["student_id", "score"],
            })
        }

        // Check if student is registered for this contest
        const participantCheck = await client.query(
            `SELECT id FROM contest_participants 
       WHERE contest_id = $1 AND student_id = $2 AND status = 'approved'`,
            [id, student_id],
        )

        if (participantCheck.rows.length === 0) {
            return res.status(400).json({
                error: "Student is not registered or approved for this contest",
            })
        }

        // Insert or update result
        const result = await client.query(
            `INSERT INTO results (contest_id, student_id, score, rank) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (contest_id, student_id) 
       DO UPDATE SET score = $3, rank = $4, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [id, student_id, score, rank || null],
        )

        // Notify student about result
        await client.query(
            `INSERT INTO notifications (user_id, message) 
       VALUES ($1, $2)`,
            [student_id, `Ваш результат у конкурсі оновлено: ${score} балів`],
        )

        res.json({
            message: "Result added successfully",
            result: result.rows[0],
        })
    } catch (error) {
        console.error("Add result error:", error)
        res.status(500).json({
            error: "Failed to add result"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    createContest,
    getAllContests,
    getContestById,
    updateContest,
    deleteContest,
    getContestResults,
    addContestResult,
}