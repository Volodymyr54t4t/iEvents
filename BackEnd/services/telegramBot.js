const TelegramBot = require("node-telegram-bot-api")
const pool = require("../db/pool")

let bot = null

// Initialize Telegram bot
const initTelegramBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
        console.warn("⚠️  TELEGRAM_BOT_TOKEN not set. Telegram notifications will be disabled.")
        return null
    }

    try {
        bot = new TelegramBot(token, {
            polling: true
        })

        // Handle /start command
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id
            const telegramUsername = msg.from.username || msg.from.first_name

            bot.sendMessage(
                chatId,
                `Вітаємо у системі управління конкурсами!\n\n` +
                `Ваш Telegram ID: ${chatId}\n` +
                `Додайте цей ID до свого профілю на сайті, щоб отримувати сповіщення.`,
            )
        })

        // Handle /link command to link account
        bot.onText(/\/link (.+)/, async (msg, match) => {
            const chatId = msg.chat.id
            const email = match[1]

            try {
                const client = await pool.connect()

                // Find user by email
                const result = await client.query(`SELECT id, name, email FROM users WHERE email = $1`, [email])

                if (result.rows.length === 0) {
                    bot.sendMessage(chatId, `Користувача з email ${email} не знайдено.`)
                    client.release()
                    return
                }

                const user = result.rows[0]

                // Update user's telegram_id
                await client.query(`UPDATE users SET telegram_id = $1 WHERE id = $2`, [chatId.toString(), user.id])

                bot.sendMessage(
                    chatId,
                    `Успішно! Ваш акаунт ${user.name} (${user.email}) тепер зв'язано з Telegram.\n\n` +
                    `Ви будете отримувати сповіщення про конкурси та результати.`,
                )

                client.release()
            } catch (error) {
                console.error("Link account error:", error)
                bot.sendMessage(chatId, "Помилка при зв'язуванні акаунту. Спробуйте пізніше.")
            }
        })

        // Handle /unlink command
        bot.onText(/\/unlink/, async (msg) => {
            const chatId = msg.chat.id

            try {
                const client = await pool.connect()

                const result = await client.query(`UPDATE users SET telegram_id = NULL WHERE telegram_id = $1 RETURNING *`, [
                    chatId.toString(),
                ])

                if (result.rows.length === 0) {
                    bot.sendMessage(chatId, "Ваш акаунт не був зв'язаний з Telegram.")
                } else {
                    bot.sendMessage(chatId, "Ваш акаунт успішно відв'язано від Telegram.")
                }

                client.release()
            } catch (error) {
                console.error("Unlink account error:", error)
                bot.sendMessage(chatId, "Помилка при відв'язуванні акаунту.")
            }
        })

        // Handle /help command
        bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id

            bot.sendMessage(
                chatId,
                `Доступні команди:\n\n` +
                `/start - Початок роботи з ботом\n` +
                `/link <email> - Зв'язати акаунт з Telegram\n` +
                `/unlink - Відв'язати акаунт від Telegram\n` +
                `/help - Показати це повідомлення`,
            )
        })

        console.log("✅ Telegram bot initialized successfully")
        return bot
    } catch (error) {
        console.error("❌ Failed to initialize Telegram bot:", error)
        return null
    }
}

// Send notification to user via Telegram
const sendTelegramNotification = async (userId, message) => {
    if (!bot) {
        console.log("Telegram bot not initialized. Skipping notification.")
        return false
    }

    try {
        const client = await pool.connect()

        // Get user's telegram_id
        const result = await client.query(`SELECT telegram_id FROM users WHERE id = $1`, [userId])

        client.release()

        if (result.rows.length === 0 || !result.rows[0].telegram_id) {
            console.log(`User ${userId} does not have Telegram linked`)
            return false
        }

        const telegramId = result.rows[0].telegram_id

        // Send message
        await bot.sendMessage(telegramId, message)
        console.log(`✅ Telegram notification sent to user ${userId}`)
        return true
    } catch (error) {
        console.error("Error sending Telegram notification:", error)
        return false
    }
}

// Send notification to multiple users
const sendBulkTelegramNotifications = async (userIds, message) => {
    if (!bot) {
        console.log("Telegram bot not initialized. Skipping notifications.")
        return
    }

    const results = await Promise.allSettled(userIds.map((userId) => sendTelegramNotification(userId, message)))

    const successful = results.filter((r) => r.status === "fulfilled" && r.value === true).length

    console.log(`Sent ${successful}/${userIds.length} Telegram notifications`)
}

// Send notification about new contest
const notifyNewContest = async (contestTitle) => {
    if (!bot) return

    try {
        const client = await pool.connect()

        // Get all teachers with Telegram linked
        const result = await client.query(
            `SELECT id, telegram_id FROM users WHERE role = 'teacher' AND telegram_id IS NOT NULL`,
        )

        client.release()

        const message = `🎯 Новий конкурс створено!\n\n📝 ${contestTitle}\n\nПерегляньте деталі на сайті та зареєструйте своїх учнів.`

        for (const user of result.rows) {
            try {
                await bot.sendMessage(user.telegram_id, message)
            } catch (error) {
                console.error(`Failed to send to user ${user.id}:`, error.message)
            }
        }
    } catch (error) {
        console.error("Error notifying about new contest:", error)
    }
}

// Send notification about participation approval
const notifyParticipationApproval = async (studentId, contestTitle, approved) => {
    if (!bot) return

    const message = approved ?
        `✅ Вашу участь підтверджено!\n\n🎯 Конкурс: ${contestTitle}\n\nУдачі!` :
        `❌ Вашу заявку відхилено\n\n🎯 Конкурс: ${contestTitle}\n\nЗв'яжіться з вашим вчителем для деталей.`

    await sendTelegramNotification(studentId, message)
}

// Send notification about new result
const notifyNewResult = async (studentId, contestTitle, score, rank) => {
    if (!bot) return

    let message = `📊 Ваш результат оновлено!\n\n🎯 Конкурс: ${contestTitle}\n💯 Бал: ${score}`

    if (rank) {
        message += `\n🏆 Місце: ${rank}`
    }

    await sendTelegramNotification(studentId, message)
}

module.exports = {
    initTelegramBot,
    sendTelegramNotification,
    sendBulkTelegramNotifications,
    notifyNewContest,
    notifyParticipationApproval,
    notifyNewResult,
}