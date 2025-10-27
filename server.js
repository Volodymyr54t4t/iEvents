require("dotenv").config()
const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const {
  Pool
} = require("pg")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const app = express()
const PORT = 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname)))
app.use("/uploads", express.static("uploads"))

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads")
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only images are allowed"))
    }
  },
})

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function initDatabase() {
  const client = await pool.connect()
  try {
    console.log("=== Початок ініціалізації бази даних ===")

    // Крок 1: Перевірка та створення enum типу
    console.log("Крок 1: Перевірка enum типу user_role...")
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
      ) as exists
    `)

    if (!enumCheck.rows[0].exists) {
      console.log("  → Створення enum типу user_role...")
      await client.query(`CREATE TYPE user_role AS ENUM ('учень', 'вчитель', 'методист')`)
      console.log("  ✓ Enum тип user_role створено")
    } else {
      console.log("  ✓ Enum тип user_role вже існує")
    }

    // Крок 2: Перевірка та створення таблиці users
    console.log("Крок 2: Перевірка таблиці users...")
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `)

    if (!usersTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці users...")
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role user_role DEFAULT 'учень',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця users створена")
    } else {
      console.log("  ✓ Таблиця users вже існує")

      console.log("  → Перевірка та видалення зайвої колонки name...")
      const nameColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'name'
        ) as exists
      `)

      if (nameColumnCheck.rows[0].exists) {
        console.log("  → Видалення колонки name...")
        await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS name`)
        console.log("  ✓ Колонка name видалена")
      }

      // Перевірка колонки role
      console.log("  → Перевірка колонки role...")
      const roleColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role'
        ) as exists
      `)

      if (!roleColumnCheck.rows[0].exists) {
        console.log("  → Додавання колонки role...")
        await client.query(`ALTER TABLE users ADD COLUMN role user_role DEFAULT 'учень'`)
        console.log("  ✓ Колонка role додана")
      } else {
        console.log("  ✓ Колонка role вже існує")
      }
    }

    // Крок 3: Перевірка та створення таблиці profiles
    console.log("Крок 3: Перевірка таблиці profiles...")
    const profilesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
      ) as exists
    `)

    if (!profilesTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці profiles...")
      await client.query(`
        CREATE TABLE profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          middle_name VARCHAR(100),
          telegram VARCHAR(100),
          phone VARCHAR(20),
          birth_date DATE,
          city VARCHAR(100),
          school VARCHAR(255),
          grade VARCHAR(50),
          interests TEXT,
          bio TEXT,
          avatar TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця profiles створена")
    } else {
      console.log("  ✓ Таблиця profiles вже існує")
    }

    // Крок 4: Перевірка та створення таблиці competitions
    console.log("Крок 4: Перевірка таблиці competitions...")
    const competitionsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competitions'
      ) as exists
    `)

    if (!competitionsTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці competitions...")
      await client.query(`
        CREATE TABLE competitions (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця competitions створена")
    } else {
      console.log("  ✓ Таблиця competitions вже існує")
    }

    // Крок 5: Перевірка та створення таблиці competition_participants
    console.log("Крок 5: Перевірка таблиці competition_participants...")
    const participantsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competition_participants'
      ) as exists
    `)

    if (!participantsTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці competition_participants...")
      await client.query(`
        CREATE TABLE competition_participants (
          id SERIAL PRIMARY KEY,
          competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(competition_id, user_id)
        )
      `)
      console.log("  ✓ Таблиця competition_participants створена")
    } else {
      console.log("  ✓ Таблиця competition_participants вже існує")
    }

    console.log("=== База даних готова до роботи! ===\n")
  } catch (error) {
    console.error("❌ КРИТИЧНА ПОМИЛКА ініціалізації бази даних:")
    console.error("Тип помилки:", error.name)
    console.error("Повідомлення:", error.message)
    console.error("Код помилки:", error.code)
    console.error("\n⚠️  РІШЕННЯ:")
    console.error("1. Відкрийте файл scripts/reset-database.sql")
    console.error("2. Скопіюйте весь SQL код")
    console.error("3. Виконайте його в SQL редакторі вашої бази даних Neon")
    console.error("4. Перезапустіть сервер командою: npm start\n")
    throw error
  } finally {
    client.release()
  }
}

// Запуск ініціалізації бази даних
initDatabase().catch((err) => {
  console.error("Не вдалося ініціалізувати базу даних. Сервер не запущено.")
  process.exit(1)
})

// Головна сторінка
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"))
})

app.post("/api/register", async (req, res) => {
  const {
    email,
    password
  } = req.body

  console.log("Спроба реєстрації:", email)

  // Валідація вхідних даних
  if (!email || !password) {
    console.log("Помилка: відсутні email або пароль")
    return res.status(400).json({
      error: "Email та пароль обов'язкові"
    })
  }

  if (password.length < 6) {
    console.log("Помилка: пароль занадто короткий")
    return res.status(400).json({
      error: "Пароль повинен містити мінімум 6 символів"
    })
  }

  // Валідація email формату
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.log("Помилка: невірний формат email")
    return res.status(400).json({
      error: "Невірний формат email"
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    console.log("Транзакція розпочата")

    // Перевірка чи користувач вже існує
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: користувач вже існує")
      return res.status(400).json({
        error: "Користувач з таким email вже існує"
      })
    }

    // Хешування пароля
    console.log("Хешування пароля...")
    const hashedPassword = await bcrypt.hash(password, 10)

    // Створення користувача
    console.log("Створення користувача в базі даних...")
    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "учень"],
    )

    const user = userResult.rows[0]
    console.log("Користувач створений з ID:", user.id)

    // Створення порожнього профілю
    console.log("Створення профілю для користувача...")
    await client.query("INSERT INTO profiles (user_id) VALUES ($1)", [user.id])
    console.log("Профіль створений")

    await client.query("COMMIT")
    console.log("Транзакція завершена успішно")
    console.log("✓ Реєстрація успішна для:", email)

    res.json({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка реєстрації:")
    console.error("Тип помилки:", error.name)
    console.error("Повідомлення:", error.message)
    console.error("Код помилки:", error.code)
    console.error("Деталі:", error.detail)

    // Специфічні помилки
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Користувач з таким email вже існує"
      })
    }
    if (error.code === "22P02") {
      return res.status(500).json({
        error: "Помилка типу даних. Перевірте структуру бази даних."
      })
    }
    if (error.message.includes("user_role")) {
      return res
        .status(500)
        .json({
          error: "Помилка ролі користувача. Запустіть SQL скрипт для перестворення бази даних."
        })
    }

    res.status(500).json({
      error: "Помилка реєстрації. Спробуйте ще раз."
    })
  } finally {
    client.release()
  }
})

app.post("/api/login", async (req, res) => {
  const {
    email,
    password
  } = req.body

  console.log("Спроба входу:", email)

  if (!email || !password) {
    console.log("Помилка: відсутні email або пароль")
    return res.status(400).json({
      error: "Email та пароль обов'язкові"
    })
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      console.log("Помилка: користувача не знайдено")
      return res.status(401).json({
        error: "Невірний email або пароль"
      })
    }

    const user = result.rows[0]
    console.log("Користувач знайдений, перевірка пароля...")

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      console.log("Помилка: невірний пароль")
      return res.status(401).json({
        error: "Невірний email або пароль"
      })
    }

    console.log("✓ Вхід успішний для користувача ID:", user.id)

    res.json({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error("❌ Помилка входу:", error.message)
    res.status(500).json({
      error: "Помилка входу. Спробуйте ще раз."
    })
  }
})

app.get("/api/profile/:userId", async (req, res) => {
  const {
    userId
  } = req.params

  console.log("Запит профілю для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача"
    })
  }

  const client = await pool.connect()

  try {
    // Перевірка існування користувача
    const userCheck = await client.query("SELECT id, role FROM users WHERE id = $1", [userId])

    if (userCheck.rows.length === 0) {
      console.log("Помилка: користувача не існує")
      return res.status(404).json({
        error: "Користувача не знайдено"
      })
    }

    const user = userCheck.rows[0]

    // Отримання профілю
    const profileResult = await client.query("SELECT * FROM profiles WHERE user_id = $1", [userId])

    if (profileResult.rows.length === 0) {
      console.log("Профіль не знайдено, створюємо новий...")
      await client.query("INSERT INTO profiles (user_id) VALUES ($1)", [userId])
      const newProfile = await client.query("SELECT * FROM profiles WHERE user_id = $1", [userId])

      const profile = {
        ...newProfile.rows[0],
        role: user.role
      }
      console.log("✓ Новий профіль створено")
      return res.json({
        profile
      })
    }

    const profile = {
      ...profileResult.rows[0],
      role: user.role
    }
    console.log("✓ Профіль знайдено")
    res.json({
      profile
    })
  } catch (error) {
    console.error("❌ Помилка отримання профілю:", error.message)
    res.status(500).json({
      error: "Помилка отримання профілю"
    })
  } finally {
    client.release()
  }
})

app.post("/api/profile", upload.single("avatar"), async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    middleName,
    telegram,
    phone,
    birthDate,
    city,
    school,
    grade,
    interests,
    bio
  } =
  req.body

  console.log("Оновлення профілю для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача"
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка існування користувача
    const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [userId])
    if (userCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: користувача не існує")
      return res.status(404).json({
        error: "Користувача не знайдено"
      })
    }

    let avatarPath = null
    if (req.file) {
      avatarPath = `/uploads/${req.file.filename}`
      console.log("Завантажено аватар:", avatarPath)
    }

    // Перевірка існування профілю
    const existingProfile = await client.query("SELECT id FROM profiles WHERE user_id = $1", [userId])

    if (existingProfile.rows.length === 0) {
      console.log("Створення нового профілю...")
      await client.query(
        `INSERT INTO profiles (
          user_id, first_name, last_name, middle_name, 
          telegram, phone, birth_date, city, 
          school, grade, interests, bio, avatar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          userId,
          firstName || null,
          lastName || null,
          middleName || null,
          telegram || null,
          phone || null,
          birthDate || null,
          city || null,
          school || null,
          grade || null,
          interests || null,
          bio || null,
          avatarPath,
        ],
      )
      console.log("✓ Новий профіль створено")
    } else {
      console.log("Оновлення існуючого профілю...")

      const updateFields = []
      const updateValues = [userId]
      let paramCounter = 2

      const fields = {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        telegram: telegram,
        phone: phone,
        birth_date: birthDate,
        city: city,
        school: school,
        grade: grade,
        interests: interests,
        bio: bio,
      }

      for (const [key, value] of Object.entries(fields)) {
        updateFields.push(`${key} = $${paramCounter}`)
        updateValues.push(value || null)
        paramCounter++
      }

      if (avatarPath) {
        updateFields.push(`avatar = $${paramCounter}`)
        updateValues.push(avatarPath)
        paramCounter++
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP")

      const updateQuery = `UPDATE profiles SET ${updateFields.join(", ")} WHERE user_id = $1`
      await client.query(updateQuery, updateValues)
      console.log("✓ Профіль оновлено")
    }

    await client.query("COMMIT")
    console.log("✓ Транзакція завершена успішно")
    res.json({
      message: "Профіль успішно оновлено"
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка оновлення профілю:", error.message)
    res.status(500).json({
      error: "Помилка оновлення профілю"
    })
  } finally {
    client.release()
  }
})

app.get("/api/admin/users", async (req, res) => {
  console.log("Запит списку всіх користувачів")

  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.role, u.created_at,
             p.first_name, p.last_name, p.phone, p.telegram, p.avatar
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY u.id DESC
    `)

    console.log("✓ Знайдено користувачів:", result.rows.length)
    res.json({
      users: result.rows
    })
  } catch (error) {
    console.error("❌ Помилка отримання користувачів:", error.message)
    res.status(500).json({
      error: "Помилка отримання користувачів"
    })
  }
})

app.post("/api/admin/change-role", async (req, res) => {
  const {
    userId,
    role
  } = req.body

  console.log("Зміна ролі користувача ID:", userId, "на роль:", role)

  const validRoles = ["учень", "вчитель", "методист"]

  if (!validRoles.includes(role)) {
    console.log("Помилка: невірна роль")
    return res.status(400).json({
      error: "Невірна роль. Доступні: учень, вчитель, методист"
    })
  }

  if (!userId) {
    console.log("Помилка: відсутній userId")
    return res.status(400).json({
      error: "ID користувача обов'язковий"
    })
  }

  try {
    const result = await pool.query("UPDATE users SET role = $1::user_role WHERE id = $2 RETURNING id, email, role", [
      role,
      userId,
    ])

    if (result.rows.length === 0) {
      console.log("Помилка: користувача не знайдено")
      return res.status(404).json({
        error: "Користувача не знайдено"
      })
    }

    console.log("✓ Роль успішно змінено на:", role)
    res.json({
      message: "Роль успішно змінено",
      user: result.rows[0]
    })
  } catch (error) {
    console.error("❌ Помилка зміни ролі:", error.message)
    res.status(500).json({
      error: "Помилка зміни ролі"
    })
  }
})

app.post("/api/admin/validate", (req, res) => {
  const {
    password
  } = req.body
  const ADMIN_PASSWORD = "319560"

  console.log("Спроба входу в адмін панель")

  if (!password) {
    console.log("Помилка: пароль не надано")
    return res.status(400).json({
      valid: false,
      error: "Пароль обов'язковий"
    })
  }

  if (password === ADMIN_PASSWORD) {
    console.log("✓ Адмін пароль правильний")
    res.json({
      valid: true
    })
  } else {
    console.log("Помилка: невірний адмін пароль")
    res.status(401).json({
      valid: false,
      error: "Невірний пароль"
    })
  }
})

// Отримання списку всіх учнів (сортовано по класах)
app.get("/api/students", async (req, res) => {
  console.log("Запит списку учнів")

  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.role,
             p.first_name, p.last_name, p.grade, p.avatar
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'учень'
      ORDER BY p.grade ASC NULLS LAST, p.last_name ASC
    `)

    console.log("✓ Знайдено учнів:", result.rows.length)
    res.json({
      students: result.rows
    })
  } catch (error) {
    console.error("❌ Помилка отримання учнів:", error.message)
    res.status(500).json({
      error: "Помилка отримання учнів"
    })
  }
})

// Створення нового конкурсу
app.post("/api/competitions", async (req, res) => {
  const {
    title,
    description,
    startDate,
    endDate,
    createdBy
  } = req.body

  console.log("Створення конкурсу:", title)

  if (!title || !startDate || !endDate) {
    console.log("Помилка: відсутні обов'язкові поля")
    return res.status(400).json({
      error: "Назва, дата початку та дата закінчення обов'язкові"
    })
  }

  try {
    const result = await pool.query(
      `INSERT INTO competitions (title, description, start_date, end_date, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [title, description, startDate, endDate, createdBy || null],
    )

    console.log("✓ Конкурс створено з ID:", result.rows[0].id)
    res.json({
      competition: result.rows[0]
    })
  } catch (error) {
    console.error("❌ Помилка створення конкурсу:", error.message)
    res.status(500).json({
      error: "Помилка створення конкурсу"
    })
  }
})

// Отримання всіх конкурсів
app.get("/api/competitions", async (req, res) => {
  console.log("Запит списку конкурсів")

  try {
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(cp.id) as participants_count
      FROM competitions c
      LEFT JOIN competition_participants cp ON c.id = cp.competition_id
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `)

    console.log("✓ Знайдено конкурсів:", result.rows.length)
    res.json({
      competitions: result.rows
    })
  } catch (error) {
    console.error("❌ Помилка отримання конкурсів:", error.message)
    res.status(500).json({
      error: "Помилка отримання конкурсів"
    })
  }
})

// Отримання конкурсів для конкретного учня
app.get("/api/competitions/my/:userId", async (req, res) => {
  const {
    userId
  } = req.params

  console.log("Запит конкурсів для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача"
    })
  }

  try {
    const result = await pool.query(
      `
      SELECT c.*, cp.added_at,
             CASE 
               WHEN c.end_date < CURRENT_DATE THEN 'неактивний'
               WHEN c.start_date > CURRENT_DATE THEN 'майбутній'
               ELSE 'активний'
             END as status
      FROM competitions c
      INNER JOIN competition_participants cp ON c.id = cp.competition_id
      WHERE cp.user_id = $1
      ORDER BY c.start_date DESC
    `,
      [userId],
    )

    console.log("✓ Знайдено конкурсів для користувача:", result.rows.length)
    res.json({
      competitions: result.rows
    })
  } catch (error) {
    console.error("❌ Помилка отримання конкурсів користувача:", error.message)
    res.status(500).json({
      error: "Помилка отримання конкурсів"
    })
  }
})

// Додавання учнів на конкурс
app.post("/api/competitions/:id/participants", async (req, res) => {
  const {
    id
  } = req.params
  const {
    studentIds
  } = req.body

  console.log("Додавання учнів на конкурс ID:", id)

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    console.log("Помилка: не вказано учнів")
    return res.status(400).json({
      error: "Необхідно вибрати хоча б одного учня"
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка існування конкурсу
    const competitionCheck = await client.query("SELECT id FROM competitions WHERE id = $1", [id])
    if (competitionCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: конкурс не знайдено")
      return res.status(404).json({
        error: "Конкурс не знайдено"
      })
    }

    let addedCount = 0
    let skippedCount = 0

    for (const studentId of studentIds) {
      try {
        await client.query(
          `INSERT INTO competition_participants (competition_id, user_id) 
           VALUES ($1, $2)`,
          [id, studentId],
        )
        addedCount++
      } catch (error) {
        if (error.code === "23505") {
          // Учень вже доданий
          skippedCount++
        } else {
          throw error
        }
      }
    }

    await client.query("COMMIT")
    console.log(`✓ Додано учнів: ${addedCount}, пропущено: ${skippedCount}`)
    res.json({
      message: `Успішно додано ${addedCount} учнів`,
      added: addedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка додавання учнів:", error.message)
    res.status(500).json({
      error: "Помилка додавання учнів на конкурс"
    })
  } finally {
    client.release()
  }
})

// Отримання учасників конкурсу
app.get("/api/competitions/:id/participants", async (req, res) => {
  const {
    id
  } = req.params

  console.log("Запит учасників конкурсу ID:", id)

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.email,
             p.first_name, p.last_name, p.grade, p.avatar,
             cp.added_at
      FROM competition_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cp.competition_id = $1
      ORDER BY p.grade ASC NULLS LAST, p.last_name ASC
    `,
      [id],
    )

    console.log("✓ Знайдено учасників:", result.rows.length)
    res.json({
      participants: result.rows
    })
  } catch (error) {
    console.error("❌ Помилка отримання учасників:", error.message)
    res.status(500).json({
      error: "Помилка отримання учасників"
    })
  }
})

// Видалення конкурсу
app.delete("/api/competitions/:id", async (req, res) => {
  const {
    id
  } = req.params

  console.log("Видалення конкурсу ID:", id)

  try {
    const result = await pool.query("DELETE FROM competitions WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      console.log("Помилка: конкурс не знайдено")
      return res.status(404).json({
        error: "Конкурс не знайдено"
      })
    }

    console.log("✓ Конкурс видалено")
    res.json({
      message: "Конкурс успішно видалено"
    })
  } catch (error) {
    console.error("❌ Помилка видалення конкурсу:", error.message)
    res.status(500).json({
      error: "Помилка видалення конкурсу"
    })
  }
})

app.use((err, req, res, next) => {
  console.error("❌ Необроблена помилка сервера:")
  console.error("URL:", req.url)
  console.error("Метод:", req.method)
  console.error("Помилка:", err.message)
  console.error("Stack:", err.stack)

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Файл занадто великий. Максимум 5MB"
      })
    }
    return res.status(400).json({
      error: "Помилка завантаження файлу"
    })
  }

  res.status(500).json({
    error: "Внутрішня помилка сервера"
  })
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`\n🚀 Сервер iEvents запущено на http://localhost:${PORT}`)
  console.log(`📝 Відкрийте браузер та перейдіть за адресою вище\n`)
})