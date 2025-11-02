const TelegramBot = require("node-telegram-bot-api")
const { Pool } = require("pg")

// Telegram Bot Token
const TELEGRAM_TOKEN = "8543297029:AAHVaWK-4eAkSTQ8WSzKG0lyKPdfsnBo3dU"

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

let bot = null
let isInitialized = false

// Store user states for conversation flow
const userStates = new Map()

function splitMessage(text, maxLength = 4000) {
  const messages = []
  let currentMessage = ""

  const lines = text.split("\n")

  for (const line of lines) {
    if ((currentMessage + line + "\n").length > maxLength) {
      if (currentMessage) {
        messages.push(currentMessage.trim())
        currentMessage = ""
      }

      // If single line is too long, split it
      if (line.length > maxLength) {
        for (let i = 0; i < line.length; i += maxLength) {
          messages.push(line.substring(i, i + maxLength))
        }
      } else {
        currentMessage = line + "\n"
      }
    } else {
      currentMessage += line + "\n"
    }
  }

  if (currentMessage.trim()) {
    messages.push(currentMessage.trim())
  }

  return messages
}

async function sendLongMessage(chatId, text) {
  const messages = splitMessage(text)

  for (let i = 0; i < messages.length; i++) {
    await bot.sendMessage(chatId, messages[i])
    // Small delay between messages to avoid rate limiting
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

// Initialize bot
async function initBot() {
  if (isInitialized) {
    console.log("⚠️ Telegram бот вже ініціалізовано")
    return bot
  }

  console.log("🤖 Ініціалізація Telegram бота...")

  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })
  isInitialized = true

  bot.on("polling_error", (error) => {
    console.error("⚠️ Telegram polling error:", error.message)
  })

  // Check if telegram_chat_id column exists in users table
  const client = await pool.connect()
  try {
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'telegram_chat_id'
      ) as exists
    `)

    if (!columnCheck.rows[0].exists) {
      console.log("📊 Додавання колонки telegram_chat_id до таблиці users...")
      await client.query(`
        ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT UNIQUE
      `)
      console.log("✅ Колонка telegram_chat_id додана")
    }
  } finally {
    client.release()
  }

  // Set bot commands
  await bot.setMyCommands([
    { command: "/start", description: "Почати роботу з ботом" },
    { command: "/login", description: "Увійти за допомогою email" },
    { command: "/mycompetitions", description: "Мої конкурси" },
    { command: "/myresults", description: "Мої результати" },
    { command: "/profile", description: "Мій профіль" },
    { command: "/logout", description: "Вийти з профілю" },
    { command: "/help", description: "Допомога" },
  ])

  // Command: /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    const firstName = msg.from.first_name || "користувач"

    const welcomeMessage = `Привіт, ${firstName}! 👋

Я бот системи iEvents - твій помічник для відстеження конкурсів та результатів.

🔐 Щоб почати, введи команду /login та вкажи свій email, який ти використовуєш в системі iEvents.

📋 Доступні команди:
/login - Увійти за допомогою email
/mycompetitions - Переглянути мої конкурси
/myresults - Переглянути мої результати
/profile - Переглянути профіль
/logout - Вийти з профілю
/help - Отримати допомогу`

    await bot.sendMessage(chatId, welcomeMessage)
  })

  // Command: /login
  bot.onText(/\/login/, async (msg) => {
    const chatId = msg.chat.id

    userStates.set(chatId, { state: "waiting_for_email" })

    await bot.sendMessage(chatId, "📧 Введи свій email, який ти використовуєш в системі iEvents:")
  })

  // Command: /mycompetitions
  bot.onText(/\/mycompetitions/, async (msg) => {
    const chatId = msg.chat.id

    try {
      const userResult = await pool.query("SELECT id, email FROM users WHERE telegram_chat_id = $1", [chatId])

      if (userResult.rows.length === 0) {
        await bot.sendMessage(chatId, "❌ Ти не увійшов в систему. Використай команду /login")
        return
      }

      const user = userResult.rows[0]

      const competitionsResult = await pool.query(
        `
      SELECT c.id, c.title, c.description, c.start_date, c.end_date, c.manual_status,
             cp.added_at
      FROM competitions c
      JOIN competition_participants cp ON c.id = cp.competition_id
      WHERE cp.user_id = $1
      ORDER BY c.start_date DESC
      LIMIT 20
    `,
        [user.id],
      )

      if (competitionsResult.rows.length === 0) {
        await bot.sendMessage(chatId, "📋 Ти поки не берешь участі в жодному конкурсі.")
        return
      }

      let message = `📋 Твої конкурси (показано ${competitionsResult.rows.length}):\n\n`

      for (const comp of competitionsResult.rows) {
        const startDate = new Date(comp.start_date).toLocaleDateString("uk-UA")
        const endDate = new Date(comp.end_date).toLocaleDateString("uk-UA")
        const status = getCompetitionStatus(comp)

        message += `🏆 ${comp.title}\n`
        message += `📅 ${startDate} - ${endDate}\n`
        message += `📊 Статус: ${status}\n`
        if (comp.description && comp.description.length > 0) {
          message += `📝 ${comp.description.substring(0, 60)}${comp.description.length > 60 ? "..." : ""}\n`
        }
        message += `\n`
      }

      await sendLongMessage(chatId, message)
    } catch (error) {
      console.error("Помилка при отриманні конкурсів:", error)
      await bot.sendMessage(chatId, "❌ Виникла помилка при отриманні списку конкурсів.")
    }
  })

  // Command: /myresults
  bot.onText(/\/myresults/, async (msg) => {
    const chatId = msg.chat.id

    try {
      const userResult = await pool.query("SELECT id, email FROM users WHERE telegram_chat_id = $1", [chatId])

      if (userResult.rows.length === 0) {
        await bot.sendMessage(chatId, "❌ Ти не увійшов в систему. Використай команду /login")
        return
      }

      const user = userResult.rows[0]

      const resultsResult = await pool.query(
        `
      SELECT cr.id, cr.place, cr.score, cr.achievement, cr.notes, cr.added_at,
             c.title as competition_title, c.start_date, c.end_date
      FROM competition_results cr
      JOIN competitions c ON cr.competition_id = c.id
      WHERE cr.user_id = $1
      ORDER BY cr.added_at DESC
      LIMIT 15
    `,
        [user.id],
      )

      if (resultsResult.rows.length === 0) {
        await bot.sendMessage(chatId, "📊 У тебе поки немає результатів.")
        return
      }

      let message = `📊 Твої результати (останні ${resultsResult.rows.length}):\n\n`

      for (let i = 0; i < resultsResult.rows.length; i++) {
        const result = resultsResult.rows[i]
        message += `${i + 1}. 🏆 ${result.competition_title}\n`

        if (result.place) {
          const medal = result.place === 1 ? "🥇" : result.place === 2 ? "🥈" : result.place === 3 ? "🥉" : "🏅"
          message += `   ${medal} Місце: ${result.place}\n`
        }
        if (result.score) {
          message += `   📈 Бали: ${result.score}\n`
        }
        message += `   🎖️ ${result.achievement}\n`
        if (result.notes && result.notes.length > 0) {
          message += `   📝 ${result.notes.substring(0, 50)}${result.notes.length > 50 ? "..." : ""}\n`
        }
        message += `\n`
      }

      await sendLongMessage(chatId, message)
    } catch (error) {
      console.error("Помилка при отриманні результатів:", error)
      await bot.sendMessage(chatId, "❌ Виникла помилка при отриманні результатів.")
    }
  })

  // Command: /profile
  bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id

    try {
      const userResult = await pool.query(
        `
      SELECT u.id, u.email, u.role, u.created_at,
             p.first_name, p.last_name, p.middle_name, p.telegram, p.phone,
             p.birth_date, p.city, p.school, p.grade
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.telegram_chat_id = $1
    `,
        [chatId],
      )

      if (userResult.rows.length === 0) {
        await bot.sendMessage(chatId, "❌ Ти не увійшов в систему. Використай команду /login")
        return
      }

      const user = userResult.rows[0]

      let message = `👤 Твій профіль:\n\n`
      message += `📧 Email: ${user.email}\n`
      message += `👔 Роль: ${user.role}\n`

      if (user.first_name || user.last_name) {
        message += `📛 Ім'я: ${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""}\n`
      }

      if (user.school) {
        message += `🏫 Школа: ${user.school}\n`
      }

      if (user.grade) {
        message += `📚 Клас: ${user.grade}\n`
      }

      if (user.city) {
        message += `🏙️ Місто: ${user.city}\n`
      }

      if (user.phone) {
        message += `📱 Телефон: ${user.phone}\n`
      }

      if (user.birth_date) {
        const birthDate = new Date(user.birth_date).toLocaleDateString("uk-UA")
        message += `🎂 Дата народження: ${birthDate}\n`
      }

      const statsResult = await pool.query(
        `
      SELECT 
        (SELECT COUNT(*) FROM competition_participants WHERE user_id = $1) as competitions_count,
        (SELECT COUNT(*) FROM competition_results WHERE user_id = $1) as results_count
    `,
        [user.id],
      )

      const stats = statsResult.rows[0]
      message += `\n📊 Статистика:\n`
      message += `🏆 Конкурсів: ${stats.competitions_count}\n`
      message += `🎖️ Результатів: ${stats.results_count}\n`

      await bot.sendMessage(chatId, message)
    } catch (error) {
      console.error("Помилка при отриманні профілю:", error)
      await bot.sendMessage(chatId, "❌ Виникла помилка при отриманні профілю.")
    }
  })

  // Command: /logout
  bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id

    try {
      const userResult = await pool.query("SELECT id, email FROM users WHERE telegram_chat_id = $1", [chatId])

      if (userResult.rows.length === 0) {
        await bot.sendMessage(chatId, "❌ Ти не увійшов в систему.")
        return
      }

      const user = userResult.rows[0]

      await pool.query("UPDATE users SET telegram_chat_id = NULL WHERE id = $1", [user.id])

      await bot.sendMessage(
        chatId,
        `✅ Ти успішно вийшов з профілю ${user.email}\n\nЩоб увійти знову, використай команду /login`,
      )
    } catch (error) {
      console.error("Помилка при виході:", error)
      await bot.sendMessage(chatId, "❌ Виникла помилка при виході з профілю.")
    }
  })

  // Command: /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id

    const helpMessage = `📚 Допомога по боту iEvents:

🔐 Авторизація:
/login - Увійти за допомогою email з системи
/logout - Вийти з профілю

📋 Конкурси:
/mycompetitions - Переглянути конкурси, в яких ти берешь участь

📊 Результати:
/myresults - Переглянути свої результати (останні 15)

👤 Профіль:
/profile - Переглянути інформацію про свій профіль

🔔 Сповіщення:
Бот автоматично надсилає сповіщення про:
• Нові конкурси
• Додавання тебе до конкурсу
• Нові результати
• Дедлайни конкурсів

❓ Питання? Звернись до адміністратора системи.`

    await bot.sendMessage(chatId, helpMessage)
  })

  // Handle text messages (for email input)
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    if (text && text.startsWith("/")) {
      return
    }

    const userState = userStates.get(chatId)

    if (userState && userState.state === "waiting_for_email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(text)) {
        await bot.sendMessage(chatId, "❌ Невірний формат email. Спробуй ще раз:")
        return
      }

      try {
        const result = await pool.query("SELECT id, email, role, telegram_chat_id FROM users WHERE email = $1", [
          text.toLowerCase(),
        ])

        if (result.rows.length === 0) {
          await bot.sendMessage(
            chatId,
            "❌ Користувача з таким email не знайдено в системі. Перевір правильність email або зареєструйся на сайті.",
          )
          userStates.delete(chatId)
          return
        }

        const user = result.rows[0]

        if (user.telegram_chat_id === chatId) {
          await bot.sendMessage(chatId, "✅ Ти вже увійшов в систему з цим профілем!")
          userStates.delete(chatId)
          return
        }

        const existingLinkResult = await pool.query("SELECT id, email FROM users WHERE telegram_chat_id = $1", [chatId])

        if (existingLinkResult.rows.length > 0) {
          const oldUser = existingLinkResult.rows[0]
          await pool.query("UPDATE users SET telegram_chat_id = NULL WHERE id = $1", [oldUser.id])
          console.log(`🔄 Відв'язано Telegram від користувача ${oldUser.email}`)
        }

        if (user.telegram_chat_id && user.telegram_chat_id !== chatId) {
          await pool.query("UPDATE users SET telegram_chat_id = NULL WHERE id = $1", [user.id])
          console.log(`🔄 Відв'язано старий Telegram від користувача ${user.email}`)
        }

        await pool.query("UPDATE users SET telegram_chat_id = $1 WHERE id = $2", [chatId, user.id])

        userStates.delete(chatId)

        await bot.sendMessage(
          chatId,
          `✅ Успішно увійшов в систему!\n\n👤 Email: ${user.email}\n👔 Роль: ${user.role}\n\n🔔 Тепер ти будеш отримувати сповіщення про конкурси та результати.\n\nВикористовуй команди:\n/mycompetitions - Мої конкурси\n/myresults - Мої результати\n/profile - Мій профіль\n/logout - Вийти з профілю`,
        )
      } catch (error) {
        console.error("Помилка при авторизації:", error)
        await bot.sendMessage(chatId, "❌ Виникла помилка при авторизації. Спробуй пізніше.")
        userStates.delete(chatId)
      }
    }
  })

  console.log("✅ Telegram бот успішно запущено!")
  return bot
}

// Helper function to get competition status
function getCompetitionStatus(competition) {
  if (competition.manual_status) {
    return competition.manual_status
  }

  const now = new Date()
  const startDate = new Date(competition.start_date)
  const endDate = new Date(competition.end_date)

  if (now < startDate) {
    return "Очікується"
  } else if (now >= startDate && now <= endDate) {
    return "Активний"
  } else {
    return "Завершений"
  }
}

// Notification functions

async function notifyUserAddedToCompetition(userId, competitionId) {
  if (!bot) return

  try {
    const result = await pool.query(
      `
      SELECT u.telegram_chat_id, u.email, c.title, c.description, c.start_date, c.end_date
      FROM users u
      JOIN competitions c ON c.id = $2
      WHERE u.id = $1 AND u.telegram_chat_id IS NOT NULL
    `,
      [userId, competitionId],
    )

    if (result.rows.length === 0) {
      return
    }

    const data = result.rows[0]
    const startDate = new Date(data.start_date).toLocaleDateString("uk-UA")
    const endDate = new Date(data.end_date).toLocaleDateString("uk-UA")

    const message = `🎉 Тебе додано до нового конкурсу!

🏆 ${data.title}
📅 ${startDate} - ${endDate}
${data.description ? `📝 ${data.description.substring(0, 200)}${data.description.length > 200 ? "..." : ""}` : ""}

Переглянути всі свої конкурси: /mycompetitions`

    await bot.sendMessage(data.telegram_chat_id, message)
    console.log(`✅ Сповіщення надіслано користувачу ${data.email}`)
  } catch (error) {
    console.error("Помилка при надсиланні сповіщення:", error)
  }
}

async function notifyUserNewResult(userId, competitionId, resultData) {
  if (!bot) return

  try {
    const result = await pool.query(
      `
      SELECT u.telegram_chat_id, u.email, c.title
      FROM users u
      JOIN competitions c ON c.id = $2
      WHERE u.id = $1 AND u.telegram_chat_id IS NOT NULL
    `,
      [userId, competitionId],
    )

    if (result.rows.length === 0) {
      return
    }

    const data = result.rows[0]

    let message = `🎖️ Додано новий результат!

🏆 Конкурс: ${data.title}
`

    if (resultData.place) {
      message += `🥇 Місце: ${resultData.place}\n`
    }
    if (resultData.score) {
      message += `📈 Бали: ${resultData.score}\n`
    }
    message += `🎖️ Досягнення: ${resultData.achievement}\n`
    if (resultData.notes) {
      message += `📝 Примітки: ${resultData.notes.substring(0, 100)}${resultData.notes.length > 100 ? "..." : ""}\n`
    }

    message += `\nПереглянути всі результати: /myresults`

    await bot.sendMessage(data.telegram_chat_id, message)
    console.log(`✅ Сповіщення про результат надіслано користувачу ${data.email}`)
  } catch (error) {
    console.error("Помилка при надсиланні сповіщення про результат:", error)
  }
}

async function notifyNewCompetition(competitionId) {
  if (!bot) return

  try {
    const competitionResult = await pool.query(
      "SELECT title, description, start_date, end_date FROM competitions WHERE id = $1",
      [competitionId],
    )

    if (competitionResult.rows.length === 0) {
      return
    }

    const competition = competitionResult.rows[0]
    const startDate = new Date(competition.start_date).toLocaleDateString("uk-UA")
    const endDate = new Date(competition.end_date).toLocaleDateString("uk-UA")

    const usersResult = await pool.query("SELECT telegram_chat_id, email FROM users WHERE telegram_chat_id IS NOT NULL")

    const message = `🆕 Новий конкурс в системі!

🏆 ${competition.title}
📅 ${startDate} - ${endDate}
${competition.description ? `📝 ${competition.description.substring(0, 200)}${competition.description.length > 200 ? "..." : ""}` : ""}

Слідкуй за оновленнями!`

    for (const user of usersResult.rows) {
      try {
        await bot.sendMessage(user.telegram_chat_id, message)
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Помилка при надсиланні сповіщення користувачу ${user.email}:`, error.message)
      }
    }

    console.log(`✅ Сповіщення про новий конкурс надіслано ${usersResult.rows.length} користувачам`)
  } catch (error) {
    console.error("Помилка при надсиланні сповіщень про новий конкурс:", error)
  }
}

async function notifyDeadlineReminder(competitionId) {
  if (!bot) return

  try {
    const result = await pool.query(
      `
      SELECT DISTINCT u.telegram_chat_id, u.email, c.title, c.end_date
      FROM users u
      JOIN competition_participants cp ON u.id = cp.user_id
      JOIN competitions c ON cp.competition_id = c.id
      WHERE c.id = $1 AND u.telegram_chat_id IS NOT NULL
    `,
      [competitionId],
    )

    if (result.rows.length === 0) {
      return
    }

    const competition = result.rows[0]
    const endDate = new Date(competition.end_date).toLocaleDateString("uk-UA")

    const message = `⏰ Нагадування про дедлайн!

🏆 ${competition.title}
📅 Завершення: ${endDate}

Не забудь завершити участь у конкурсі!`

    for (const user of result.rows) {
      try {
        await bot.sendMessage(user.telegram_chat_id, message)
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Помилка при надсиланні нагадування користувачу ${user.email}:`, error.message)
      }
    }

    console.log(`✅ Нагадування про дедлайн надіслано ${result.rows.length} користувачам`)
  } catch (error) {
    console.error("Помилка при надсиланні нагадувань про дедлайн:", error)
  }
}

setInterval(
  async () => {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

      const result = await pool.query(
        `
      SELECT id, title, end_date
      FROM competitions
      WHERE end_date >= $1 AND end_date < $2
    `,
        [tomorrow, dayAfterTomorrow],
      )

      for (const competition of result.rows) {
        await notifyDeadlineReminder(competition.id)
      }
    } catch (error) {
      console.error("Помилка при перевірці дедлайнів:", error)
    }
  },
  60 * 60 * 1000,
)

module.exports = {
  initBot,
  notifyUserAddedToCompetition,
  notifyUserNewResult,
  notifyNewCompetition,
  notifyDeadlineReminder,
}
