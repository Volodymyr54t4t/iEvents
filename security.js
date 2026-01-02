const crypto = require("crypto")

// ============= RATE LIMITING =============
// Зберігає інформацію про запити користувачів для обмеження кількості запитів
const requestLog = new Map()

// Middleware для обмеження кількості запитів (DDoS захист)
function rateLimiter(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, max = 100, message = "Занадто багато запитів. Спробуйте пізніше."
    } = options

    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress
        const now = Date.now()

        if (!requestLog.has(key)) {
            requestLog.set(key, {
                count: 1,
                resetTime: now + windowMs
            })
            return next()
        }

        const record = requestLog.get(key)

        if (now > record.resetTime) {
            record.count = 1
            record.resetTime = now + windowMs
            return next()
        }

        if (record.count >= max) {
            console.warn(`[SECURITY] Rate limit exceeded for IP: ${key}`)
            return res.status(429).json({
                error: message
            })
        }

        record.count++
        next()
    }
}

// Спеціальні лімітери для різних типів запитів
const authLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 5, // максимум 5 спроб входу
    message: "Занадто багато спроб входу. Спробуйте через 15 хвилин.",
})

const apiLimiter = rateLimiter({
    windowMs: 1 * 60 * 1000, // 1 хвилина
    max: 100, // максимум 100 запитів
})

const uploadLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 година
    max: 50, // максимум 50 завантажень
    message: "Занадто багато завантажень файлів. Спробуйте через годину.",
})

// ============= INPUT VALIDATION & SANITIZATION =============

// Санітизація HTML для захисту від XSS
function sanitizeHtml(text) {
    if (typeof text !== "string") return text

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;")
}

// Валідація email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Валідація пароля (мінімум 6 символів, буква та цифра)
function isValidPassword(password) {
    if (typeof password !== "string" || password.length < 6) {
        return false
    }
    // Перевірка на наявність хоча б однієї букви та однієї цифри
    const hasLetter = /[a-zA-Zа-яА-ЯіІїЇєЄґҐ]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    return hasLetter && hasNumber
}

// Валідація телефону
function isValidPhone(phone) {
    if (!phone) return true // телефон опціональний
    const phoneRegex = /^\+?[0-9]{10,15}$/
    return phoneRegex.test(phone.replace(/[\s\-$$$$]/g, ""))
}

// Валідація ID (тільки цілі числа)
function isValidId(id) {
    return Number.isInteger(Number(id)) && Number(id) > 0
}

// Middleware для валідації вхідних даних
function validateInput(schema) {
    return (req, res, next) => {
        const data = {
            ...req.body,
            ...req.params,
            ...req.query
        }
        const errors = []

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field]

            // Перевірка на обов'язковість
            if (rules.required && !value) {
                errors.push(`Поле ${field} є обов'язковим`)
                continue
            }

            if (!value && !rules.required) continue

            // Перевірка типу
            if (rules.type === "email" && !isValidEmail(value)) {
                errors.push(`Невірний формат email`)
            }
            if (rules.type === "password" && !isValidPassword(value)) {
                errors.push(`Пароль повинен містити мінімум 6 символів, включаючи букву та цифру`)
            }
            if (rules.type === "phone" && !isValidPhone(value)) {
                errors.push(`Невірний формат телефону`)
            }
            if (rules.type === "id" && !isValidId(value)) {
                errors.push(`Невірний ID`)
            }

            // Перевірка мінімальної та максимальної довжини
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`Поле ${field} повинно містити мінімум ${rules.minLength} символів`)
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`Поле ${field} не повинно перевищувати ${rules.maxLength} символів`)
            }

            // Санітизація HTML
            if (rules.sanitize && typeof value === "string") {
                req.body[field] = sanitizeHtml(value)
            }
        }

        if (errors.length > 0) {
            console.warn(`[SECURITY] Validation failed:`, errors)
            return res.status(400).json({
                error: errors.join(", ")
            })
        }

        next()
    }
}

// ============= SQL INJECTION PROTECTION =============

// Перевірка на небезпечні SQL паттерни
function detectSqlInjection(value) {
    if (typeof value !== "string") return false

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
        /(--|;|\/\*|\*\/|xp_|sp_)/gi,
        /(\bOR\b.*=.*|1\s*=\s*1)/gi,
    ]

    return sqlPatterns.some((pattern) => pattern.test(value))
}

// Middleware для захисту від SQL ін'єкцій
function sqlInjectionProtection(req, res, next) {
    const checkObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === "string" && detectSqlInjection(obj[key])) {
                console.error(`[SECURITY] SQL Injection attempt detected in ${key}:`, obj[key])
                return true
            }
            if (typeof obj[key] === "object") {
                if (checkObject(obj[key])) return true
            }
        }
        return false
    }

    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
        return res.status(400).json({
            error: "Виявлено підозрілу активність"
        })
    }

    next()
}

// ============= XSS PROTECTION =============

// Middleware для захисту від XSS атак
function xssProtection(req, res, next) {
    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === "string") {
                // Перевірка на наявність небезпечних тегів
                if (/<script|<iframe|javascript:|onerror|onload/gi.test(obj[key])) {
                    console.warn(`[SECURITY] XSS attempt detected in ${key}`)
                    obj[key] = sanitizeHtml(obj[key])
                }
            } else if (typeof obj[key] === "object") {
                sanitizeObject(obj[key])
            }
        }
    }

    sanitizeObject(req.body)
    sanitizeObject(req.query)

    next()
}

// ============= CSRF PROTECTION =============

// Генерація CSRF токенів
function generateCsrfToken() {
    return crypto.randomBytes(32).toString("hex")
}

// Зберігання токенів (в production краще використовувати Redis або session store)
const csrfTokens = new Map()

// Middleware для створення CSRF токену
function csrfTokenGenerator(req, res, next) {
    const token = generateCsrfToken()
    const sessionId = req.headers["x-session-id"] || req.ip

    csrfTokens.set(sessionId, token)

    // Видалення старих токенів (кожні 30 хвилин)
    setTimeout(
        () => {
            csrfTokens.delete(sessionId)
        },
        30 * 60 * 1000,
    )

    req.csrfToken = token
    res.setHeader("X-CSRF-Token", token)
    next()
}

// Middleware для перевірки CSRF токену
function csrfProtection(req, res, next) {
    // GET запити не потребують CSRF перевірки
    if (req.method === "GET") {
        return next()
    }

    const token = req.headers["x-csrf-token"]
    const sessionId = req.headers["x-session-id"] || req.ip

    if (!token || csrfTokens.get(sessionId) !== token) {
        console.warn(`[SECURITY] CSRF token validation failed for session: ${sessionId}`)
        return res.status(403).json({
            error: "Невірний CSRF токен"
        })
    }

    next()
}

// ============= FILE UPLOAD SECURITY =============

// Перевірка типу файлу
function validateFileType(file, allowedTypes) {
    const fileExtension = file.originalname.split(".").pop().toLowerCase()
    const mimeType = file.mimetype.toLowerCase()

    const allowedExtensions = allowedTypes.extensions || []
    const allowedMimeTypes = allowedTypes.mimeTypes || []

    return allowedExtensions.includes(fileExtension) && allowedMimeTypes.includes(mimeType)
}

// Перевірка розміру файлу
function validateFileSize(file, maxSize) {
    return file.size <= maxSize
}

// Безпечне перейменування файлу
function sanitizeFileName(filename) {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.+/g, ".")
        .substring(0, 255)
}

// Middleware для перевірки файлів
function fileUploadSecurity(options = {}) {
    const {
        allowedTypes = {
                extensions: ["jpg", "jpeg", "png", "gif"],
                mimeTypes: ["image/jpeg", "image/png", "image/gif"],
            },
            maxSize = 5 * 1024 * 1024, // 5MB
    } = options

    return (req, res, next) => {
        if (!req.file && !req.files) {
            return next()
        }

        const files = req.files || [req.file]

        for (const file of files) {
            if (!file) continue

            // Перевірка типу файлу
            if (!validateFileType(file, allowedTypes)) {
                console.warn(`[SECURITY] Invalid file type: ${file.mimetype}`)
                return res.status(400).json({
                    error: "Недозволений тип файлу"
                })
            }

            // Перевірка розміру
            if (!validateFileSize(file, maxSize)) {
                console.warn(`[SECURITY] File too large: ${file.size} bytes`)
                return res.status(400).json({
                    error: "Файл занадто великий"
                })
            }

            // Санітизація імені файлу
            file.originalname = sanitizeFileName(file.originalname)
        }

        next()
    }
}

// ============= AUTHENTICATION & AUTHORIZATION =============

// Middleware для перевірки автентифікації
function requireAuth(req, res, next) {
    const userId = req.headers["x-user-id"] || req.body.userId

    if (!userId || !isValidId(userId)) {
        console.warn(`[SECURITY] Unauthorized access attempt`)
        return res.status(401).json({
            error: "Необхідна автентифікація"
        })
    }

    req.userId = userId
    next()
}

// Middleware для перевірки ролі користувача
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        const userId = req.userId || req.headers["x-user-id"] || req.body.userId

        if (!userId) {
            return res.status(401).json({
                error: "Необхідна автентифікація"
            })
        }

        try {
            // Отримання ролі з БД (потрібно передати pool через req або використовувати глобальний)
            const {
                pool
            } = req.app.locals

            if (!pool) {
                console.error("[SECURITY] Database pool not available")
                return res.status(500).json({
                    error: "Помилка сервера"
                })
            }

            const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId])

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Користувача не знайдено"
                })
            }

            const userRole = result.rows[0].role

            if (!allowedRoles.includes(userRole)) {
                console.warn(`[SECURITY] Access denied for role: ${userRole}`)
                return res.status(403).json({
                    error: "Недостатньо прав доступу"
                })
            }

            req.userRole = userRole
            next()
        } catch (error) {
            console.error("[SECURITY] Role verification error:", error)
            return res.status(500).json({
                error: "Помилка перевірки прав доступу"
            })
        }
    }
}

// ============= SECURITY HEADERS =============

// Middleware для встановлення безпечних HTTP заголовків
function securityHeaders(req, res, next) {
    // Захист від clickjacking
    res.setHeader("X-Frame-Options", "DENY")

    // Захист від MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff")

    // XSS фільтр браузера
    res.setHeader("X-XSS-Protection", "1; mode=block")

    // Content Security Policy
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
    )

    // Strict Transport Security (HTTPS only)
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    // Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

    // Permissions Policy
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

    next()
}

// ============= LOGGING & MONITORING =============

// Логування підозрілої активності
function logSuspiciousActivity(req, type, details) {
    const log = {
        timestamp: new Date().toISOString(),
        type: type,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        url: req.url,
        method: req.method,
        details: details,
    }

    console.warn("[SECURITY ALERT]", JSON.stringify(log))

    // В production тут можна додати запис в БД або відправку в систему моніторингу
}

// ============= PASSWORD SECURITY =============

// Перевірка на слабкі паролі
const weakPasswords = ["123456", "password", "qwerty", "admin", "letmein", "welcome", "monkey", "1234567890"]

function isWeakPassword(password) {
    const lowerPassword = password.toLowerCase()

    // Перевірка на загальні слабкі паролі
    if (weakPasswords.includes(lowerPassword)) {
        return true
    }

    // Перевірка на послідовності
    if (/^(.)\1+$/.test(password)) {
        // всі символи однакові
        return true
    }

    if (/^(012|123|234|345|456|567|678|789|890)+/.test(password)) {
        // числові послідовності
        return true
    }

    return false
}

// Middleware для перевірки надійності пароля
function passwordStrengthCheck(req, res, next) {
    const password = req.body.password || req.body.newPassword

    if (!password) {
        return next()
    }

    if (isWeakPassword(password)) {
        return res.status(400).json({
            error: "Пароль занадто слабкий. Використайте складніший пароль.",
        })
    }

    next()
}

// ============= EXPORT =============

module.exports = {
    // Rate Limiting
    rateLimiter,
    authLimiter,
    apiLimiter,
    uploadLimiter,

    // Input Validation
    validateInput,
    sanitizeHtml,
    isValidEmail,
    isValidPassword,
    isValidPhone,
    isValidId,

    // SQL Injection Protection
    sqlInjectionProtection,
    detectSqlInjection,

    // XSS Protection
    xssProtection,

    // CSRF Protection
    csrfTokenGenerator,
    csrfProtection,
    generateCsrfToken,

    // File Upload Security
    fileUploadSecurity,
    validateFileType,
    validateFileSize,
    sanitizeFileName,

    // Authentication & Authorization
    requireAuth,
    requireRole,

    // Security Headers
    securityHeaders,

    // Logging
    logSuspiciousActivity,

    // Password Security
    passwordStrengthCheck,
    isWeakPassword,
}