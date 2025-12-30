document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("questionForm")
    const submitBtn = document.getElementById("submitBtn")
    const messageTextarea = document.getElementById("questionMessage")
    const charCount = document.getElementById("charCount")
    const formMessage = document.getElementById("formMessage")

    // Character counter
    messageTextarea.addEventListener("input", function () {
        const currentLength = this.value.length
        const maxLength = 1000

        charCount.textContent = currentLength

        if (currentLength > maxLength) {
            this.value = this.value.substring(0, maxLength)
            charCount.textContent = maxLength
        }
    })

    // Form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity()
            return
        }

        // Get form data
        const formData = {
            name: document.getElementById("userName").value.trim(),
            email: document.getElementById("userEmail").value.trim(),
            subject: document.getElementById("questionSubject").value,
            message: document.getElementById("questionMessage").value.trim(),
        }

        // Validate data
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            showMessage("Будь ласка, заповніть всі обов'язкові поля", "error")
            return
        }

        // Disable submit button
        submitBtn.disabled = true
        submitBtn.innerHTML = `
            <svg class="btn-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <span>Надсилання...</span>
        `

        try {
            // Send question via Telegram bot
            const result = await window.sendQuestionToTelegram(formData)

            if (result.success) {
                showMessage("✅ Ваше питання успішно надіслано! Ми зв'яжемося з вами найближчим часом.", "success")
                form.reset()
                charCount.textContent = "0"
            } else {
                throw new Error(result.error || "Помилка надсилання")
            }
        } catch (error) {
            console.error("Error sending question:", error)
            showMessage("❌ Помилка надсилання питання. Спробуйте ще раз або зв'яжіться через Email чи Telegram.", "error")
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false
            submitBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
                <span>Надіслати питання</span>
            `
        }
    })

    function showMessage(text, type) {
        formMessage.textContent = text
        formMessage.className = `form-message ${type}`
        formMessage.style.display = "flex"

        // Auto hide after 5 seconds
        setTimeout(() => {
            formMessage.style.display = "none"
        }, 5000)
    }

    // Add spinner animation
    const style = document.createElement("style")
    style.textContent = `
        .spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `
    document.head.appendChild(style)
})