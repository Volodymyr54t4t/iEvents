const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const pool = require("../db/pool")

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        },
    )
}

// Register new user
const register = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            name,
            email,
            password,
            role,
            telegram_id
        } = req.body

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["name", "email", "password", "role"],
            })
        }

        // Validate role
        const validRoles = ["methodist", "teacher", "student"]
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                error: "Invalid role",
                validRoles,
            })
        }

        // Check if user already exists
        const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "User with this email already exists"
            })
        }

        // Hash password
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Insert new user
        const result = await client.query(
            `INSERT INTO users (name, email, password, role, telegram_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, telegram_id, created_at`,
            [name, email, hashedPassword, role, telegram_id || null],
        )

        const newUser = result.rows[0]

        // Generate token
        const token = generateToken(newUser)

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                telegram_id: newUser.telegram_id,
                created_at: newUser.created_at,
            },
            token,
        })
    } catch (error) {
        console.error("Registration error:", error)
        res.status(500).json({
            error: "Registration failed"
        })
    } finally {
        client.release()
    }
}

// Login user
const login = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            email,
            password
        } = req.body

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["email", "password"],
            })
        }

        // Find user
        const result = await client.query(
            "SELECT id, name, email, password, role, telegram_id FROM users WHERE email = $1",
            [email],
        )

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            })
        }

        const user = result.rows[0]

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                error: "Invalid email or password"
            })
        }

        // Generate token
        const token = generateToken(user)

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                telegram_id: user.telegram_id,
            },
            token,
        })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({
            error: "Login failed"
        })
    } finally {
        client.release()
    }
}

// Get current user info
const getMe = async (req, res) => {
    const client = await pool.connect()

    try {
        const userId = req.user.id

        const result = await client.query(
            `SELECT id, name, email, role, telegram_id, created_at 
       FROM users 
       WHERE id = $1`,
            [userId],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "User not found"
            })
        }

        res.json({
            user: result.rows[0],
        })
    } catch (error) {
        console.error("Get user error:", error)
        res.status(500).json({
            error: "Failed to get user information"
        })
    } finally {
        client.release()
    }
}

// Get all users (admin function)
const getAllUsers = async (req, res) => {
    const client = await pool.connect()

    try {
        const {
            role
        } = req.query

        let query = `SELECT id, name, email, role, telegram_id, created_at 
                 FROM users`
        const params = []

        if (role) {
            query += ` WHERE role = $1`
            params.push(role)
        }

        query += ` ORDER BY created_at DESC`

        const result = await client.query(query, params)

        res.json({
            users: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error("Get users error:", error)
        res.status(500).json({
            error: "Failed to get users"
        })
    } finally {
        client.release()
    }
}

module.exports = {
    register,
    login,
    getMe,
    getAllUsers,
}