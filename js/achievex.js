// AchieveX - Achievement Garage Client Logic
(function () {
  const API = window.AppConfig ? window.AppConfig.API_URL : "";
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");
  const isTeacher = userRole === "вчитель" || userRole === "методист";

  let allAchievements = [];

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", () => {
    if (!userId) {
      window.location.href = "auth.html";
      return;
    }

    // Show/hide role-specific UI
    if (isTeacher) {
      document.getElementById("teacherFilters").style.display = "block";
      document.getElementById("studentFilters").style.display = "none";
    } else {
      document.getElementById("teacherFilters").style.display = "none";
      document.getElementById("studentFilters").style.display = "block";
    }

    loadAchievements();
    loadStats();

    // Form submissions
    document
      .getElementById("achievementForm")
      .addEventListener("submit", handleSubmit);
    document
      .getElementById("confirmForm")
      .addEventListener("submit", handleConfirm);

    // Student filters
    document
      .getElementById("studentFilterCategory")
      .addEventListener("change", applyStudentFilters);
    document
      .getElementById("studentFilterStatus")
      .addEventListener("change", applyStudentFilters);
  });

  // ===== Load Achievements =====
  window.loadAchievements = async function () {
    const grid = document.getElementById("achievementsGrid");
    grid.innerHTML =
      '<div class="achx-loading">Завантаження досягнень...</div>';

    try {
      let url;
      if (isTeacher) {
        const search = document.getElementById("searchInput").value;
        const cat = document.getElementById("filterCategory").value;
        const conf = document.getElementById("filterConfirmed").value;
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (cat) params.set("category", cat);
        if (conf) params.set("confirmed", conf);
        url = `${API}/api/achievex/teacher/${userId}?${params.toString()}`;
      } else {
        url = `${API}/api/achievex/user/${userId}`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (!data.success) throw new Error(data.error);

      allAchievements = data.achievements || [];
      renderAchievements(allAchievements);
    } catch (err) {
      console.error("Error loading achievements:", err);
      grid.innerHTML = '<div class="achx-loading">Помилка завантаження</div>';
    }
  };

  // ===== Apply Student Filters (client-side) =====
  function applyStudentFilters() {
    const cat = document.getElementById("studentFilterCategory").value;
    const status = document.getElementById("studentFilterStatus").value;

    let filtered = [...allAchievements];
    if (cat) filtered = filtered.filter((a) => a.category === cat);
    if (status === "confirmed")
      filtered = filtered.filter((a) => a.teacher_confirmed);
    if (status === "pending")
      filtered = filtered.filter((a) => !a.teacher_confirmed);

    renderAchievements(filtered);
  }

  // ===== Render Achievements =====
  function renderAchievements(achievements) {
    const grid = document.getElementById("achievementsGrid");
    const empty = document.getElementById("emptyState");

    if (!achievements || achievements.length === 0) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    grid.innerHTML = achievements
      .map((a) => {
        const catClass = getCategoryClass(a.category);
        const statusClass = a.teacher_confirmed
          ? "achx-status-confirmed"
          : "achx-status-pending";
        const statusText = a.teacher_confirmed ? "Підтверджено" : "Очікує";
        const statusIcon = a.teacher_confirmed ? "&#10003;" : "&#9679;";

        const dateStr = a.competition_date
          ? new Date(a.competition_date).toLocaleDateString("uk-UA")
          : "";
        const createdStr = new Date(a.created_at).toLocaleDateString("uk-UA");

        // Student info for teacher view
        let studentInfoHtml = "";
        if (isTeacher && a.first_name) {
          const initials = (a.first_name?.[0] || "") + (a.last_name?.[0] || "");
          studentInfoHtml = `
          <div class="achx-card-student-info">
            <div class="achx-student-avatar">
              ${a.avatar ? `<img src="${API}${a.avatar}" alt="">` : initials}
            </div>
            <div>
              <div class="achx-student-name">${a.last_name || ""} ${a.first_name || ""}</div>
              <div class="achx-student-school">${a.school_name || ""}</div>
            </div>
          </div>
        `;
        }

        // Teacher confirmation info
        let teacherInfoHtml = "";
        if (a.teacher_confirmed && a.teacher_comment) {
          teacherInfoHtml = `
          <div class="achx-card-teacher-info">
            <p><strong>Коментар:</strong> ${escapeHtml(a.teacher_comment)}</p>
            ${a.teacher_recommendation ? `<p><strong>Рекомендація:</strong> ${escapeHtml(a.teacher_recommendation)}</p>` : ""}
            ${a.confirmer_first_name ? `<p><strong>Підтвердив:</strong> ${a.confirmer_last_name || ""} ${a.confirmer_first_name || ""}</p>` : ""}
          </div>
        `;
        }

        // Actions
        let actionsHtml = `
        <button class="btn-achx btn-achx-outline btn-achx-xs" onclick="viewDetail(${a.id})">Деталі</button>
        <button class="btn-achx btn-achx-outline btn-achx-xs" onclick="showQr(${a.id})">QR</button>
      `;

        if (isTeacher && !a.teacher_confirmed) {
          actionsHtml += `<button class="btn-achx btn-achx-success btn-achx-xs" onclick="openConfirmModal(${a.id})">Підтвердити</button>`;
        }

        if (!isTeacher || String(a.user_id) === userId) {
          actionsHtml += `
          <button class="btn-achx btn-achx-outline btn-achx-xs" onclick="editAchievement(${a.id})">Ред.</button>
          <button class="btn-achx btn-achx-danger btn-achx-xs" onclick="deleteAchievement(${a.id})">Вид.</button>
        `;
        }

        if (isTeacher && a.teacher_confirmed) {
          actionsHtml += `<button class="btn-achx btn-achx-danger btn-achx-xs" onclick="revokeConfirmation(${a.id})">Скасувати</button>`;
        }

        return `
        <div class="achx-card">
          <div class="achx-card-top">
            <span class="achx-card-category ${catClass}">${a.category || "Інше"}</span>
            ${a.competition_level ? `<span class="achx-meta-tag">${a.competition_level}</span>` : ""}
            <span class="achx-card-status ${statusClass}">${statusIcon} ${statusText}</span>
          </div>
          <div class="achx-card-body">
            ${studentInfoHtml}
            <h3 class="achx-card-title">${escapeHtml(a.title)}</h3>
            ${a.competition_name ? `<p class="achx-card-comp">${escapeHtml(a.competition_name)}${dateStr ? " | " + dateStr : ""}</p>` : ""}
            ${a.competition_place ? `<div class="achx-card-meta"><span class="achx-meta-tag">&#127942; ${escapeHtml(a.competition_place)}</span></div>` : ""}
            ${a.file_name ? `<div class="achx-card-meta"><span class="achx-meta-tag">&#128196; ${escapeHtml(a.file_name)}</span></div>` : ""}
            ${teacherInfoHtml}
          </div>
          <div class="achx-card-footer">
            <span class="achx-card-date">Додано: ${createdStr}</span>
            <div class="achx-card-actions">${actionsHtml}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // ===== Load Stats =====
  async function loadStats() {
    try {
      const resp = await fetch(`${API}/api/achievex/stats/${userId}`);
      const data = await resp.json();
      if (!data.success) return;

      const s = data.stats;
      document.getElementById("statTotal").textContent = s.total;
      document.getElementById("statConfirmed").textContent = s.confirmed;
      document.getElementById("statCategories").textContent =
        s.categories.length;
      document.getElementById("statLevels").textContent = s.levels.length;
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  // ===== Category CSS class =====
  function getCategoryClass(cat) {
    const map = {
      Олімпіада: "achx-cat-olimp",
      Конкурс: "achx-cat-konkurs",
      МАН: "achx-cat-man",
      Спорт: "achx-cat-sport",
      Творчість: "achx-cat-creative",
      Волонтерство: "achx-cat-volunteer",
      Наука: "achx-cat-science",
      Проєкт: "achx-cat-project",
    };
    return map[cat] || "achx-cat-other";
  }

  // ===== Category icon =====
  function getCategoryIcon(cat) {
    const map = {
      Олімпіада: "&#127941;",
      Конкурс: "&#127942;",
      МАН: "&#128218;",
      Спорт: "&#9917;",
      Творчість: "&#127912;",
      Волонтерство: "&#10084;",
      Наука: "&#128300;",
      Проєкт: "&#128161;",
    };
    return map[cat] || "&#11088;";
  }

  // ===== Open Add Modal =====
  window.openAddModal = function () {
    document.getElementById("modalTitle").textContent = "Додати досягнення";
    document.getElementById("editId").value = "";
    document.getElementById("achievementForm").reset();
    document.getElementById("achPublic").checked = true;
    resetFilePreview("diplomaPreview");
    resetFilePreview("projectPreview");
    document.getElementById("achievementModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  };

  // ===== Edit Achievement =====
  window.editAchievement = function (id) {
    const a = allAchievements.find((x) => x.id === id);
    if (!a) return;

    document.getElementById("modalTitle").textContent = "Редагувати досягнення";
    document.getElementById("editId").value = id;
    document.getElementById("achTitle").value = a.title || "";
    document.getElementById("achCategory").value = a.category || "";
    document.getElementById("achLevel").value = a.competition_level || "";
    document.getElementById("achCompName").value = a.competition_name || "";
    document.getElementById("achCompDate").value = a.competition_date
      ? a.competition_date.split("T")[0]
      : "";
    document.getElementById("achPlace").value = a.competition_place || "";
    document.getElementById("achDescription").value = a.description || "";
    document.getElementById("achPublic").checked = a.is_public !== false;

    resetFilePreview("diplomaPreview");
    resetFilePreview("projectPreview");
    if (a.file_name) {
      setFilePreview("diplomaPreview", a.file_name);
    }
    if (a.project_file_name) {
      setFilePreview("projectPreview", a.project_file_name);
    }

    document.getElementById("achievementModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  };

  // ===== Close Modal =====
  window.closeModal = function () {
    document.getElementById("achievementModal").style.display = "none";
    document.body.style.overflow = "";
  };

  // ===== Handle Submit =====
  async function handleSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById("editId").value;
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Збереження...";

    try {
      const formData = new FormData();
      formData.append("title", document.getElementById("achTitle").value);
      formData.append("category", document.getElementById("achCategory").value);
      formData.append(
        "competition_level",
        document.getElementById("achLevel").value,
      );
      formData.append(
        "competition_name",
        document.getElementById("achCompName").value,
      );
      formData.append(
        "competition_date",
        document.getElementById("achCompDate").value,
      );
      formData.append(
        "competition_place",
        document.getElementById("achPlace").value,
      );
      formData.append(
        "description",
        document.getElementById("achDescription").value,
      );
      formData.append(
        "is_public",
        document.getElementById("achPublic").checked ? "true" : "false",
      );
      formData.append("user_id", userId);

      const diplomaFile = document.getElementById("achDiploma").files[0];
      if (diplomaFile) formData.append("diploma", diplomaFile);

      const projectFile = document.getElementById("achProject").files[0];
      if (projectFile) formData.append("project", projectFile);

      let url, method;
      if (editId) {
        url = `${API}/api/achievex/${editId}`;
        method = "PUT";
      } else {
        url = `${API}/api/achievex/${userId}`;
        method = "POST";
      }

      const resp = await fetch(url, { method, body: formData });
      const data = await resp.json();

      if (!data.success) throw new Error(data.error);

      closeModal();
      showToast(
        editId ? "Досягнення оновлено" : "Досягнення додано",
        "success",
      );
      loadAchievements();
      loadStats();
    } catch (err) {
      console.error("Error saving achievement:", err);
      showToast("Помилка збереження: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Зберегти";
    }
  }

  // ===== Delete Achievement =====
  window.deleteAchievement = async function (id) {
    if (!confirm("Ви впевнені, що хочете видалити це досягнення?")) return;

    try {
      const resp = await fetch(`${API}/api/achievex/${id}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      showToast("Досягнення видалено", "success");
      loadAchievements();
      loadStats();
    } catch (err) {
      showToast("Помилка видалення: " + err.message, "error");
    }
  };

  // ===== View Detail =====
  window.viewDetail = function (id) {
    const a = allAchievements.find((x) => x.id === id);
    if (!a) return;

    const API_BASE = API;
    const detailBody = document.getElementById("detailBody");
    document.getElementById("detailTitle").textContent = a.title;

    const dateStr = a.competition_date
      ? new Date(a.competition_date).toLocaleDateString("uk-UA")
      : "---";
    const createdStr = new Date(a.created_at).toLocaleDateString("uk-UA");

    let filesHtml = "";
    if (a.file_path) {
      filesHtml += `<a href="${API_BASE}${a.file_path}" target="_blank" class="achx-file-link">&#128196; ${escapeHtml(a.file_name || "Диплом")}</a>`;
    }
    if (a.project_file_path) {
      filesHtml += `<a href="${API_BASE}${a.project_file_path}" target="_blank" class="achx-file-link">&#128193; ${escapeHtml(a.project_file_name || "Проєкт")}</a>`;
    }

    let confirmationHtml = "";
    if (a.teacher_confirmed) {
      confirmationHtml = `
        <div class="achx-detail-confirmation">
          <h4>&#10003; Підтверджено вчителем</h4>
          ${a.confirmer_first_name ? `<p><strong>Хто підтвердив:</strong> ${a.confirmer_last_name || ""} ${a.confirmer_first_name || ""}</p>` : ""}
          ${a.confirmed_at ? `<p><strong>Дата:</strong> ${new Date(a.confirmed_at).toLocaleDateString("uk-UA")}</p>` : ""}
          ${a.teacher_comment ? `<p><strong>Коментар:</strong> ${escapeHtml(a.teacher_comment)}</p>` : ""}
          ${a.teacher_recommendation ? `<p><strong>Рекомендація:</strong> ${escapeHtml(a.teacher_recommendation)}</p>` : ""}
          ${a.teacher_signature ? `<div class="signature">Підпис: ${escapeHtml(a.teacher_signature)}</div>` : ""}
        </div>
      `;
    }

    // Share link
    const shareUrl = `${window.location.origin}/achievex.html?verify=${a.qr_token}`;
    const shareHtml = `
      <div class="achx-detail-share">
        <input type="text" value="${shareUrl}" readonly onclick="this.select()">
        <button onclick="copyToClipboard('${shareUrl}')">Копіювати</button>
      </div>
    `;

    // QR placeholder
    const qrHtml = `
      <div class="achx-detail-qr">
        <canvas id="detailQrCanvas"></canvas>
        <div class="achx-detail-qr-info">
          <p><strong>QR-код перевірки</strong></p>
          <p>Відскануйте для перевірки автентичності досягнення</p>
        </div>
      </div>
    `;

    detailBody.innerHTML = `
      <div class="achx-detail-grid">
        <div class="achx-detail-item">
          <div class="label">Категорія</div>
          <div class="value">${a.category || "---"}</div>
        </div>
        <div class="achx-detail-item">
          <div class="label">Рівень</div>
          <div class="value">${a.competition_level || "---"}</div>
        </div>
        <div class="achx-detail-item">
          <div class="label">Конкурс / Олімпіада</div>
          <div class="value">${a.competition_name || "---"}</div>
        </div>
        <div class="achx-detail-item">
          <div class="label">Дата проведення</div>
          <div class="value">${dateStr}</div>
        </div>
        <div class="achx-detail-item">
          <div class="label">Результат / Місце</div>
          <div class="value">${a.competition_place || "---"}</div>
        </div>
        <div class="achx-detail-item">
          <div class="label">Додано</div>
          <div class="value">${createdStr}</div>
        </div>
        ${
          a.description
            ? `
          <div class="achx-detail-item achx-detail-full">
            <div class="label">Опис</div>
            <div class="value">${escapeHtml(a.description)}</div>
          </div>
        `
            : ""
        }
        ${filesHtml ? `<div class="achx-detail-files">${filesHtml}</div>` : ""}
        ${confirmationHtml}
        ${qrHtml}
        ${shareHtml}
      </div>
    `;

    document.getElementById("detailModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    // Generate QR code
    setTimeout(() => {
      const canvas = document.getElementById("detailQrCanvas");
      if (canvas && typeof QRCode !== "undefined") {
        const verifyUrl = `${window.location.origin}/achievex.html?verify=${a.qr_token}`;
        QRCode.toCanvas(canvas, verifyUrl, {
          width: 120,
          margin: 2,
          color: { dark: "#78643a", light: "#ffffff" },
        });
      }
    }, 100);
  };

  window.closeDetailModal = function () {
    document.getElementById("detailModal").style.display = "none";
    document.body.style.overflow = "";
  };

  // ===== QR Code =====
  window.showQr = function (id) {
    const a = allAchievements.find((x) => x.id === id);
    if (!a) return;

    const qrBody = document.getElementById("qrBody");
    const verifyUrl = `${window.location.origin}/achievex.html?verify=${a.qr_token}`;

    qrBody.innerHTML = `
      <canvas id="qrCanvas"></canvas>
      <p><strong>${escapeHtml(a.title)}</strong></p>
      <p>Відскануйте QR-код для перевірки автентичності досягнення</p>
      <button class="btn-achx btn-achx-outline btn-achx-sm" onclick="copyToClipboard('${verifyUrl}')">Копіювати посилання</button>
    `;

    document.getElementById("qrModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      const canvas = document.getElementById("qrCanvas");
      if (canvas && typeof QRCode !== "undefined") {
        QRCode.toCanvas(canvas, verifyUrl, {
          width: 200,
          margin: 2,
          color: { dark: "#78643a", light: "#ffffff" },
        });
      }
    }, 100);
  };

  window.closeQrModal = function () {
    document.getElementById("qrModal").style.display = "none";
    document.body.style.overflow = "";
  };

  // ===== Teacher Confirm =====
  window.openConfirmModal = function (id) {
    const a = allAchievements.find((x) => x.id === id);
    if (!a) return;

    document.getElementById("confirmAchId").value = id;
    document.getElementById("confirmForm").reset();
    document.getElementById("confirmInfo").innerHTML = `
      <h4>${escapeHtml(a.title)}</h4>
      <p>${a.first_name ? (a.last_name || "") + " " + (a.first_name || "") : "Учень"}</p>
      <p>${a.category || ""} ${a.competition_level ? "| " + a.competition_level : ""}</p>
    `;

    document.getElementById("confirmModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  };

  window.closeConfirmModal = function () {
    document.getElementById("confirmModal").style.display = "none";
    document.body.style.overflow = "";
  };

  async function handleConfirm(e) {
    e.preventDefault();
    const achId = document.getElementById("confirmAchId").value;
    const comment = document.getElementById("teacherComment").value;
    const recommendation = document.getElementById(
      "teacherRecommendation",
    ).value;
    const signature = document.getElementById("teacherSignature").value;

    try {
      const resp = await fetch(`${API}/api/achievex/${achId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed_by: userId,
          teacher_comment: comment,
          teacher_recommendation: recommendation,
          teacher_signature: signature,
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      closeConfirmModal();
      showToast("Досягнення підтверджено", "success");
      loadAchievements();
      loadStats();
    } catch (err) {
      showToast("Помилка підтвердження: " + err.message, "error");
    }
  }

  // ===== Revoke Confirmation =====
  window.revokeConfirmation = async function (id) {
    if (!confirm("Скасувати підтвердження цього досягнення?")) return;

    try {
      const resp = await fetch(`${API}/api/achievex/${id}/revoke`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      showToast("Підтвердження скасовано", "info");
      loadAchievements();
      loadStats();
    } catch (err) {
      showToast("Помилка: " + err.message, "error");
    }
  };

  // ===== Portfolio =====
  window.openPortfolio = async function () {
    const body = document.getElementById("portfolioBody");
    body.innerHTML =
      '<div class="achx-loading">Завантаження портфоліо...</div>';
    document.getElementById("portfolioModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    try {
      const resp = await fetch(`${API}/api/achievex/portfolio/${userId}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      const profile = data.profile;
      const achievements = data.achievements || [];

      const portfolioUrl = `${window.location.origin}/achievex.html?portfolio=${userId}`;

      // Profile header
      const name = profile
        ? `${profile.last_name || ""} ${profile.first_name || ""}`.trim()
        : "Користувач";
      const initials = profile
        ? (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")
        : "?";

      // Stats
      const total = achievements.length;
      const confirmed = achievements.filter((a) => a.teacher_confirmed).length;
      const categories = [
        ...new Set(achievements.map((a) => a.category).filter(Boolean)),
      ].length;

      let avatarHtml = initials;
      if (profile && profile.avatar) {
        avatarHtml = `<img src="${API}${profile.avatar}" alt="">`;
      }

      let achievementsListHtml = "";
      if (achievements.length === 0) {
        achievementsListHtml =
          '<p style="text-align:center;color:#6b7280;padding:24px;">Поки що немає публічних досягнень</p>';
      } else {
        achievementsListHtml = achievements
          .map((a) => {
            const catClass = getCategoryClass(a.category);
            const dateStr = a.competition_date
              ? new Date(a.competition_date).toLocaleDateString("uk-UA")
              : "";
            return `
            <div class="achx-portfolio-item">
              <div class="achx-portfolio-item-icon">${getCategoryIcon(a.category)}</div>
              <div class="achx-portfolio-item-info">
                <div class="achx-portfolio-item-title">${escapeHtml(a.title)}</div>
                ${a.competition_name ? `<div class="achx-portfolio-item-comp">${escapeHtml(a.competition_name)}${dateStr ? " | " + dateStr : ""}</div>` : ""}
                <div class="achx-portfolio-item-meta">
                  <span class="achx-portfolio-item-badge ${catClass}">${a.category || "Інше"}</span>
                  ${a.competition_level ? `<span class="achx-portfolio-item-badge" style="background:#f3f4f6;color:#374151;">${a.competition_level}</span>` : ""}
                  ${a.competition_place ? `<span class="achx-portfolio-item-badge" style="background:#fef3c7;color:#d97706;">${escapeHtml(a.competition_place)}</span>` : ""}
                  ${a.teacher_confirmed ? '<span class="achx-portfolio-item-badge" style="background:#d1fae5;color:#059669;">&#10003; Підтверджено</span>' : ""}
                </div>
              </div>
            </div>
          `;
          })
          .join("");
      }

      body.innerHTML = `
        <div class="achx-portfolio-header">
          <div class="achx-portfolio-avatar">${avatarHtml}</div>
          <div>
            <div class="achx-portfolio-name">${escapeHtml(name)}</div>
            <div class="achx-portfolio-school">${profile?.school_name || profile?.city || ""}</div>
            <div class="achx-portfolio-stats">
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${total}</div>
                <div class="achx-portfolio-stat-lbl">Досягнень</div>
              </div>
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${confirmed}</div>
                <div class="achx-portfolio-stat-lbl">Підтверджено</div>
              </div>
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${categories}</div>
                <div class="achx-portfolio-stat-lbl">Категорій</div>
              </div>
            </div>
          </div>
        </div>
        <div class="achx-portfolio-share-row">
          <input type="text" value="${portfolioUrl}" readonly onclick="this.select()">
          <button onclick="copyToClipboard('${portfolioUrl}')">Поділитися</button>
        </div>
        <div class="achx-portfolio-list">
          ${achievementsListHtml}
        </div>
      `;
    } catch (err) {
      console.error("Error loading portfolio:", err);
      body.innerHTML =
        '<div class="achx-loading">Помилка завантаження портфоліо</div>';
    }
  };

  window.closePortfolioModal = function () {
    document.getElementById("portfolioModal").style.display = "none";
    document.body.style.overflow = "";
  };

  // ===== File Handling =====
  window.handleFileSelect = function (input, previewId) {
    const file = input.files[0];
    if (file) {
      setFilePreview(previewId, file.name);
    } else {
      resetFilePreview(previewId);
    }
  };

  function setFilePreview(id, name) {
    const el = document.getElementById(id);
    el.classList.add("has-file");
    el.innerHTML = `
      <span class="achx-file-icon">&#10003;</span>
      <span>${escapeHtml(name)}</span>
      <small>Файл обрано</small>
    `;
  }

  function resetFilePreview(id) {
    const el = document.getElementById(id);
    el.classList.remove("has-file");
    if (id === "diplomaPreview") {
      el.innerHTML = `
        <span class="achx-file-icon">&#128196;</span>
        <span>Перетягніть файл або натисніть</span>
        <small>JPG, PNG, PDF (до 20 МБ)</small>
      `;
    } else {
      el.innerHTML = `
        <span class="achx-file-icon">&#128193;</span>
        <span>Перетягніть файл або натисніть</span>
        <small>Будь-який формат (до 20 МБ)</small>
      `;
    }
  }

  // ===== Utility =====
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  window.copyToClipboard = function (text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("Посилання скопійовано", "info");
      })
      .catch(() => {
        // Fallback
        const input = document.createElement("input");
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        showToast("Посилання скопійовано", "info");
      });
  };

  function showToast(message, type = "info") {
    const existing = document.querySelector(".achx-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `achx-toast achx-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===== URL Parameter handling (verify, portfolio) =====
  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Verify mode
    const verifyToken = params.get("verify");
    if (verifyToken) {
      showVerification(verifyToken);
      return;
    }

    // Public portfolio mode
    const portfolioUserId = params.get("portfolio");
    if (portfolioUserId) {
      showPublicPortfolio(portfolioUserId);
      return;
    }
  }

  async function showVerification(token) {
    try {
      const resp = await fetch(`${API}/api/achievex/verify/${token}`);
      const data = await resp.json();

      if (!data.success) {
        alert("Досягнення не знайдено або посилання недійсне");
        return;
      }

      const a = data.achievement;
      const detailBody = document.getElementById("detailBody");
      document.getElementById("detailTitle").textContent =
        "Перевірка досягнення";

      const name =
        `${a.last_name || ""} ${a.first_name || ""}`.trim() || "Невідомий";
      const dateStr = a.competition_date
        ? new Date(a.competition_date).toLocaleDateString("uk-UA")
        : "---";

      detailBody.innerHTML = `
        <div class="achx-detail-grid">
          <div class="achx-detail-item achx-detail-full">
            <div class="label">Учень</div>
            <div class="value">${escapeHtml(name)}${a.school_name ? " | " + escapeHtml(a.school_name) : ""}</div>
          </div>
          <div class="achx-detail-item achx-detail-full">
            <div class="label">Досягнення</div>
            <div class="value" style="font-size:16px;font-weight:700;">${escapeHtml(a.title)}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Категорія</div>
            <div class="value">${a.category || "---"}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Рівень</div>
            <div class="value">${a.competition_level || "---"}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Конкурс</div>
            <div class="value">${a.competition_name || "---"}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Дата</div>
            <div class="value">${dateStr}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Результат</div>
            <div class="value">${a.competition_place || "---"}</div>
          </div>
          <div class="achx-detail-item">
            <div class="label">Статус</div>
            <div class="value">${a.teacher_confirmed ? "&#10003; Підтверджено вчителем" : "&#9679; Очікує підтвердження"}</div>
          </div>
          ${
            a.teacher_confirmed
              ? `
            <div class="achx-detail-confirmation">
              <h4>&#10003; Електронне підтвердження</h4>
              ${a.confirmer_first_name ? `<p><strong>Підтвердив:</strong> ${a.confirmer_last_name || ""} ${a.confirmer_first_name || ""}</p>` : ""}
              ${a.confirmed_at ? `<p><strong>Дата підтвердження:</strong> ${new Date(a.confirmed_at).toLocaleDateString("uk-UA")}</p>` : ""}
              ${a.teacher_comment ? `<p><strong>Коментар:</strong> ${escapeHtml(a.teacher_comment)}</p>` : ""}
              ${a.teacher_recommendation ? `<p><strong>Рекомендація:</strong> ${escapeHtml(a.teacher_recommendation)}</p>` : ""}
              ${a.teacher_signature ? `<div class="signature">Електронний підпис: ${escapeHtml(a.teacher_signature)}</div>` : ""}
            </div>
          `
              : ""
          }
        </div>
      `;

      document.getElementById("detailModal").style.display = "flex";
      document.body.style.overflow = "hidden";
    } catch (err) {
      console.error("Verification error:", err);
      alert("Помилка перевірки. Спробуйте пізніше.");
    }
  }

  async function showPublicPortfolio(targetUserId) {
    const body = document.getElementById("portfolioBody");
    body.innerHTML =
      '<div class="achx-loading">Завантаження портфоліо...</div>';
    document.getElementById("portfolioModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    try {
      const resp = await fetch(`${API}/api/achievex/portfolio/${targetUserId}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      const profile = data.profile;
      const achievements = data.achievements || [];

      const name = profile
        ? `${profile.last_name || ""} ${profile.first_name || ""}`.trim()
        : "Користувач";
      const initials = profile
        ? (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")
        : "?";

      const total = achievements.length;
      const confirmed = achievements.filter((a) => a.teacher_confirmed).length;
      const categories = [
        ...new Set(achievements.map((a) => a.category).filter(Boolean)),
      ].length;

      let avatarHtml = initials;
      if (profile && profile.avatar) {
        avatarHtml = `<img src="${API}${profile.avatar}" alt="">`;
      }

      let listHtml =
        achievements.length === 0
          ? '<p style="text-align:center;color:#6b7280;padding:24px;">Немає публічних досягнень</p>'
          : achievements
              .map((a) => {
                const catClass = getCategoryClass(a.category);
                const dateStr = a.competition_date
                  ? new Date(a.competition_date).toLocaleDateString("uk-UA")
                  : "";
                return `
              <div class="achx-portfolio-item">
                <div class="achx-portfolio-item-icon">${getCategoryIcon(a.category)}</div>
                <div class="achx-portfolio-item-info">
                  <div class="achx-portfolio-item-title">${escapeHtml(a.title)}</div>
                  ${a.competition_name ? `<div class="achx-portfolio-item-comp">${escapeHtml(a.competition_name)}${dateStr ? " | " + dateStr : ""}</div>` : ""}
                  <div class="achx-portfolio-item-meta">
                    <span class="achx-portfolio-item-badge ${catClass}">${a.category || "Інше"}</span>
                    ${a.competition_level ? `<span class="achx-portfolio-item-badge" style="background:#f3f4f6;color:#374151;">${a.competition_level}</span>` : ""}
                    ${a.competition_place ? `<span class="achx-portfolio-item-badge" style="background:#fef3c7;color:#d97706;">${escapeHtml(a.competition_place)}</span>` : ""}
                    ${a.teacher_confirmed ? '<span class="achx-portfolio-item-badge" style="background:#d1fae5;color:#059669;">&#10003; Підтверджено</span>' : ""}
                  </div>
                </div>
              </div>
            `;
              })
              .join("");

      body.innerHTML = `
        <div class="achx-portfolio-header">
          <div class="achx-portfolio-avatar">${avatarHtml}</div>
          <div>
            <div class="achx-portfolio-name">${escapeHtml(name)}</div>
            <div class="achx-portfolio-school">${profile?.school_name || profile?.city || ""}</div>
            <div class="achx-portfolio-stats">
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${total}</div>
                <div class="achx-portfolio-stat-lbl">Досягнень</div>
              </div>
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${confirmed}</div>
                <div class="achx-portfolio-stat-lbl">Підтверджено</div>
              </div>
              <div class="achx-portfolio-stat">
                <div class="achx-portfolio-stat-num">${categories}</div>
                <div class="achx-portfolio-stat-lbl">Категорій</div>
              </div>
            </div>
          </div>
        </div>
        <div class="achx-portfolio-list">${listHtml}</div>
      `;
    } catch (err) {
      body.innerHTML =
        '<div class="achx-loading">Помилка завантаження портфоліо</div>';
    }
  }

  // Check URL params after page load
  setTimeout(checkUrlParams, 500);
})();
