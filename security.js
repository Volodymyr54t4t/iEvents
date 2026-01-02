const crypto = require("crypto")
const rateLimit = require("express-rate-limit")
const helmet = require("helmet")


// Rate Limiting - захист від DDoS атак
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = "Забагато запитів з цієї IP-адреси") => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message
        },
        standardHeaders: true,
        legacyHeaders: false,
    })
}

// Rate limiters для різних типів запитів
const rateLimiters = {
    general: createRateLimiter(15 * 60 * 1000, 100, "Забагато запитів. Спробуйте через 15 хвилин"),
    auth: createRateLimiter(15 * 60 * 1000, 5, "Забагато спроб входу. Спробуйте через 15 хвилин"),
    registration: createRateLimiter(60 * 60 * 1000, 3, "Забагато спроб реєстрації. Спробуйте через годину"),
    api: createRateLimiter(1 * 60 * 1000, 30, "Забагато API запитів. Спробуйте через хвилину"),
    upload: createRateLimiter(15 * 60 * 1000, 10, "Забагато завантажень файлів"),
}

// ==================== ВАЛІДАЦІЯ ТА САНІТИЗАЦІЯ ====================

// Валідація email
const validateEmail = (email) => {
    if (!email || typeof email !== "string") return false
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email) && email.length <= 255
}

// Валідація пароля (мінімум 6 символів)
const validatePassword = (password) => {
    if (!password || typeof password !== "string") return false
    return password.length >= 6 && password.length <= 100
}

// Санітизація рядків (видалення HTML тегів та небезпечних символів)
const sanitizeString = (str) => {
    if (!str || typeof str !== "string") return ""
    return str
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim()
        .slice(0, 10000) // Максимум 10000 символів
}

// Валідація та санітизація ID
const validateId = (id) => {
    const numId = Number.parseInt(id, 10)
    return !isNaN(numId) && numId > 0 && numId < Number.MAX_SAFE_INTEGER
}

// Валідація номера телефону
const validatePhone = (phone) => {
    if (!phone) return true // Необов'язкове поле
    const phoneRegex = /^\+?[0-9]{10,15}$/
    return phoneRegex.test(phone)
}

// Валідація дати
const validateDate = (date) => {
    if (!date) return true
    const timestamp = Date.parse(date)
    return !isNaN(timestamp) && timestamp > 0
}

// ==================== ЗАХИСТ ВІД SQL INJECTION ====================

// Перевірка на SQL injection паттерни
const containsSqlInjection = (value) => {
    if (typeof value !== "string") return false

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
        /(;|--|\/\*|\*\/|xp_|sp_)/gi,
        /('|"|\||&|<|>)/g,
    ]

    return sqlPatterns.some((pattern) => pattern.test(value))
}

// Валідатор для SQL параметрів
const sanitizeSqlParams = (params) => {
    if (Array.isArray(params)) {
        return params.map((param) => {
            if (typeof param === "string" && containsSqlInjection(param)) {
                throw new Error("Виявлено підозрілі символи в запиті")
            }
            return param
        })
    }
    return params
}

// ==================== ЗАХИСТ ВІД XSS ====================

// Екранування HTML символів
const escapeHtml = (text) => {
    if (!text || typeof text !== "string") return ""
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    }
    return text.replace(/[&<>"'/]/g, (char) => map[char])
}

// ==================== ЗАХИСТ ВІД CSRF ====================

// Генерація CSRF токена
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString("hex")
}

// Валідація CSRF токена
const validateCsrfToken = (token, sessionToken) => {
    if (!token || !sessionToken) return false
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))
}

// ==================== ЗАХИСТ ПАРОЛІВ ====================

// Перевірка складності пароля
const checkPasswordStrength = (password) => {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    const score = Object.values(checks).filter(Boolean).length

    return {
        isStrong: score >= 3,
        score,
        checks,
        suggestions: [
            !checks.length && "Пароль має містити мінімум 8 символів",
            !checks.uppercase && "Додайте великі літери",
            !checks.lowercase && "Додайте малі літери",
            !checks.number && "Додайте цифри",
            !checks.special && "Додайте спеціальні символи",
        ].filter(Boolean),
    }
}

// ==================== ЗАХИСТ ФАЙЛІВ ====================

// Дозволені типи файлів
const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

// Валідація файлу
const validateFile = (file, allowedTypes = allowedImageTypes, maxSize = 10 * 1024 * 1024) => {
    const errors = []

    if (!file) {
        errors.push("Файл не вибрано")
        return {
            isValid: false,
            errors
        }
    }

    // Перевірка типу
    if (!allowedTypes.includes(file.mimetype)) {
        errors.push("Недозволений тип файлу")
    }

    // Перевірка розміру
    if (file.size > maxSize) {
        errors.push(`Файл занадто великий. Максимум: ${maxSize / 1024 / 1024}MB`)
    }

    // Перевірка розширення
    const ext = file.originalname.split(".").pop().toLowerCase()
    const allowedExts = allowedTypes
        .map((type) => {
            const extMap = {
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/png": "png",
                "image/gif": "gif",
                "image/webp": "webp",
                "application/pdf": "pdf",
                "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            }
            return extMap[type]
        })
        .filter(Boolean)

    if (!allowedExts.includes(ext)) {
        errors.push("Недозволене розширення файлу")
    }

    return {
        isValid: errors.length === 0,
        errors
    }
}

// ==================== МОНІТОРИНГ БЕЗПЕКИ ====================

// Логування підозрілої активності
const suspiciousActivityLog = new Map()

const logSuspiciousActivity = (ip, type, details) => {
    const key = `${ip}_${type}`
    const now = Date.now()

    if (!suspiciousActivityLog.has(key)) {
        suspiciousActivityLog.set(key, [])
    }

    const logs = suspiciousActivityLog.get(key)
    logs.push({
        timestamp: now,
        details
    })

    // Видаляємо старі записи (старші 1 години)
    const filtered = logs.filter((log) => now - log.timestamp < 60 * 60 * 1000)
    suspiciousActivityLog.set(key, filtered)

    console.warn(`[SECURITY WARNING] ${type} from ${ip}:`, details)

    // Якщо більше 10 підозрілих активностей за годину - блокуємо IP
    if (filtered.length >= 10) {
        console.error(`[SECURITY ALERT] IP ${ip} blocked due to suspicious activity`)
        return true // Треба блокувати
    }

    return false
}

// ==================== MIDDLEWARE ====================

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https:", "wss:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
    },
})

// Input validation middleware
const validateInput = (req, res, next) => {
    try {
        // Перевірка body на SQL injection
        if (req.body) {
            Object.values(req.body).forEach((value) => {
                if (typeof value === "string" && containsSqlInjection(value)) {
                    throw new Error("Виявлено небезпечні символи в запиті")
                }
            })
        }

        // Перевірка query parameters
        if (req.query) {
            Object.values(req.query).forEach((value) => {
                if (typeof value === "string" && containsSqlInjection(value)) {
                    throw new Error("Виявлено небезпечні символи в параметрах")
                }
            })
        }

        next()
    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }
}

// IP blocking middleware
const blockSuspiciousIp = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress

    // Перевірка, чи IP не в чорному списку
    const blocked = suspiciousActivityLog.get(`${ip}_blocked`)
    if (blocked && blocked.length > 0) {
        const lastBlock = blocked[blocked.length - 1]
        const now = Date.now()

        // Блокування на 1 годину
        if (now - lastBlock.timestamp < 60 * 60 * 1000) {
            return res.status(403).json({
                error: "Доступ заборонено через підозрілу активність"
            })
        }
    }

    next()
}

// ==================== ЕКСПОРТ ====================

module.exports = {
    // Rate limiters
    rateLimiters,

    // Validation functions
    validateEmail,
    validatePassword,
    validateId,
    validatePhone,
    validateDate,

    // Sanitization
    sanitizeString,
    escapeHtml,
    sanitizeSqlParams,

    // SQL Injection protection
    containsSqlInjection,

    // CSRF protection
    generateCsrfToken,
    validateCsrfToken,

    // Password security
    checkPasswordStrength,

    // File validation
    validateFile,
    allowedImageTypes,
    allowedDocumentTypes,

    // Security monitoring
    logSuspiciousActivity,

    // Middleware
    securityHeaders,
    validateInput,
    blockSuspiciousIp,
}