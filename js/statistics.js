// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL
if (window.location.hostname === "localhost") {
    // 🖥️ Локальний режим
    BASE_URL = "http://localhost:3000"
} else {
    // ☁️ Онлайн-сервер Render
    BASE_URL = "https://ievents-qf5k.onrender.com"
}
console.log("📡 Підключення до:", BASE_URL)

// Статистика платформи iEvents
// Chart.js завантажується через CDN в HTML файлі

const userId = localStorage.getItem("userId")
const userRole = localStorage.getItem("userRole")

if (!userId) {
    window.location.href = "auth.html"
}

// Завантаження загальної статистики
async function loadOverviewStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/overview`)
        const data = await response.json()

        document.getElementById("totalStudents").textContent = data.students || 0
        document.getElementById("totalCompetitions").textContent = data.competitions || 0
        document.getElementById("totalParticipations").textContent = data.participations || 0
        document.getElementById("activeCompetitions").textContent = data.activeCompetitions || 0
    } catch (error) {
        console.error("Помилка завантаження загальної статистики:", error)
    }
}

// Завантаження статистики по класах
async function loadGradeStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/by-grade`)
        const data = await response.json()

        if (!data.grades || data.grades.length === 0) {
            document.getElementById("gradeChart").parentElement.innerHTML =
                '<p style="text-align: center; padding: 40px; color: #666;">Немає даних для відображення. Додайте учнів та конкурси.</p>'
            return
        }

        const grades = data.grades.map((g) => g.grade || "Не вказано")
        const participations = data.grades.map((g) => Number.parseInt(g.participations_count) || 0)

        const ctx = document.getElementById("gradeChart").getContext("2d")
        const chart = new window.Chart(ctx, {
            type: "bar",
            data: {
                labels: grades,
                datasets: [{
                    label: "Кількість участей",
                    data: participations,
                    backgroundColor: "rgba(102, 126, 234, 0.8)",
                    borderColor: "rgba(102, 126, 234, 1)",
                    borderWidth: 2,
                    borderRadius: 8,
                }, ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        },
                    },
                },
            },
        })
    } catch (error) {
        console.error("Помилка завантаження статистики по класах:", error)
    }
}

// Завантаження статистики успішності конкурсів
async function loadTimelineStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/competition-success`)
        const data = await response.json()

        if (!data.competitions || data.competitions.length === 0) {
            document.getElementById("timelineChart").parentElement.innerHTML =
                '<p style="text-align: center; padding: 40px; color: #666;">Немає даних для відображення. Додайте результати конкурсів.</p>'
            return
        }

        const competitions = data.competitions.map((c) =>
            c.title.length > 20 ? c.title.substring(0, 20) + "..." : c.title,
        )
        const scores = data.competitions.map((c) => Number.parseFloat(c.average_score) || 0)

        const ctx = document.getElementById("timelineChart").getContext("2d")
        if (window.timelineChartInstance) {
            window.timelineChartInstance.destroy()
        }
        window.timelineChartInstance = new window.Chart(ctx, {
            type: "bar",
            data: {
                labels: competitions,
                datasets: [{
                    label: "Середній бал",
                    data: scores,
                    backgroundColor: "rgba(245, 87, 108, 0.8)",
                    borderColor: "rgba(245, 87, 108, 1)",
                    borderWidth: 2,
                    borderRadius: 8,
                }, ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => data.competitions[context[0].dataIndex].title,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 10,
                        },
                    },
                },
            },
        })
    } catch (error) {
        console.error("Помилка завантаження статистики успішності:", error)
    }
}

// Завантаження топ учнів
async function loadTopStudents() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/top-students?limit=8`)
        const data = await response.json()

        const container = document.getElementById("topStudents")

        if (!data.students || data.students.length === 0) {
            container.innerHTML = '<div class="loading">Немає даних. Додайте учнів та конкурси.</div>'
            return
        }

        container.innerHTML = data.students
            .map(
                (student) => `
      <div class="student-card">
        <div class="student-avatar">
          ${student.avatar ? `<img src="${student.avatar}" alt="${student.first_name || "Учень"}">` : "👤"}
        </div>
        <div class="student-name">${student.first_name || ""} ${student.last_name || "Учень"}</div>
        <div class="student-grade">${student.grade || "Клас не вказано"}</div>
        <div class="student-participations">${student.participations_count || 0}</div>
        <div class="student-participations-label">участей</div>
      </div>
    `,
            )
            .join("")
    } catch (error) {
        console.error("Помилка завантаження топ учнів:", error)
        document.getElementById("topStudents").innerHTML = '<div class="loading">Помилка завантаження</div>'
    }
}

// Завантаження статистики конкурсів
async function loadCompetitionsStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/competitions-detailed`)
        const data = await response.json()

        const tbody = document.querySelector("#competitionsTable tbody")

        if (!data.competitions || data.competitions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Немає конкурсів. Створіть перший конкурс.</td></tr>'
            return
        }

        tbody.innerHTML = data.competitions
            .map((comp) => {
                const statusClass =
                    comp.status === "активний" ? "active" : comp.status === "майбутній" ? "upcoming" : "completed"
                const statusText =
                    comp.status === "активний" ? "Активний" : comp.status === "майбутній" ? "Майбутній" : "Завершений"

                return `
        <tr>
          <td>${comp.title}</td>
          <td data-label="Дата початку:">${new Date(comp.start_date).toLocaleDateString("uk-UA")}</td>
          <td data-label="Дата закінчення:">${new Date(comp.end_date).toLocaleDateString("uk-UA")}</td>
          <td data-label="Учасників:">${comp.participants_count || 0}</td>
          <td data-label="Середній бал:">${comp.average_score ? Number.parseFloat(comp.average_score).toFixed(1) : "N/A"}</td>
          <td data-label="Статус:"><span class="status-badge ${statusClass}">${statusText}</span></td>
        </tr>
      `
            })
            .join("")
    } catch (error) {
        console.error("Помилка завантаження статистики конкурсів:", error)
        // Fallback to original endpoint if detailed one doesn't exist
        const response = await fetch(`${BASE_URL}/api/statistics/competitions`)
        const data = await response.json()

        const tbody = document.querySelector("#competitionsTable tbody")

        if (!data.competitions || data.competitions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Немає конкурсів.</td></tr>'
            return
        }

        tbody.innerHTML = data.competitions
            .map((comp) => {
                const statusClass =
                    comp.status === "активний" ? "active" : comp.status === "майбутній" ? "upcoming" : "completed"
                const statusText =
                    comp.status === "активний" ? "Активний" : comp.status === "майбутній" ? "Майбутній" : "Завершений"

                return `
        <tr>
          <td>${comp.title}</td>
          <td data-label="Дата початку:">${new Date(comp.start_date).toLocaleDateString("uk-UA")}</td>
          <td data-label="Дата закінчення:">${new Date(comp.end_date).toLocaleDateString("uk-UA")}</td>
          <td data-label="Учасників:">${comp.participants_count || 0}</td>
          <td data-label="Середній бал:">N/A</td>
          <td data-label="Статус:"><span class="status-badge ${statusClass}">${statusText}</span></td>
        </tr>
      `
            })
            .join("")
    }
}

// Завантаження статистики по школах
async function loadSchoolsStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/by-school`)
        const data = await response.json()

        const container = document.getElementById("schoolsList")

        if (!data.schools || data.schools.length === 0) {
            container.innerHTML = '<div class="loading">Немає даних. Додайте інформацію про школи в профілях учнів.</div>'
            return
        }

        container.innerHTML = data.schools
            .map(
                (school) => `
      <div class="school-item">
        <div class="school-info">
          <div class="school-name">${school.school}</div>
          <div class="school-students">${school.students_count || 0} учнів</div>
        </div>
        <div class="school-participations">${school.participations_count || 0}</div>
      </div>
    `,
            )
            .join("")
    } catch (error) {
        console.error("Помилка завантаження статистики по школах:", error)
        document.getElementById("schoolsList").innerHTML = '<div class="loading">Помилка завантаження</div>'
    }
}

// Завантаження середніх балів
async function loadAverageScores() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/average-scores`)
        const data = await response.json()

        // Update overall average score
        document.getElementById("averageScore").textContent = data.overallAverage || "N/A"

        // Create chart for average scores by grade
        if (data.byGrade && data.byGrade.length > 0) {
            const grades = data.byGrade.map((g) => g.grade || "Не вказано")
            const averages = data.byGrade.map((g) => Number.parseFloat(g.average_score) || 0)

            const ctx = document.getElementById("averageScoresChart").getContext("2d")
            if (window.averageScoresChartInstance) {
                window.averageScoresChartInstance.destroy()
            }
            window.averageScoresChartInstance = new window.Chart(ctx, {
                type: "bar",
                data: {
                    labels: grades,
                    datasets: [{
                        label: "Середній бал",
                        data: averages,
                        backgroundColor: "rgba(250, 112, 154, 0.8)",
                        borderColor: "rgba(250, 112, 154, 1)",
                        borderWidth: 2,
                        borderRadius: 8,
                    }, ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false,
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                        },
                    },
                },
            })
        } else {
            document.getElementById("averageScoresChart").parentElement.innerHTML =
                '<p style="text-align: center; padding: 40px; color: #666;">Немає даних про бали.</p>'
        }
    } catch (error) {
        console.error("Помилка завантаження середніх балів:", error)
    }
}

// Завантаження рівня участі
async function loadParticipationRate() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/participation-rate`)
        const data = await response.json()

        document.getElementById("participationRate").textContent = `${data.rate || 0}%`
    } catch (error) {
        console.error("Помилка завантаження рівня участі:", error)
    }
}

// Завантаження деталей класів
async function loadClassDetails() {
    try {
        const response = await fetch(`${BASE_URL}/api/statistics/class-details`)
        const data = await response.json()

        const container = document.getElementById("classDetails")

        if (!data.classes || data.classes.length === 0) {
            container.innerHTML = '<div class="loading">Немає даних про класи.</div>'
            return
        }

        container.innerHTML = data.classes
            .map(
                (cls) => `
      <div class="class-detail-card">
        <div class="class-name">${cls.grade || "Клас не вказано"}</div>
        <div class="class-stats">
          <div class="class-stat-row">
            <span class="class-stat-label">Учнів:</span>
            <span class="class-stat-value">${cls.students_count || 0}</span>
          </div>
          <div class="class-stat-row">
            <span class="class-stat-label">Участей:</span>
            <span class="class-stat-value">${cls.participations_count || 0}</span>
          </div>
          <div class="class-stat-row">
            <span class="class-stat-label">Середній бал:</span>
            <span class="class-stat-value">${cls.average_score ? Number.parseFloat(cls.average_score).toFixed(1) : "N/A"}</span>
          </div>
          <div class="class-stat-row">
            <span class="class-stat-label">Активність:</span>
            <span class="class-stat-value">${cls.participation_rate ? Number.parseFloat(cls.participation_rate).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>
    `,
            )
            .join("")
    } catch (error) {
        console.error("Помилка завантаження деталей класів:", error)
        document.getElementById("classDetails").innerHTML = '<div class="loading">Помилка завантаження</div>'
    }
}

// Відкриття форми планування
function openPlanningForm() {
    document.getElementById("planningSection").style.display = "block"
    document.getElementById("eventStartDate").valueAsDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    document.getElementById("eventEndDate").valueAsDate = endDate
}

// Закриття форми планування
function closePlanningForm() {
    document.getElementById("planningSection").style.display = "none"
    document.getElementById("planningForm").reset()
}

// Ініціалізація сторінки
document.addEventListener("DOMContentLoaded", async () => {
    console.log("[v0] Завантаження статистики...")

    // Check user role and show planning button for teachers and methodists
    if (userRole === "вчитель" || userRole === "методист") {
        document.getElementById("planButton").style.display = "block"
    }

    // Setup planning form
    document.getElementById("planningForm").addEventListener("submit", async (e) => {
        e.preventDefault()

        const title = document.getElementById("eventTitle").value
        const description = document.getElementById("eventDescription").value
        const startDate = document.getElementById("eventStartDate").value
        const endDate = document.getElementById("eventEndDate").value

        try {
            const response = await fetch(`${BASE_URL}/api/competitions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    startDate,
                    endDate,
                    createdBy: userId,
                }),
            })

            if (response.ok) {
                alert("Захід успішно створено!")
                closePlanningForm()
                // Reload competitions statistics
                await loadCompetitionsStats()
                await loadOverviewStats()
            } else {
                const error = await response.json()
                alert(`Помилка: ${error.error || "Не вдалося створити захід"}`)
            }
        } catch (error) {
            console.error("Помилка створення заходу:", error)
            alert("Помилка створення заходу. Спробуйте ще раз.")
        }
    })

    // Load all statistics
    await loadOverviewStats()
    await loadParticipationRate()
    await loadGradeStats()
    await loadTimelineStats()
    await loadAverageScores()
    await loadTopStudents()
    await loadCompetitionsStats()
    await loadSchoolsStats()
    await loadClassDetails()
    console.log("[v0] Статистика завантажена")
})
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then(() => console.log("Service Worker зареєстровано"))
    .catch(err => console.log("SW error:", err));
}
