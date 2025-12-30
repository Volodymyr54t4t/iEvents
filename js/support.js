document.addEventListener("DOMContentLoaded", () => {
    // FAQ Toggle Functionality
    const faqItems = document.querySelectorAll(".faq-item")

    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question")

        question.addEventListener("click", () => {
            const isActive = item.classList.contains("active")

            // Close all other items
            faqItems.forEach((otherItem) => {
                if (otherItem !== item) {
                    otherItem.classList.remove("active")
                }
            })

            // Toggle current item
            if (isActive) {
                item.classList.remove("active")
            } else {
                item.classList.add("active")
            }
        })
    })

    // Category Filter Functionality
    const categoryBtns = document.querySelectorAll(".category-btn")

    categoryBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            // Update active button
            categoryBtns.forEach((otherBtn) => {
                otherBtn.classList.remove("active")
            })
            btn.classList.add("active")

            // Filter FAQ items
            const category = btn.getAttribute("data-category")

            faqItems.forEach((item) => {
                // Close all items
                item.classList.remove("active")

                if (category === "all") {
                    item.classList.remove("hidden")
                } else {
                    const itemCategory = item.getAttribute("data-category")
                    if (itemCategory === category) {
                        item.classList.remove("hidden")
                    } else {
                        item.classList.add("hidden")
                    }
                }
            })
        })
    })

    // Smooth scroll for anchor links
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

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1"
                entry.target.style.transform = "translateY(0)"
            }
        })
    }, observerOptions)

    // Observe elements for animation
    const animateElements = document.querySelectorAll(
        ".feature-card, .step-card, .resource-card, .highlight-card, .tip-card",
    )

    animateElements.forEach((el) => {
        el.style.opacity = "0"
        el.style.transform = "translateY(20px)"
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease"
        observer.observe(el)
    })

    // Search functionality (if search box is added in the future)
    const searchFAQ = (query) => {
        const lowerQuery = query.toLowerCase()

        faqItems.forEach((item) => {
            const question = item.querySelector(".faq-question h3").textContent.toLowerCase()
            const answer = item.querySelector(".faq-answer").textContent.toLowerCase()

            if (question.includes(lowerQuery) || answer.includes(lowerQuery)) {
                item.classList.remove("hidden")
            } else {
                item.classList.add("hidden")
            }
        })
    }

    // Auto-close FAQ after 30 seconds of being open
    faqItems.forEach((item) => {
        let timeout

        item.addEventListener("click", () => {
            clearTimeout(timeout)

            if (item.classList.contains("active")) {
                timeout = setTimeout(() => {
                    item.classList.remove("active")
                }, 30000)
            }
        })
    })

    // Add hover effect to comparison table rows
    const tableRows = document.querySelectorAll(".comparison-table tbody tr")

    tableRows.forEach((row) => {
        row.addEventListener("mouseenter", () => {
            row.style.transform = "scale(1.02)"
            row.style.transition = "transform 0.2s ease"
        })

        row.addEventListener("mouseleave", () => {
            row.style.transform = "scale(1)"
        })
    })

    console.log("Support page initialized successfully")
})