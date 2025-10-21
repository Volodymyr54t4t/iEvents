const pool = require("../db/pool")

// Generate prediction for student based on historical performance
const generatePrediction = async (req, res) => {
  const client = await pool.connect()

  try {
    const { student_id, contest_id } = req.body

    if (!student_id || !contest_id) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["student_id", "contest_id"],
      })
    }

    // Get student's historical scores
    const historyResult = await client.query(
      `SELECT score FROM results WHERE student_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [student_id],
    )

    if (historyResult.rows.length === 0) {
      return res.status(400).json({
        error: "Not enough historical data to generate prediction",
      })
    }

    // Calculate average score with more weight on recent results
    let weightedSum = 0
    let weightSum = 0

    historyResult.rows.forEach((row, index) => {
      const weight = historyResult.rows.length - index // More recent = higher weight
      weightedSum += Number.parseFloat(row.score) * weight
      weightSum += weight
    })

    const predictedScore = (weightedSum / weightSum).toFixed(2)

    // Save prediction
    const result = await client.query(
      `INSERT INTO predictions (student_id, contest_id, predicted_score) 
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, contest_id) 
       DO UPDATE SET predicted_score = $3, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student_id, contest_id, predictedScore],
    )

    res.json({
      message: "Prediction generated successfully",
      prediction: result.rows[0],
    })
  } catch (error) {
    console.error("Generate prediction error:", error)
    res.status(500).json({ error: "Failed to generate prediction" })
  } finally {
    client.release()
  }
}

// Get predictions for a student
const getStudentPredictions = async (req, res) => {
  const client = await pool.connect()

  try {
    const student_id = req.user.role === "student" ? req.user.id : req.query.student_id

    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" })
    }

    const result = await client.query(
      `SELECT p.*, c.title as contest_title, c.deadline
       FROM predictions p
       JOIN contests c ON p.contest_id = c.id
       WHERE p.student_id = $1
       ORDER BY p.created_at DESC`,
      [student_id],
    )

    res.json({
      predictions: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error("Get predictions error:", error)
    res.status(500).json({ error: "Failed to get predictions" })
  } finally {
    client.release()
  }
}

// Batch generate predictions for all registered students in a contest
const generateContestPredictions = async (req, res) => {
  const client = await pool.connect()

  try {
    const { contest_id } = req.params

    // Get all approved participants
    const participantsResult = await client.query(
      `SELECT student_id FROM contest_participants 
       WHERE contest_id = $1 AND status = 'approved'`,
      [contest_id],
    )

    const predictions = []

    for (const participant of participantsResult.rows) {
      const student_id = participant.student_id

      // Get student's historical scores
      const historyResult = await client.query(
        `SELECT score FROM results WHERE student_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [student_id],
      )

      if (historyResult.rows.length === 0) {
        continue // Skip students without history
      }

      // Calculate weighted average
      let weightedSum = 0
      let weightSum = 0

      historyResult.rows.forEach((row, index) => {
        const weight = historyResult.rows.length - index
        weightedSum += Number.parseFloat(row.score) * weight
        weightSum += weight
      })

      const predictedScore = (weightedSum / weightSum).toFixed(2)

      // Save prediction
      const result = await client.query(
        `INSERT INTO predictions (student_id, contest_id, predicted_score) 
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, contest_id) 
         DO UPDATE SET predicted_score = $3, created_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [student_id, contest_id, predictedScore],
      )

      predictions.push(result.rows[0])
    }

    res.json({
      message: "Predictions generated successfully",
      predictions,
      count: predictions.length,
    })
  } catch (error) {
    console.error("Generate contest predictions error:", error)
    res.status(500).json({ error: "Failed to generate predictions" })
  } finally {
    client.release()
  }
}

module.exports = {
  generatePrediction,
  getStudentPredictions,
  generateContestPredictions,
}
