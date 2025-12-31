const API_URL = window.API_URL || "http://localhost:3000"

let currentNewsId = null
let userLikes = new Set()

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  checkAuth()
  loadNews()
  loadUserLikes()
  setupEventListeners()
})

function checkAuth() {
  const userId = localStorage.getItem("userId")

  if (!userId) {
    window.location.href = "auth.html"
    return
  }
}

function setupEventListeners() {
  document.getElementById("searchNews")?.addEventListener("input", filterNews)
  document.getElementById("filterCategory")?.addEventListener("change", filterNews)
  document.getElementById("sortBy")?.addEventListener("change", filterNews)
}

async function loadNews() {
  try {
    const response = await fetch(`${API_URL}/api/news/published`)
    const data = await response.json()

    if (data.success) {
      displayNews(data.news)
    } else {
      throw new Error(data.error || "Помилка завантаження новин")
    }
  } catch (error) {
    console.error("Помилка:", error)
    document.getElementById("newsList").innerHTML = `
      <div class="empty-state">
        <p>❌ Помилка завантаження новин: ${error.message}</p>
      </div>
    `
  }
}

async function loadUserLikes() {
  const userId = localStorage.getItem("userId")

  try {
    const response = await fetch(`${API_URL}/api/news/likes/user/${userId}`)
    const data = await response.json()

    if (data.success) {
      userLikes = new Set(data.likes.map((like) => like.news_id))
    }
  } catch (error) {
    console.error("Помилка завантаження лайків:", error)
  }
}

function displayNews(news) {
  const container = document.getElementById("newsList")

  if (news.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📰 Новин поки немає</p>
      </div>
    `
    return
  }

  container.innerHTML = news
    .map((item) => {
      const isLiked = userLikes.has(item.id)
      const coverImage = item.cover_image_url || item.image_url
      return `
      <div class="news-card" onclick="viewNews(${item.id})">
        ${coverImage ? `<img src="${coverImage}" alt="${item.title}" class="news-card-image">` : '<div class="news-card-image"></div>'}
        
        <div class="news-card-content">
          <div class="news-card-header">
            ${item.category ? `<span class="news-card-category">${item.category}</span>` : ""}
            <h3 class="news-card-title">${item.title}</h3>
          </div>
          
          <p class="news-card-excerpt">${item.content.substring(0, 150)}${item.content.length > 150 ? "..." : ""}</p>
          
          <div class="news-card-meta">
            <span class="news-card-date">
              📅 ${new Date(item.created_at).toLocaleDateString("uk-UA")}
            </span>
            <div class="news-card-stats">
              <span class="stat-item">👁️ ${item.views_count || 0}</span>
              <button class="like-btn ${isLiked ? "liked" : ""}" onclick="event.stopPropagation(); toggleLike(${item.id})">
                ${isLiked ? "❤️" : "🤍"} <span id="likes-${item.id}">${item.likes_count || 0}</span>
              </button>
              <span class="stat-item">💬 ${item.comments_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    `
    })
    .join("")
}

function filterNews() {
  loadNews()
}

async function viewNews(newsId) {
  currentNewsId = newsId

  try {
    await fetch(`${API_URL}/api/news/${newsId}/view`, {
      method: "POST",
    })
  } catch (error) {
    console.error("Помилка збільшення переглядів:", error)
  }

  try {
    const response = await fetch(`${API_URL}/api/news/${newsId}`)
    const data = await response.json()

    if (data.success) {
      const news = data.news
      const isLiked = userLikes.has(news.id)

      const coverImage = news.cover_image_url || news.image_url
      const galleryImages = news.gallery_images || []

      document.getElementById("newsModalTitle").textContent = news.title
      document.getElementById("newsFullContent").innerHTML = `
        ${coverImage ? `<img src="${coverImage}" alt="${news.title}" class="news-full-image">` : ""}
        
        <div class="news-full-meta">
          ${news.category ? `<span class="news-card-category">${news.category}</span>` : ""}
          <span>👤 ${news.author_name || "Невідомий автор"}</span>
          <span>📅 ${new Date(news.created_at).toLocaleDateString("uk-UA")}</span>
          <span>👁️ ${news.views_count || 0} переглядів</span>
          <button class="like-btn ${isLiked ? "liked" : ""}" onclick="toggleLike(${news.id})">
            ${isLiked ? "❤️" : "🤍"} <span id="likes-${news.id}">${news.likes_count || 0}</span>
          </button>
          <span>💬 ${news.comments_count || 0} коментарів</span>
        </div>
        
        <div class="news-full-content">${news.content.replace(/\n/g, "<br>")}</div>
        
        ${
          galleryImages.length > 0
            ? `
          <div class="news-gallery" style="margin-top: 24px;">
            ${galleryImages.map((img) => `<img src="${img}" alt="Gallery image" class="news-full-image" style="margin-bottom: 16px;">`).join("")}
          </div>
        `
            : ""
        }
      `

      loadComments(newsId)
      document.getElementById("viewNewsModal").classList.add("active")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка завантаження новини")
  }
}

async function loadComments(newsId) {
  try {
    const response = await fetch(`${API_URL}/api/news/${newsId}/comments`)
    const data = await response.json()

    if (data.success) {
      displayComments(data.comments)
    }
  } catch (error) {
    console.error("Помилка:", error)
    document.getElementById("commentsList").innerHTML =
      `<div class="empty-state"><p>Помилка завантаження коментарів</p></div>`
  }
}

function displayComments(comments) {
  const container = document.getElementById("commentsList")

  if (comments.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Коментарів поки немає. Будьте першим!</p></div>`
    return
  }

  container.innerHTML = comments
    .map(
      (comment) => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">${comment.user_name || comment.user_email || "Невідомий користувач"}</span>
        <span class="comment-date">${new Date(comment.created_at).toLocaleString("uk-UA")}</span>
      </div>
      <div class="comment-text">${comment.comment}</div>
    </div>
  `,
    )
    .join("")
}

async function addComment() {
  const commentText = document.getElementById("newComment").value.trim()
  const userId = localStorage.getItem("userId")

  if (!commentText) {
    alert("Введіть текст коментаря")
    return
  }

  try {
    const response = await fetch(`${API_URL}/api/news/${currentNewsId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        comment: commentText,
      }),
    })

    const data = await response.json()

    if (data.success) {
      document.getElementById("newComment").value = ""
      loadComments(currentNewsId)
      loadNews()
    } else {
      throw new Error(data.error || "Помилка додавання коментаря")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert(`Помилка: ${error.message}`)
  }
}

async function toggleLike(newsId) {
  const userId = localStorage.getItem("userId")
  const isLiked = userLikes.has(newsId)

  try {
    const url = `${API_URL}/api/news/${newsId}/like`
    const method = isLiked ? "DELETE" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()

    if (data.success) {
      if (isLiked) {
        userLikes.delete(newsId)
      } else {
        userLikes.add(newsId)
      }

      const likesElements = document.querySelectorAll(`#likes-${newsId}`)
      likesElements.forEach((element) => {
        element.textContent = data.likesCount
      })

      const likeButtons = document.querySelectorAll(`.like-btn`)
      likeButtons.forEach((button) => {
        const buttonHtml = button.innerHTML
        if (buttonHtml.includes(`id="likes-${newsId}"`)) {
          if (isLiked) {
            button.classList.remove("liked")
            button.innerHTML = `🤍 <span id="likes-${newsId}">${data.likesCount}</span>`
          } else {
            button.classList.add("liked")
            button.innerHTML = `❤️ <span id="likes-${newsId}">${data.likesCount}</span>`
          }
        }
      })

      loadNews()
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка оновлення лайка")
  }
}

function closeViewNewsModal() {
  document.getElementById("viewNewsModal").classList.remove("active")
  currentNewsId = null
}
