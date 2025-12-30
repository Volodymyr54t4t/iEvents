// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault()
        const target = document.querySelector(this.getAttribute("href"))
        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start",
            })
        }
    })
})

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible")
        }
    })
}, observerOptions)

// Observe all sections for fade-in animation
document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll(
        ".info-card, .feature-card, .advantage-item, .author-card, .tech-card, .results-card",
    )
    sections.forEach((section) => {
        section.classList.add("fade-in-on-scroll")
        observer.observe(section)
    })

    loadAuthorPhotos()
})

// Counter animation for statistics (if any numbers are displayed)
function animateCounter(element, target, duration = 2000) {
    let start = 0
    const increment = target / (duration / 16)

    const timer = setInterval(() => {
        start += increment
        if (start >= target) {
            element.textContent = Math.round(target)
            clearInterval(timer)
        } else {
            element.textContent = Math.round(start)
        }
    }, 16)
}

// Parallax effect for hero section
window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset
    const heroSection = document.querySelector(".hero-section")
    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`
    }
})

// Add hover effect to cards
const cards = document.querySelectorAll(".info-card, .feature-card, .tech-card, .author-card, .results-card")
cards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
        this.style.transition = "all 0.3s ease"
    })
})

// Mobile menu toggle (if needed in future)
function toggleMobileMenu() {
    const nav = document.querySelector(".nav")
    nav.classList.toggle("active")
}

// Log page views (for analytics, if needed)
console.log("[v0] About page loaded with single column layout")
console.log("[v0] User viewing information about iEvents system")

// Lazy loading for images (if any are added in future)
if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target
                if (img.dataset.src) {
                    img.src = img.dataset.src
                    img.classList.add("loaded")
                    observer.unobserve(img)
                }
            }
        })
    })

    document.querySelectorAll("img[data-src]").forEach((img) => {
        imageObserver.observe(img)
    })
}

// Add active state to navigation
const currentPage = window.location.pathname.split("/").pop()
const navLinks = document.querySelectorAll(".nav a")
navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
        link.classList.add("active")
    }
})

// Toast notification function (can be used for future features)
function showToast(message, type = "info") {
    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === "success" ? "#10B981" : "#4F46E5"};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `

    document.body.appendChild(toast)

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease"
        setTimeout(() => toast.remove(), 300)
    }, 3000)
}

// Keyboard navigation accessibility
document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        document.body.classList.add("keyboard-nav")
    }
})

document.addEventListener("mousedown", () => {
    document.body.classList.remove("keyboard-nav")
})

// Performance monitoring
window.addEventListener("load", () => {
    const loadTime = performance.now()
    console.log(`[v0] Page loaded in ${Math.round(loadTime)}ms`)
})

function loadAuthorPhotos() {
    const photos = document.querySelectorAll(".author-photo img")
    photos.forEach((img) => {
        img.addEventListener("error", function () {
            // If image fails to load, show a placeholder background
            this.parentElement.style.background = "var(--gradient-primary)"
            this.parentElement.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 4rem;">
          👤
        </div>
      `
        })
    })
}