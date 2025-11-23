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

// Створення папки для завантажень
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads")
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
      await client.query(`CREATE TYPE user_role AS ENUM ('учень', 'вчитель', 'методист', 'адміністратор_громади')`)
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

    console.log("Перевірка таблиці cities...")
    const citiesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cities'
      ) as exists
    `)

    if (!citiesTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці cities...")
      await client.query(`
        CREATE TABLE cities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          region VARCHAR(100),
          type VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця cities створена")

      // Додавання міст України
      console.log("  → Додавання міст України...")
      const cities = [
        { name: "Київ", region: "м. Київ", type: "столиця" },
        { name: "Харків", region: "Харківська", type: "обласний центр" },
        { name: "Одеса", region: "Одеська", type: "обласний центр" },
        { name: "Дніпро", region: "Дніпропетровська", type: "обласний центр" },
        { name: "Донецьк", region: "Донецька", type: "обласний центр" },
        { name: "Запоріжжя", region: "Запорізька", type: "обласний центр" },
        { name: "Львів", region: "Львівська", type: "обласний центр" },
        { name: "Кривий Ріг", region: "Дніпропетровська", type: "місто" },
        { name: "Миколаїв", region: "Миколаївська", type: "обласний центр" },
        { name: "Маріуполь", region: "Донецька", type: "місто" },
        { name: "Луганськ", region: "Луганська", type: "обласний центр" },
        { name: "Вінниця", region: "Вінницька", type: "обласний центр" },
        { name: "Севастополь", region: "м. Севастополь", type: "місто" },
        { name: "Макіївка", region: "Донецька", type: "місто" },
        { name: "Сімферополь", region: "Автономна Республіка Крим", type: "місто" },
        { name: "Херсон", region: "Херсонська", type: "обласний центр" },
        { name: "Полтава", region: "Полтавська", type: "обласний центр" },
        { name: "Чернігів", region: "Чернігівська", type: "обласний центр" },
        { name: "Черкаси", region: "Черкаська", type: "обласний центр" },
        { name: "Житомир", region: "Житомирська", type: "обласний центр" },
        { name: "Суми", region: "Сумська", type: "обласний центр" },
        { name: "Хмельницький", region: "Хмельницька", type: "обласний центр" },
        { name: "Чернівці", region: "Чернівецька", type: "обласний центр" },
        { name: "Рівне", region: "Рівненська", type: "обласний центр" },
        { name: "Кам'янське", region: "Дніпропетровська", type: "місто" },
        { name: "Кропивницький", region: "Кіровоградська", type: "обласний центр" },
        { name: "Івано-Франківськ", region: "Івано-Франківська", type: "обласний центр" },
        { name: "Кременчук", region: "Полтавська", type: "місто" },
        { name: "Тернопіль", region: "Тернопільська", type: "обласний центр" },
        { name: "Луцьк", region: "Волинська", type: "обласний центр" },
        { name: "Біла Церква", region: "Київська", type: "місто" },
        { name: "Краматорськ", region: "Донецька", type: "місто" },
        { name: "Мелітополь", region: "Запорізька", type: "місто" },
        { name: "Керч", region: "Автономна Республіка Крим", type: "місто" },
        { name: "Нікополь", region: "Дніпропетровська", type: "місто" },
        { name: "Слов'янськ", region: "Донецька", type: "місто" },
        { name: "Ужгород", region: "Закарпатська", type: "обласний центр" },
        { name: "Бердянськ", region: "Запорізька", type: "місто" },
        { name: "Алчевськ", region: "Луганська", type: "місто" },
        { name: "Павлоград", region: "Дніпропетровська", type: "місто" },
        { name: "Євпаторія", region: "Автономна Республіка Крим", type: "місто" },
        { name: "Кам'янець-Подільський", region: "Хмельницька", type: "місто" },
        { name: "Лисичанськ", region: "Луганська", type: "місто" },
        { name: "Мукачево", region: "Закарпатська", type: "місто" },
      ]

      for (const city of cities) {
        await client.query(`INSERT INTO cities (name, region, type) VALUES ($1, $2, $3)`, [
          city.name,
          city.region,
          city.type,
        ])
      }

      console.log(`  ✓ Додано ${cities.length} міст України`)
    } else {
      console.log("  ✓ Таблиця cities вже існує")

      // Перевірка кількості міст
      const countResult = await pool.query("SELECT COUNT(*) as count FROM cities")
      const cityCount = Number.parseInt(countResult.rows[0].count)
      console.log(`  ℹ️  Кількість міст в базі: ${cityCount}`)

      if (cityCount === 0) {
        console.log("  ⚠️  Таблиця cities порожня, додаю міста...")
        const cities = [
          { name: "Київ", region: "м. Київ", type: "столиця" },
          { name: "Харків", region: "Харківська", type: "обласний центр" },
          { name: "Одеса", region: "Одеська", type: "обласний центр" },
          { name: "Дніпро", region: "Дніпропетровська", type: "обласний центр" },
          { name: "Донецьк", region: "Донецька", type: "обласний центр" },
          { name: "Запоріжжя", region: "Запорізька", type: "обласний центр" },
          { name: "Львів", region: "Львівська", type: "обласний центр" },
          { name: "Кривий Ріг", region: "Дніпропетровська", type: "місто" },
          { name: "Миколаїв", region: "Миколаївська", type: "обласний центр" },
          { name: "Маріуполь", region: "Донецька", type: "місто" },
          { name: "Луганськ", region: "Луганська", type: "обласний центр" },
          { name: "Вінниця", region: "Вінницька", type: "обласний центр" },
          { name: "Севастополь", region: "м. Севастополь", type: "місто" },
          { name: "Макіївка", region: "Донецька", type: "місто" },
          { name: "Сімферополь", region: "Автономна Республіка Крим", type: "місто" },
          { name: "Херсон", region: "Херсонська", type: "обласний центр" },
          { name: "Полтава", region: "Полтавська", type: "обласний центр" },
          { name: "Чернігів", region: "Чернігівська", type: "обласний центр" },
          { name: "Черкаси", region: "Черкаська", type: "обласний центр" },
          { name: "Житомир", region: "Житомирська", type: "обласний центр" },
          { name: "Суми", region: "Сумська", type: "обласний центр" },
          { name: "Хмельницький", region: "Хмельницька", type: "обласний центр" },
          { name: "Чернівці", region: "Чернівецька", type: "обласний центр" },
          { name: "Рівне", region: "Рівненська", type: "обласний центр" },
          { name: "Кам'янське", region: "Дніпропетровська", type: "місто" },
          { name: "Кропивницький", region: "Кіровоградська", type: "обласний центр" },
          { name: "Івано-Франківськ", region: "Івано-Франківська", type: "обласний центр" },
          { name: "Кременчук", region: "Полтавська", type: "місто" },
          { name: "Тернопіль", region: "Тернопільська", type: "обласний центр" },
          { name: "Луцьк", region: "Волинська", type: "обласний центр" },
          { name: "Біла Церква", region: "Київська", type: "місто" },
          { name: "Краматорськ", region: "Донецька", type: "місто" },
          { name: "Мелітополь", region: "Запорізька", type: "місто" },
          { name: "Керч", region: "Автономна Республіка Крим", type: "місто" },
          { name: "Нікополь", region: "Дніпропетровська", type: "місто" },
          { name: "Слов'янськ", region: "Донецька", type: "місто" },
          { name: "Ужгород", region: "Закарпатська", type: "обласний центр" },
          { name: "Бердянськ", region: "Запорізька", type: "місто" },
          { name: "Алчевськ", region: "Луганська", type: "місто" },
          { name: "Павлоград", region: "Дніпропетровська", type: "місто" },
          { name: "Євпаторія", region: "Автономна Республіка Крим", type: "місто" },
          { name: "Кам'янець-Подільський", region: "Хмельницька", type: "місто" },
          { name: "Лисичанськ", region: "Луганська", type: "місто" },
          { name: "Мукачево", region: "Закарпатська", type: "місто" },
        ]

        for (const city of cities) {
          await client.query(`INSERT INTO cities (name, region, type) VALUES ($1, $2, $3)`, [
            city.name,
            city.region,
            city.type,
          ])
        }

        console.log(`  ✓ Додано ${cities.length} міст України`)
      }
    }

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

    // Перевірка та створення таблиці community_admins (new)
    console.log("Перевірка таблиці community_admins...")
    const communityAdminsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'community_admins'
      ) as exists
    `)

    if (!communityAdminsTableCheck.rows[0].exists) {
      console.log("  → Створення таблиці community_admins...")
      await client.query(`
        CREATE TABLE community_admins (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          city VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("  ✓ Таблиця community_admins створена")
    } else {
      console.log("  ✓ Таблиця community_admins вже існує")
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

async function initializeCommunityAdmin() {
  const client = await pool.connect()
  try {
    console.log("=== Ініціалізація Адміністратора Громади ===")

    const email = process.env.COMMUNITY_ADMIN_EMAIL
    const password = process.env.COMMUNITY_ADMIN_PASSWORD
    const city = process.env.COMMUNITY_ADMIN_CITY

    if (!email || !password || !city) {
      console.log("⚠️  Змінні оточення для адміна громади не встановлені. Пропускаємо ініціалізацію.")
      return
    }

    console.log(`📍 Ініціалізація адміна для міста: ${city}`)

    // Крок 1: Видалення існуючого користувача з таким email
    console.log(`  → Перевірка та видалення існуючого користувача (${email})...`)
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      const userId = existingUser.rows[0].id
      console.log(`  → Видалення користувача ID: ${userId}...`)

      // Спочатку видалимо запис з community_admins
      await client.query("DELETE FROM community_admins WHERE user_id = $1", [userId])

      // Потім видалимо користувача
      await client.query("DELETE FROM users WHERE id = $1", [userId])
      console.log(`  ✓ Користувач видалений`)
    } else {
      console.log(`  ✓ Користувача не знайдено (новий запис)`)
    }

    // Крок 2: Хешування пароля
    console.log(`  → Хешування пароля...`)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Крок 3: Вставлення нового користувача як адміністратор громади
    console.log(`  → Створення нового користувача (${email})...`)
    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "адміністратор_громади"],
    )

    const userId = userResult.rows[0].id
    console.log(`  ✓ Користувач створений з ID: ${userId}`)

    // Крок 4: Вставлення запису в таблицю community_admins
    console.log(`  → Додавання до таблиці community_admins...`)
    await client.query(
      "INSERT INTO community_admins (user_id, city) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [userId, city],
    )
    console.log(`  ✓ Адміністратор громади додан для міста ${city}`)

    console.log(`✅ Адміністратор громади успішно ініціалізований!`)
    console.log(`   Email: ${email}`)
    console.log(`   Роль: адміністратор_громади`)
    console.log(`   Місто: ${city}\n`)
  } catch (error) {
    console.error("❌ Помилка при ініціалізації адміна громади:")
    console.error("Тип помилки:", error.name)
    console.error("Повідомлення:", error.message)
    console.error("Код помилки:", error.code)
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

app.get("/api/cities", async (req, res) => {
  console.log("🌍 Запит списку міст")

  try {
    const result = await pool.query(`
      SELECT id, name, region, type 
      FROM cities 
      ORDER BY 
        CASE 
          WHEN type = 'столиця' THEN 1
          WHEN type = 'обласний центр' THEN 2
          ELSE 3
        END,
        name ASC
    `)

    console.log("✅ Знайдено міст:", result.rows.length)

    if (result.rows.length === 0) {
      console.warn("⚠️ Таблиця cities порожня! Запустіть SQL скрипт для додавання міст.")
    }

    res.json({
      cities: result.rows || [],
      total: result.rows.length || 0,
    })
  } catch (error) {
    console.error("❌ Помилка отримання міст:", error.message)
    console.error("Stack trace:", error.stack)

    res.status(500).json({
      error: "Помилка отримання списку міст",
      details: error.message,
      cities: [],
      total: 0,
    })
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
        website_url, is_online
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
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

  console.log("[v0] Запит топ активних учнів, limit:", limit)

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

    console.log("[v0] Топ активних учнів отримано, кількість:", result.rows.length)

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
    console.error("[v0] Помилка отримання топ учнів:", error.message)
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
        customFields || null, // Added customFields value
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

  console.log("[v0] Received profile update - userId:", userId, "Type:", typeof userId)

  let parsedUserId = null

  if (!userId) {
    return res.status(400).json({
      error: "Невірний ID користувача",
    })
  }

  parsedUserId = Number.parseInt(String(userId).trim(), 10)

  if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
    console.error("[v0] Invalid userId after parsing:", parsedUserId)
    return res.status(400).json({
      error: "ID користувача має бути числом більшим за 0",
    })
  }

  console.log("[v0] Parsed userId:", parsedUserId)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [parsedUserId])
    if (userCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      console.error("[v0] User not found:", parsedUserId)
      return res.status(404).json({
        error: "Користувача не знайдено в системі",
      })
    }

    let avatarPath = null
    if (req.file) {
      avatarPath = `/uploads/${req.file.filename}`
      console.log("[v0] Avatar uploaded:", avatarPath)
    }

    const existingProfile = await client.query("SELECT id, avatar FROM profiles WHERE user_id = $1", [parsedUserId])

    if (existingProfile.rows.length === 0) {
      console.log("[v0] Creating new teacher profile for userId:", parsedUserId)
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
      console.log("[v0] Updating existing teacher profile for userId:", parsedUserId)

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
    console.log("[v0] Profile saved successfully for userId:", parsedUserId)
    res.json({
      message: "Профіль успішно оновлено",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[v0] Error updating teacher profile:", error.message)
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

    console.log("[v0] Fetching students for teacher:", teacherId)

    const teacherProfile = await pool.query(
      `SELECT p.school_id, p.subjects_ids 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE u.id = $1 AND u.role IN ('вчитель', 'методист')`,
      [teacherId],
    )

    if (teacherProfile.rows.length === 0) {
      console.log("[v0] Teacher not found or not a teacher/metodyst")
      return res.status(404).json({ error: "Вчителя не знайдено або користувач не є вчителем/методистом." })
    }

    const schoolId = teacherProfile.rows[0].school_id

    console.log("[v0] Teacher's school ID:", schoolId)

    if (!schoolId) {
      console.log("[v0] Teacher has no school assigned")
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

    console.log("[v0] Students found:", studentsResult.rows.length)

    res.json({
      success: true,
      students: studentsResult.rows,
      schoolName: studentsResult.rows.length > 0 ? studentsResult.rows[0].school_name : null,
      totalStudents: studentsResult.rows.length,
    })
  } catch (error) {
    console.error("[v0] Error getting teacher students:", error)
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

  console.log("[v0] Creating new student:", { email, schoolId })

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

    console.log("[v0] Student created successfully:", userId)
    res.json({ message: "Учня успішно створено", userId })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[v0] Error creating student:", error)
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

  console.log("[v0] Updating student:", studentId)

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

    console.log("[v0] Student updated successfully:", studentId)
    res.json({ message: "Учня успішно оновлено" })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[v0] Error updating student:", error)
    res.status(500).json({ error: "Помилка оновлення учня" })
  } finally {
    client.release()
  }
})

// Видалення учня вчителем
app.delete("/api/teacher/students/:studentId", async (req, res) => {
  const { studentId } = req.params

  console.log("[v0] Deleting student:", studentId)

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

    console.log("[v0] Student deleted successfully:", studentId)
    res.json({ message: "Учня успішно видалено" })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("[v0] Error deleting student:", error)
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

  await initializeCommunityAdmin()

  try {
    await initBot()
    console.log("✅ Telegram бот успішно запущено")
  } catch (error) {
    console.error("❌ Помилка при запуску Telegram бота:", error)
  }
})

// Community Admin endpoints
app.post("/api/community-admins", async (req, res) => {
  const { email, password, city } = req.body

  if (!email || !password || !city) {
    return res.status(400).json({
      error: "Email, пароль та місто обов'язкові",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const hashedPassword = await bcrypt.hash(password, 10)

    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "адміністратор_громади"],
    )

    const user = userResult.rows[0]

    await client.query("INSERT INTO community_admins (user_id, city) VALUES ($1, $2)", [user.id, city])

    await client.query("INSERT INTO profiles (user_id) VALUES ($1)", [user.id])

    await client.query("COMMIT")
    console.log("✓ Адміністратор громади створено для міста:", city)

    res.json({
      userId: user.id,
      email: user.email,
      role: user.role,
      city: city,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка створення адміністратора громади:", error.message)
    res.status(500).json({
      error: "Помилка створення адміністратора громади",
    })
  } finally {
    client.release()
  }
})

// Отримання даних адміністратора громади
app.get("/api/community-admin/:userId", async (req, res) => {
  const { userId } = req.params

  console.log("Запит даних адміністратора громади:", userId)

  try {
    const result = await pool.query("SELECT * FROM community_admins WHERE user_id = $1", [userId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Адміністратора громади не знайдено",
      })
    }

    console.log("✓ Дані адміністратора громади отримані")
    res.json({
      admin: result.rows[0],
    })
  } catch (error) {
    console.error("❌ Помилка отримання даних адміністратора громади:", error.message)
    res.status(500).json({
      error: "Помилка отримання даних адміністратора",
    })
  }
})

// Отримання методистів по адміністратору громади
app.get("/api/community-admin/:userId/methodists", async (req, res) => {
  const { userId } = req.params

  console.log("📋 Запит методистів для адміністратора громади:", userId)

  try {
    // Отримуємо місто адміністратора громади
    const adminResult = await pool.query("SELECT city FROM community_admins WHERE user_id = $1", [userId])

    if (adminResult.rows.length === 0) {
      console.log("❌ Адміністратора громади не знайдено для userId:", userId)
      return res.status(404).json({
        error: "Адміністратора громади не знайдено",
      })
    }

    const city = adminResult.rows[0].city
    console.log(`📍 Місто адміністратора: ${city}`)

    // Отримуємо методистів цього міста з усіма необхідними полями
    const result = await pool.query(
      `SELECT 
        p.id as profile_id,
        p.user_id,
        p.first_name,
        p.last_name,
        p.middle_name,
        p.phone,
        p.city,
        p.methodist_area,
        p.consultation_areas,
        p.school,
        p.subjects_ids,
        u.email,
        u.role as user_role,
        u.created_at 
       FROM profiles p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.city = $1 AND u.role = $2 
       ORDER BY u.created_at DESC`,
      [city, "методист"],
    )

    console.log(`✅ Знайдено методистів: ${result.rows.length}`)
    if (result.rows.length > 0) {
      console.log(`📊 Приклад структури першого методиста:`, result.rows[0])
    }

    res.json({
      methodists: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання методистів:", error.message)
    console.error("❌ Деталі помилки:", error)
    res.status(500).json({
      error: "Помилка отримання методистів для адміністратора громади",
      details: error.message,
    })
  }
})

// Отримання вчителів по адміністратору громади
app.get("/api/community-admin/:userId/teachers", async (req, res) => {
  const { userId } = req.params

  console.log("📋 Запит вчителів для адміністратора громади:", userId)

  try {
    // Отримуємо місто адміністратора громади
    const adminResult = await pool.query("SELECT city FROM community_admins WHERE user_id = $1", [userId])

    if (adminResult.rows.length === 0) {
      console.log("❌ Адміністратора громади не знайдено для userId:", userId)
      return res.status(404).json({
        error: "Адміністратора громади не знайдено",
      })
    }

    const city = adminResult.rows[0].city
    console.log(`📍 Місто адміністратора: ${city}`)

    // Отримуємо вчителів цього міста з усіма необхідними полями
    const result = await pool.query(
      `SELECT 
        p.id as profile_id,
        p.user_id,
        p.first_name,
        p.last_name,
        p.middle_name,
        p.phone,
        p.city,
        p.school,
        p.subjects_ids,
        p.grades_catering,
        p.experience_years,
        u.email,
        u.role as user_role,
        u.created_at 
       FROM profiles p
       INNER JOIN users u ON p.user_id = u.id
       WHERE p.city = $1 AND u.role = $2 
       ORDER BY u.created_at DESC`,
      [city, "вчитель"],
    )

    console.log(`✅ Знайдено вчителів: ${result.rows.length}`)
    if (result.rows.length > 0) {
      console.log(`📊 Приклад структури першого вчителя:`, result.rows[0])
    }

    res.json({
      teachers: result.rows,
    })
  } catch (error) {
    console.error("❌ Помилка отримання вчителів:", error.message)
    console.error("❌ Деталі помилки:", error)
    res.status(500).json({
      error: "Помилка отримання вчителів для адміністратора громади",
      details: error.message,
    })
  }
})

// Оновлення даних методиста (для адміністратора громади)
app.put("/api/community-admin/methodists/:methodistId", async (req, res) => {
  const { methodistId } = req.params
  const { firstName, lastName, phone, methodistArea, consultationAreas } = req.body

  console.log("Запит оновлення методиста:", methodistId)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const result = await pool.query(
      `UPDATE profiles 
       SET first_name = $1, last_name = $2, phone = $3, methodist_area = $4, consultation_areas = $5
       WHERE user_id = $6
       RETURNING *`,
      [firstName, lastName, phone, methodistArea, consultationAreas, methodistId],
    )

    if (result.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({
        error: "Методиста не знайдено",
      })
    }

    await client.query("COMMIT")
    console.log("✓ Методист успішно оновлений")

    res.json({
      methodist: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка оновлення методиста:", error.message)
    res.status(500).json({
      error: "Помилка оновлення методиста",
    })
  } finally {
    client.release()
  }
})

// Оновлення даних вчителя (для адміністратора громади)
app.put("/api/community-admin/teachers/:teacherId", async (req, res) => {
  const { teacherId } = req.params
  const { firstName, lastName, phone, school } = req.body

  console.log("Запит оновлення вчителя:", teacherId)

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const result = await pool.query(
      `UPDATE profiles 
       SET first_name = $1, last_name = $2, phone = $3, school = $4
       WHERE user_id = $5
       RETURNING *`,
      [firstName, lastName, phone, school, teacherId],
    )

    if (result.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({
        error: "Вчителя не знайдено",
      })
    }

    await client.query("COMMIT")
    console.log("✓ Вчитель успішно оновлений")

    res.json({
      teacher: result.rows[0],
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Помилка оновлення вчителя:", error.message)
    res.status(500).json({
      error: "Помилка оновлення вчителя",
    })
  } finally {
    client.release()
  }
})

app.post("/api/community-admin/methodists", async (req, res) => {
  const { email, password, firstName, lastName, phone, methodistArea, consultationAreas, city } = req.body

  console.log("Створення методиста адміністратором громади")

  if (!email || !password || !firstName || !lastName || !city) {
    return res.status(400).json({
      error: "Email, пароль, ім'я, прізвище та місто обов'язкові",
    })
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

    const hashedPassword = await bcrypt.hash(password, 10)

    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "методист"],
    )

    const user = userResult.rows[0]

    await client.query(
      `INSERT INTO profiles (user_id, first_name, last_name, phone, city, methodist_area, consultation_areas) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, firstName, lastName, phone || null, city, methodistArea || null, consultationAreas || null],
    )

    await client.query("COMMIT")
    console.log("✓ Методист створено:", user.id)

    res.json({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка створення методиста:", error.message)
    res.status(500).json({
      error: "Помилка створення методиста",
    })
  } finally {
    client.release()
  }
})

app.post("/api/community-admin/teachers", async (req, res) => {
  const { email, password, firstName, lastName, phone, school, city } = req.body

  console.log("Створення вчителя адміністратором громади")

  if (!email || !password || !firstName || !lastName || !city) {
    return res.status(400).json({
      error: "Email, пароль, ім'я, прізвище та місто обов'язкові",
    })
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

    const hashedPassword = await bcrypt.hash(password, 10)

    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "вчитель"],
    )

    const user = userResult.rows[0]

    await client.query(
      `INSERT INTO profiles (user_id, first_name, last_name, phone, city, school) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, firstName, lastName, phone || null, city, school || null],
    )

    await client.query("COMMIT")
    console.log("✓ Вчитель створено:", user.id)

    res.json({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка створення вчителя:", error.message)
    res.status(500).json({
      error: "Помилка створення вчителя",
    })
  } finally {
    client.release()
  }
})

app.post("/api/make-community-admin", async (req, res) => {
  const { userId, city } = req.body

  if (!userId || !city) {
    return res.status(400).json({
      error: "userId та city обов'язкові",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевіряємо, чи існує користувач
    const userCheck = await client.query("SELECT id, email, role FROM users WHERE id = $1", [userId])

    if (userCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({
        error: "Користувача не знайдено",
      })
    }

    const user = userCheck.rows[0]

    // Оновлюємо роль користувача на адміністратор_громади
    await client.query("UPDATE users SET role = $1::user_role WHERE id = $2", ["адміністратор_громади", userId])

    // Додаємо запис в таблицю community_admins (якщо його немає)
    await client.query(
      `INSERT INTO community_admins (user_id, city) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO UPDATE SET city = $2`,
      [userId, city],
    )

    // Оновлюємо місто в профілі (якщо профіль існує)
    await client.query(
      `INSERT INTO profiles (user_id, city) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO UPDATE SET city = $2`,
      [userId, city],
    )

    await client.query("COMMIT")
    console.log(`✓ Користувач ${userId} (${user.email}) став адміністратором громади для міста ${city}`)

    res.json({
      success: true,
      userId: userId,
      email: user.email,
      role: "адміністратор_громади",
      city: city,
      message: `Користувач успішно став адміністратором громади для міста ${city}`,
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка перетворення користувача в адміністратора громади:", error.message)
    res.status(500).json({
      error: "Помилка створення адміністратора громади",
      details: error.message,
    })
  } finally {
    client.release()
  }
})

// Community Admin endpoints

// Методсит по місту
app.get("/api/methodists/city/:city", async (req, res) => {
  const { city } = req.params

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.email, p.first_name, p.last_name, p.phone, 
             p.methodist_area, p.consultation_areas, u.created_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'методист' AND p.city = $1
      ORDER BY p.last_name ASC
    `,
      [city],
    )

    res.json({
      methodists: result.rows,
    })
  } catch (error) {
    console.error("Помилка отримання методистів:", error.message)
    res.status(500).json({
      error: "Помилка отримання методистів",
    })
  }
})

// Вчителі по місту
app.get("/api/teachers/city/:city", async (req, res) => {
  const { city } = req.params

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.email, p.first_name, p.last_name, p.phone, 
             p.school, p.subjects_ids, u.created_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'вчитель' AND p.city = $1
      ORDER BY p.last_name ASC
    `,
      [city],
    )

    res.json({
      teachers: result.rows,
    })
  } catch (error) {
    console.error("Помилка отримання вчителів:", error.message)
    res.status(500).json({
      error: "Помилка отримання вчителів",
    })
  }
})

// Оновлення методиста
app.put("/api/methodists/:methodistId", async (req, res) => {
  const { methodistId } = req.params
  const { firstName, lastName, phone, methodistArea, consultationAreas } = req.body

  try {
    const result = await pool.query(
      `
      UPDATE profiles 
      SET first_name = $1, last_name = $2, phone = $3, methodist_area = $4, consultation_areas = $5
      WHERE user_id = $6
      RETURNING *
    `,
      [firstName, lastName, phone, methodistArea, consultationAreas, methodistId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Методист не знайдено",
      })
    }

    res.json({
      message: "Методист успішно оновлено",
      profile: result.rows[0],
    })
  } catch (error) {
    console.error("Помилка оновлення методиста:", error.message)
    res.status(500).json({
      error: "Помилка оновлення методиста",
    })
  }
})

// Оновлення вчителя
app.put("/api/teachers/:teacherId", async (req, res) => {
  const { teacherId } = req.params
  const { firstName, lastName, phone, school } = req.body

  try {
    const result = await pool.query(
      `
      UPDATE profiles 
      SET first_name = $1, last_name = $2, phone = $3, school = $4
      WHERE user_id = $5
      RETURNING *
    `,
      [firstName, lastName, phone, school, teacherId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Вчитель не знайдено",
      })
    }

    res.json({
      message: "Вчитель успішно оновлено",
      profile: result.rows[0],
    })
  } catch (error) {
    console.error("Помилка оновлення вчителя:", error.message)
    res.status(500).json({
      error: "Помилка оновлення вчителя",
    })
  }
})

app.post("/api/create-super-methodist", async (req, res) => {
  const { email, password, fullName, city, phone, school, consultationAreas } = req.body

  if (!email || !password) {
    return res.status(400).json({
      error: "Email та пароль обов'язкові",
    })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Перевіряємо, чи вже існує користувач з таким email
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK")
      return res.status(400).json({
        error: "Користувач з таким email вже існує",
      })
    }

    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Створюємо користувача з роллю методист
    const userResult = await client.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3::user_role) RETURNING id, email, role",
      [email, hashedPassword, "методист"],
    )

    const user = userResult.rows[0]

    // Створюємо профіль методиста
    await client.query(
      `INSERT INTO profiles (user_id, full_name, city, phone, school, consultation_areas) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        fullName || "Головний методист",
        city || "Житомир",
        phone || null,
        school || null,
        consultationAreas || null,
      ],
    )

    await client.query("COMMIT")
    console.log(`✓ Методист створений: ${email} (ID: ${user.id})`)

    res.json({
      success: true,
      userId: user.id,
      email: user.email,
      role: user.role,
      message: "Методист успішно створений",
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Помилка створення методиста:", error.message)
    res.status(500).json({
      error: "Помилка створення методиста",
      details: error.message,
    })
  } finally {
    client.release()
  }
})
