const BASE_URL = window.AppConfig
  ? window.AppConfig.API_URL
  : window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://ievents-qf5k.onrender.com";

console.log("📡 [v0] Підключення до:", BASE_URL);

// Перевірка авторизації
const userId = localStorage.getItem("userId");

if (!userId) {
  window.location.href = "auth.html";
}

let currentCompetitionFormId = null;

// Завантаження конкурсів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  loadMyCompetitions();
  loadMyResults();
});

async function loadMyCompetitions() {
  try {
    console.log("[v0] Завантаження конкурсів для користувача:", userId);
    const response = await fetch(`${BASE_URL}/api/competitions/my/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.competitions) {
      const active = data.competitions.filter((c) => c.status === "активний");
      const upcoming = data.competitions.filter(
        (c) => c.status === "майбутній",
      );
      const inactive = data.competitions.filter(
        (c) => c.status === "неактивний",
      );

      displayCompetitions("activeCompetitions", active, "active");
      displayCompetitions("upcomingCompetitions", upcoming, "upcoming");
      displayCompetitions("inactiveCompetitions", inactive, "inactive");
    }
  } catch (error) {
    console.error("[v0] Помилка завантаження конкурсів:", error);
    showError("activeCompetitions");
    showError("upcomingCompetitions");
    showError("inactiveCompetitions");
  }
}

function displayCompetitions(containerId, competitions, type) {
  const container = document.getElementById(containerId);

  if (competitions.length === 0) {
    let message = "";
    if (type === "active") {
      message = "Наразі у вас немає активних конкурсів";
    } else if (type === "upcoming") {
      message = "Наразі у вас немає майбутніх конкурсів";
    } else {
      message = "У вас ще немає завершених конкурсів";
    }

    container.innerHTML = `
      <div class="empty-state">
        <h3>${message}</h3>
        <p>Очікуйте, поки викладач додасть вас на конкурс</p>
      </div>
    `;
    return;
  }

  container.innerHTML = competitions
    .map((competition) => {
      const startDate = new Date(competition.start_date);
      const endDate = new Date(competition.end_date);
      const today = new Date();

      let statusText = "";
      let statusClass = "";
      let daysInfo = "";

      if (type === "active") {
        statusText = "Активний";
        statusClass = "active";
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0) {
          daysInfo = `<div class="days-remaining">Залишилось днів: ${daysLeft}</div>`;
        }
      } else if (type === "upcoming") {
        statusText = "Майбутній";
        statusClass = "upcoming";
        const daysUntil = Math.ceil(
          (startDate - today) / (1000 * 60 * 60 * 24),
        );
        if (daysUntil > 0) {
          daysInfo = `<div class="days-remaining">Почнеться через ${daysUntil} днів</div>`;
        }
      } else {
        statusText = "Завершено";
        statusClass = "inactive";
      }

      return `
        <div class="competition-card ${statusClass}">
          <h3 class="competition-title">${competition.title}</h3>
          <span class="status-badge status-${statusClass}">${statusText}</span>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          <div class="competition-dates">
            <span>📅 Початок: ${startDate.toLocaleDateString("uk-UA")}</span>
            <span>📅 Закінчення: ${endDate.toLocaleDateString("uk-UA")}</span>
          </div>
          ${daysInfo}
          <div class="competition-actions">
            ${
              type === "active" || type === "upcoming"
                ? `
              <button class="btn-action btn-details" onclick="openCompetitionForm(${competition.id})">
                📋 Заповнити форму
              </button>
              <button class="btn-upload" onclick="openUploadModal(${competition.id})">
                📎 Завантажити файл
              </button>
            `
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function showError(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="empty-state">
      <h3>Помилка завантаження</h3>
      <p>Спробуйте оновити сторінку</p>
    </div>
  `;
}

async function loadMyResults() {
  const container = document.getElementById("myResults");
  container.innerHTML =
    '<div class="loading">Завантаження результатів...</div>';

  try {
    console.log("[v0] Завантаження результатів для користувача:", userId);
    const competitionsResponse = await fetch(
      `${BASE_URL}/api/competitions/my/${userId}`,
    );

    if (!competitionsResponse.ok) {
      throw new Error(`HTTP ${competitionsResponse.status}`);
    }

    const competitionsData = await competitionsResponse.json();

    if (
      !competitionsData.competitions ||
      competitionsData.competitions.length === 0
    ) {
      container.innerHTML =
        '<div class="empty-state"><p>У вас поки немає результатів</p></div>';
      return;
    }

    const allResults = [];

    for (const competition of competitionsData.competitions) {
      try {
        const resultsResponse = await fetch(
          `${BASE_URL}/api/results/${competition.id}`,
        );

        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();

          if (resultsData.results && resultsData.results.length > 0) {
            const myResult = resultsData.results.find(
              (r) => r.user_id === Number.parseInt(userId),
            );
            if (myResult) {
              allResults.push({
                ...myResult,
                competition_title: competition.title,
                competition_date: competition.end_date,
              });
            }
          }
        }
      } catch (error) {
        console.error(
          `[v0] Помилка завантаження результатів для конкурсу ${competition.id}:`,
          error,
        );
      }
    }

    if (allResults.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>У вас поки немає результатів</p></div>';
      return;
    }

    allResults.sort(
      (a, b) => new Date(b.competition_date) - new Date(a.competition_date),
    );

    container.innerHTML = `
      <div class="results-grid">
        ${allResults
          .map((result) => {
            const date = new Date(result.competition_date).toLocaleDateString(
              "uk-UA",
            );
            const placeEmoji =
              result.place === "1" || result.place === 1
                ? "🥇"
                : result.place === "2" || result.place === 2
                  ? "🥈"
                  : result.place === "3" || result.place === 3
                    ? "🥉"
                    : "🏅";

            return `
              <div class="result-card">
                <div class="result-header">
                  <h3>${result.competition_title}</h3>
                  <span class="result-date">${date}</span>
                </div>
                <div class="result-body">
                  ${result.place ? `<div class="result-place">${placeEmoji} Місце: ${result.place}</div>` : ""}
                  ${result.score ? `<div class="result-score">📊 Бали: ${result.score}</div>` : ""}
                  <div class="result-achievement">🏆 ${result.achievement}</div>
                  ${result.notes ? `<div class="result-notes">📝 ${result.notes}</div>` : ""}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  } catch (error) {
    console.error("[v0] Помилка завантаження результатів:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Помилка завантаження результатів</p></div>';
  }
}

async function openCompetitionForm(competitionId) {
  console.log("=====================================");
  console.log("[v0] 🔵 ПОЧАТОК ЗАВАНТАЖЕННЯ ФОРМИ");
  console.log("[v0] Competition ID:", competitionId);
  console.log("[v0] User ID:", userId);
  console.log("[v0] BASE_URL:", BASE_URL);
  console.log("=====================================");

  currentCompetitionFormId = competitionId;

  let modal = document.getElementById("competitionFormModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "competitionFormModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2 id="formModalTitle">Форма реєстрації на конкурс</h2>
          <button class="modal-close" onclick="closeCompetitionForm()">&times;</button>
        </div>
        <div class="modal-body" id="formModalBody">
          <div class="loading">Завантаження форми...</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeCompetitionForm()">Закрити</button>
          <button class="btn btn-primary" onclick="submitCompetitionForm()" id="submitFormBtn">
            Надіслати форму
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add("active");
  const formBody = document.getElementById("formModalBody");
  formBody.innerHTML = '<div class="loading">Завантаження форми...</div>';

  try {
    const requestUrl = `${BASE_URL}/api/competitions/${competitionId}`;
    console.log("[v0] 📡 Виконую запит до:", requestUrl);

    const competitionResponse = await fetch(requestUrl);
    console.log(
      "[v0] 📥 Відповідь сервера статус:",
      competitionResponse.status,
    );
    console.log(
      "[v0] 📥 Content-Type:",
      competitionResponse.headers.get("content-type"),
    );

    if (!competitionResponse.ok) {
      const errorText = await competitionResponse.text();
      console.error("[v0] ❌ Помилка сервера:", errorText);
      throw new Error(`Сервер повернув помилку ${competitionResponse.status}`);
    }

    const contentType = competitionResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[v0] ❌ Сервер повернув не JSON:", contentType);
      throw new Error("Сервер повернув невірний формат даних");
    }

    const competitionData = await competitionResponse.json();
    console.log("[v0] ✅ Дані конкурсу отримано:", competitionData);

    if (!competitionData || !competitionData.competition) {
      throw new Error("Дані конкурсу відсутні");
    }

    const competition = competitionData.competition;
    console.log("[v0] 📋 Назва конкурсу:", competition.title);
    console.log("[v0] 📋 Custom fields (raw):", competition.custom_fields);
    console.log(
      "[v0] 📋 Custom fields type:",
      typeof competition.custom_fields,
    );

    try {
      const responseCheckUrl = `${BASE_URL}/api/competitions/${competitionId}/form-response/${userId}`;
      console.log("[v0] 🔍 Перевірка існуючої відповіді:", responseCheckUrl);

      const responseResponse = await fetch(responseCheckUrl);

      if (responseResponse.ok) {
        const responseData = await responseResponse.json();
        console.log("[v0] 📝 Відповідь з сервера:", responseData);

        if (responseData.response && responseData.response.form_data) {
          console.log("[v0] ✅ Форма вже заповнена, показуємо відповідь");
          displaySubmittedForm(competition, responseData.response);
          return;
        }
      }

      console.log("[v0] ℹ️ Форма ще не заповнена, показуємо форму");
    } catch (e) {
      console.log(
        "[v0] ℹ️ Помилка перевірки відповіді (не критично):",
        e.message,
      );
    }

    let customFields = [];

    if (competition.custom_fields) {
      if (Array.isArray(competition.custom_fields)) {
        customFields = competition.custom_fields;
        console.log("[v0] ✅ Custom fields це вже масив:", customFields);
      } else if (typeof competition.custom_fields === "string") {
        try {
          customFields = JSON.parse(competition.custom_fields);
          console.log("[v0] ✅ Custom fields парсинуто з рядка:", customFields);
        } catch (e) {
          console.error("[v0] ❌ Помилка парсування:", e);
          customFields = [];
        }
      } else if (typeof competition.custom_fields === "object") {
        customFields = [competition.custom_fields];
        console.log(
          "[v0] ✅ Custom fields конвертовано в масив:",
          customFields,
        );
      }
    }

    console.log(
      "[v0] 📋 Фінальні custom fields для відображення:",
      customFields,
    );
    console.log("[v0] 📋 Кількість кастомних полів:", customFields.length);

    // Parse standard fields
    let standardFields = {};
    if (competition.standard_fields) {
      if (typeof competition.standard_fields === "string") {
        try {
          standardFields = JSON.parse(competition.standard_fields);
        } catch (e) {
          console.error("[v0] Помилка парсування standard_fields:", e);
        }
      } else {
        standardFields = competition.standard_fields;
      }
    }
    console.log("[v0] 📋 Standard fields:", standardFields);

    // Standard fields configuration
    const STANDARD_FIELDS_CONFIG = {
      // Student data
      student_name: {
        label: "ПІБ учня",
        type: "text",
        placeholder: "Введіть ваше повне ім'я",
        required: true,
      },
      student_email: {
        label: "Електронна пошта",
        type: "email",
        placeholder: "example@email.com",
        required: true,
      },
      student_phone: {
        label: "Номер телефону",
        type: "tel",
        placeholder: "+380...",
        required: true,
      },
      student_birthdate: {
        label: "Дата народження",
        type: "date",
        placeholder: "",
        required: false,
      },
      student_class: {
        label: "Клас / курс",
        type: "text",
        placeholder: "Наприклад: 10-А",
        required: false,
      },
      student_school: {
        label: "Навчальний заклад",
        type: "text",
        placeholder: "Назва школи / ліцею / гімназії",
        required: false,
      },
      student_city: {
        label: "Місто / область",
        type: "text",
        placeholder: "Місто, область",
        required: false,
      },
      student_country: {
        label: "Країна",
        type: "text",
        placeholder: "Україна",
        required: false,
      },
      // Mentor data
      mentor_name: {
        label: "ПІБ керівника",
        type: "text",
        placeholder: "ПІБ вашого керівника / ментора",
        required: false,
      },
      mentor_email: {
        label: "Email керівника",
        type: "email",
        placeholder: "mentor@email.com",
        required: false,
      },
      mentor_phone: {
        label: "Телефон керівника",
        type: "tel",
        placeholder: "+380...",
        required: false,
      },
      mentor_position: {
        label: "Посада / школа / університет керівника",
        type: "text",
        placeholder: "Посада, місце роботи",
        required: false,
      },
      // Work data
      work_title: {
        label: "Назва роботи / проєкту",
        type: "text",
        placeholder: "Введіть назву вашої роботи",
        required: false,
      },
      work_category: {
        label: "Категорія / секція конкурсу",
        type: "text",
        placeholder: "Наприклад: Інформатика",
        required: false,
      },
      work_description: {
        label: "Короткий опис (abstract)",
        type: "textarea",
        placeholder: "Опишіть вашу роботу (до 500 слів)",
        required: false,
      },
      work_keywords: {
        label: "Ключові слова",
        type: "text",
        placeholder: "Через кому: програмування, алгоритми, ...",
        required: false,
      },
      // Files
      file_work: {
        label: "Файл роботи (PDF / DOCX)",
        type: "file",
        placeholder: "",
        required: false,
      },
      file_presentation: {
        label: "Презентація (PPTX / PDF)",
        type: "file",
        placeholder: "",
        required: false,
      },
      file_photo: {
        label: "Фото або постер",
        type: "file",
        placeholder: "",
        required: false,
      },
      // Consent
      consent_data: {
        label: "Я даю згоду на обробку персональних даних",
        type: "boolean",
        placeholder: "",
        required: false,
      },
      consent_authorship: {
        label: "Я підтверджую, що робота є моєю власною і не є плагіатом",
        type: "boolean",
        placeholder: "",
        required: false,
      },
    };

    // Generate standard fields HTML based on saved configuration
    function generateStandardFieldsHTML(standardFields) {
      let html = "";

      // Check each standard field
      for (const [fieldKey, isEnabled] of Object.entries(standardFields)) {
        if (!isEnabled) continue;

        const config = STANDARD_FIELDS_CONFIG[fieldKey];
        if (!config) continue;

        const fieldId = `field_${fieldKey}`;
        const requiredClass = config.required ? "required" : "";
        const requiredAttr = config.required ? "required" : "";

        if (config.type === "textarea") {
          html += `
            <div class="form-field">
              <label for="${fieldId}" class="${requiredClass}">${config.label}</label>
              <textarea 
                id="${fieldId}" 
                name="${fieldKey}"
                placeholder="${config.placeholder}"
                rows="4"
                ${requiredAttr}
              ></textarea>
            </div>
          `;
        } else if (config.type === "boolean") {
          html += `
            <div class="form-field form-field-checkbox">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="${fieldId}" 
                  name="${fieldKey}"
                  ${requiredAttr}
                />
                <span>${config.label}</span>
              </label>
            </div>
          `;
        } else if (config.type === "file") {
          html += `
            <div class="form-field">
              <label for="${fieldId}" class="${requiredClass}">${config.label}</label>
              <input 
                type="file" 
                id="${fieldId}" 
                name="${fieldKey}"
                ${requiredAttr}
              />
              <small>Максимальний розмір файлу: 50 МБ</small>
            </div>
          `;
        } else {
          html += `
            <div class="form-field">
              <label for="${fieldId}" class="${requiredClass}">${config.label}</label>
              <input 
                type="${config.type}" 
                id="${fieldId}" 
                name="${fieldKey}"
                placeholder="${config.placeholder}"
                ${requiredAttr}
              />
            </div>
          `;
        }
      }

      return html;
    }

    // Check if standard_fields exist and have any enabled fields
    const hasStandardFields =
      Object.keys(standardFields).length > 0 &&
      Object.values(standardFields).some((v) => v === true);

    // If no standard fields configured, use default (student_name, student_email, student_phone)
    const defaultStandardFields = {
      student_name: true,
      student_email: true,
      student_phone: true,
    };

    const fieldsToUse = hasStandardFields
      ? standardFields
      : defaultStandardFields;
    const standardFieldsHTML = generateStandardFieldsHTML(fieldsToUse);

    document.getElementById("formModalTitle").textContent = competition.title;

    const formHTML = `
      <div class="competition-full-details">
        <div class="competition-detail-section">
          <h3>Інформація про конкурс</h3>
          ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
          
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <div>
                <strong>Початок:</strong>
                <span>${new Date(competition.start_date).toLocaleDateString("uk-UA")}</span>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <div>
                <strong>Закінчення:</strong>
                <span>${new Date(competition.end_date).toLocaleDateString("uk-UA")}</span>
              </div>
            </div>
            ${
              competition.location
                ? `
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <div>
                <strong>Місце:</strong>
                <span>${competition.location}</span>
              </div>
            </div>
            `
                : ""
            }
            ${
              competition.max_participants
                ? `
            <div class="detail-item">
              <span class="detail-icon">👥</span>
              <div>
                <strong>Максимум учасників:</strong>
                <span>${competition.max_participants}</span>
              </div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="student-form-section">
          <h3>Форма для заповнення</h3>
          <p class="form-description">
            Будь ласка, заповніть всі обов'язкові поля нижче. Поля позначені зірочкою (*) є обов'язковими.
          </p>

          <form class="student-form" id="studentRegistrationForm">
            <!-- Стандартні поля (динамічно згенеровані) -->
            ${standardFieldsHTML}

            <!-- Кастомні поля -->
            ${
              customFields && customFields.length > 0
                ? customFields
                    .map((field, index) => {
                      console.log(`[v0] 🔨 Генерую поле ${index}:`, field);

                      const fieldId = `field_custom_${index}`;
                      const isRequired = field.required ? "required" : "";
                      const requiredClass = field.required ? "required" : "";

                      switch (field.type) {
                        case "text":
                        case "email":
                        case "tel":
                        case "url":
                        case "number":
                        case "date":
                          return `
                    <div class="form-field">
                      <label for="${fieldId}" class="${requiredClass}">${field.label}</label>
                      <input 
                        type="${field.type}" 
                        id="${fieldId}" 
                        name="custom_${index}"
                        placeholder="${field.placeholder || ""}"
                        ${isRequired}
                      />
                      ${field.description ? `<small>${field.description}</small>` : ""}
                    </div>
                  `;
                        case "textarea":
                          return `
                    <div class="form-field">
                      <label for="${fieldId}" class="${requiredClass}">${field.label}</label>
                      <textarea 
                        id="${fieldId}" 
                        name="custom_${index}"
                        placeholder="${field.placeholder || ""}"
                        rows="4"
                        ${isRequired}
                      ></textarea>
                      ${field.description ? `<small>${field.description}</small>` : ""}
                    </div>
                  `;
                        case "file":
                          return `
                    <div class="form-field">
                      <label for="${fieldId}" class="${requiredClass}">📎 ${field.label}</label>
                      <input 
                        type="file" 
                        id="${fieldId}" 
                        name="custom_${index}"
                        placeholder="${field.placeholder || ""}"
                        ${isRequired}
                      />
                      <small>Максимальний розмір файлу: 50 МБ. ${field.description ? field.description : ""}</small>
                    </div>
                  `;
                        case "select":
                          const options = field.options || [];
                          return `
                    <div class="form-field">
                      <label for="${fieldId}" class="${requiredClass}">${field.label}</label>
                      <select 
                        id="${fieldId}" 
                        name="custom_${index}"
                        ${isRequired}
                      >
                        <option value="">Оберіть...</option>
                        ${options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
                      </select>
                      ${field.description ? `<small>${field.description}</small>` : ""}
                    </div>
                  `;
                        case "radio":
                          const radioOptions = field.options || [];
                          return `
                    <div class="form-field">
                      <label class="${requiredClass}">${field.label}</label>
                      <div class="radio-group">
                        ${radioOptions
                          .map(
                            (opt) => `
                          <label class="radio-option">
                            <input 
                              type="radio" 
                              name="custom_${index}" 
                              value="${opt}"
                              ${isRequired}
                            />
                            <span>${opt}</span>
                          </label>
                        `,
                          )
                          .join("")}
                      </div>
                      ${field.description ? `<small>${field.description}</small>` : ""}
                    </div>
                  `;
                        case "checkbox":
                          const checkboxOptions = field.options || [];
                          return `
                    <div class="form-field">
                      <label class="${requiredClass}">${field.label}</label>
                      <div class="checkbox-group">
                        ${checkboxOptions
                          .map(
                            (opt) => `
                          <label class="checkbox-option">
                            <input 
                              type="checkbox" 
                              name="custom_${index}[]" 
                              value="${opt}"
                            />
                            <span>${opt}</span>
                          </label>
                        `,
                          )
                          .join("")}
                      </div>
                      ${field.description ? `<small>${field.description}</small>` : ""}
                    </div>
                  `;
                        default:
                          console.warn(
                            `[v0] ⚠️ Невідомий тип поля: ${field.type}`,
                          );
                          return "";
                      }
                    })
                    .join("")
                : '<p class="info-message">📝 Додаткових полів немає</p>'
            }
          </form>
        </div>
      </div>
    `;

    formBody.innerHTML = formHTML;
    console.log("[v0] ✅ Форма успішно згенерована!");
    console.log("=====================================");
  } catch (error) {
    console.error("[v0] ❌ КРИТИЧНА ПОМИЛКА:", error);
    console.error("[v0] Error stack:", error.stack);

    formBody.innerHTML = `
      <div class="empty-state">
        <h3>❌ Помилка завантаження форми</h3>
        <p><strong>Деталі:</strong> ${error.message}</p>
        <p><strong>URL:</strong> ${BASE_URL}/api/competitions/${competitionId}</p>
        <p>Переконайтеся, що сервер запущений та доступний.</p>
        <button class="btn btn-primary" onclick="openCompetitionForm(${competitionId})">
          🔄 Спробувати ще раз
        </button>
      </div>
    `;
  }
}

function displaySubmittedForm(competition, response) {
  console.log("[v0] Відображення заповненої форми");
  const formBody = document.getElementById("formModalBody");
  const submitBtn = document.getElementById("submitFormBtn");
  submitBtn.style.display = "none";

  let customFields = [];
  if (competition.custom_fields) {
    try {
      customFields =
        typeof competition.custom_fields === "string"
          ? JSON.parse(competition.custom_fields)
          : competition.custom_fields;
    } catch (e) {
      console.error("[v0] Помилка парсування custom_fields:", e);
    }
  }

  // Parse standard fields
  let standardFields = {};
  if (competition.standard_fields) {
    try {
      standardFields =
        typeof competition.standard_fields === "string"
          ? JSON.parse(competition.standard_fields)
          : competition.standard_fields;
    } catch (e) {
      console.error("[v0] Помилка парсування standard_fields:", e);
    }
  }

  // Standard fields labels
  const STANDARD_FIELDS_LABELS = {
    student_name: "ПІБ учня",
    student_email: "Електронна пошта",
    student_phone: "Номер телефону",
    student_birthdate: "Дата народження",
    student_class: "Клас / курс",
    student_school: "Навчальний заклад",
    student_city: "Місто / область",
    student_country: "Країна",
    mentor_name: "ПІБ керівника",
    mentor_email: "Email керівника",
    mentor_phone: "Телефон керівника",
    mentor_position: "Посада керівника",
    work_title: "Назва роботи",
    work_category: "Категорія",
    work_description: "Опис роботи",
    work_keywords: "Ключові слова",
    file_work: "Файл роботи",
    file_presentation: "Презентація",
    file_photo: "Фото / постер",
    consent_data: "Згода на обробку даних",
    consent_authorship: "Підтвердження авторства",
  };

  const formData =
    typeof response.form_data === "string"
      ? JSON.parse(response.form_data)
      : response.form_data;

  // Generate standard fields display
  const hasStandardFields =
    Object.keys(standardFields).length > 0 &&
    Object.values(standardFields).some((v) => v === true);
  const defaultStandardFields = {
    student_name: true,
    student_email: true,
    student_phone: true,
  };
  const fieldsToUse = hasStandardFields
    ? standardFields
    : defaultStandardFields;

  const standardFieldsHTML = Object.entries(fieldsToUse)
    .filter(([key, isEnabled]) => isEnabled)
    .map(([key]) => {
      const label = STANDARD_FIELDS_LABELS[key] || key;
      let value = formData[key];

      // Handle boolean/checkbox fields
      if (key.startsWith("consent_")) {
        value = value === "on" || value === true ? "Так" : value || "-";
      }

      if (!value && value !== false) return "";
      return `
        <div class="data-item">
          <strong>${label}:</strong>
          <span>${Array.isArray(value) ? value.join(", ") : value}</span>
        </div>
      `;
    })
    .join("");

  const submittedHTML = `
    <div class="competition-full-details">
      <div class="alert alert-success">
        <strong>Форму вже заповнено!</strong>
        <p>Ви подали свою заявку ${new Date(response.submitted_at).toLocaleString("uk-UA")}</p>
      </div>

      <div class="competition-detail-section">
        <h3>Інформація про конкурс</h3>
        ${competition.description ? `<p class="competition-description">${competition.description}</p>` : ""}
      </div>

      <div class="student-form-section">
        <h3>Ваші відповіді</h3>
        
        <div class="submitted-data">
          ${standardFieldsHTML}

          ${customFields
            .map((field, index) => {
              const value = formData[`custom_${index}`];
              if (!value) return "";
              return `
              <div class="data-item">
                <strong>${field.label}:</strong>
                <span>${Array.isArray(value) ? value.join(", ") : value}</span>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    </div>
  `;

  formBody.innerHTML = submittedHTML;
}

function closeCompetitionForm() {
  const modal = document.getElementById("competitionFormModal");
  if (modal) {
    modal.classList.remove("active");
  }
  currentCompetitionFormId = null;
}

async function submitCompetitionForm() {
  const form = document.getElementById("studentRegistrationForm");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  const data = {};
  const filesToUpload = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const fieldIndex = key.replace("custom_", "");
      filesToUpload.push({
        fieldKey: key,
        fieldIndex: fieldIndex,
        file: value,
      });
      // Store reference instead of actual file
      data[key] = value.name; // Store filename reference
    } else if (key.endsWith("[]")) {
      const cleanKey = key.replace("[]", "");
      if (!data[cleanKey]) {
        data[cleanKey] = [];
      }
      data[cleanKey].push(value);
    } else {
      data[key] = value;
    }
  }

  console.log("[v0] Відправка даних форми:", data);
  console.log("[v0] Файли для завантаження:", filesToUpload.length);

  try {
    const response = await fetch(
      `${BASE_URL}/api/competitions/${currentCompetitionFormId}/form-response`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          formData: data,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[v0] ❌ Помилка відправки форми:", result.error);
      alert(`❌ Помилка: ${result.error}`);
      return;
    }

    console.log("[v0] ✅ Форма успішно відправлена");

    if (filesToUpload.length > 0) {
      console.log("[v0] 📤 Початок завантаження файлів...");
      for (const fileData of filesToUpload) {
        const fileFormData = new FormData();
        fileFormData.append("file", fileData.file);
        fileFormData.append("userId", userId);
        fileFormData.append("fieldIndex", fileData.fieldIndex);
        fileFormData.append("description", `Form field: ${fileData.fieldKey}`);

        try {
          const uploadResponse = await fetch(
            `${BASE_URL}/api/competitions/${currentCompetitionFormId}/form-file-upload`,
            {
              method: "POST",
              body: fileFormData,
            },
          );

          if (uploadResponse.ok) {
            console.log(
              "[v0] ✅ Файл успішно завантажено:",
              fileData.file.name,
            );
          } else {
            console.error(
              "[v0] ⚠️ Помилка завантаження файлу:",
              fileData.file.name,
            );
          }
        } catch (fileError) {
          console.error("[v0] ⚠️ Помилка завантаження файлу:", fileError);
        }
      }
    }

    alert("✅ Форму успішно відправлено!");
    closeCompetitionForm();
    loadMyCompetitions();
  } catch (error) {
    console.error("[v0] ❌ Помилка відправки форми:", error);
    alert("❌ Помилка відправки форми. Спробуйте ще раз.");
  }
}

function openUploadModal(competitionId) {
  document.getElementById("uploadCompetitionId").value = competitionId;
  document.getElementById("uploadFileModal").style.display = "flex";
  loadMyDocuments(competitionId);
}

function closeUploadModal() {
  document.getElementById("uploadFileModal").style.display = "none";
  document.getElementById("uploadFileForm").reset();
}

async function uploadFile() {
  const competitionId = document.getElementById("uploadCompetitionId").value;
  const fileInput = document.getElementById("fileInput");
  const description = document.getElementById("fileDescription").value;

  if (!fileInput.files[0]) {
    alert("Будь ласка, оберіть файл");
    return;
  }

  const maxSize = 50 * 1024 * 1024;
  if (fileInput.files[0].size > maxSize) {
    alert("Файл занадто великий. Максимальний розмір: 50 МБ");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("userId", userId);
  formData.append("description", description);

  try {
    const uploadBtn = document.querySelector(
      "#uploadFileModal .btn-primary:last-of-type",
    );
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Завантаження...";

    const response = await fetch(
      `${BASE_URL}/api/competitions/${competitionId}/documents/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (response.ok) {
      alert("✅ Файл успішно завантажено!");
      document.getElementById("uploadFileForm").reset();
      loadMyDocuments(competitionId);
    } else {
      alert(`❌ Помилка: ${data.error}`);
    }
  } catch (error) {
    console.error("❌ Помилка завантаження файлу:", error);
    alert("❌ Помилка завантаження файлу. Спробуйте ще раз.");
  } finally {
    const uploadBtn = document.querySelector(
      "#uploadFileModal .btn-primary:last-of-type",
    );
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Завантажити файл";
  }
}

async function loadMyDocuments(competitionId) {
  const container = document.getElementById("myDocumentsList");
  container.innerHTML = '<div class="loading">Завантаження...</div>';

  try {
    const response = await fetch(
      `${BASE_URL}/api/competitions/${competitionId}/documents/my/${userId}`,
    );
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML =
        '<div class="empty-state"><p>Помилка завантаження файлів</p></div>';
      return;
    }

    if (data.documents.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Ви ще не завантажили жодного файлу</p></div>';
      return;
    }

    container.innerHTML = data.documents
      .map((doc) => {
        const uploadDate = new Date(doc.uploaded_at).toLocaleDateString(
          "uk-UA",
        );
        const fileSize = (doc.file_size / 1024 / 1024).toFixed(2);

        return `
          <div class="document-item">
            <div class="document-info">
              <div class="document-name">📄 ${doc.original_name}</div>
              <div class="document-meta">
                <span>📅 ${uploadDate}</span>
                <span>💾 ${fileSize} МБ</span>
              </div>
              ${doc.description ? `<div class="document-description">${doc.description}</div>` : ""}
            </div>
            <div class="document-actions">
              <button class="btn btn-sm btn-view" onclick="previewFile('${doc.file_path}', '${doc.original_name}', '${doc.file_type}')">
                👁️ Переглянути
              </button>
              <button class="btn btn-sm btn-primary" onclick="window.open('${BASE_URL}${doc.file_path}', '_blank')">
                ⬇️ Завантажити
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteDocument(${doc.id}, ${competitionId})">
                🗑️ Видалити
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Помилка завантаження документів:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Помилка завантаження файлів</p></div>';
  }
}

async function deleteDocument(documentId, competitionId) {
  if (!confirm("Ви впевнені, що хочете видалити цей файл?")) {
    return;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/competitions/documents/${documentId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          userRole: "учень",
        }),
      },
    );

    if (response.ok) {
      alert("Файл успішно видалено");
      loadMyDocuments(competitionId);
    } else {
      const data = await response.json();
      alert(`Помилка: ${data.error}`);
    }
  } catch (error) {
    console.error("Помилка видалення файлу:", error);
    alert("Помилка видалення файлу");
  }
}

function previewFile(filePath, fileName, fileType) {
  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.style.zIndex = "10000";

  let content = "";

  if (fileType && fileType.startsWith("image/")) {
    content = `<img src="${BASE_URL}${filePath}" alt="${fileName}" style="max-width: 100%; max-height: 80vh;" />`;
  } else if (fileType === "application/pdf") {
    content = `<iframe src="${BASE_URL}${filePath}" style="width: 100%; height: 80vh;" frameborder="0"></iframe>`;
  } else {
    content = `
      <div class="empty-state">
        <p>Попередній перегляд недоступний для цього типу файлу</p>
        <button class="btn btn-primary" onclick="window.open('${BASE_URL}${filePath}', '_blank')">
          Відкрити файл
        </button>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h2>${fileName}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body" style="text-align: center;">
        ${content}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Закрити</button>
        <button class="btn btn-primary" onclick="window.open('${BASE_URL}${filePath}', '_blank')">
          Завантажити файл
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function logout() {
  localStorage.removeItem("userId");
  window.location.href = "auth.html";
}
