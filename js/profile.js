// 🔧 Визначаємо, де зараз запущений сайт — локально чи онлайн
let BASE_URL;
if (window.location.hostname === "localhost") {
  // 🖥️ Локальний режим
  BASE_URL = "http://localhost:3000";
} else {
  // ☁️ Онлайн-сервер Render
  BASE_URL = "https://ievents-qf5k.onrender.com";
}
console.log("📡 Підключення до:", BASE_URL);

const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole") || "учень";

if (!userId || userId === "undefined" || userId === "null") {
  console.error("Invalid userId, redirecting to auth");
  window.location.href = "auth.html";
}

let avatarFile = null;
let originalImage = null;
let imageState = {
  scale: 1,
  rotate: 0,
  flipH: false,
  flipV: false,
  offsetX: 0,
  offsetY: 0,
};

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

function toggleFieldsByRole() {
  const isStudent = userRole === "учень";

  // Показуємо/приховуємо поля для учнів
  document.getElementById("schoolSelectGroup").style.display = isStudent
    ? "block"
    : "none";
  document.getElementById("schoolTextGroup").style.display = isStudent
    ? "none"
    : "block";
  document.getElementById("gradeStudentGroup").style.display = isStudent
    ? "flex"
    : "none";
  document.getElementById("gradeTextGroup").style.display = isStudent
    ? "none"
    : "block";
  document.getElementById("clubGroup").style.display = isStudent
    ? "flex"
    : "none";

  // Встановлюємо required для полів учнів
  if (isStudent) {
    document.getElementById("schoolSelect").required = true;
    document.getElementById("gradeNumber").required = true;
    document.getElementById("school").required = false;
    document.getElementById("grade").required = false;
  } else {
    document.getElementById("schoolSelect").required = false;
    document.getElementById("gradeNumber").required = false;
    document.getElementById("school").required = false;
    document.getElementById("grade").required = false;
  }
}

async function loadSchools() {
  try {
    const response = await fetch(`${BASE_URL}/api/schools`);
    const data = await response.json();

    if (response.ok && data.schools) {
      const select = document.getElementById("schoolSelect");
      data.schools.forEach((school) => {
        const option = document.createElement("option");
        option.value = school.id;
        option.textContent = `${school.id} – ${school.name}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading schools:", error);
  }
}

async function loadProfile() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`);
    const data = await response.json();

    if (response.ok && data.profile) {
      const profile = data.profile;
      document.getElementById("firstName").value = profile.first_name || "";
      document.getElementById("lastName").value = profile.last_name || "";
      document.getElementById("middleName").value = profile.middle_name || "";
      document.getElementById("telegram").value = profile.telegram || "";
      document.getElementById("phone").value = profile.phone || "";

      if (profile.birth_date) {
        const date = new Date(profile.birth_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        document.getElementById("birthDate").value = `${year}-${month}-${day}`;
      } else {
        document.getElementById("birthDate").value = "";
      }

      document.getElementById("city").value = profile.city || "";

      if (userRole === "учень") {
        if (profile.school_id) {
          document.getElementById("schoolSelect").value = String(
            profile.school_id,
          );
          console.log("[v0] Student school_id loaded:", profile.school_id);
        }
        document.getElementById("gradeNumber").value =
          profile.grade_number || "";
        document.getElementById("gradeLetter").value =
          profile.grade_letter || "";
        document.getElementById("clubInstitution").value =
          profile.club_institution || "";
        document.getElementById("clubName").value = profile.club_name || "";
      } else {
        document.getElementById("school").value = profile.school || "";
        document.getElementById("grade").value = profile.grade || "";
      }

      document.getElementById("interests").value = profile.interests || "";
      document.getElementById("bio").value = profile.bio || "";

      const avatarPreview = document.getElementById("avatarPreview");
      if (profile.avatar) {
        console.log("Завантаження аватара з бази даних:", profile.avatar);
        const avatarUrl = `${profile.avatar}?t=${Date.now()}`;
        avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="console.error('Помилка завантаження аватара'); this.parentElement.innerHTML='<span class=\\'avatar-placeholder\\'>📷</span>'">`;
      } else {
        console.log("Аватар не знайдено в базі даних");
        avatarPreview.innerHTML = '<span class="avatar-placeholder">📷</span>';
      }

      const roleValue = document.getElementById("roleValue");
      roleValue.textContent = userRole;
    } else {
      console.error("Failed to load profile:", data.error);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

function openAvatarEditor() {
  const file = avatarFile;
  if (!file) {
    alert("Спочатку завантажте фото");
    return;
  }

  document.getElementById("avatarEditorModal").style.display = "flex";
  redrawCanvas();
}

function closeAvatarEditor() {
  document.getElementById("avatarEditorModal").style.display = "none";
  resetAvatarEditor();
}

function redrawCanvas() {
  if (!originalImage) return;

  const canvas = document.getElementById("avatarCanvas");
  const ctx = canvas.getContext("2d");
  const img = originalImage;

  canvas.width = 280;
  canvas.height = 280;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  ctx.translate(imageState.offsetX, imageState.offsetY);

  // Поворот
  if (imageState.rotate !== 0) {
    ctx.rotate((imageState.rotate * Math.PI) / 180);
  }

  // Відзеркалення
  if (imageState.flipH || imageState.flipV) {
    ctx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1);
  }

  // Масштабування
  const scale = imageState.scale;
  const w = (img.width * scale) / 2;
  const h = (img.height * scale) / 2;

  ctx.drawImage(img, -w, -h, img.width * scale, img.height * scale);
  ctx.restore();

  // Додаємо бордюр
  ctx.strokeStyle = "#7ec8e3";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(140, 140, 140, 0, Math.PI * 2);
  ctx.stroke();
}

function resetAvatarEditor() {
  imageState = {
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0,
  };
  document.getElementById("scaleSlider").value = 1;
  document.getElementById("rotateSlider").value = 0;
  document.getElementById("flipHorizontal").checked = false;
  document.getElementById("flipVertical").checked = false;
  updateSliderValues();
  redrawCanvas();
}

function updateSliderValues() {
  document.getElementById("scaleValue").textContent =
    Math.round(imageState.scale * 100) + "%";
  document.getElementById("rotateValue").textContent = imageState.rotate + "°";
}

document.addEventListener("DOMContentLoaded", () => {
  const scaleSlider = document.getElementById("scaleSlider");
  const rotateSlider = document.getElementById("rotateSlider");
  const flipH = document.getElementById("flipHorizontal");
  const flipV = document.getElementById("flipVertical");
  const canvas = document.getElementById("avatarCanvas");

  if (scaleSlider) {
    scaleSlider.addEventListener("input", (e) => {
      imageState.scale = parseFloat(e.target.value);
      updateSliderValues();
      redrawCanvas();
    });
  }

  if (rotateSlider) {
    rotateSlider.addEventListener("input", (e) => {
      imageState.rotate = parseInt(e.target.value);
      updateSliderValues();
      redrawCanvas();
    });
  }

  if (flipH) {
    flipH.addEventListener("change", (e) => {
      imageState.flipH = e.target.checked;
      redrawCanvas();
    });
  }

  if (flipV) {
    flipV.addEventListener("change", (e) => {
      imageState.flipV = e.target.checked;
      redrawCanvas();
    });
  }

  if (canvas) {
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartOffsetX = imageState.offsetX;
      dragStartOffsetY = imageState.offsetY;
      canvas.style.cursor = "grabbing";
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      imageState.offsetX = dragStartOffsetX + deltaX;
      imageState.offsetY = dragStartOffsetY + deltaY;

      redrawCanvas();
    });

    canvas.addEventListener("mouseup", () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    });

    canvas.addEventListener("mouseleave", () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    });

    canvas.style.cursor = "grab";
  }
});

function confirmAvatar() {
  const canvas = document.getElementById("avatarCanvas");
  canvas.toBlob((blob) => {
    const file = new File([blob], "avatar.png", { type: "image/png" });
    avatarFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("avatarPreview").innerHTML =
        `<img src="${e.target.result}" alt="Avatar">`;
      document.getElementById("clearAvatarBtn").style.display = "block";
    };
    reader.readAsDataURL(blob);

    closeAvatarEditor();
  }, "image/png");
}

function clearAvatar() {
  avatarFile = null;
  originalImage = null;
  document.getElementById("avatarPreview").innerHTML =
    '<span class="avatar-placeholder">📷</span>';
  document.getElementById("avatarInput").value = "";
  document.getElementById("clearAvatarBtn").style.display = "none";
  imageState = {
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0,
  };
}

document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    console.log("Вибрано файл аватара:", file.name, file.size, "байт");

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл занадто великий. Максимальний розмір: 5MB");
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Дозволені тільки зображення (JPEG, PNG, GIF, WebP)");
      e.target.value = "";
      return;
    }

    avatarFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        imageState = {
          scale: 1,
          rotate: 0,
          flipH: false,
          flipV: false,
          offsetX: 0,
          offsetY: 0,
        };
        document.getElementById("scaleSlider").value = 1;
        document.getElementById("rotateSlider").value = 0;
        document.getElementById("flipHorizontal").checked = false;
        document.getElementById("flipVertical").checked = false;
        updateSliderValues();
        openAvatarEditor();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const messageDiv = document.getElementById("profileMessage");
  messageDiv.style.display = "none";

  console.log("=== Початок збереження профілю ===");
  console.log(
    "Файл аватара для завантаження:",
    avatarFile ? avatarFile.name : "немає",
  );

  const formData = new FormData();
  formData.append("userId", userId);
  formData.append(
    "firstName",
    document.getElementById("firstName").value.trim(),
  );
  formData.append("lastName", document.getElementById("lastName").value.trim());
  formData.append(
    "middleName",
    document.getElementById("middleName").value.trim(),
  );
  formData.append("telegram", document.getElementById("telegram").value.trim());
  formData.append("phone", document.getElementById("phone").value.trim());
  formData.append("birthDate", document.getElementById("birthDate").value);
  formData.append("city", document.getElementById("city").value.trim());
  formData.append(
    "interests",
    document.getElementById("interests").value.trim(),
  );
  formData.append("bio", document.getElementById("bio").value.trim());

  if (userRole === "учень") {
    const schoolId = document.getElementById("schoolSelect").value;
    formData.append("schoolId", schoolId ? Number.parseInt(schoolId, 10) : "");
    console.log("[v0] Submitting school_id:", schoolId);
    formData.append(
      "gradeNumber",
      document.getElementById("gradeNumber").value.trim(),
    );
    formData.append(
      "gradeLetter",
      document.getElementById("gradeLetter").value.trim(),
    );
    formData.append(
      "clubInstitution",
      document.getElementById("clubInstitution").value.trim(),
    );
    formData.append(
      "clubName",
      document.getElementById("clubName").value.trim(),
    );
  } else {
    formData.append("school", document.getElementById("school").value.trim());
    formData.append("grade", document.getElementById("grade").value.trim());
  }

  if (avatarFile) {
    formData.append("avatar", avatarFile);
    console.log("Аватар додано до FormData");
  }

  try {
    console.log("Відправка запиту на сервер...");
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: "POST",
      body: formData,
    });

    console.log("Статус відповіді:", response.status);
    const data = await response.json();
    console.log("Дані відповіді:", data);

    if (response.ok) {
      messageDiv.textContent = "Профіль успішно збережено!";
      messageDiv.className = "message success";
      messageDiv.style.display = "block";

      avatarFile = null;
      document.getElementById("avatarInput").value = "";

      console.log("Перезавантаження профілю з бази даних...");
      setTimeout(async () => {
        await loadProfile();
      }, 500);

      setTimeout(() => {
        messageDiv.style.display = "none";
      }, 3000);
    } else {
      messageDiv.textContent = data.error || "Помилка збереження профілю";
      messageDiv.className = "message error";
      messageDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Помилка збереження профілю:", error);
    messageDiv.textContent = "Помилка з'єднання з сервером";
    messageDiv.className = "message error";
    messageDiv.style.display = "block";
  }

  console.log("=== Кінець збереження профілю ===");
});

toggleFieldsByRole();
loadSchools();
loadProfile();

// ==================== STUDENT SUCCESS PASSPORT ====================

let passportData = {};

function openPassportModal() {
  const overlay = document.getElementById("passportModal");
  overlay.classList.add("active");
  document.getElementById("passportLoading").style.display = "flex";
  document.getElementById("passportContent").style.display = "none";
  document.getElementById("passportDownloadBtn").disabled = true;
  loadPassportData();
}

function closePassportModal() {
  document.getElementById("passportModal").classList.remove("active");
}

// Close on overlay click
document.getElementById("passportModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closePassportModal();
});

async function loadPassportData() {
  try {
    const [profileRes, competitionsRes, resultsRes, rehearsalsRes] =
      await Promise.allSettled([
        fetch(`${BASE_URL}/api/profile/${userId}`),
        fetch(`${BASE_URL}/api/competitions/my/${userId}`),
        fetch(`${BASE_URL}/api/students/${userId}/results`),
        fetch(`${BASE_URL}/api/rehearsals/student/${userId}`),
      ]);

    const profile =
      profileRes.status === "fulfilled" ? await profileRes.value.json() : {};
    const competitions =
      competitionsRes.status === "fulfilled"
        ? await competitionsRes.value.json()
        : {};
    const results =
      resultsRes.status === "fulfilled" ? await resultsRes.value.json() : {};
    const rehearsals =
      rehearsalsRes.status === "fulfilled"
        ? await rehearsalsRes.value.json()
        : {};

    passportData = {
      profile: profile.profile || {},
      competitions: competitions.competitions || [],
      results: results.results || [],
      rehearsals: rehearsals.rehearsals || [],
    };

    renderPassport();
  } catch (err) {
    console.error("Error loading passport data:", err);
    document.getElementById("passportLoading").innerHTML =
      '<p style="color:#c41e3a; font-weight:600;">Помилка завантаження даних</p>';
  }
}

function renderPassport() {
  const { profile, competitions, results, rehearsals } = passportData;

  // Header subtitle
  const fullName = [profile.last_name, profile.first_name, profile.middle_name]
    .filter(Boolean)
    .join(" ");
  document.getElementById("passportStudentName").textContent =
    fullName || "Учень";

  // Profile card
  const avatarEl = document.getElementById("passportAvatar");
  if (profile.avatar) {
    avatarEl.innerHTML = `<img src="${profile.avatar}?t=${Date.now()}" alt="Avatar">`;
  } else {
    avatarEl.innerHTML =
      '<span style="font-size:40px;display:flex;align-items:center;justify-content:center;height:100%;">&#128100;</span>';
  }

  document.getElementById("passportFullName").textContent = fullName || "---";

  const schoolTag = document.getElementById("passportSchool");
  const gradeTag = document.getElementById("passportGrade");
  const cityTag = document.getElementById("passportCity");

  schoolTag.textContent = profile.school || "";
  if (profile.school_id) {
    const schoolSelect = document.getElementById("schoolSelect");
    if (schoolSelect) {
      const opt = schoolSelect.querySelector(
        `option[value="${profile.school_id}"]`,
      );
      if (opt)
        schoolTag.textContent = opt.textContent
          .split(" – ")
          .slice(1)
          .join(" – ");
    }
  }

  if (profile.grade_number) {
    gradeTag.textContent =
      profile.grade_number +
      (profile.grade_letter ? "-" + profile.grade_letter : "") +
      " клас";
  } else if (profile.grade) {
    gradeTag.textContent = profile.grade;
  }

  cityTag.textContent = profile.city || "";

  // Profile details
  const detailsEl = document.getElementById("passportProfileDetails");
  let detailsHtml = "";
  if (profile.birth_date) {
    const bd = new Date(profile.birth_date);
    detailsHtml += `<div class="detail-row"><span class="detail-label">Дата народження:</span> ${bd.toLocaleDateString("uk-UA")}</div>`;
  }
  if (profile.telegram) {
    detailsHtml += `<div class="detail-row"><span class="detail-label">Telegram:</span> ${profile.telegram}</div>`;
  }
  if (profile.phone) {
    detailsHtml += `<div class="detail-row"><span class="detail-label">Телефон:</span> ${profile.phone}</div>`;
  }
  if (profile.club_institution || profile.club_name) {
    detailsHtml += `<div class="detail-row"><span class="detail-label">Гурток:</span> ${[profile.club_institution, profile.club_name].filter(Boolean).join(" / ")}</div>`;
  }
  detailsEl.innerHTML = detailsHtml;

  // Stats
  const totalComps = competitions.length;
  const totalResults = results.length;
  const firstPlaces = results.filter(
    (r) => r.place === 1 || r.place === "1",
  ).length;
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((s, r) => s + (parseFloat(r.score) || 0), 0) /
            results.length,
        )
      : 0;
  const totalRehearsals = rehearsals.length;
  const achievements = results.filter((r) => r.achievement).length;

  const statsHtml = `
    <div class="passport-stat-card">
      <div class="passport-stat-num">${totalComps}</div>
      <div class="passport-stat-label">Конкурсiв</div>
    </div>
    <div class="passport-stat-card">
      <div class="passport-stat-num">${totalResults}</div>
      <div class="passport-stat-label">Результатiв</div>
    </div>
    <div class="passport-stat-card">
      <div class="passport-stat-num">${firstPlaces}</div>
      <div class="passport-stat-label">Перших мiсць</div>
    </div>
    <div class="passport-stat-card">
      <div class="passport-stat-num">${avgScore > 0 ? avgScore : "---"}</div>
      <div class="passport-stat-label">Сер. бал</div>
    </div>
  `;
  document.getElementById("passportStatsGrid").innerHTML = statsHtml;

  // Competitions
  const compSection = document.getElementById("passportCompetitionsSection");
  const compList = document.getElementById("passportCompetitionsList");
  if (competitions.length === 0) {
    compList.innerHTML =
      '<div class="passport-empty">Участi у конкурсах поки немає</div>';
  } else {
    compList.innerHTML = competitions
      .map((c) => {
        const statusClass =
          c.status === "активний"
            ? "active"
            : c.status === "майбутній"
              ? "upcoming"
              : "inactive";
        const statusLabel = c.status || "---";
        const startDate = c.start_date
          ? new Date(c.start_date).toLocaleDateString("uk-UA")
          : "";
        const endDate = c.end_date
          ? new Date(c.end_date).toLocaleDateString("uk-UA")
          : "";
        return `
        <div class="passport-comp-item">
          <div class="passport-comp-status ${statusClass}"></div>
          <div class="passport-comp-info">
            <div class="passport-comp-title">${escPassport(c.title)}</div>
            <div class="passport-comp-meta">${escPassport(statusLabel)}</div>
          </div>
          <div class="passport-comp-dates">${startDate}${endDate ? " - " + endDate : ""}</div>
        </div>
      `;
      })
      .join("");
  }

  // Results
  const resSection = document.getElementById("passportResultsSection");
  const resList = document.getElementById("passportResultsList");
  if (results.length === 0) {
    resList.innerHTML =
      '<div class="passport-empty">Результатiв поки немає</div>';
  } else {
    resList.innerHTML = results
      .map((r) => {
        let placeClass = "other";
        if (r.place == 1) placeClass = "gold";
        else if (r.place == 2) placeClass = "silver";
        else if (r.place == 3) placeClass = "bronze";

        const badges = [];
        if (r.score != null && r.score !== "")
          badges.push(
            `<span class="passport-result-badge score">${r.score} балiв</span>`,
          );
        if (r.achievement)
          badges.push(
            `<span class="passport-result-badge achievement">${escPassport(r.achievement)}</span>`,
          );

        return `
        <div class="passport-result-item">
          <div class="passport-result-place ${placeClass}">${r.place || "?"}</div>
          <div class="passport-result-info">
            <div class="passport-result-title">${escPassport(r.competition_title)}</div>
            <div class="passport-result-details">${badges.join("")}${r.notes ? '<span style="color:#888;">' + escPassport(r.notes) + "</span>" : ""}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // Rehearsals
  const rehSection = document.getElementById("passportRehearsalsSection");
  const rehList = document.getElementById("passportRehearsalsList");
  if (rehearsals.length === 0) {
    rehSection.style.display = "none";
  } else {
    rehSection.style.display = "";
    const months = [
      "Сiч",
      "Лют",
      "Бер",
      "Квiт",
      "Трав",
      "Черв",
      "Лип",
      "Серп",
      "Вер",
      "Жовт",
      "Лист",
      "Груд",
    ];
    rehList.innerHTML = rehearsals
      .map((r) => {
        const d = new Date(r.rehearsal_date);
        const day = d.getDate();
        const month = months[d.getMonth()] || "";
        return `
        <div class="passport-reh-item">
          <div class="passport-reh-date-badge">
            <div class="passport-reh-day">${day}</div>
            <div class="passport-reh-month">${month}</div>
          </div>
          <div class="passport-reh-info">
            <div class="passport-reh-title">${escPassport(r.title)}</div>
            <div class="passport-reh-meta">${escPassport(r.competition_title || "")}${r.location ? " &middot; " + escPassport(r.location) : ""}${r.duration ? " &middot; " + r.duration + " хв" : ""}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // Bio / Interests
  const bioSection = document.getElementById("passportBioSection");
  const bioContent = document.getElementById("passportBioContent");
  if (!profile.interests && !profile.bio) {
    bioSection.style.display = "none";
  } else {
    bioSection.style.display = "";
    let bioHtml = "";
    if (profile.interests) {
      bioHtml += `<div class="passport-bio-block"><div class="passport-bio-label">Iнтереси та хобi</div><div class="passport-bio-text">${escPassport(profile.interests)}</div></div>`;
    }
    if (profile.bio) {
      bioHtml += `<div class="passport-bio-block" style="margin-top:10px;"><div class="passport-bio-label">Про себе</div><div class="passport-bio-text">${escPassport(profile.bio)}</div></div>`;
    }
    bioContent.innerHTML = bioHtml;
  }

  // Footer note
  const now = new Date();
  document.getElementById("passportFooterNote").textContent =
    `Паспорт успiшностi згенеровано ${now.toLocaleDateString("uk-UA")} о ${now.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })} | iEvents`;

  // Show content
  document.getElementById("passportLoading").style.display = "none";
  document.getElementById("passportContent").style.display = "block";
  document.getElementById("passportDownloadBtn").disabled = false;
}

function escPassport(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ==================== PDF DOWNLOAD ====================

async function downloadPassportPDF() {
  const btn = document.getElementById("passportDownloadBtn");
  btn.disabled = true;
  btn.textContent = "Генерацiя...";

  try {
    const { profile, competitions, results, rehearsals } = passportData;

    const fullName =
      [profile.last_name, profile.first_name, profile.middle_name]
        .filter(Boolean)
        .join(" ") || "Учень";

    // School name
    let schoolName = profile.school || "";
    if (profile.school_id) {
      const schoolSelect = document.getElementById("schoolSelect");
      if (schoolSelect) {
        const opt = schoolSelect.querySelector(
          `option[value="${profile.school_id}"]`,
        );
        if (opt) schoolName = opt.textContent.split(" – ").slice(1).join(" – ");
      }
    }

    let gradeTxt = "";
    if (profile.grade_number) {
      gradeTxt =
        profile.grade_number +
        (profile.grade_letter ? "-" + profile.grade_letter : "") +
        " клас";
    } else if (profile.grade) {
      gradeTxt = profile.grade;
    }

    // Stats
    const totalComps = competitions.length;
    const totalResults = results.length;
    const firstPlaces = results.filter((r) => r.place == 1).length;
    const avgScore =
      results.length > 0
        ? Math.round(
            results.reduce((s, r) => s + (parseFloat(r.score) || 0), 0) /
              results.length,
          )
        : 0;

    // Build HTML document
    const esc = (s) => {
      if (!s) return "";
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString("uk-UA");
    const timeStr = now.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Details rows
    let detailsRows = "";
    if (profile.birth_date) {
      const bd = new Date(profile.birth_date);
      detailsRows += `<tr><td class="dl">Дата народження:</td><td>${bd.toLocaleDateString("uk-UA")}</td></tr>`;
    }
    if (profile.telegram)
      detailsRows += `<tr><td class="dl">Telegram:</td><td>${esc(profile.telegram)}</td></tr>`;
    if (profile.phone)
      detailsRows += `<tr><td class="dl">Телефон:</td><td>${esc(profile.phone)}</td></tr>`;
    if (profile.club_institution || profile.club_name) {
      detailsRows += `<tr><td class="dl">Гурток:</td><td>${esc([profile.club_institution, profile.club_name].filter(Boolean).join(" / "))}</td></tr>`;
    }

    // Competitions HTML
    let compsHtml = "";
    if (competitions.length === 0) {
      compsHtml = '<p class="empty">Участi у конкурсах поки немає</p>';
    } else {
      compsHtml =
        '<table class="tbl"><thead><tr><th>Назва конкурсу</th><th>Статус</th><th>Дати</th></tr></thead><tbody>';
      competitions.forEach((c) => {
        const sd = c.start_date
          ? new Date(c.start_date).toLocaleDateString("uk-UA")
          : "";
        const ed = c.end_date
          ? new Date(c.end_date).toLocaleDateString("uk-UA")
          : "";
        compsHtml += `<tr><td>${esc(c.title)}</td><td>${esc(c.status || "---")}</td><td>${sd}${ed ? " - " + ed : ""}</td></tr>`;
      });
      compsHtml += "</tbody></table>";
    }

    // Results HTML
    let resultsHtml = "";
    if (results.length === 0) {
      resultsHtml = '<p class="empty">Результатiв поки немає</p>';
    } else {
      resultsHtml =
        '<table class="tbl"><thead><tr><th>Мiсце</th><th>Конкурс</th><th>Бали</th><th>Досягнення</th><th>Примiтки</th></tr></thead><tbody>';
      results.forEach((r) => {
        resultsHtml += `<tr>
          <td class="center"><strong>${esc(String(r.place || "?"))}</strong></td>
          <td>${esc(r.competition_title)}</td>
          <td class="center">${r.score != null ? esc(String(r.score)) : "---"}</td>
          <td>${esc(r.achievement || "")}</td>
          <td>${esc(r.notes || "")}</td>
        </tr>`;
      });
      resultsHtml += "</tbody></table>";
    }

    // Rehearsals HTML
    let rehHtml = "";
    if (rehearsals.length > 0) {
      rehHtml =
        '<h2>Репетицii</h2><table class="tbl"><thead><tr><th>Дата</th><th>Назва</th><th>Конкурс</th><th>Мiсце</th></tr></thead><tbody>';
      rehearsals.forEach((r) => {
        const rd = r.rehearsal_date
          ? new Date(r.rehearsal_date).toLocaleDateString("uk-UA")
          : "";
        rehHtml += `<tr><td>${rd}</td><td>${esc(r.title)}</td><td>${esc(r.competition_title || "")}</td><td>${esc(r.location || "")}</td></tr>`;
      });
      rehHtml += "</tbody></table>";
    }

    // Bio HTML
    let bioHtml = "";
    if (profile.interests)
      bioHtml += `<h2>Iнтереси та хобi</h2><p>${esc(profile.interests)}</p>`;
    if (profile.bio) bioHtml += `<h2>Про себе</h2><p>${esc(profile.bio)}</p>`;

    const htmlDoc = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<title>Паспорт успiшностi - ${esc(fullName)}</title>
<style>
  @page { margin: 18mm 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; font-size: 13px; line-height: 1.5; padding: 0; }
  .header { background: #1a4d2e; color: white; padding: 22px 28px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 2px; }
  .header-sub { opacity: 0.85; font-size: 13px; }
  .avatar { width: 72px; height: 72px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.5); object-fit: cover; background: rgba(255,255,255,0.15); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 16px; background: #e8f5ef; color: #1a4d2e; font-size: 11px; font-weight: 600; }
  .details { margin-top: 6px; }
  .details td { padding: 2px 0; font-size: 12px; }
  .dl { font-weight: 700; color: #444; padding-right: 10px; white-space: nowrap; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; text-align: center; background: #f5f5f0; border: 1px solid #e0dbd2; border-radius: 10px; padding: 14px 8px; }
  .stat-n { font-size: 28px; font-weight: 900; color: #1a4d2e; line-height: 1; }
  .stat-l { font-size: 10px; color: #888; text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; margin-top: 4px; }
  h2 { font-size: 15px; font-weight: 800; color: #1f2937; margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e0dbd2; }
  .tbl { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 12px; }
  .tbl th { background: #f5f5f0; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid #e0dbd2; font-size: 11px; }
  .tbl td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  .tbl tr:hover { background: #fafaf6; }
  .center { text-align: center; }
  .empty { color: #aaa; font-style: italic; padding: 12px 0; }
  p { margin-bottom: 8px; }
  .footer { text-align: center; color: #aaa; font-size: 11px; margin-top: 28px; padding-top: 12px; border-top: 1px solid #e0dbd2; }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .stat { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .tag { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .tbl th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Паспорт успiшностi учня</h1>
      <div class="header-sub">iEvents | Згенеровано ${dateStr} о ${timeStr}</div>
    </div>
  </div>

  <h1 style="font-size:20px; margin-bottom:4px;">${esc(fullName)}</h1>
  <div class="tags">
    ${schoolName ? '<span class="tag">' + esc(schoolName) + "</span>" : ""}
    ${gradeTxt ? '<span class="tag">' + esc(gradeTxt) + "</span>" : ""}
    ${profile.city ? '<span class="tag">' + esc(profile.city) + "</span>" : ""}
  </div>
  ${detailsRows ? '<table class="details">' + detailsRows + "</table>" : ""}

  <div class="stats" style="margin-top:16px;">
    <div class="stat"><div class="stat-n">${totalComps}</div><div class="stat-l">Конкурсiв</div></div>
    <div class="stat"><div class="stat-n">${totalResults}</div><div class="stat-l">Результатiв</div></div>
    <div class="stat"><div class="stat-n">${firstPlaces}</div><div class="stat-l">Перших мiсць</div></div>
    <div class="stat"><div class="stat-n">${avgScore > 0 ? avgScore : "---"}</div><div class="stat-l">Сер. бал</div></div>
  </div>

  <h2>Участь у конкурсах</h2>
  ${compsHtml}

  <h2>Результати та досягнення</h2>
  ${resultsHtml}

  ${rehHtml}
  ${bioHtml}

  <div class="footer">Паспорт успiшностi учня &mdash; ${esc(fullName)} &mdash; ${dateStr} &mdash; iEvents</div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  <\/script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(
        "Будь ласка, дозвольте спливаючi вiкна для цього сайту i спробуйте знову.",
      );
      return;
    }
    printWindow.document.write(htmlDoc);
    printWindow.document.close();
  } catch (err) {
    console.error("PDF generation error:", err);
    alert("Помилка генерацii PDF: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Завантажити PDF";
  }
}
