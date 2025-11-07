class ToastNotification {
    constructor() {
        this.container = null
        this.currentToast = null
        this.queue = []
        this.init()
    }

    init() {
        this.container = document.createElement("div")
        this.container.id = "toast-notification-container"
        this.container.style.cssText = `
      position: fixed;
      top: 30px;
      right: 30px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `
        document.body.appendChild(this.container)

        this.addStyles()
        this.overrideConsoleMethods()
    }

    addStyles() {
        const style = document.createElement("style")
        style.textContent = `
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0) translateY(0);
        }
      }

      @keyframes toastSlideOut {
        from {
          opacity: 1;
          transform: translateX(0) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%) translateY(-20px);
        }
      }

      @keyframes progressBar {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      .toast {
        position: relative;
        min-width: 320px;
        max-width: 450px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.8);
      }

      .toast.closing {
        animation: toastSlideOut 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      .toast-wrapper {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
      }

      .toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        margin-top: 2px;
      }

      .toast-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .toast-title {
        font-weight: 600;
        font-size: 14px;
        line-height: 1.4;
        margin: 0;
      }

      .toast-message {
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
        opacity: 0.7;
        max-height: 60px;
        overflow-y: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        word-break: break-word;
      }

      .toast-message::-webkit-scrollbar {
        width: 4px;
      }

      .toast-message::-webkit-scrollbar-track {
        background: transparent;
      }

      .toast-message::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        animation: progressBar 5s linear forwards;
      }

      .toast.error {
        border-left: 4px solid #ef4444;
      }

      .toast.error .toast-icon {
        color: #ef4444;
      }

      .toast.error .toast-title {
        color: #dc2626;
      }

      .toast.error .toast-message {
        color: #b91c1c;
      }

      .toast.warn {
        border-left: 4px solid #f59e0b;
      }

      .toast.warn .toast-icon {
        color: #f59e0b;
      }

      .toast.warn .toast-title {
        color: #d97706;
      }

      .toast.warn .toast-message {
        color: #b45309;
      }

      @media (max-width: 600px) {
        #toast-notification-container {
          top: 15px !important;
          right: 15px !important;
          left: 15px !important;
        }

        .toast {
          min-width: auto;
          max-width: none;
        }
      }
    `
        document.head.appendChild(style)
    }

    overrideConsoleMethods() {
        const originalError = console.error
        console.error = (...args) => {
            originalError(...args)
            const message = this.formatMessage(args)
            if (this.isCriticalError(message)) {
                this.showToast(message, "error", "Помилка")
            }
        }

        const originalWarn = console.warn
        console.warn = (...args) => {
            originalWarn(...args)
        }
    }

    isCriticalError(message) {
        const lowerMsg = message.toLowerCase()

        // Прибираємо localhost, звичайні логи, дебаг інформацію
        if (
            lowerMsg.includes("localhost") ||
            lowerMsg.includes("3000") ||
            lowerMsg.includes("fetch") ||
            lowerMsg.includes("undefined") ||
            lowerMsg.includes("v0]")
        ) {
            return false
        }

        // Показуємо ТІЛЬКИ важливі помилки
        const criticalPatterns = [
            "доступ", // Помилки доступу
            "forbidden", // 403
            "unauthorized", // 401
            "not found", // 404
            "error", // Загальні помилки
            "failed", // Невдача
            "permission", // Дозволи
            "denied", // Заборонено
            "server error", // Помилки сервера
            "400", // Bad request
            "403", // Forbidden
            "404", // Not found
            "500", // Server error
            "502", // Bad gateway
            "503", // Service unavailable
        ]

        return criticalPatterns.some((pattern) => lowerMsg.includes(pattern))
    }

    formatMessage(args) {
        return args
            .map((arg) => {
                if (typeof arg === "object") {
                    try {
                        return JSON.stringify(arg, null, 2)
                    } catch (e) {
                        return String(arg)
                    }
                }
                return String(arg)
            })
            .join(" ")
    }

    showToast(message, type = "error", title = "Error") {
        this.queue.push({
            message,
            type,
            title
        })
        if (!this.currentToast) {
            this.processQueue()
        }
    }

    processQueue() {
        if (this.queue.length === 0) {
            this.currentToast = null
            return
        }

        const {
            message,
            type,
            title
        } = this.queue.shift()

        const toast = document.createElement("div")
        toast.className = `toast ${type}`

        const icons = {
            error: "✕",
            warn: "⚠",
        }

        const icon = icons[type] || "!"

        toast.innerHTML = `
      <div class="toast-wrapper">
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
          <p class="toast-title">${this.escapeHtml(title)}</p>
          <p class="toast-message">${this.escapeHtml(message)}</p>
        </div>
      </div>
      <div class="toast-progress"></div>
    `

        this.container.appendChild(toast)
        this.currentToast = toast

        setTimeout(() => {
            this.closeToast(toast)
        }, 5000)
    }

    closeToast(toast) {
        if (!toast.parentElement) return

        toast.classList.add("closing")
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast)
            }
            this.processQueue()
        }, 400)
    }

    escapeHtml(text) {
        const div = document.createElement("div")
        div.textContent = text
        return div.innerHTML
    }
}

// Initialize on DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        new ToastNotification()
    })
} else {
    new ToastNotification()
}