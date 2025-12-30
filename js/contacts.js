// Image upload functionality for contact photos
document.addEventListener("DOMContentLoaded", () => {
    // Handle image loading errors with placeholder
    const images = document.querySelectorAll(".contact-photo img")

    images.forEach((img) => {
        img.addEventListener("error", () => {
            console.log("[v0] Image failed to load, using placeholder")
            // Keep the placeholder if actual image fails to load
        })
    })

    // Add smooth scroll animation for page load
    const cards = document.querySelectorAll(".contact-card, .info-item, .research-card")

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "0"
                entry.target.style.transform = "translateY(20px)"

                setTimeout(() => {
                    entry.target.style.transition = "opacity 0.6s ease, transform 0.6s ease"
                    entry.target.style.opacity = "1"
                    entry.target.style.transform = "translateY(0)"
                }, 100)

                observer.unobserve(entry.target)
            }
        })
    }, observerOptions)

    cards.forEach((card) => {
        observer.observe(card)
    })

    // Add photo upload functionality (for future implementation)
    const authorPhoto = document.getElementById("authorPhoto")
    const supervisor1Photo = document.getElementById("supervisor1Photo")
    const supervisor2Photo = document.getElementById("supervisor2Photo")

    // Function to handle photo updates (can be extended later)
    function updatePhoto(photoElement, imagePath) {
        if (photoElement && imagePath) {
            photoElement.src = imagePath
        }
    }

    // Example: To update photos dynamically in the future
    // updatePhoto(authorPhoto, '/path/to/author-photo.jpg');
    // updatePhoto(supervisor1Photo, '/path/to/supervisor1-photo.jpg');
    // updatePhoto(supervisor2Photo, '/path/to/supervisor2-photo.jpg');
})