// Конфігурація сервера
const API_URL = "http://localhost:3000/api"

// Глобальний стан
let currentUser = {
  id: null,
  name: "",
  role: ""
}
let currentChatId = null
let chats = []
let messages = []
let messagePollingInterval = null

// DOM елементи
const chatList = document.getElementById("chatList")
const messagesContainer = document.getElementById("messagesContainer")
const messageForm = document.getElementById("messageForm")
const messageInput = document.getElementById("messageInput")
const chatTitle = document.getElementById("chatTitle")
const chatMembers = document.getElementById("chatMembers")
const messageInputContainer = document.getElementById("messageInputContainer")
const createChatBtn = document.getElementById("createChatBtn")
const createChatModal = document.getElementById("createChatModal")
const createChatForm = document.getElementById("createChatForm")
const closeModalBtn = document.getElementById("closeModalBtn")
const cancelCreateBtn = document.getElementById("cancelCreateBtn")

// Ініціалізація
async function init() {
  console.log("[v0] Initializing chat system...")

  const userId = localStorage.getItem("userId")
  const userEmail = localStorage.getItem("userEmail")
  const userRole = localStorage.getItem("userRole")

  if (!userId || !userRole) {
    console.error("[v0] User not authenticated")
    alert("Будь ласка, увійдіть в систему")
    window.location.href = "auth.html"
    return
  }

  await loadUserProfile(userId, userEmail, userRole)

  console.log("[v0] Current user:", currentUser)

  if (currentUser.role === "методист") {
    createChatBtn.style.display = "flex"
  } else {
    createChatBtn.style.display = "none"
  }

  await loadChats()
  setupEventListeners()

  startChatPolling()

  console.log("[v0] Chat system initialized")
}

async function loadUserProfile(userId, userEmail, userRole) {
  try {
    const response = await fetch(`${API_URL}/profile/${userId}`)
    if (!response.ok) {
      throw new Error("Failed to load profile")
    }

    const data = await response.json()
    const profile = data.profile

    // Визначаємо ім'я користувача
    let displayName = userEmail
    if (profile.first_name && profile.last_name) {
      displayName = `${profile.first_name} ${profile.last_name}`
    } else if (profile.first_name) {
      displayName = profile.first_name
    }

    // Оновлюємо глобальний стан
    currentUser = {
      id: Number.parseInt(userId),
      name: displayName,
      role: userRole,
    }

    // Визначаємо текст ролі українською
    let roleText = "Користувач"
    switch (userRole) {
      case "учень":
        roleText = "Учень"
        break
      case "вчитель":
        roleText = "Вчитель"
        break
      case "методист":
        roleText = "Методист"
        break
    }

    // Оновлюємо UI
    document.getElementById("userName").textContent = displayName
    document.getElementById("userRole").textContent = roleText

    // Оновлюємо аватар (перша літера імені)
    const firstLetter = displayName.charAt(0).toUpperCase()
    document.getElementById("userAvatar").textContent = firstLetter

    console.log("[v0] User profile loaded:", displayName, roleText)
  } catch (error) {
    console.error("[v0] Error loading user profile:", error)
    // Fallback до базових даних
    currentUser = {
      id: Number.parseInt(userId),
      name: userEmail,
      role: userRole,
    }

    document.getElementById("userName").textContent = userEmail
    document.getElementById("userRole").textContent = userRole
    document.getElementById("userAvatar").textContent = userEmail.charAt(0).toUpperCase()
  }
}

// Завантаження чатів
async function loadChats() {
  try {
    const response = await fetch(`${API_URL}/chats?userId=${currentUser.id}`)
    const allChats = await response.json()

    if (currentUser.role === "учень") {
      chats = allChats.filter((chat) => chat.name === "Учні + методист" || chat.is_member)
    } else if (currentUser.role === "вчитель") {
      chats = allChats.filter((chat) => chat.name === "Вчителі + методист" || chat.is_member)
    } else if (currentUser.role === "методист") {
      chats = allChats // Методист бачить всі чати
    } else {
      chats = []
    }

    console.log("[v0] Loaded chats:", chats.length)
    renderChatList()
  } catch (error) {
    console.error("Error loading chats:", error)
    showError("Помилка завантаження чатів")
  }
}

// Відображення списку чатів
function renderChatList() {
  chatList.innerHTML = ""

  chats.forEach((chat) => {
    const chatItem = document.createElement("div")
    chatItem.className = "chat-item"
    if (chat.id === currentChatId) {
      chatItem.classList.add("active")
    }

    const lastMessage = chat.last_message || "Повідомлень ще немає"
    const lastMessageTime = chat.last_message_time ? formatTime(new Date(chat.last_message_time)) : ""

    const unreadBadge = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : ""

    chatItem.innerHTML = `
            <div class="chat-item-header">
                <div class="chat-item-name">${chat.name}${unreadBadge}</div>
                <div class="chat-item-time">${lastMessageTime}</div>
            </div>
            <div class="chat-item-preview">${lastMessage}</div>
        `

    chatItem.addEventListener("click", () => selectChat(chat.id))
    chatList.appendChild(chatItem)
  })
}

// Вибір чату
async function selectChat(chatId) {
  console.log("[v0] Selecting chat:", chatId)
  currentChatId = chatId

  const chat = chats.find((c) => c.id === chatId)
  if (!chat) return

  await markChatAsRead(chatId)

  // Оновити UI
  chatTitle.textContent = chat.name
  chatMembers.textContent = chat.description || `${chat.member_count || 0} учасників`
  messageInputContainer.style.display = "block"

  // Оновити активний чат в списку
  document.querySelectorAll(".chat-item").forEach((item, index) => {
    if (chats[index].id === chatId) {
      item.classList.add("active")
    } else {
      item.classList.remove("active")
    }
  })

  // Завантажити повідомлення
  await loadMessages(chatId)

  // Запустити polling для нових повідомлень
  startMessagePolling()
}

// Завантаження повідомлень
async function loadMessages(chatId) {
  try {
    const response = await fetch(`${API_URL}/messages/${chatId}`)
    messages = await response.json()
    console.log("[v0] Loaded messages:", messages.length)
    renderMessages()
  } catch (error) {
    console.error("Error loading messages:", error)
    showError("Помилка завантаження повідомлень")
  }
}

// Відображення повідомлень
function renderMessages() {
  messagesContainer.innerHTML = ""

  if (messages.length === 0) {
    messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Почніть спілкування</h2>
                <p>Напишіть перше повідомлення в цьому чаті</p>
            </div>
        `
    return
  }

  messages.forEach((message) => {
    const messageDiv = document.createElement("div")
    messageDiv.className = "message"

    if (message.user_id === currentUser.id) {
      messageDiv.classList.add("own")
    }

    const messageTime = formatTime(new Date(message.created_at))

    messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-author">${message.user_name}</span>
                <span class="message-time">${messageTime}</span>
            </div>
            <div class="message-bubble">
                <div class="message-text">${escapeHtml(message.content)}</div>
            </div>
        `

    messagesContainer.appendChild(messageDiv)
  })

  // Прокрутити до кінця
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

// Відправка повідомлення
async function sendMessage(e) {
  e.preventDefault()

  const content = messageInput.value.trim()
  if (!content || !currentChatId) return

  try {
    const response = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: currentChatId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        content: content,
      }),
    })

    if (response.ok) {
      messageInput.value = ""
      await loadMessages(currentChatId)
      await loadChats() // Оновити список чатів
    }
  } catch (error) {
    console.error("Error sending message:", error)
    showError("Помилка відправки повідомлення")
  }
}

// Створення нового чату
async function createChat(e) {
  e.preventDefault()

  if (currentUser.role !== "методист") {
    showError("Тільки методист може створювати чати")
    return
  }

  const name = document.getElementById("chatName").value.trim()
  const description = document.getElementById("chatDescription").value.trim()

  if (!name) return

  try {
    const response = await fetch(`${API_URL}/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        description: description,
        created_by: currentUser.id,
      }),
    })

    if (response.ok) {
      closeModal()
      document.getElementById("chatName").value = ""
      document.getElementById("chatDescription").value = ""
      await loadChats()
    }
  } catch (error) {
    console.error("Error creating chat:", error)
    showError("Помилка створення чату")
  }
}

// Позначити чату як прочитаного
async function markChatAsRead(chatId) {
  try {
    await fetch(`${API_URL}/chats/${chatId}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: currentUser.id
      }),
    })

    // Оновити локальний стан
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      chat.unread_count = 0
    }

    renderChatList()
  } catch (error) {
    console.error("Error marking chat as read:", error)
  }
}

// Polling для нових чатів та оновлення badge
function startChatPolling() {
  setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/chats?userId=${currentUser.id}`)
      const allChats = await response.json()

      // Фільтрація чатів за роллю
      let filteredChats = []
      if (currentUser.role === "учень") {
        filteredChats = allChats.filter((chat) => chat.name === "Учні + методист" || chat.is_member)
      } else if (currentUser.role === "вчитель") {
        filteredChats = allChats.filter((chat) => chat.name === "Вчителі + методист" || chat.is_member)
      } else if (currentUser.role === "методист") {
        filteredChats = allChats
      }

      // Перевірити чи є нові чати або оновлення
      if (JSON.stringify(filteredChats) !== JSON.stringify(chats)) {
        chats = filteredChats
        renderChatList()
      }
    } catch (error) {
      console.error("Error polling chats:", error)
    }
  }, 5000) // Кожні 5 секунд
}

// Polling для нових повідомлень
function startMessagePolling() {
  // Очистити попередній інтервал
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval)
  }

  // Перевіряти нові повідомлення кожні 3 секунди
  messagePollingInterval = setInterval(async () => {
    if (currentChatId) {
      const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : 0

      try {
        const response = await fetch(`${API_URL}/messages/${currentChatId}?after=${lastMessageId}`)
        const newMessages = await response.json()

        if (newMessages.length > 0) {
          messages.push(...newMessages)
          renderMessages()
          await loadChats() // Оновити список чатів
        }
      } catch (error) {
        console.error("Error polling messages:", error)
      }
    }
  }, 3000)
}

// Відкрити модальне вікно
function openModal() {
  createChatModal.classList.add("active")
}

// Закрити модальне вікно
function closeModal() {
  createChatModal.classList.remove("active")
}

// Налаштування обробників подій
function setupEventListeners() {
  messageForm.addEventListener("submit", sendMessage)
  createChatBtn.addEventListener("click", openModal)
  closeModalBtn.addEventListener("click", closeModal)
  cancelCreateBtn.addEventListener("click", closeModal)
  createChatForm.addEventListener("submit", createChat)

  // Закрити модальне вікно при кліку поза ним
  createChatModal.addEventListener("click", (e) => {
    if (e.target === createChatModal) {
      closeModal()
    }
  })
}

// Допоміжні функції
function formatTime(date) {
  const now = new Date()
  const diff = now - date

  // Якщо сьогодні
  if (diff < 86400000 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Якщо цього року
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
    })
  }

  // Інакше повна дата
  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function showError(message) {
  alert(message)
}

// Запустити додаток
document.addEventListener("DOMContentLoaded", init)

// Очистити інтервал при закритті сторінки
window.addEventListener("beforeunload", () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval)
  }
})
document.getElementById('homeBtn').addEventListener('click', function () {
  window.location.href = 'index.html';
});