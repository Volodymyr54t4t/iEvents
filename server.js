require("dotenv").config()
const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const { Pool } = require("pg")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { initBot, notifyUserAddedToCompetition, notifyUserNewResult, notifyNewCompetition } = require("./bot")

const app = express()
const PORT = 3000

// Зберігаємо ID чатів для сповіщень
const subscribedChats = new Set()

// Функція відправки Telegram сповіщень
async function sendTelegramNotification(message) {
  console.log("sendTelegramNotification викликано з повідомленням:", message)
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname)))
app.use("/uploads", express.static("uploads"))

app.use("/documents", express.static(path.join(__dirname, "documents")))

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads")
}

if (!fs.existsSync("documents")) {
  fs.mkdirSync("documents")
  console.log("📁 Створено папку documents/")
}

// Налаштування Multer для завантаження файлів
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
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Тільки зображення дозволені"))
    }
  },
})

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "documents/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")
    cb(null, uniqueSuffix + "-" + sanitizedName)
  },
})

const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB максимальний розмір
  },
})

// Підключення до PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Ініціалізація бази даних
async function initializeDatabase() {
  const client = await pool.connect()
  try {
    console.log("=== Початок ініціалізації бази даних ===")

    // Перевірка та створення enum типу
    console.log("Перевірка enum типу user_role...")
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
      ) as exists
    `)

    if (!enumCheck.rows[0].exists) {
      await client.query(`CREATE TYPE user_role AS ENUM ('учень', 'вчитель', 'методист')`)
      console.log("Enum тип user_role створено")
    } else {
      console.log("Enum тип user_role вже існує")
    }

    // Перевірка та створення таблиці users
    console.log("Перевірка таблиці users...")
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

      // Видалення зайвої колонки name
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
      } else {
        console.log("  ✓ Колонка name відсутня")
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

    // Перевірка та створення таблиці profiles
    console.log("Перевірка таблиці profiles...")
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
          school_id INTEGER,
          grade_number INTEGER,
          grade_letter VARCHAR(10),
          club_institution VARCHAR(255),
          club_name VARCHAR(255),
          experience_years INTEGER DEFAULT 0,
          subjects_ids TEXT,
          grades_catering TEXT,
          specialization VARCHAR(255),
          awards TEXT,
          methodist_area TEXT,
          consultation_areas TEXT,
          interests TEXT,
          bio TEXT,
          avatar TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця profiles створена")
    } else {
      console.log("  ✓ Таблиця profiles вже існує")
      // Додавання колонок до profiles
      const columnsToAdd = [
        { name: "school_id", type: "INTEGER" },
        { name: "grade_number", type: "INTEGER" },
        { name: "grade_letter", type: "VARCHAR(10)" },
        { name: "club_institution", type: "VARCHAR(255)" },
        { name: "club_name", type: "VARCHAR(255)" },
        { name: "experience_years", type: "INTEGER DEFAULT 0" },
        { name: "subjects_ids", type: "TEXT" },
        { name: "grades_catering", type: "TEXT" },
        { name: "specialization", type: "VARCHAR(255)" },
        { name: "awards", type: "TEXT" },
        { name: "methodist_area", type: "TEXT" },
        { name: "consultation_areas", type: "TEXT" },
      ]

      console.log("  → Перевірка та додавання колонок до profiles...")
      for (const col of columnsToAdd) {
        try {
          const columnCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'profiles' AND column_name = '${col.name}'
            ) as exists
          `)

          if (!columnCheck.rows[0].exists) {
            console.log(`  → Додавання колонки ${col.name}...`)
            await client.query(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type}`)
            console.log(`  ✓ Колонка ${col.name} додана`)
          } else {
            console.log(`  ✓ Колонка ${col.name} вже існує`)
          }
        } catch (colError) {
          // Колонка вже існує
          console.log(`  ⚠️  Помилка при перевірці/додаванні ${col.name} (можливо, вже існує): ${colError.message}`)
        }
      }
    }

    // Додавання колонок для профілів вчителів/методистів
    const teacherProfileColumns = [
      { name: "experience_years", type: "INTEGER DEFAULT 0" },
      { name: "subjects_ids", type: "TEXT" },
      { name: "grades_catering", type: "TEXT" },
      { name: "specialization", type: "VARCHAR(255)" },
      { name: "awards", type: "TEXT" },
      { name: "methodist_area", type: "TEXT" },
      { name: "consultation_areas", type: "TEXT" },
      { name: "is_active", type: "BOOLEAN DEFAULT TRUE" },
      { name: "average_score", type: "NUMERIC(5, 2)" },
    ]

    console.log("  → Перевірка та додавання колонок для профілю вчителя/методиста...")
    for (const col of teacherProfileColumns) {
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = '${col.name}'
        ) as exists
      `)
      if (!columnCheck.rows[0].exists) {
        console.log(`  → Додавання колонки ${col.name}...`)
        try {
          await client.query(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type}`)
          console.log(`  ✓ Колонка ${col.name} додана`)
        } catch (colError) {
          console.log(`  ⚠️  Помилка при додаванні ${col.name}: ${colError.message}`)
        }
      } else {
        console.log(`  ✓ Колонка ${col.name} вже існує`)
      }
    }

    // Перевірка та створення таблиці competitions
    console.log("Перевірка таблиці competitions...")
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
          manual_status VARCHAR(20),
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця competitions створена")
    } else {
      console.log("  ✓ Таблиця competitions вже існує")
      // Перевірка колонки manual_status
      console.log("  → Перевірка колонки manual_status...")
      const manualStatusColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'competitions' AND column_name = 'manual_status'
        ) as exists
      `)

      if (!manualStatusColumnCheck.rows[0].exists) {
        console.log("  → Додавання колонки manual_status...")
        await client.query(`ALTER TABLE competitions ADD COLUMN manual_status VARCHAR(20)`)
        console.log("  ✓ Колонка manual_status додана")
      } else {
        console.log("  ✓ Колонка manual_status вже існує")
      }
    }

    // Додавання нових колонок до competitions
    const newCompetitionColumns = [
      { name: "subject_id", type: "INTEGER REFERENCES subjects(id) ON DELETE SET NULL" },
      { name: "level", type: "VARCHAR(50)" },
      { name: "organizer", type: "VARCHAR(255)" },
      { name: "location", type: "VARCHAR(255)" },
      { name: "max_participants", type: "INTEGER" },
      { name: "registration_deadline", type: "DATE" },
      { name: "requirements", type: "TEXT" },
      { name: "prizes", type: "TEXT" },
      { name: "contact_info", type: "TEXT" },
      { name: "website_url", type: "VARCHAR(255)" },
      { name: "is_online", type: "BOOLEAN DEFAULT FALSE" },
      { name: "custom_fields", type: "JSONB" },
      { name: "updated_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
    ]

    console.log("  → Перевірка та додавання нових колонок до competitions...")
    for (const col of newCompetitionColumns) {
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'competitions' AND column_name = '${col.name}'
        ) as exists
      `)
      if (!columnCheck.rows[0].exists) {
        console.log(`  → Додавання колонки ${col.name}...`)
        await client.query(`ALTER TABLE competitions ADD COLUMN ${col.name} ${col.type}`)
        console.log(`  ✓ Колонка ${col.name} додана`)
      } else {
        console.log(`  ✓ Колонка ${col.name} вже існує`)
      }
    }

    // Перевірка та створення таблиці competition_participants
    console.log("Перевірка таблиці competition_participants...")
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

    // Перевірка та створення таблиці competition_results
    console.log("Перевірка таблиці competition_results...")
    const resultsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competition_results'
      ) as exists
    `)

    if (!resultsTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці competition_results...")
      await client.query(`
        CREATE TABLE competition_results (
          id SERIAL PRIMARY KEY,
          competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          place INTEGER,
          score VARCHAR(50),
          achievement VARCHAR(255) NOT NULL,
          notes TEXT,
          added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(competition_id, user_id)
        )
      `)
      console.log("  ✓ Таблиця competition_results створена")
    } else {
      console.log("  ✓ Таблиця competition_results вже існує")
      // Перевірка та додавання колонок до competition_results
      const resultColumns = [
        { name: "score", type: "VARCHAR(50)" },
        { name: "place", type: "INTEGER" },
        { name: "notes", type: "TEXT" },
        { name: "added_by", type: "INTEGER REFERENCES users(id) ON DELETE SET NULL" },
        { name: "updated_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
        { name: "achievement", type: "VARCHAR(255) NOT NULL" },
      ]

      console.log("  → Перевірка колонок таблиці competition_results...")
      for (const col of resultColumns) {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'competition_results' AND column_name = '${col.name}'
          ) as exists
        `)

        if (!columnCheck.rows[0].exists) {
          console.log(`  → Додавання колонки ${col.name}...`)
          await client.query(`ALTER TABLE competition_results ADD COLUMN ${col.name} ${col.type}`)
          console.log(`  ✓ Колонка ${col.name} додана`)
        } else {
          console.log(`  ✓ Колонка ${col.name} вже існує`)
        }
      }

      // Перевірка колонки is_confirmed
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'competition_results' AND column_name = 'is_confirmed'
      `)

      if (columnCheck.rows.length === 0) {
        console.log("  → Додавання колонки is_confirmed...")
        await client.query(`
          ALTER TABLE competition_results 
          ADD COLUMN is_confirmed BOOLEAN DEFAULT FALSE
        `)
        console.log("  ✓ Додано колонку is_confirmed")
      } else {
        console.log("  ✓ Колонка is_confirmed вже існує")
      }

      //ALTER COLUMN place TYPE VARCHAR(10) USING place::VARCHAR(10)
      console.log("  → Альтерація колонки place...")
      await client.query(`
        ALTER TABLE competition_results 
        ALTER COLUMN place TYPE VARCHAR(10) USING place::VARCHAR(10)
      `)
      console.log("  ✓ Колонка place змінена на VARCHAR(10)")
    }

    // Створення таблиці competition_documents
    console.log("Перевірка таблиці competition_documents...")
    const documentsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competition_documents'
      ) as exists
    `)

    if (!documentsTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці competition_documents...")
      await client.query(`
        CREATE TABLE competition_documents (
          id SERIAL PRIMARY KEY,
          competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          file_type VARCHAR(100),
          description TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця competition_documents створена")
    } else {
      console.log("  ✓ Таблиця competition_documents вже існує")
    }

    // Перевірка таблиці competition_form_responses
    console.log("Перевірка таблиці competition_form_responses...")
    const formResponsesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competition_form_responses'
      ) as exists
    `)

    if (!formResponsesTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці competition_form_responses...")
      await client.query(`
        CREATE TABLE competition_form_responses (
          id SERIAL PRIMARY KEY,
          competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          form_data JSONB NOT NULL,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(competition_id, user_id)
        )
      `)
      console.log("  ✓ Таблиця competition_form_responses створена")
    } else {
      console.log("  ✓ Таблиця competition_form_responses вже існує")
    }

    console.log("=== База даних готова до роботи! ===\n")
  } catch (error) {
    console.error("❌ КРИТИЧНА ПОМИЛКА ініціалізації бази даних:")
    console.error("Тип помилки:", error.name)
    console.error("Повідомлення:", error.message)
    console.error("Код помилки:", error.code)
    console.error("\n⚠️  РІШЕННЯ:")
    console.error("1. Відкрийте файл scripts/init-competitions-forms.sql")
    console.error("2. Скопіюйте весь SQL код")
    console.error("3. Виконайте його в SQL редакторі вашої бази даних Neon")
    console.error("4. Перезапустіть сервер командою: npm start\n")
    throw error
  } finally {
    client.release()
  }
}

// Запуск ініціалізації БД
initializeDatabase().catch((err) => {
  console.error("Не вдалося ініціалізувати базу даних. Сервер не запущено.")
  process.exit(1)
})

// Головна сторінка
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"))
})

// Реєстрація користувача
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body

  console.log("Спроба реєстрації:", email)

  // Валідація вхідних даних
  if (!email || !password) {
    console.log("Помилка: відсутні email або пароль")
    return res.status(400).json({
      error: "Email та пароль обов'язкові",
    })
  }

  if (password.length < 6) {
    console.log("Помилка: пароль занадто короткий")
    return res.status(400).json({
      error: "Пароль повинен містити мінімум 6 символів",
    })
  }

  // Валідація email формату
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.log("Помилка: невірний формат email")
    return res.status(400).json({
      error: "Невірний формат email",
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
        error: "Користувач з таким email вже існує",
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
        error: "Користувач з таким email вже існує",
      })
    }
    if (error.code === "22P02") {
      return res.status(500).json({
        error: "Помилка типу даних. Перевірте структуру бази даних.",
      })
    }
    if (error.message.includes("user_role")) {
      return res.status(500).json({
        error: "Помилка ролі користувача. Запустіть SQL скрипт для перестворення бази даних.",
      })
    }

    res.status(500).json({
      error: "Помилка реєстрації. Спробуйте ще раз.",
    })
  } finally {
    client.release()
  }
})

// Вхід користувача
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body

  console.log("Спроба входу:", email)

  if (!email || !password) {
    console.log("Помилка: відсутні email або пароль")
    return res.status(400).json({
      error: "Email та пароль обов'язкові",
    })
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      console.log("Помилка: користувача не знайдено")
      return res.status(401).json({
        error: "Невірний email або пароль",
      })
    }

    const user = result.rows[0]
    console.log("Користувач знайдений, перевірка пароля...")

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      console.log("Помилка: невірний пароль")
      return res.status(401).json({
        error: "Невірний email або пароль",
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
      error: "Помилка входу. Спробуйте ще раз.",
    })
  }
})

// Отримання ролі користувача
app.get("/api/user/role/:userId", async (req, res) => {
  const { userId } = req.params

  console.log("Запит ролі користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача",
    })
  }

  try {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId])

    if (result.rows.length === 0) {
      console.log("Помилка: користувача не знайдено")
      return res.status(404).json({
        error: "Користувача не знайдено",
      })
    }

    console.log("✓ Роль користувача:", result.rows[0].role)
    res.json({
      role: result.rows[0].role,
    })
  } catch (error) {
    console.error("❌ Помилка отримання ролі:", error.message)
    res.status(500).json({
      error: "Помилка отримання ролі",
    })
  }
})

// Отримання профілю
app.get("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params

  console.log("Запит профілю для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача",
    })
  }

  const client = await pool.connect()

  try {
    // Перевірка існування користувача
    const userCheck = await client.query("SELECT id, role FROM users WHERE id = $1", [userId])

    if (userCheck.rows.length === 0) {
      console.log("Помилка: користувача не існує")
      return res.status(404).json({
        error: "Користувача не знайдено",
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
        role: user.role,
      }
      console.log("✓ Новий профіль створено")
      return res.json({
        profile,
      })
    }

    const profile = {
      ...profileResult.rows[0],
      role: user.role,
    }
    console.log("✓ Профіль знайдено")
    res.json({
      profile,
    })
  } catch (error) {
    console.error("❌ Помилка отримання профілю:", error.message)
    res.status(500).json({
      error: "Помилка отримання профілю",
    })
  } finally {
    client.release()
  }
})

// Оновлення профілю
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
    schoolId,
    gradeNumber,
    gradeLetter,
    clubInstitution,
    clubName,
    interests,
    bio,
  } = req.body

  console.log("Оновлення профілю для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача",
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
        error: "Користувача не знайдено",
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
          school, grade, school_id, grade_number, grade_letter,
          club_institution, club_name, interests, bio, avatar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
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
          schoolId || null,
          gradeNumber || null,
          gradeLetter || null,
          clubInstitution || null,
          clubName || null,
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
        school_id: schoolId,
        grade_number: gradeNumber,
        grade_letter: gradeLetter,
        club_institution: clubInstitution,
        club_name: clubName,
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
      message: "Профіль успішно оновлено",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка оновлення профілю:", error)
    res.status(500).json({
      error: "Помилка оновлення профілю",
    })
  } finally {
    client.release()
  }
})

// Отримання всіх користувачів
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
      users: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання користувачів:", error.message)
    res.status(500).json({
      error: "Помилка отримання користувачів",
    })
  }
})

// Зміна ролі користувача
app.post("/api/admin/change-role", async (req, res) => {
  const { userId, role } = req.body

  console.log("Зміна ролі користувача ID:", userId, "на роль:", role)

  const validRoles = ["учень", "вчитель", "методист"]

  if (!validRoles.includes(role)) {
    console.log("Помилка: невірна роль")
    return res.status(400).json({
      error: "Невірна роль. Доступні: учень, вчитель, методист",
    })
  }

  if (!userId) {
    console.log("Помилка: відсутній userId")
    return res.status(400).json({
      error: "ID користувача обов'язковий",
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
        error: "Користувача не знайдено",
      })
    }

    console.log("✓ Роль успішно змінено на:", role)
    res.json({
      message: "Роль успішно змінено",
      user: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Помилка зміни ролі:", error.message)
    res.status(500).json({
      error: "Помилка зміни ролі",
    })
  }
})

// Валідація адмін пароля
app.post("/api/admin/validate", (req, res) => {
  const { password } = req.body
  const ADMIN_PASSWORD = "319560"

  console.log("Спроба входу в адмін панель")

  if (!password) {
    console.log("Помилка: пароль не надано")
    return res.status(400).json({
      valid: false,
      error: "Пароль обов'язковий",
    })
  }

  if (password === ADMIN_PASSWORD) {
    console.log("✓ Адмін пароль правильний")
    res.json({
      valid: true,
    })
  } else {
    console.log("Помилка: невірний адмін пароль")
    res.status(401).json({
      valid: false,
      error: "Невірний пароль",
    })
  }
})

// Отримання списку учнів (сортовано по класах)
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
      students: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання учнів:", error.message)
    res.status(500).json({
      error: "Помилка отримання учнів",
    })
  }
})

// Отримання предметів
app.get("/api/subjects", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM subjects ORDER BY name")
    res.json({ subjects: result.rows })
  } catch (error) {
    console.error("Помилка отримання предметів:", error)
    res.status(500).json({ error: "Помилка отримання предметів" })
  }
})

// Отримання шкіл
app.get("/api/schools", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name FROM schools ORDER BY name")
    res.json({ schools: result.rows })
  } catch (error) {
    console.error("Error fetching schools:", error)
    res.status(500).json({ error: "Помилка отримання списку шкіл" })
  }
})

// Створення конкурсу
app.post("/api/competitions", async (req, res) => {
  const {
    title,
    description,
    startDate,
    endDate,
    manualStatus,
    createdBy,
    subjectId,
    level,
    organizer,
    location,
    maxParticipants,
    registrationDeadline,
    requirements,
    prizes,
    contactInfo,
    websiteUrl,
    isOnline,
    customFields, // Added customFields parameter
  } = req.body

  console.log("Створення конкурсу:", title)

  if (!title || !startDate || !endDate) {
    console.log("Помилка: відсутні обов'язкові поля")
    return res.status(400).json({
      error: "Назва, дата початку та дата закінчення обов'язкові",
    })
  }

  try {
    const result = await pool.query(
      `INSERT INTO competitions (
        title, description, start_date, end_date, manual_status, created_by,
        subject_id, level, organizer, location, max_participants,
        registration_deadline, requirements, prizes, contact_info,
        website_url, is_online, custom_fields
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [
        title,
        description,
        startDate,
        endDate,
        manualStatus || null,
        createdBy || null,
        subjectId || null,
        level || null,
        organizer || null,
        location || null,
        maxParticipants || null,
        registrationDeadline || null,
        requirements || null,
        prizes || null,
        contactInfo || null,
        websiteUrl || null,
        isOnline || false,
        customFields ? JSON.stringify(customFields) : null, // Stringify customFields
      ],
    )

    const competition = result.rows[0]
    console.log("✓ Конкурс створено з ID:", competition.id)

    const startDateFormatted = new Date(startDate).toLocaleDateString("uk-UA")
    const endDateFormatted = new Date(endDate).toLocaleDateString("uk-UA")

    const notificationMessage = `
🎉 <b>Новий конкурс!</b>

📌 <b>Назва:</b> ${title}
📝 <b>Опис:</b> ${description || "Без опису"}
📅 <b>Початок:</b> ${startDateFormatted}
⏰ <b>Закінчення:</b> ${endDateFormatted}

Не пропустіть можливість взяти участь!
    `.trim()

    // await sendTelegramNotification(notificationMessage) // Use the local sendTelegramNotification - This will fail if sendTelegramNotification is not fully implemented or bot is not initialized here.
    console.log(
      "`/api/competitions` endpoint called. Notification sending needs to be re-integrated or managed in bot.js.",
    )

    res.json({
      competition: competition,
    })
  } catch (error) {
    console.error("❌ Помилка створення конкурсу:", error.message)
    res.status(500).json({
      error: "Помилка створення конкурсу",
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
      competitions: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання конкурсів:", error.message)
    res.status(500).json({
      error: "Помилка отримання конкурсів",
    })
  }
})

// Отримання конкретного конкурсу за ID
app.get("/api/competitions/:id", async (req, res) => {
  const { id } = req.params

  console.log("=======================================")
  console.log("[SERVER] 🔍 Запит конкурсу з ID:", id)
  console.log("[SERVER] Request method:", req.method)
  console.log("[SERVER] Request URL:", req.url)
  console.log("[SERVER] Request params:", req.params)
  console.log("=======================================")

  try {
    const result = await pool.query(
      `SELECT c.*, 
              COUNT(cp.id) as participants_count
       FROM competitions c
       LEFT JOIN competition_participants cp ON c.id = cp.competition_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id],
    )

    console.log("[SERVER] Query executed, rows found:", result.rows.length)

    if (result.rows.length === 0) {
      console.log("[SERVER] ❌ Конкурс не знайдено для ID:", id)
      return res.status(404).json({
        error: "Конкурс не знайдено",
      })
    }

    const competition = result.rows[0]
    console.log("[SERVER] Конкурс знайдено:", competition.title)
    console.log("[SERVER] Custom fields (raw):", competition.custom_fields)
    console.log("[SERVER] Custom fields type:", typeof competition.custom_fields)

    if (competition.custom_fields) {
      if (typeof competition.custom_fields === "string") {
        try {
          competition.custom_fields = JSON.parse(competition.custom_fields)
          console.log("[SERVER] ✓ Custom fields парсинуто з рядка")
        } catch (e) {
          console.error("[SERVER] ❌ Помилка парсування custom_fields:", e)
          console.error("[SERVER] Значення:", competition.custom_fields)
          competition.custom_fields = []
        }
      } else if (!Array.isArray(competition.custom_fields)) {
        console.log("[SERVER] ⚠️ Custom fields не є масивом, конвертую в масив")
        competition.custom_fields = []
      }
    } else {
      competition.custom_fields = []
    }

    console.log("[SERVER] Custom fields (фінальні):", competition.custom_fields)
    console.log("[SERVER] ✓ Відправляю відповідь клієнту")

    res.json({
      competition: competition,
    })
  } catch (error) {
    console.error("[SERVER] ❌ Помилка отримання конкурсу:", error.message)
    console.error("[SERVER] Error stack:", error.stack)
    res.status(500).json({
      error: "Помилка отримання конкурсу",
      details: error.message,
    })
  }
})

// Отримання конкурсів для конкретного учня
app.get("/api/competitions/my/:userId", async (req, res) => {
  const { userId } = req.params

  console.log("Запит конкурсів для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    console.log("Помилка: невірний userId")
    return res.status(400).json({
      error: "Невірний ID користувача",
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
      competitions: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання конкурсів користувача:", error.message)
    res.status(500).json({
      error: "Помилка отримання конкурсів",
    })
  }
})

// Додавання учнів на конкурс
app.post("/api/competitions/:id/participants", async (req, res) => {
  const { id } = req.params
  const { studentIds } = req.body

  console.log("Додавання учнів на конкурс ID:", id)

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    console.log("Помилка: не вказано учнів")
    return res.status(400).json({
      error: "Необхідно вибрати хоча б одного учня",
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
        error: "Конкурс не знайдено",
      })
    }

    let addedCount = 0
    let skippedCount = 0

    for (const studentId of studentIds) {
      try {
        const insertedParticipant = await client.query(
          `INSERT INTO competition_participants (competition_id, user_id) 
           VALUES ($1, $2) RETURNING user_id`,
          [id, studentId],
        )
        addedCount++
        // Notify the user about being added to the competition
        const addedUserId = insertedParticipant.rows[0].user_id
        // This call relies on bot.js. Ensure it's correctly imported and works.
        await notifyUserAddedToCompetition(addedUserId, id) // Call the bot notification function
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
      error: "Помилка додавання учнів на конкурс",
    })
  } finally {
    client.release()
  }
})

// Отримання учасників конкурсу
app.get("/api/competitions/:id/participants", async (req, res) => {
  const { id } = req.params

  console.log("Запит учасників конкурсу ID:", id)

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.email,
             p.first_name, p.last_name, p.grade, p.avatar
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
      participants: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання учасників:", error.message)
    res.status(500).json({
      error: "Помилка отримання учасників",
    })
  }
})

// Отримання учасників конкурсу з результатами
app.get("/api/competitions/:id/participants-with-results", async (req, res) => {
  const { id } = req.params

  console.log("Запит учасників з результатами для конкурсу ID:", id)

  try {
    const result = await pool.query(
      `
      SELECT 
        u.id as student_id,
        u.email,
        p.first_name, 
        p.last_name, 
        p.grade, 
        p.avatar,
        cp.added_at,
        r.id as result_id,
        r.score,
        r.place,
        r.notes,
        r.is_confirmed
      FROM competition_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN competition_results r ON r.competition_id = cp.competition_id AND r.user_id = u.id
      WHERE cp.competition_id = $1
      ORDER BY p.grade ASC NULLS LAST, p.last_name ASC
    `,
      [id],
    )

    console.log("✓ Знайдено учасників з результатами:", result.rows.length)
    res.json({
      participants: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання учасників з результатами:", error.message)
    res.status(500).json({
      error: "Помилка отримання учасників",
    })
  }
})

// Видалення конкурсу
app.delete("/api/competitions/:id", async (req, res) => {
  const { id } = req.params

  console.log("Видалення конкурсу ID:", id)

  try {
    const result = await pool.query("DELETE FROM competitions WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      console.log("Помилка: конкурс не знайдено")
      return res.status(404).json({
        error: "Конкурс не знайдено",
      })
    }

    console.log("✓ Конкурс видалено")
    res.json({
      message: "Конкурс успішно видалено",
    })
  } catch (error) {
    console.error("❌ Помилка видалення конкурсу:", error.message)
    res.status(500).json({
      error: "Помилка видалення конкурсу",
    })
  }
})

// Створення результату (новий ендпоінт)
app.post("/api/results", async (req, res) => {
  const { competitionId, studentId, score, place, notes, addedBy, isConfirmed } = req.body

  console.log("Додавання результату для учня ID:", studentId, "на конкурс ID:", competitionId)

  if (!competitionId || !studentId || !addedBy) {
    console.log("Помилка: відсутні обов'язкові поля")
    return res.status(400).json({
      error: "Конкурс, учень та викладач обов'язкові",
    })
  }

  if (!score && !place) {
    console.log("Помилка: потрібно вказати хоча б бали або місце")
    return res.status(400).json({
      error: "Вкажіть хоча б бали або місце",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка чи учень є учасником конкурсу
    const participantCheck = await client.query(
      "SELECT id FROM competition_participants WHERE competition_id = $1 AND user_id = $2",
      [competitionId, studentId],
    )

    if (participantCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: учень не є учасником конкурсу")
      return res.status(403).json({
        error: "У вас немає прав додавати результати для цього учня. Учень не бере участь у конкурсі.",
      })
    }

    // Перевірка чи викладач має права (вчитель або методист)
    const teacherCheck = await client.query("SELECT role FROM users WHERE id = $1", [addedBy])

    if (teacherCheck.rows.length === 0 || !["вчитель", "методист"].includes(teacherCheck.rows[0].role)) {
      await client.query("ROLLBACK")
      console.log("Помилка: недостатньо прав")
      return res.status(403).json({
        error: "У вас немає прав для додавання результатів",
      })
    }

    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'competition_results' AND column_name = 'is_confirmed'
    `)

    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE competition_results 
        ADD COLUMN is_confirmed BOOLEAN DEFAULT FALSE
      `)
      console.log("✓ Додано колонку is_confirmed")
    }

    await client.query(`
      ALTER TABLE competition_results 
      ALTER COLUMN place TYPE VARCHAR(10) USING place::VARCHAR(10)
    `)

    // Створення результату
    const result = await client.query(
      `INSERT INTO competition_results (competition_id, user_id, score, place, notes, achievement, added_by, is_confirmed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [competitionId, studentId, score, place, notes, score || place || "Участь", addedBy, isConfirmed || false],
    )

    await client.query("COMMIT")
    console.log("✓ Результат додано з ID:", result.rows[0].id)

    // Notify the student about the new result
    try {
      await notifyUserNewResult(studentId, competitionId)
    } catch (notifyError) {
      console.log("Помилка сповіщення:", notifyError.message)
    }

    res.json({
      message: "Результат успішно додано",
      result: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка додавання результату:", error.message)

    if (error.code === "23505") {
      return res.status(400).json({
        error: "Результат для цього учня вже існує",
      })
    }

    res.status(500).json({
      error: "Помилка додавання результату",
    })
  } finally {
    client.release()
  }
})

// Отримання результатів конкретного конкурсу
app.get("/api/results/:competitionId", async (req, res) => {
  const { competitionId } = req.params

  console.log("=======================================")
  console.log("[SERVER] 🔍 Запит результатів конкурсу ID:", competitionId)
  console.log("[SERVER] Request URL:", req.url)
  console.log("=======================================")

  try {
    const result = await pool.query(
      `SELECT 
        cr.*,
        u.email,
        p.first_name,
        p.last_name,
        p.grade,
        p.avatar
      FROM competition_results cr
      INNER JOIN users u ON cr.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cr.competition_id = $1
      ORDER BY cr.place ASC NULLS LAST, cr.score DESC NULLS LAST`,
      [competitionId],
    )

    console.log("✓ Знайдено результатів:", result.rows.length)
    res.json({
      results: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання результатів:", error.message)
    res.status(500).json({
      error: "Помилка отримання результатів",
    })
  }
})

// Оновлення результату (новий ендпоінт)
app.put("/api/results/:resultId", async (req, res) => {
  const { resultId } = req.params
  const { competitionId, studentId, score, place, notes, addedBy, isConfirmed } = req.body

  console.log("Оновлення результату ID:", resultId)

  if (!score && !place) {
    console.log("Помилка: потрібно вказати хоча б бали або місце")
    return res.status(400).json({
      error: "Вкажіть хоча б бали або місце",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка існування результату
    const resultCheck = await client.query("SELECT * FROM competition_results WHERE id = $1", [resultId])

    if (resultCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: результат не знайдено")
      return res.status(404).json({
        error: "Результат не знайдено",
      })
    }

    // Перевірка прав доступу
    if (addedBy) {
      const teacherCheck = await client.query("SELECT role FROM users WHERE id = $1", [addedBy])

      if (teacherCheck.rows.length === 0 || !["вчитель", "методист"].includes(teacherCheck.rows[0].role)) {
        await client.query("ROLLBACK")
        console.log("Помилка: недостатньо прав")
        return res.status(403).json({
          error: "У вас немає прав для редагування результатів",
        })
      }

      if (teacherCheck.rows[0].role === "вчитель" && resultCheck.rows[0].is_confirmed) {
        await client.query("ROLLBACK")
        console.log("Помилка: вчитель не може редагувати підтверджений результат")
        return res.status(403).json({
          error: "Ви не можете редагувати підтверджений результат",
        })
      }
    }

    // Оновлення результату
    const result = await client.query(
      `UPDATE competition_results 
       SET score = $1, place = $2, notes = $3, achievement = $4, is_confirmed = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [
        score,
        place,
        notes,
        score || place || "Участь",
        isConfirmed !== undefined ? isConfirmed : resultCheck.rows[0].is_confirmed,
        resultId,
      ],
    )

    await client.query("COMMIT")
    console.log("✓ Результат оновлено")

    res.json({
      message: "Результат успішно оновлено",
      result: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка оновлення результату:", error.message)
    res.status(500).json({
      error: "Помилка оновлення результату",
    })
  } finally {
    client.release()
  }
})

// Видалення результату (новий ендпоінт)
app.delete("/api/results/:resultId", async (req, res) => {
  const { resultId } = req.params

  console.log("Видалення результату ID:", resultId)

  try {
    const result = await pool.query("DELETE FROM competition_results WHERE id = $1 RETURNING id", [resultId])

    if (result.rows.length === 0) {
      console.log("Помилка: результат не знайдено")
      return res.status(404).json({
        error: "Результат не знайдено",
      })
    }

    console.log("✓ Результат видалено")
    res.json({
      message: "Результат успішно видалено",
    })
  } catch (error) {
    console.error("❌ Помилка видалення результату:", error.message)
    res.status(500).json({
      error: "Помилка видалення результату",
    })
  }
})

// Експорт результатів конкурсу
app.get("/api/results/:competitionId/export", async (req, res) => {
  const { competitionId } = req.params

  console.log("Експорт результатів конкурсу ID:", competitionId)

  try {
    const competition = await pool.query("SELECT title FROM competitions WHERE id = $1", [competitionId])

    if (competition.rows.length === 0) {
      return res.status(404).json({ error: "Конкурс не знайдено" })
    }

    const results = await pool.query(
      `
      SELECT 
        COALESCE(p.last_name || ' ' || p.first_name, u.email) as student_name,
        p.grade,
        cr.place,
        cr.score,
        cr.achievement,
        cr.notes,
        cr.added_at
      FROM competition_results cr
      INNER JOIN users u ON cr.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cr.competition_id = $1
      ORDER BY 
        CASE WHEN cr.place IS NULL THEN 1 ELSE 0 END,
        cr.place ASC
    `,
      [competitionId],
    )

    // Формування CSV
    let csv = "Учень,Клас,Місце,Бали,Досягнення,Примітки,Дата додавання\n"

    results.rows.forEach((row) => {
      csv += `"${row.student_name}","${row.grade || ""}","${row.place || ""}","${row.score || ""}","${row.achievement}","${row.notes || ""}","${new Date(row.added_at).toLocaleDateString("uk-UA")}"\n`
    })

    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="results_${competition.rows[0].title}_${Date.now()}.csv"`,
    )
    res.send("\uFEFF" + csv) // BOM для правильного відображення кирилиці

    console.log("✓ Результати експортовано")
  } catch (error) {
    console.error("❌ Помилка експорту результатів:", error.message)
    res.status(500).json({
      error: "Помилка експорту результатів",
    })
  }
})

// Загальна статистика платформи
app.get("/api/statistics/overview", async (req, res) => {
  console.log("Запит загальної статистики")

  try {
    // Загальна кількість учнів
    const studentsCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'учень'")

    // Загальна кількість конкурсів
    const competitionsCount = await pool.query("SELECT COUNT(*) as count FROM competitions")

    // Загальна кількість участей
    const participationsCount = await pool.query("SELECT COUNT(*) as count FROM competition_participants")

    // Активні конкурси (поточні)
    const activeCompetitions = await pool.query(
      "SELECT COUNT(*) as count FROM competitions WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE",
    )

    // Майбутні конкурси
    const upcomingCompetitions = await pool.query(
      "SELECT COUNT(*) as count FROM competitions WHERE start_date > CURRENT_DATE",
    )

    // Завершені конкурси
    const completedCompetitions = await pool.query(
      "SELECT COUNT(*) as count FROM competitions WHERE end_date < CURRENT_DATE",
    )

    console.log("✓ Загальна статистика отримана")
    res.json({
      students: Number.parseInt(studentsCount.rows[0].count),
      competitions: Number.parseInt(competitionsCount.rows[0].count),
      participations: Number.parseInt(participationsCount.rows[0].count),
      activeCompetitions: Number.parseInt(activeCompetitions.rows[0].count),
      upcomingCompetitions: Number.parseInt(upcomingCompetitions.rows[0].count),
      completedCompetitions: Number.parseInt(completedCompetitions.rows[0].count),
    })
  } catch (error) {
    console.error("❌ Помилка отримання загальної статистики:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики",
    })
  }
})

// Статистика по класах
app.get("/api/statistics/by-grade", async (req, res) => {
  console.log("Запит статистики по класах")

  try {
    const result = await pool.query(`
      SELECT 
        p.grade,
        COUNT(DISTINCT u.id) as students_count,
        COUNT(cp.id) as participations_count,
        ROUND(AVG(CASE WHEN cp.id IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as participation_rate
      FROM profiles p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN competition_participants cp ON u.id = cp.user_id
      WHERE u.role = 'учень' AND p.grade IS NOT NULL
      GROUP BY p.grade
      ORDER BY p.grade ASC
    `)

    console.log("✓ Статистика по класах отримана")
    res.json({
      grades: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання статистики по класах:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики",
    })
  }
})

// Топ активних учнів
app.get("/api/statistics/top-students", async (req, res) => {
  const limit = Number.parseInt(req.query.limit) || 10

  console.log(" Запит топ активних учнів, limit:", limit)

  try {
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Невірний параметр limit",
        students: [],
      })
    }

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        p.first_name,
        p.last_name,
        p.grade,
        p.avatar,
        COUNT(cp.id) as participations_count
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN competition_participants cp ON u.id = cp.user_id
      WHERE u.role = $1
      GROUP BY u.id, u.email, p.first_name, p.last_name, p.grade, p.avatar
      ORDER BY participations_count DESC
      LIMIT $2
      `,
      ["учень", limit],
    )

    console.log(" Топ активних учнів отримано, кількість:", result.rows.length)

    const students = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      grade: row.grade || "",
      avatar: row.avatar || null,
      participations_count: Number.parseInt(row.participations_count) || 0,
    }))

    res.json({
      success: true,
      students: students,
      count: students.length,
    })
  } catch (error) {
    console.error(" Помилка отримання топ учнів:", error.message)
    res.status(500).json({
      success: false,
      error: "Помилка отримання статистики",
      students: [],
    })
  }
})

// Статистика по конкурсах
app.get("/api/statistics/competitions", async (req, res) => {
  console.log("Запит статистики по конкурсах")

  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.title,
        c.start_date,
        c.end_date,
        COUNT(cp.id) as participants_count,
        CASE 
          WHEN c.end_date < CURRENT_DATE THEN 'завершений'
          WHEN c.start_date > CURRENT_DATE THEN 'майбутній'
          ELSE 'активний'
        END as status
      FROM competitions c
      LEFT JOIN competition_participants cp ON c.id = cp.competition_id
      GROUP BY c.id, c.title, c.start_date, c.end_date
      ORDER BY c.start_date DESC
    `)

    console.log("✓ Статистика по конкурсах отримана")
    res.json({
      competitions: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання статистики по конкурсах:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики",
    })
  }
})

// Статистика участі по місяцях
app.get("/api/statistics/participation-timeline", async (req, res) => {
  console.log("Запит статистики участі по місяцях")

  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(cp.added_at, 'YYYY-MM') as month,
        COUNT(*) as participations_count
      FROM competition_participants cp
      GROUP BY TO_CHAR(cp.added_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `)

    console.log("✓ Статистика участі по місяцях отримана")
    res.json({
      timeline: result.rows.reverse(),
    })
  } catch (error) {
    console.error("❌ Помилка отримання статистики участі:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики",
    })
  }
})

// Статистика по школах
app.get("/api/statistics/by-school", async (req, res) => {
  console.log("Запит статистики по школах")

  try {
    const result = await pool.query(`
      SELECT 
        p.school,
        COUNT(DISTINCT u.id) as students_count,
        COUNT(cp.id) as participations_count
      FROM profiles p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN competition_participants cp ON u.id = cp.user_id
      WHERE u.role = 'учень' AND p.school IS NOT NULL AND p.school != ''
      GROUP BY p.school
      ORDER BY participations_count DESC
      LIMIT 10
    `)

    console.log("✓ Статистика по школах отримана")
    res.json({
      schools: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання статистики по школах:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики",
    })
  }
})

// Get all participants with competition and user details
app.get("/api/admin/all-participants", async (req, res) => {
  console.log("Запит всіх учасників")

  try {
    const result = await pool.query(`
      SELECT 
        cp.id,
        cp.competition_id,
        cp.user_id,
        cp.added_at,
        c.title as competition_title,
        u.email,
        p.first_name,
        p.last_name,
        p.grade
      FROM competition_participants cp
      INNER JOIN competitions c ON cp.competition_id = c.id
      INNER JOIN users u ON cp.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY cp.added_at DESC
    `)

    console.log("✓ Знайдено учасників:", result.rows.length)
    res.json({ participants: result.rows })
  } catch (error) {
    console.error("❌ Помилка отримання учасників:", error.message)
    res.status(500).json({ error: "Помилка отримання учасників" })
  }
})

// Delete participant
app.delete("/api/admin/participants/:id", async (req, res) => {
  const { id } = req.params

  console.log("Видалення учасника ID:", id)

  try {
    const result = await pool.query("DELETE FROM competition_participants WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      console.log("Помилка: учасника не знайдено")
      return res.status(404).json({ error: "Учасника не знайдено" })
    }

    console.log("✓ Учасника видалено")
    res.json({ message: "Учасника видалено" })
  } catch (error) {
    console.error("❌ Помилка видалення учасника:", error.message)
    res.status(500).json({ error: "Помилка видалення учасника" })
  }
})

// Get all results with competition and user details
app.get("/api/admin/all-results", async (req, res) => {
  console.log("Запит всіх результатів")

  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.competition_id,
        cr.user_id,
        cr.place,
        cr.score,
        cr.achievement,
        cr.notes,
        cr.added_at,
        cr.is_confirmed,
        c.title as competition_title,
        u.email,
        p.first_name,
        p.last_name,
        p.grade
      FROM competition_results cr
      INNER JOIN competitions c ON cr.competition_id = c.id
      INNER JOIN users u ON cr.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY cr.added_at DESC
    `)

    console.log("✓ Знайдено результатів:", result.rows.length)
    res.json({ results: result.rows })
  } catch (error) {
    console.error("❌ Помилка отримання результатів:", error.message)
    res.status(500).json({ error: "Помилка отримання результатів" })
  }
})

// Оновлення конкурсу
app.put("/api/competitions/:id", async (req, res) => {
  const { id } = req.params
  const {
    title,
    description,
    startDate,
    endDate,
    manualStatus,
    subjectId,
    level,
    organizer,
    location,
    maxParticipants,
    registrationDeadline,
    requirements,
    prizes,
    contactInfo,
    websiteUrl,
    isOnline,
    customFields, // Added customFields parameter
  } = req.body

  console.log("Оновлення конкурсу ID:", id)

  if (!title || !startDate || !endDate) {
    return res.status(400).json({ error: "Назва та дати обов'язкові" })
  }

  try {
    const result = await pool.query(
      `UPDATE competitions 
       SET title = $1, description = $2, start_date = $3, end_date = $4, 
           manual_status = $5, subject_id = $6, level = $7, organizer = $8,
           location = $9, max_participants = $10, registration_deadline = $11,
           requirements = $12, prizes = $13, contact_info = $14,
           website_url = $15, is_online = $16, custom_fields = $17, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $18
       RETURNING *`,
      [
        title,
        description,
        startDate,
        endDate,
        manualStatus || null,
        subjectId || null,
        level || null,
        organizer || null,
        location || null,
        maxParticipants || null,
        registrationDeadline || null,
        requirements || null,
        prizes || null,
        contactInfo || null,
        websiteUrl || null,
        isOnline || false,
        customFields ? JSON.stringify(customFields) : null, // Stringify customFields
        id,
      ],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Конкурс не знайдено" })
    }

    console.log("✓ Конкурс оновлено")
    res.json({ competition: result.rows[0] })
  } catch (error) {
    console.error("❌ Помилка оновлення конкурсу:", error.message)
    res.status(500).json({ error: "Помилка оновлення конкурсу" })
  }
})

// Створення користувача адміністратором
app.post("/api/create-user", async (req, res) => {
  const { email, password, firstName, lastName, role, phone, telegram } = req.body

  console.log("Створення користувача адміністратором:", email, "з роллю:", role)

  // Validation
  if (!email || !password || !role) {
    console.log("Помилка: відсутні обов'язкові поля")
    return res.status(400).json({
      error: "Email, пароль та роль обов'язкові",
    })
  }

  if (password.length < 6) {
    console.log("Помилка: пароль занадто короткий")
    return res.status(400).json({
      error: "Пароль повинен містити мінімум 6 символів",
    })
  }

  const validRoles = ["учень", "вчитель", "методист"]
  if (!validRoles.includes(role)) {
    console.log("Помилка: невірна роль")
    return res.status(400).json({
      error: "Невірна роль. Доступні: учень, вчитель, методист",
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.log("Помилка: невірний формат email")
    return res.status(400).json({
      error: "Невірний формат email",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    console.log("Транзакція розпочата")

    // Check if user already exists
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: користувач вже існує")
      return res.status(400).json({
        error: "Користувач з таким email вже існує",
      })
    }

    // Hash password
    console.log("Хешування пароля...")
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with specified role
    console.log("Створення користувача в базі даних...")
    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, role],
    )

    const user = userResult.rows[0]
    console.log("Користувач створений з ID:", user.id)

    // Create profile with additional information
    console.log("Створення профілю для користувача...")
    await client.query(
      "INSERT INTO profiles (user_id, first_name, last_name, phone, telegram) VALUES ($1, $2, $3, $4, $5)",
      [user.id, firstName || null, lastName || null, phone || null, telegram || null],
    )
    console.log("Профіль створений")

    await client.query("COMMIT")
    console.log("Транзакція завершена успішно")
    console.log("✓ Користувача створено адміністратором:", email)

    res.json({
      message: "Користувача успішно створено",
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка створення користувача:")
    console.error("Тип помилки:", error.name)
    console.error("Повідомлення:", error.message)
    console.error("Код помилки:", error.code)

    if (error.code === "23505") {
      return res.status(400).json({
        error: "Користувач з таким email вже існує",
      })
    }

    res.status(500).json({
      error: "Помилка створення користувача",
    })
  } finally {
    client.release()
  }
})

// Середні бали
app.get("/api/statistics/average-scores", async (req, res) => {
  console.log("Запит середніх балів")

  try {
    // Overall average score
    const overallResult = await pool.query(`
      SELECT ROUND(AVG(CAST(score AS NUMERIC)), 1) as average
      FROM competition_results
      WHERE score::TEXT ~ '^[0-9]+(\\.[0-9]+)?$'
    `)

    // Average scores by grade
    const byGradeResult = await pool.query(`
      SELECT 
        p.grade,
        ROUND(AVG(CAST(cr.score AS NUMERIC)), 1) as average_score,
        COUNT(cr.id) as results_count
      FROM competition_results cr
      INNER JOIN users u ON cr.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cr.score::TEXT ~ '^[0-9]+(\\.[0-9]+)?$' AND p.grade IS NOT NULL
      GROUP BY p.grade
      ORDER BY p.grade ASC
    `)

    console.log("✓ Середні бали отримано")
    res.json({
      overallAverage: overallResult.rows[0]?.average || "N/A",
      byGrade: byGradeResult.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання середніх балів:", error.message)
    res.status(500).json({
      error: "Помилка отримання середніх балів",
    })
  }
})

// Статистика успішності по конкурсах
app.get("/api/statistics/competition-success", async (req, res) => {
  console.log("Запит статистики успішності по конкурсах")

  try {
    const result = await pool.query(`
      SELECT 
        c.title,
        c.id,
        COUNT(DISTINCT cp.id) as participants_count,
        ROUND(AVG(CAST(CASE WHEN cr.score::TEXT ~ '^[0-9]+(\\.[0-9]+)?$' THEN cr.score ELSE NULL END AS NUMERIC)), 1) as average_score,
        CASE 
          WHEN c.end_date < CURRENT_DATE THEN 'завершений'
          WHEN c.start_date > CURRENT_DATE THEN 'майбутній'
          ELSE 'активний'
        END as status
      FROM competitions c
      LEFT JOIN competition_participants cp ON c.id = cp.competition_id
      LEFT JOIN competition_results cr ON c.id = cr.competition_id
      WHERE c.end_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY c.id, c.title, c.start_date, c.end_date
      HAVING COUNT(DISTINCT cp.id) > 0
      ORDER BY c.start_date DESC
      LIMIT 10
    `)

    console.log("✓ Статистика успішності по конкурсах отримана")
    res.json({
      competitions: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання статистики успішності:", error.message)
    res.status(500).json({
      error: "Помилка отримання статистики успішності",
    })
  }
})

// Рівень участі
app.get("/api/statistics/participation-rate", async (req, res) => {
  console.log("Запит рівня участі")

  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT cp.user_id) as participating_students,
        ROUND(
          (COUNT(DISTINCT cp.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0)) * 100, 
          1
        ) as participation_rate
      FROM users u
      LEFT JOIN competition_participants cp ON u.id = cp.user_id
      WHERE u.role = 'учень'
    `)

    console.log("✓ Рівень участі отримано")
    res.json({
      rate: result.rows[0]?.participation_rate || 0,
      totalStudents: Number.parseInt(result.rows[0]?.total_students) || 0,
      participatingStudents: Number.parseInt(result.rows[0]?.participating_students) || 0,
    })
  } catch (error) {
    console.error("❌ Помилка отримання рівня участі:", error.message)
    res.status(500).json({
      error: "Помилка отримання рівня участі",
    })
  }
})

// Детальна статистика класів
app.get("/api/statistics/class-details", async (req, res) => {
  console.log("Запит детальної статистики класів")

  try {
    const result = await pool.query(`
      SELECT 
        p.grade,
        COUNT(DISTINCT u.id) as students_count,
        COUNT(cp.id) as participations_count,
        ROUND(AVG(CAST(CASE WHEN cr.score::TEXT ~ '^[0-9]+(\\.[0-9]+)?$' THEN cr.score ELSE NULL END AS NUMERIC)), 1) as average_score,
        ROUND(
          (COUNT(DISTINCT cp.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0)) * 100, 
          1
        ) as participation_rate
      FROM profiles p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN competition_participants cp ON u.id = cp.user_id
      LEFT JOIN competition_results cr ON u.id = cr.user_id
      WHERE u.role = 'учень' AND p.grade IS NOT NULL
      GROUP BY p.grade
      ORDER BY p.grade ASC
    `)

    console.log("✓ Детальна статистика класів отримана")
    res.json({
      classes: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання детальної статистики класів:", error.message)
    res.status(500).json({
      error: "Помилка отримання детальної статистики класів",
    })
  }
})

// Детальна статистика конкурсів
app.get("/api/statistics/competitions-detailed", async (req, res) => {
  console.log("Запит детальної статистики конкурсів")

  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.title,
        c.start_date,
        c.end_date,
        COUNT(DISTINCT cp.id) as participants_count,
        ROUND(AVG(CAST(CASE WHEN cr.score::TEXT ~ '^[0-9]+(\\.[0-9]+)?$' THEN cr.score ELSE NULL END AS NUMERIC)), 1) as average_score,
        CASE 
          WHEN c.end_date < CURRENT_DATE THEN 'завершений'
          WHEN c.start_date > CURRENT_DATE THEN 'майбутній'
          ELSE 'активний'
        END as status
      FROM competitions c
      LEFT JOIN competition_participants cp ON c.id = cp.competition_id
      LEFT JOIN competition_results cr ON c.id = cr.competition_id
      GROUP BY c.id, c.title, c.start_date, c.end_date
      ORDER BY c.start_date DESC
    `)

    console.log("✓ Детальна статистика конкурсів отримана")
    res.json({
      competitions: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання детальної статистики конкурсів:", error.message)
    res.status(500).json({
      error: "Помилка отримання детальної статистики конкурсів",
    })
  }
})

// Telegram сповіщення
app.post("/api/telegram/notify", async (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({
      error: "Повідомлення обов'язкове",
    })
  }

  try {
    // This will fail if sendTelegramNotification relies on a bot instance not present here.
    // await sendTelegramNotification(message)
    console.log(
      "'/api/telegram/notify' endpoint called. Notification sending needs to be re-integrated or managed in bot.js.",
    )
    res.json({
      message: "Сповіщення відправлено (функціонал сповіщень потребує перевірки)",
      // subscri besCount: subscribedChats.size, // subscribedChats is not used elsewhere if bot logic moved.
    })
  } catch (error) {
    console.error("❌ Помилка відправки сповіщення:", error.message)
    res.status(500).json({
      error: "Помилка відправки сповіщення",
    })
  }
})

// Отримання підписників
app.get("/api/telegram/subscribers", (req, res) => {
  // This relies on subscribedChats, which might be tied to the bot instance removed from this file.
  // If this endpoint is still needed, the management of subscribedChats needs to be handled,
  // possibly by exposing it from bot.js or re-implementing it here if necessary.
  console.log(
    "'/api/telegram/subscribers' endpoint called. subscribedChats count may not be accurate if managed elsewhere.",
  )
  res.json({
    count: subscribedChats.size, // This might be 0 if not updated correctly.
  })
})

// Перевірка дедлайнів
setInterval(async () => {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    const result = await pool.query(
      `SELECT * FROM competitions 
       WHERE end_date >= $1 AND end_date < $2 
       AND (manual_status IS NULL OR manual_status != 'завершено')`,
      [tomorrow, dayAfterTomorrow],
    )

    if (result.rows.length > 0) {
      for (const competition of result.rows) {
        const message = `
⏰ <b>Нагадування про дедлайн!</b>

📌 <b>Конкурс:</b> ${competition.title}
⚠️ <b>Закінчується завтра:</b> ${new Date(competition.end_date).toLocaleDateString("uk-UA")}

Поспішайте подати свої роботи!
        `.trim()

        // This call relies on sendTelegramNotification, which needs the bot instance.
        // await sendTelegramNotification(message) // Use the local sendTelegramNotification
        console.log(
          "Deadline reminder interval triggered. Notification sending needs to be re-integrated or managed in bot.js.",
        )
      }
    }
  } catch (error) {
    console.error("❌ Помилка перевірки дедлайнів:", error.message)
  }
}, 3600000) // Check every hour

// GET teacher profile
app.get("/api/profile/teacher/:userId", async (req, res) => {
  const { userId } = req.params

  console.log("Запит профілю педагога для користувача:", userId)

  if (!userId || userId === "undefined" || userId === "null") {
    return res.status(400).json({
      error: "Невірний ID користувача",
    })
  }

  const client = await pool.connect()

  try {
    // Check if user exists and get role
    const userCheck = await client.query("SELECT id, role FROM users WHERE id = $1", [userId])

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Користувача не знайдено",
      })
    }

    const user = userCheck.rows[0]
    if (user.role !== "вчитель" && user.role !== "методист") {
      return res.status(403).json({
        error: "Користувач не є педагогом",
      })
    }

    // Get profile
    const profileResult = await client.query("SELECT * FROM profiles WHERE user_id = $1", [userId])

    if (profileResult.rows.length === 0) {
      console.log("Профіль не знайдено, створюємо новий...")
      await client.query("INSERT INTO profiles (user_id) VALUES ($1)", [userId])
      const newProfile = await client.query("SELECT * FROM profiles WHERE user_id = $1", [userId])

      return res.json({
        profile: newProfile.rows[0],
      })
    }

    res.json({
      profile: profileResult.rows[0],
    })
  } catch (error) {
    console.error("Error getting teacher profile:", error)
    res.status(500).json({
      error: "Помилка завантаження профілю",
    })
  } finally {
    client.release()
  }
})

// POST/UPDATE teacher profile
app.post("/api/profile/teacher", upload.single("avatar"), async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    middleName,
    telegram,
    phone,
    schoolId,
    experienceYears,
    subjectsIds,
    gradesCatering,
    bio,
    userRole,
    consultationAreas,
  } = req.body

  console.log(" Received profile update - userId:", userId, "Type:", typeof userId)

  let parsedUserId = null

  if (!userId) {
    return res.status(400).json({
      error: "Невірний ID користувача",
    })
  }

  parsedUserId = Number.parseInt(String(userId).trim(), 10)

  if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
    console.error(" Invalid userId after parsing:", parsedUserId)
    return res.status(400).json({
      error: "ID користувача має бути числом більшим за 0",
    })
  }

  console.log(" Parsed userId:", parsedUserId)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [parsedUserId])
    if (userCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.error(" User not found:", parsedUserId)
      return res.status(404).json({
        error: "Користувача не знайдено в системі",
      })
    }

    let avatarPath = null
    if (req.file) {
      avatarPath = `/uploads/${req.file.filename}`
      console.log(" Avatar uploaded:", avatarPath)
    }

    const existingProfile = await client.query("SELECT id, avatar FROM profiles WHERE user_id = $1", [parsedUserId])

    if (existingProfile.rows.length === 0) {
      console.log(" Creating new teacher profile for userId:", parsedUserId)
      await client.query(
        `INSERT INTO profiles (
          user_id, first_name, last_name, middle_name, 
          telegram, phone, school_id,
          experience_years, subjects_ids, grades_catering,
          bio, consultation_areas, avatar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          parsedUserId,
          firstName && firstName.trim() ? firstName.trim() : null,
          lastName && lastName.trim() ? lastName.trim() : null,
          middleName && middleName.trim() ? middleName.trim() : null,
          telegram && telegram.trim() ? telegram.trim() : null,
          phone && phone.trim() ? phone.trim() : null,
          schoolId ? Number.parseInt(String(schoolId).trim(), 10) : null,
          experienceYears ? Number.parseInt(String(experienceYears).trim(), 10) : 0,
          subjectsIds && subjectsIds.trim() ? subjectsIds.trim() : null,
          gradesCatering && gradesCatering.trim() ? gradesCatering.trim() : null,
          bio && bio.trim() ? bio.trim() : null,
          consultationAreas && consultationAreas.trim() ? consultationAreas.trim() : null,
          avatarPath,
        ],
      )
    } else {
      console.log(" Updating existing teacher profile for userId:", parsedUserId)

      const currentAvatar = existingProfile.rows[0].avatar
      const finalAvatarPath = avatarPath || currentAvatar

      await client.query(
        `UPDATE profiles SET
          first_name = $2,
          last_name = $3,
          middle_name = $4,
          telegram = $5,
          phone = $6,
          school_id = $7,
          experience_years = $8,
          subjects_ids = $9,
          grades_catering = $10,
          bio = $11,
          consultation_areas = $12,
          avatar = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1`,
        [
          parsedUserId,
          firstName && firstName.trim() ? firstName.trim() : null,
          lastName && lastName.trim() ? lastName.trim() : null,
          middleName && middleName.trim() ? middleName.trim() : null,
          telegram && telegram.trim() ? telegram.trim() : null,
          phone && phone.trim() ? phone.trim() : null,
          schoolId ? Number.parseInt(String(schoolId).trim(), 10) : null,
          experienceYears ? Number.parseInt(String(experienceYears).trim(), 10) : 0,
          subjectsIds && subjectsIds.trim() ? subjectsIds.trim() : null,
          gradesCatering && gradesCatering.trim() ? gradesCatering.trim() : null,
          bio && bio.trim() ? bio.trim() : null,
          consultationAreas && consultationAreas.trim() ? consultationAreas.trim() : null,
          finalAvatarPath,
        ],
      )
    }

    await client.query("COMMIT")
    console.log(" Profile saved successfully for userId:", parsedUserId)
    res.json({
      message: "Профіль успішно оновлено",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error(" Error updating teacher profile:", error.message)
    res.status(500).json({
      error: "Помилка оновлення профіля: " + error.message,
    })
  } finally {
    client.release()
  }
})

// GET teacher students
app.get("/api/teacher/:teacherId/students", async (req, res) => {
  try {
    const { teacherId } = req.params

    console.log(" Fetching students for teacher:", teacherId)

    const teacherProfile = await pool.query(
      `SELECT p.school_id, p.subjects_ids 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE u.id = $1 AND u.role IN ('вчитель', 'методист')`,
      [teacherId],
    )

    if (teacherProfile.rows.length === 0) {
      console.log(" Teacher not found or not a teacher/metodyst")
      return res.status(404).json({ error: "Вчителя не знайдено або користувач не є вчителем/методистом." })
    }

    const schoolId = teacherProfile.rows[0].school_id

    console.log(" Teacher's school ID:", schoolId)

    if (!schoolId) {
      console.log(" Teacher has no school assigned")
      return res.status(400).json({ error: "У вчителя не вказана школа. Будь ласка, заповніть профіль." })
    }

    const studentsResult = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        p.first_name, 
        p.last_name, 
        p.middle_name,
        p.grade_number,
        p.grade_letter,
        p.school_id,
        p.phone,
        p.birth_date,
        p.avatar,
        p.grade,
        p.is_active,
        p.average_score,
        (SELECT name FROM schools WHERE id = p.school_id) as school_name
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'учень' 
        AND p.school_id = $1
        AND p.school_id IS NOT NULL
      ORDER BY p.last_name, p.first_name`,
      [schoolId],
    )

    console.log(" Students found:", studentsResult.rows.length)

    res.json({
      success: true,
      students: studentsResult.rows,
      schoolName: studentsResult.rows.length > 0 ? studentsResult.rows[0].school_name : null,
      totalStudents: studentsResult.rows.length,
    })
  } catch (error) {
    console.error(" Error getting teacher students:", error)
    res.status(500).json({ error: "Помилка сервера при отриманні списку учнів" })
  }
})

// GET student's competition participations
app.get("/api/students/:studentId/participations", async (req, res) => {
  try {
    const { studentId } = req.params

    // Changed 'db.query' to 'pool.query' assuming 'db' was a typo or placeholder.
    // Also, corrected column names based on common PostgreSQL naming conventions and potential table structures.
    // Assuming 'results' table has columns like 'score', 'place'.
    // Assuming 'competition_results' is the correct table name.
    const participations = await pool.query(
      `SELECT 
        c.id as competition_id,
        c.title as competition_name,
        cr.score as result_score, -- Renamed from 'score' to 'result_score' for clarity
        cr.place,
        c.start_date
      FROM competition_participants cp
      JOIN competitions c ON cp.competition_id = c.id
      LEFT JOIN competition_results cr ON cr.user_id = cp.user_id AND cr.competition_id = c.id
      WHERE cp.user_id = $1
      ORDER BY c.start_date DESC`,
      [studentId],
    )

    res.json({
      success: true,
      participations: participations.rows,
    })
  } catch (error) {
    console.error("Error getting student participations:", error)
    res.status(500).json({ error: "Помилка сервера при отриманні участей студента" })
  }
})

// Зміна пароля
app.post("/api/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body

  console.log("Запит на зміну пароля для користувача ID:", userId)

  if (!userId || !currentPassword || !newPassword) {
    console.log("Помилка: відсутні обов'язкові поля")
    return res.status(400).json({
      error: "Всі поля обов'язкові",
    })
  }

  if (newPassword.length < 6) {
    console.log("Помилка: пароль занадто короткий")
    return res.status(400).json({
      error: "Новий пароль повинен містити мінімум 6 символів",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Отримання поточного пароля користувача
    const userResult = await client.query("SELECT id, email, password FROM users WHERE id = $1", [userId])

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK")
      console.log("Помилка: користувача не знайдено")
      return res.status(404).json({
        error: "Користувача не знайдено",
      })
    }

    const user = userResult.rows[0]

    // Перевірка поточного пароля
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      await client.query("ROLLBACK")
      console.log("Помилка: невірний поточний пароль")
      return res.status(400).json({
        error: "Невірний поточний пароль",
      })
    }

    // Хешування нового пароля
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Оновлення пароля в базі даних
    await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId])

    await client.query("COMMIT")
    console.log("✓ Пароль успішно змінено для користувача:", user.email)

    res.json({
      message: "Пароль успішно змінено",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка зміни пароля:", error.message)
    res.status(500).json({
      error: "Помилка зміни пароля",
    })
  } finally {
    client.release()
  }
})

// Створення учня вчителем
app.post("/api/teacher/students", async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    phone,
    gradeNumber,
    gradeLetter,
    birthDate,
    city,
    telegram,
    isActive,
    schoolId,
  } = req.body

  console.log(" Creating new student:", { email, schoolId })

  if (!email || !password || !firstName || !lastName || !schoolId) {
    return res.status(400).json({ error: "Заповніть всі обов'язкові поля" })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Check if email already exists
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK")
      return res.status(400).json({ error: "Користувач з таким email вже існує" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, 'учень') RETURNING id",
      [email, hashedPassword],
    )

    const userId = userResult.rows[0].id

    // Create profile
    const grade = gradeNumber && gradeLetter ? `${gradeNumber}${gradeLetter}` : gradeNumber || null

    await client.query(
      `INSERT INTO profiles (
        user_id, first_name, last_name, middle_name, phone, 
        grade_number, grade_letter, grade, birth_date, city, 
        telegram, is_active, school_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId,
        firstName,
        lastName,
        middleName || null,
        phone || null,
        gradeNumber || null,
        gradeLetter || null,
        grade,
        birthDate || null,
        city || null,
        telegram || null,
        isActive !== false,
        schoolId,
      ],
    )

    await client.query("COMMIT")

    console.log(" Student created successfully:", userId)
    res.json({ message: "Учня успішно створено", userId })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error(" Error creating student:", error)
    res.status(500).json({ error: "Помилка створення учня" })
  } finally {
    client.release()
  }
})

// Оновлення учня вчителем
app.put("/api/teacher/students/:studentId", async (req, res) => {
  const { studentId } = req.params
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    phone,
    gradeNumber,
    gradeLetter,
    birthDate,
    city,
    telegram,
    isActive,
    schoolId,
  } = req.body

  console.log(" Updating student:", studentId)

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Заповніть всі обов'язкові поля" })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Check if email exists for another user
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, studentId])
    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK")
      return res.status(400).json({ error: "Email вже використовується іншим користувачем" })
    }

    // Update user email
    await client.query("UPDATE users SET email = $1 WHERE id = $2", [email, studentId])

    // Update password if provided
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10)
      await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, studentId])
    }

    // Update profile
    const grade = gradeNumber && gradeLetter ? `${gradeNumber}${gradeLetter}` : gradeNumber || null

    await client.query(
      `UPDATE profiles SET
        first_name = $1,
        last_name = $2,
        middle_name = $3,
        phone = $4,
        grade_number = $5,
        grade_letter = $6,
        grade = $7,
        birth_date = $8,
        city = $9,
        telegram = $10,
        is_active = $11,
        school_id = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $13`,
      [
        firstName,
        lastName,
        middleName || null,
        phone || null,
        gradeNumber || null,
        gradeLetter || null,
        grade,
        birthDate || null,
        city || null,
        telegram || null,
        isActive !== false,
        schoolId,
        studentId,
      ],
    )

    await client.query("COMMIT")

    console.log(" Student updated successfully:", studentId)
    res.json({ message: "Учня успішно оновлено" })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error(" Error updating student:", error)
    res.status(500).json({ error: "Помилка оновлення учня" })
  } finally {
    client.release()
  }
})

// Видалення учня вчителем
app.delete("/api/teacher/students/:studentId", async (req, res) => {
  const { studentId } = req.params

  console.log(" Deleting student:", studentId)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Delete student's participations
    // Note: The table 'competition_participants' uses 'user_id', not 'student_id'.
    // Assuming 'studentId' corresponds to 'user_id' here.
    await client.query("DELETE FROM competition_participants WHERE user_id = $1", [studentId])

    // Delete student's results
    // Note: The table 'competition_results' uses 'user_id', not 'student_id'.
    // Assuming 'studentId' corresponds to 'user_id' here.
    // Also, the table name was 'results', corrected to 'competition_results' based on other queries.
    await client.query("DELETE FROM competition_results WHERE user_id = $1", [studentId])

    // Delete profile
    await client.query("DELETE FROM profiles WHERE user_id = $1", [studentId])

    // Delete user
    await client.query("DELETE FROM users WHERE id = $1", [studentId])

    await client.query("COMMIT")

    console.log(" Student deleted successfully:", studentId)
    res.json({ message: "Учня успішно видалено" })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error(" Error deleting student:", error)
    res.status(500).json({ error: "Помилка видалення учня" })
  } finally {
    client.release()
  }
})

// Отримання деталей учня
app.get("/api/students/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params

    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        p.first_name,
        p.last_name,
        p.middle_name,
        p.phone,
        p.grade_number,
        p.grade_letter,
        p.grade,
        p.birth_date,
        p.city,
        p.telegram,
        p.is_active,
        p.school_id
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [studentId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Учня не знайдено" })
    }

    res.json({ success: true, student: result.rows[0] })
  } catch (error) {
    console.error("Error getting student details:", error)
    res.status(500).json({ error: "Помилка завантаження деталей учня" })
  }
})

// Отримання результатів учня
app.get("/api/students/:studentId/results", async (req, res) => {
  try {
    const { studentId } = req.params

    const results = await pool.query(
      `SELECT 
        cr.id,
        cr.competition_id,
        c.title as competition_title,
        cr.place,
        cr.score,
        cr.achievement,
        cr.notes,
        cr.created_at
      FROM competition_results cr
      JOIN competitions c ON cr.competition_id = c.id
      WHERE cr.user_id = $1
      ORDER BY cr.created_at DESC`,
      [studentId],
    )

    res.json({ success: true, results: results.rows })
  } catch (error) {
    console.error("Error getting student results:", error)
    res.status(500).json({ error: "Помилка завантаження результатів" })
  }
})

app.post("/api/competitions/:competitionId/documents/upload", uploadDocument.single("file"), async (req, res) => {
  const { competitionId } = req.params
  const { userId, description } = req.body

  console.log(`📤 Завантаження файлу для конкурсу ${competitionId} від користувача ${userId}`)

  if (!userId || !req.file) {
    return res.status(400).json({
      error: "Не вказано користувача або файл не завантажено",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка, чи учень є учасником конкурсу
    const participantCheck = await client.query(
      `SELECT id FROM competition_participants WHERE competition_id = $1 AND user_id = $2`,
      [competitionId, userId],
    )

    if (participantCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      // Видаляємо завантажений файл
      fs.unlinkSync(req.file.path)
      return res.status(403).json({
        error: "Ви не є учасником цього конкурсу",
      })
    }

    // Отримання інформації про учня та конкурс для організації файлів
    const userInfo = await client.query(
      `SELECT u.email, p.first_name, p.last_name FROM users u 
       LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1`,
      [userId],
    )

    const competitionInfo = await client.query(`SELECT title FROM competitions WHERE id = $1`, [competitionId])

    const user = userInfo.rows[0]
    const competition = competitionInfo.rows[0]

    // Створення структури папок: documents/competition_id/user_id/
    const competitionFolder = path.join(__dirname, "documents", `competition_${competitionId}`)
    const userFolder = path.join(competitionFolder, `user_${userId}`)

    // Створення папок, якщо їх немає
    if (!fs.existsSync(competitionFolder)) {
      fs.mkdirSync(competitionFolder, { recursive: true })
      console.log(`📁 Створено папку: ${competitionFolder}`)
    }

    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true })
      console.log(`📁 Створено папку: ${userFolder}`)
    }

    // Переміщення файлу до організованої структури
    const newFilePath = path.join(userFolder, req.file.filename)
    fs.renameSync(req.file.path, newFilePath)

    const relativeFilePath = `/documents/competition_${competitionId}/user_${userId}/${req.file.filename}`

    // Збереження інформації про файл у базу даних
    const result = await client.query(
      `INSERT INTO competition_documents (
        competition_id, user_id, file_name, original_name, 
        file_path, file_size, file_type, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        competitionId,
        userId,
        req.file.filename,
        req.file.originalname,
        relativeFilePath,
        req.file.size,
        req.file.mimetype,
        description || null,
      ],
    )

    await client.query("COMMIT")

    console.log(`✓ Файл успішно завантажено та організовано: ${req.file.originalname}`)
    console.log(`  → Шлях: ${relativeFilePath}`)

    res.json({
      message: "Файл успішно завантажено",
      document: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")

    // Видаляємо файл у разі помилки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    console.error("❌ Помилка завантаження файлу:", error.message)

    res.status(500).json({
      error: "Помилка завантаження файлу",
    })
  } finally {
    client.release()
  }
})

app.get("/api/competitions/:competitionId/documents", async (req, res) => {
  const { competitionId } = req.params

  console.log(`📋 Запит файлів для конкурсу ${competitionId}`)

  try {
    const result = await pool.query(
      `SELECT 
        cd.*,
        u.email,
        p.first_name,
        p.last_name,
        p.grade,
        p.avatar
      FROM competition_documents cd
      INNER JOIN users u ON cd.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cd.competition_id = $1
      ORDER BY cd.uploaded_at DESC`,
      [competitionId],
    )

    console.log(`✓ Знайдено файлів: ${result.rows.length}`)

    res.json({
      documents: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання файлів:", error.message)
    res.status(500).json({
      error: "Помилка отримання файлів",
    })
  }
})

app.get("/api/competitions/:competitionId/documents/my/:userId", async (req, res) => {
  const { competitionId, userId } = req.params

  console.log(`📋 Запит файлів учня ${userId} для конкурсу ${competitionId}`)

  try {
    const result = await pool.query(
      `SELECT * FROM competition_documents 
       WHERE competition_id = $1 AND user_id = $2
       ORDER BY uploaded_at DESC`,
      [competitionId, userId],
    )

    console.log(`✓ Знайдено файлів учня: ${result.rows.length}`)

    res.json({
      documents: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання файлів учня:", error.message)
    res.status(500).json({
      error: "Помилка отримання файлів",
    })
  }
})

app.delete("/api/competitions/documents/:documentId", async (req, res) => {
  const { documentId } = req.params
  const { userId, userRole } = req.body

  console.log(`🗑️ Видалення файлу ${documentId} користувачем ${userId}`)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Отримання інформації про файл
    const docResult = await client.query(`SELECT * FROM competition_documents WHERE id = $1`, [documentId])

    if (docResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({
        error: "Файл не знайдено",
      })
    }

    const document = docResult.rows[0]

    // Перевірка прав доступу
    if (document.user_id !== Number.parseInt(userId) && userRole !== "вчитель" && userRole !== "методист") {
      await client.query("ROLLBACK")
      return res.status(403).json({
        error: "У вас немає прав для видалення цього файлу",
      })
    }

    // Видалення запису з бази
    await client.query(`DELETE FROM competition_documents WHERE id = $1`, [documentId])

    // Видалення файлу з файлової системи
    const filePath = path.join(__dirname, document.file_path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`✓ Файл видалено: ${filePath}`)
    }

    await client.query("COMMIT")

    res.json({
      message: "Файл успішно видалено",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка видалення файлу:", error.message)
    res.status(500).json({
      error: "Помилка видалення файлу",
    })
  } finally {
    client.release()
  }
})

// Обробка помилок
app.use((err, req, res, next) => {
  console.error("❌ Необроблена помилка сервера:")
  console.error("URL:", req.url)
  console.error("Метод:", req.method)
  console.error("Помилка:", err.message)
  console.error("Stack:", err.stack)

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Файл занадто великий. Максимум 5MB",
      })
    }
    return res.status(400).json({
      error: "Помилка завантаження файлу",
    })
  }

  res.status(500).json({
    error: "Внутрішня помилка сервера",
  })
})

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущено на порту ${PORT}`)
  await initializeDatabase()

  try {
    await initBot()
    console.log("✅ Telegram бот успішно запущено")
  } catch (error) {
    console.error("❌ Помилка при запуску Telegram бота:", error)
  }
})

// API ендпоінти для роботи з відповідями на форми конкурсів

// Збереження відповіді учня на форму конкурсу
app.post("/api/competitions/:id/form-response", async (req, res) => {
  const { id } = req.params
  const { userId, formData } = req.body

  console.log("Збереження відповіді на форму конкурсу ID:", id, "від користувача:", userId)

  if (!userId || !formData) {
    return res.status(400).json({
      error: "userId та formData обов'язкові",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const participantCheck = await client.query(
      "SELECT id FROM competition_participants WHERE competition_id = $1 AND user_id = $2",
      [id, userId],
    )

    if (participantCheck.rows.length === 0) {
      // Automatically register student as participant
      await client.query("INSERT INTO competition_participants (competition_id, user_id) VALUES ($1, $2)", [id, userId])
      console.log("✓ Учень автоматично доданий як учасник")
    }

    // Збереження або оновлення відповіді
    const result = await client.query(
      `INSERT INTO competition_form_responses (competition_id, user_id, form_data, submitted_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (competition_id, user_id) 
       DO UPDATE SET form_data = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, userId, JSON.stringify(formData)],
    )

    await client.query("COMMIT")
    console.log("✓ Відповідь збережено")

    res.json({
      message: "Відповідь успішно збережено",
      response: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка збереження відповіді:", error.message)
    res.status(500).json({
      error: "Помилка збереження відповіді: " + error.message,
    })
  } finally {
    client.release()
  }
})

// Отримання відповіді конкретного учня на форму конкурсу
app.get("/api/competitions/:id/form-response/:userId", async (req, res) => {
  const { id, userId } = req.params

  console.log("Запит відповіді на форму конкурсу ID:", id, "від користувача:", userId)

  try {
    const result = await pool.query(
      `SELECT * FROM competition_form_responses 
       WHERE competition_id = $1 AND user_id = $2`,
      [id, userId],
    )

    if (result.rows.length === 0) {
      return res.json({
        response: null,
      })
    }

    console.log("✓ Відповідь знайдено")
    res.json({
      response: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Помилка отримання відповіді:", error.message)
    res.status(500).json({
      error: "Помилка отримання відповіді",
    })
  }
})

// Отримання всіх відповідей на форму конкурсу (для вчителів/методистів)
app.get("/api/competitions/:id/form-responses", async (req, res) => {
  const { id } = req.params

  console.log("Запит всіх відповідей на форму конкурсу ID:", id)

  try {
    const result = await pool.query(
      `SELECT 
        cfr.*,
        u.email,
        p.first_name,
        p.last_name,
        p.grade,
        p.avatar
      FROM competition_form_responses cfr
      INNER JOIN users u ON cfr.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE cfr.competition_id = $1
      ORDER BY cfr.submitted_at DESC`,
      [id],
    )

    console.log("✓ Знайдено відповідей:", result.rows.length)
    res.json({
      responses: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання відповідей:", error.message)
    res.status(500).json({
      error: "Помилка отримання відповідей",
    })
  }
})

// CHANGE: Added new endpoint for form file uploads
app.post("/api/competitions/:competitionId/form-file-upload", uploadDocument.single("file"), async (req, res) => {
  const { competitionId } = req.params
  const { userId, fieldIndex, description } = req.body

  console.log(`📤 Завантаження файлу форми для конкурсу ${competitionId} від користувача ${userId}`)

  if (!userId || !req.file) {
    return res.status(400).json({
      error: "Не вказано користувача або файл не завантажено",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевірка, чи учень є учасником конкурсу
    const participantCheck = await client.query(
      `SELECT id FROM competition_participants WHERE competition_id = $1 AND user_id = $2`,
      [competitionId, userId],
    )

    if (participantCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      fs.unlinkSync(req.file.path)
      return res.status(403).json({
        error: "Ви не є учасником цього конкурсу",
      })
    }

    // Отримання інформації про конкурс
    const competitionInfo = await client.query(`SELECT title FROM competitions WHERE id = $1`, [competitionId])
    const competition = competitionInfo.rows[0]

    // Організація папок: documents/(конкурс)/(id учня)/
    const competitionFolderName = competition.title.replace(/[^a-zA-Z0-9_-]/g, "_")
    const competitionFolder = path.join(__dirname, "documents", competitionFolderName)
    const userFolder = path.join(competitionFolder, `${userId}`)

    // Створення папок, якщо їх немає
    if (!fs.existsSync(competitionFolder)) {
      fs.mkdirSync(competitionFolder, { recursive: true })
      console.log(`📁 Створено папку: ${competitionFolder}`)
    }

    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true })
      console.log(`📁 Створено папку: ${userFolder}`)
    }

    // Переміщення файлу до організованої структури
    const newFilePath = path.join(userFolder, req.file.filename)
    fs.renameSync(req.file.path, newFilePath)

    const relativeFilePath = `/documents/${competitionFolderName}/${userId}/${req.file.filename}`

    // Збереження інформації про файл у базу даних
    const result = await client.query(
      `INSERT INTO competition_documents (
        competition_id, user_id, file_name, original_name, 
        file_path, file_size, file_type, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        competitionId,
        userId,
        req.file.filename,
        req.file.originalname,
        relativeFilePath,
        req.file.size,
        req.file.mimetype,
        description || null,
      ],
    )

    await client.query("COMMIT")

    console.log(`✓ Файл успішно завантажено та організовано: ${req.file.originalname}`)
    console.log(`  → Шлях: ${relativeFilePath}`)

    res.json({
      message: "Файл успішно завантажено",
      document: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
    console.error("❌ Помилка завантаження файлу форми:", error.message)
    res.status(500).json({
      error: "Помилка завантаження файлу: " + error.message,
    })
  } finally {
    client.release()
  }
})
