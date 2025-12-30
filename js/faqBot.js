// Telegram Bot Configuration
const TELEGRAM_CONFIG = {
    botToken: "7990137671:AAEQOQxN6_yG8t8033eEiq8ZES-abnW480o",
    chatId: "5814860066", 
}

// Function to send message to Telegram
async function sendQuestionToTelegram(questionData) {
    try {
        const {
            name,
            email,
            subject,
            message
        } = questionData

        // Get subject name in Ukrainian
        const subjectNames = {
            technical: "Технічна підтримка",
            functionality: "Функціональність системи",
            registration: "Реєстрація та авторизація",
            competitions: "Конкурси та заходи",
            statistics: "Статистика та аналітика",
            predictions: "Прогнозування результатів",
            profile: "Профіль користувача",
            cooperation: "Співпраця та партнерство",
            other: "Інше",
        }

        const subjectName = subjectNames[subject] || subject

        // Format message for Telegram
        const telegramMessage = `
🔔 <b>Нове питання з сайту iEvents</b>

👤 <b>Ім'я:</b> ${name}
📧 <b>Email:</b> ${email}
📋 <b>Тема:</b> ${subjectName}

💬 <b>Повідомлення:</b>
${message}

⏰ <b>Час:</b> ${new Date().toLocaleString("uk-UA")}
        `.trim()

        // Send message via Telegram Bot API
        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`

        const response = await fetch(telegramApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.chatId,
                text: telegramMessage,
                parse_mode: "HTML",
            }),
        })

        const result = await response.json()

        if (result.ok) {
            console.log("[v0] Question sent successfully to Telegram")
            return {
                success: true,
                data: result
            }
        } else {
            console.error("[v0] Telegram API error:", result)
            return {
                success: false,
                error: result.description || "Unknown error"
            }
        }
    } catch (error) {
        console.error("[v0] Error sending question to Telegram:", error)
        return {
            success: false,
            error: error.message
        }
    }
}

// Make function available globally
window.sendQuestionToTelegram = sendQuestionToTelegram

// Optional: Test function (remove in production)
window.testTelegramBot = async () => {
    const testData = {
        name: "Тестовий користувач",
        email: "test@example.com",
        subject: "technical",
        message: "Це тестове повідомлення для перевірки роботи Telegram бота.",
    }

    const result = await sendQuestionToTelegram(testData)
    console.log("Test result:", result)
    return result
}