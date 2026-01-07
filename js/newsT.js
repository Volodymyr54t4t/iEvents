let BASE_URL
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000"
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

const API_URL = BASE_URL

let currentNewsId = null
let currentCoverImageUrl = null
let currentGalleryImages = []
let galleryFilesToUpload = []

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  checkAuth()
  loadNews()
  setupEventListeners()
})

function checkAuth() {
  const userId = localStorage.getItem("userId")
  const userRole = localStorage.getItem("userRole")

  if (!userId) {
    window.location.href = "auth.html"
    return
  }

  if (userRole !== "методист" && userRole !== "вчитель") {
    alert("У вас немає доступу до цієї сторінки")
    window.location.href = "index.html"
    return
  }
}

function setupEventListeners() {
  document.getElementById("searchNews")?.addEventListener("input", filterNews)
  document.getElementById("filterCategory")?.addEventListener("change", filterNews)
  document.getElementById("filterPublished")?.addEventListener("change", filterNews)
  document.getElementById("sortBy")?.addEventListener("change", filterNews)

  document.getElementById("newsCoverImage")?.addEventListener("change", handleCoverImagePreview)
  document.getElementById("newsGalleryImages")?.addEventListener("change", handleGalleryImagesPreview)
}

async function loadNews() {
  try {
    const response = await fetch(`${API_URL}/api/news`)
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

function displayNews(news) {
  const container = document.getElementById("newsList")

  if (news.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📰 Новин поки немає. Створіть першу новину!</p>
      </div>
    `
    return
  }

  container.innerHTML = news
    .map(
      (item) => `
    <div class="news-item ${!item.is_published ? "draft" : ""}">
      <div class="news-header">
        <h3 class="news-title">${item.title}</h3>
        <div class="news-badges">
          <span class="badge badge-category">${item.category || "Без категорії"}</span>
          ${!item.is_published ? '<span class="badge badge-draft">Чернетка</span>' : '<span class="badge badge-published">Опубліковано</span>'}
        </div>
      </div>
      
      ${item.cover_image_url || item.image_url ? `<img src="${item.cover_image_url || item.image_url}" alt="${item.title}" class="news-image">` : ""}
      
      <div class="news-content">${item.content}</div>
      
      ${
        item.gallery_images && item.gallery_images.length > 0
          ? `
        <div class="news-gallery">
          ${item.gallery_images
            .slice(0, 4)
            .map((img) => `<img src="${img}" alt="Gallery image">`)
            .join("")}
          ${item.gallery_images.length > 4 ? `<div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #6c757d;">+${item.gallery_images.length - 4} фото</div>` : ""}
        </div>
      `
          : ""
      }
      
      <div class="news-meta">
        <span>👤 ${item.author_name || "Невідомий автор"}</span>
        <span>📅 ${new Date(item.created_at).toLocaleDateString("uk-UA")}</span>
        <span>👁️ ${item.views_count || 0}</span>
        <span>👍 ${item.likes_count || 0}</span>
        <span>💬 ${item.comments_count || 0}</span>
      </div>
      
      <div class="news-actions">
        <button class="btn btn-primary btn-sm" onclick="editNews(${item.id})">✏️ Редагувати</button>
        <button class="btn btn-secondary btn-sm" onclick="viewComments(${item.id})">💬 Коментарі (${item.comments_count || 0})</button>
        <button class="btn btn-danger btn-sm" onclick="deleteNews(${item.id})">🗑️ Видалити</button>
      </div>
    </div>
  `,
    )
    .join("")
}

function filterNews() {
  loadNews()
}

function openCreateNewsModal() {
  document.getElementById("modalTitle").textContent = "Створити новину"
  document.getElementById("editNewsId").value = ""
  document.getElementById("createNewsForm").reset()
  document.getElementById("coverImagePreview").innerHTML = ""
  document.getElementById("galleryImagesPreview").innerHTML = ""
  currentCoverImageUrl = null
  currentGalleryImages = []
  galleryFilesToUpload = []
  document.getElementById("createNewsModal").classList.add("active")
}

function closeCreateNewsModal() {
  document.getElementById("createNewsModal").classList.remove("active")
}

function handleCoverImagePreview(event) {
  const file = event.target.files[0]
  const preview = document.getElementById("coverImagePreview")

  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Cover Preview">`
    }
    reader.readAsDataURL(file)
  } else {
    preview.innerHTML = ""
  }
}

function handleGalleryImagesPreview(event) {
  const files = Array.from(event.target.files)
  const preview = document.getElementById("galleryImagesPreview")

  galleryFilesToUpload = files

  if (files.length === 0) {
    preview.innerHTML = ""
    return
  }

  preview.innerHTML = ""

  files.forEach((file, index) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const itemDiv = document.createElement("div")
      itemDiv.className = "gallery-preview-item"
      itemDiv.innerHTML = `
        <img src="${e.target.result}" alt="Gallery preview ${index + 1}">
        <button class="gallery-preview-remove" onclick="removeGalleryPreviewItem(${index})" type="button">&times;</button>
      `
      preview.appendChild(itemDiv)
    }
    reader.readAsDataURL(file)
  })
}

function removeGalleryPreviewItem(index) {
  galleryFilesToUpload.splice(index, 1)

  const input = document.getElementById("newsGalleryImages")
  const dt = new DataTransfer()

  galleryFilesToUpload.forEach((file) => dt.items.add(file))
  input.files = dt.files

  handleGalleryImagesPreview({ target: input })
}

async function saveNews() {
  const newsId = document.getElementById("editNewsId").value
  const title = document.getElementById("newsTitle").value.trim()
  const category = document.getElementById("newsCategory").value
  const content = document.getElementById("newsContent").value.trim()
  const isPublished = document.getElementById("newsPublished").checked
  const coverImageFile = document.getElementById("newsCoverImage").files[0]
  const galleryImageFiles = Array.from(document.getElementById("newsGalleryImages").files)
  const userId = localStorage.getItem("userId")

  if (!title || !category || !content) {
    alert("Будь ласка, заповніть всі обов'язкові поля")
    return
  }

  try {
    let coverImageUrl = currentCoverImageUrl

    if (coverImageFile) {
      const formData = new FormData()
      formData.append("image", coverImageFile)

      const uploadResponse = await fetch(`${API_URL}/api/upload-image`, {
        method: "POST",
        body: formData,
      })

      const uploadData = await uploadResponse.json()
      if (uploadData.success) {
        coverImageUrl = uploadData.imageUrl
      }
    }

    const galleryImageUrls = [...currentGalleryImages]

    if (galleryImageFiles.length > 0) {
      for (const file of galleryImageFiles) {
        const formData = new FormData()
        formData.append("image", file)

        const uploadResponse = await fetch(`${API_URL}/api/upload-image`, {
          method: "POST",
          body: formData,
        })

        const uploadData = await uploadResponse.json()
        if (uploadData.success) {
          galleryImageUrls.push(uploadData.imageUrl)
        }
      }
    }

    const newsData = {
      title,
      category,
      content,
      isPublished,
      coverImageUrl,
      galleryImageUrls,
      authorId: userId,
    }

    const url = newsId ? `${API_URL}/api/news/${newsId}` : `${API_URL}/api/news`
    const method = newsId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newsData),
    })

    const data = await response.json()

    if (data.success) {
      alert(newsId ? "Новину оновлено!" : "Новину створено!")
      closeCreateNewsModal()
      loadNews()
    } else {
      throw new Error(data.error || "Помилка збереження новини")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert(`Помилка: ${error.message}`)
  }
}

async function editNews(newsId) {
  try {
    const response = await fetch(`${API_URL}/api/news/${newsId}`)
    const data = await response.json()

    if (data.success) {
      const news = data.news

      document.getElementById("modalTitle").textContent = "Редагувати новину"
      document.getElementById("editNewsId").value = news.id
      document.getElementById("newsTitle").value = news.title
      document.getElementById("newsCategory").value = news.category || ""
      document.getElementById("newsContent").value = news.content
      document.getElementById("newsPublished").checked = news.is_published

      currentCoverImageUrl = news.cover_image_url || news.image_url
      if (currentCoverImageUrl) {
        document.getElementById("coverImagePreview").innerHTML =
          `<img src="${currentCoverImageUrl}" alt="Current cover">`
      }

      currentGalleryImages = news.gallery_images || []
      if (currentGalleryImages.length > 0) {
        const galleryPreview = document.getElementById("galleryImagesPreview")
        galleryPreview.innerHTML = currentGalleryImages
          .map(
            (img, index) => `
          <div class="gallery-preview-item">
            <img src="${img}" alt="Gallery image ${index + 1}">
            <button class="gallery-preview-remove" onclick="removeExistingGalleryImage(${index})" type="button">&times;</button>
          </div>
        `,
          )
          .join("")
      }

      document.getElementById("createNewsModal").classList.add("active")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка завантаження новини")
  }
}

function removeExistingGalleryImage(index) {
  currentGalleryImages.splice(index, 1)

  const galleryPreview = document.getElementById("galleryImagesPreview")
  galleryPreview.innerHTML = currentGalleryImages
    .map(
      (img, idx) => `
    <div class="gallery-preview-item">
      <img src="${img}" alt="Gallery image ${idx + 1}">
      <button class="gallery-preview-remove" onclick="removeExistingGalleryImage(${idx})" type="button">&times;</button>
    </div>
  `,
    )
    .join("")
}

async function deleteNews(newsId) {
  if (!confirm("Ви впевнені, що хочете видалити цю новину?")) {
    return
  }

  try {
    const response = await fetch(`${API_URL}/api/news/${newsId}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (data.success) {
      alert("Новину видалено!")
      loadNews()
    } else {
      throw new Error(data.error || "Помилка видалення новини")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert(`Помилка: ${error.message}`)
  }
}

async function viewComments(newsId) {
  currentNewsId = newsId

  try {
    const response = await fetch(`${API_URL}/api/news/${newsId}/comments`)
    const data = await response.json()

    if (data.success) {
      displayComments(data.comments)
      document.getElementById("viewCommentsModal").classList.add("active")
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка завантаження коментарів")
  }
}

function displayComments(comments) {
  const container = document.getElementById("commentsContainer")

  if (comments.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Коментарів поки немає</p></div>`
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
      <div class="comment-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteComment(${comment.id})">🗑️ Видалити</button>
      </div>
    </div>
  `,
    )
    .join("")
}

async function deleteComment(commentId) {
  if (!confirm("Видалити цей коментар?")) {
    return
  }

  try {
    const response = await fetch(`${API_URL}/api/news/comments/${commentId}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (data.success) {
      viewComments(currentNewsId)
      loadNews()
    }
  } catch (error) {
    console.error("Помилка:", error)
    alert("Помилка видалення коментаря")
  }
}

function closeViewCommentsModal() {
  document.getElementById("viewCommentsModal").classList.remove("active")
  currentNewsId = null
}
