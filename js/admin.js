// Admin Panel JavaScript
// Global state
let currentSection = 'dashboard';
let usersData = [];
let allUsersData = []; // Store all users for client-side pagination
let competitionsData = [];
let resultsData = [];
let schoolsData = [];
let subjectsData = [];
let newsData = [];

// Pagination state
const pagination = {
    users: { page: 1, limit: 10, total: 0 },
    competitions: { page: 1, limit: 10, total: 0 },
    results: { page: 1, limit: 10, total: 0 }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initDropdownNavigation();
    loadDashboard();
    loadSchoolsForSelect();
    loadSubjectsForSelect();
    loadCompetitionsForSelect();
});

// Check authentication and role
function checkAuth() {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId) {
        window.location.href = 'auth.html';
        return;
    }

    // Allow access for admin roles
    const allowedRoles = ['методист', 'адміністратор_платформи', 'адміністратор_громади', 'вчитель'];
    if (!allowedRoles.includes(userRole)) {
        showToast('У вас немає доступу до адмін панелі', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
}

// Dropdown Navigation
function initDropdownNavigation() {
    const dropdownBtn = document.getElementById('navDropdownBtn');
    const dropdownMenu = document.getElementById('navDropdownMenu');
    const navItems = document.querySelectorAll('.dropdown-nav-item');

    // Toggle dropdown on button click
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownBtn.classList.toggle('active');
        dropdownMenu.classList.toggle('show');
    });

    // Handle nav item clicks
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            const icon = item.querySelector('.nav-icon').textContent;
            const text = item.querySelector('span:last-child').textContent;

            // Update button text
            document.querySelector('.current-section-icon').textContent = icon;
            document.querySelector('.current-section-text').textContent = text;

            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch section
            switchSection(section);

            // Close dropdown
            dropdownBtn.classList.remove('active');
            dropdownMenu.classList.remove('show');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownBtn.classList.remove('active');
            dropdownMenu.classList.remove('show');
        }
    });
}

function switchSection(section) {
    currentSection = section;

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active');
    });

    // Show selected section
    document.getElementById(section).classList.add('active');

    // Load data for section
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'competitions':
            loadCompetitions();
            break;
        case 'results':
            loadResults();
            break;
        case 'schools':
            loadSchools();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'news':
            loadNews();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const userId = localStorage.getItem('userId');
    const baseUrl = window.AppConfig ? window.AppConfig.API_URL : '';

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || ''
        }
    };

    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }

    return response.json();
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        // Load statistics
        const [usersStats, competitionsStats, resultsCount, schoolsCount] = await Promise.all([
            apiRequest('/api/admin/stats/users').catch(() => ({ total: 0, byRole: {} })),
            apiRequest('/api/admin/stats/competitions').catch(() => ({ total: 0, byStatus: {} })),
            apiRequest('/api/admin/stats/results').catch(() => ({ total: 0 })),
            apiRequest('/api/schools').catch(() => [])
        ]);

        // Update stat cards
        document.getElementById('totalUsersCount').textContent = usersStats.total || 0;
        document.getElementById('totalCompetitionsCount').textContent = competitionsStats.total || 0;
        document.getElementById('totalResultsCount').textContent = resultsCount.total || 0;
        // Schools API returns { schools: [...] } object
        const schoolsList = Array.isArray(schoolsCount) ? schoolsCount : (schoolsCount.schools || []);
        document.getElementById('totalSchoolsCount').textContent = schoolsList.length;

        // Render charts
        renderUsersChart(usersStats.byRole || {});
        renderCompetitionsChart(competitionsStats.byStatus || {});

        // Load recent activity
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Помилка завантаження дашборду', 'error');
    }
}

function renderUsersChart(data) {
    const container = document.getElementById('userRolesChart');
    const roles = [
        { key: 'учень', label: 'Учні', color: '#3b82f6' },
        { key: 'вчитель', label: 'Вчителі', color: '#f59e0b' },
        { key: 'методист', label: 'Методисти', color: '#8b5cf6' }
    ];

    const maxValue = Math.max(...Object.values(data), 1);

    container.innerHTML = roles.map(role => {
        const value = data[role.key] || 0;
        const height = (value / maxValue) * 150;
        return `
            <div class="chart-bar">
                <div class="bar-value">${value}</div>
                <div class="bar" style="height: ${height}px; background: ${role.color};"></div>
                <div class="bar-label">${role.label}</div>
            </div>
        `;
    }).join('');
}

function renderCompetitionsChart(data) {
    const container = document.getElementById('competitionStatusChart');
    const statuses = [
        { key: 'active', label: 'Активні', color: '#10b981' },
        { key: 'upcoming', label: 'Майбутні', color: '#f59e0b' },
        { key: 'completed', label: 'Завершені', color: '#3b82f6' }
    ];

    const maxValue = Math.max(...Object.values(data), 1);

    container.innerHTML = statuses.map(status => {
        const value = data[status.key] || 0;
        const height = (value / maxValue) * 150;
        return `
            <div class="chart-bar">
                <div class="bar-value">${value}</div>
                <div class="bar" style="height: ${height}px; background: ${status.color};"></div>
                <div class="bar-label">${status.label}</div>
            </div>
        `;
    }).join('');
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');

    try {
        const activities = await apiRequest('/api/admin/activity').catch(() => []);

        if (!activities.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p class="empty-state-text">Немає останніх дій</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <div class="activity-text">${activity.message}</div>
                    <div class="activity-time">${formatDate(activity.created_at)}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<p class="loading">Не вдалося завантажити активність</p>';
    }
}

function getActivityIcon(type) {
    const icons = {
        'user': '👤',
        'competition': '🏆',
        'result': '📋',
        'auth': '🔐',
        'news': '📰'
    };
    return icons[type] || '📌';
}

// ==================== USERS ====================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Завантаження...</td></tr>';

    try {
        const search = document.getElementById('userSearch')?.value || '';
        const role = document.getElementById('userRoleFilter')?.value || '';

        // Load all users from API
        const params = new URLSearchParams({
            limit: 1000, // Get all users
            search,
            role
        });

        const response = await apiRequest(`/api/admin/users?${params}`);
        allUsersData = response.users || response || [];
        pagination.users.total = allUsersData.length;

        // Reset to first page when loading new data
        if (search || role) {
            pagination.users.page = 1;
        }

        renderUsersTable();
        renderUsersPagination();

    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Помилка завантаження</td></tr>';
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');

    if (!allUsersData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Користувачів не знайдено</td></tr>';
        return;
    }

    // Calculate pagination
    const start = (pagination.users.page - 1) * pagination.users.limit;
    const end = start + pagination.users.limit;
    usersData = allUsersData.slice(start, end);

    tbody.innerHTML = usersData.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${formatUserName(user)}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td>${user.school || '-'}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Редагувати">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteUser(${user.id})" title="Видалити">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderUsersPagination() {
    const container = document.getElementById('usersPagination');
    if (!container) return;

    const totalPages = Math.ceil(pagination.users.total / pagination.users.limit);
    const currentPage = pagination.users.page;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changeUsersPage(${currentPage - 1})">«</button>`;

    // First page
    if (currentPage > 3) {
        html += `<button onclick="changeUsersPage(1)">1</button>`;
        if (currentPage > 4) {
            html += '<button disabled>...</button>';
        }
    }

    // Page numbers around current
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changeUsersPage(${i})">${i}</button>`;
    }

    // Last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            html += '<button disabled>...</button>';
        }
        html += `<button onclick="changeUsersPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changeUsersPage(${currentPage + 1})">»</button>`;

    // Page info
    html += `<span class="pagination-info">Сторінка ${currentPage} з ${totalPages}</span>`;

    container.innerHTML = html;
}

function changeUsersPage(page) {
    const totalPages = Math.ceil(pagination.users.total / pagination.users.limit);
    if (page < 1 || page > totalPages) return;

    pagination.users.page = page;
    renderUsersTable();
    renderUsersPagination();

    // Scroll to top of table
    document.getElementById('users')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatUserName(user) {
    if (user.first_name || user.last_name) {
        return `${user.last_name || ''} ${user.first_name || ''}`.trim();
    }
    return '-';
}

function editUser(id) {
    const user = allUsersData.find(u => u.id === id);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = 'Редагувати користувача';
    document.getElementById('userId').value = user.id;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userFirstName').value = user.first_name || '';
    document.getElementById('userLastName').value = user.last_name || '';
    document.getElementById('userSchool').value = user.school_id || '';

    // Hide password field for editing
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('userPassword').required = false;

    openModal('addUserModal');
}

async function saveUser(event) {
    event.preventDefault();

    const id = document.getElementById('userId').value;
    const schoolIdValue = document.getElementById('userSchool').value;

    const data = {
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        first_name: document.getElementById('userFirstName').value || null,
        last_name: document.getElementById('userLastName').value || null,
        school_id: schoolIdValue ? parseInt(schoolIdValue, 10) : null
    };

    const password = document.getElementById('userPassword').value;
    if (password) {
        data.password = password;
    }

    try {
        if (id) {
            // Update existing user
            const response = await apiRequest(`/api/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (response.success || response.message) {
                showToast('Профіль користувача успішно оновлено', 'success');
            } else {
                showToast('Користувача оновлено', 'success');
            }
        } else {
            if (!password) {
                showToast('Введіть пароль', 'error');
                return;
            }
            await apiRequest('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Користувача створено', 'success');
        }

        closeModal('addUserModal');
        loadUsers();

    } catch (error) {
        console.error('Save user error:', error);
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteUser(id) {
    confirmAction('Ви впевнені, що хочете видалити цього користувача?', async () => {
        try {
            await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
            showToast('Користувача видалено', 'success');
            loadUsers();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== COMPETITIONS ====================
async function loadCompetitions() {
    const tbody = document.getElementById('competitionsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Завантаження...</td></tr>';

    try {
        const search = document.getElementById('competitionSearch')?.value || '';
        const status = document.getElementById('competitionStatusFilter')?.value || '';

        const response = await apiRequest('/api/competitions');
        let competitions = Array.isArray(response) ? response : response.competitions || [];

        // Filter by search and status
        if (search) {
            competitions = competitions.filter(c =>
                c.title.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (status) {
            competitions = competitions.filter(c => getCompetitionStatus(c) === status);
        }

        competitionsData = competitions;
        pagination.competitions.total = competitions.length;

        renderCompetitionsTable();
        renderPagination('competitions', pagination.competitions);

    } catch (error) {
        console.error('Error loading competitions:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Помилка завантаження</td></tr>';
    }
}

function getCompetitionStatus(competition) {
    if (competition.manual_status) return competition.manual_status;

    const now = new Date();
    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
}

function renderCompetitionsTable() {
    const tbody = document.getElementById('competitionsTableBody');

    if (!competitionsData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Конкурсів не знайдено</td></tr>';
        return;
    }

    const start = (pagination.competitions.page - 1) * pagination.competitions.limit;
    const paginatedData = competitionsData.slice(start, start + pagination.competitions.limit);

    tbody.innerHTML = paginatedData.map(comp => {
        const status = getCompetitionStatus(comp);
        return `
            <tr>
                <td>${comp.id}</td>
                <td>${comp.title}</td>
                <td>${formatDate(comp.start_date)}</td>
                <td>${formatDate(comp.end_date)}</td>
                <td><span class="status-badge status-${status}">${getStatusLabel(status)}</span></td>
                <td>${comp.participants_count || 0}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view" onclick="viewCompetition(${comp.id})" title="Переглянути">👁️</button>
                        <button class="btn-icon btn-edit" onclick="editCompetition(${comp.id})" title="Редагувати">✏️</button>
                        <button class="btn-icon btn-delete" onclick="deleteCompetition(${comp.id})" title="Видалити">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusLabel(status) {
    const labels = {
        'active': 'Активний',
        'upcoming': 'Майбутній',
        'completed': 'Завершений',
        'cancelled': 'Скасований'
    };
    return labels[status] || status;
}

function viewCompetition(id) {
    window.open(`competitionsT.html?id=${id}`, '_blank');
}

function editCompetition(id) {
    const comp = competitionsData.find(c => c.id === id);
    if (!comp) return;

    document.getElementById('competitionModalTitle').textContent = 'Редагувати конкурс';
    document.getElementById('competitionId').value = comp.id;
    document.getElementById('competitionTitle').value = comp.title;
    document.getElementById('competitionDescription').value = comp.description || '';
    document.getElementById('competitionStartDate').value = formatDateForInput(comp.start_date);
    document.getElementById('competitionEndDate').value = formatDateForInput(comp.end_date);
    document.getElementById('competitionLevel').value = comp.level || '';
    document.getElementById('competitionSubject').value = comp.subject_id || '';
    document.getElementById('competitionOrganizer').value = comp.organizer || '';
    document.getElementById('competitionLocation').value = comp.location || '';
    document.getElementById('competitionMaxParticipants').value = comp.max_participants || '';
    document.getElementById('competitionStatus').value = comp.manual_status || '';
    document.getElementById('competitionIsOnline').checked = comp.is_online || false;

    openModal('addCompetitionModal');
}

async function saveCompetition(event) {
    event.preventDefault();

    const id = document.getElementById('competitionId').value;
    const data = {
        title: document.getElementById('competitionTitle').value,
        description: document.getElementById('competitionDescription').value,
        start_date: document.getElementById('competitionStartDate').value,
        end_date: document.getElementById('competitionEndDate').value,
        level: document.getElementById('competitionLevel').value,
        subject_id: document.getElementById('competitionSubject').value || null,
        organizer: document.getElementById('competitionOrganizer').value,
        location: document.getElementById('competitionLocation').value,
        max_participants: document.getElementById('competitionMaxParticipants').value || null,
        manual_status: document.getElementById('competitionStatus').value || null,
        is_online: document.getElementById('competitionIsOnline').checked
    };

    try {
        if (id) {
            await apiRequest(`/api/competitions/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Конкурс оновлено', 'success');
        } else {
            await apiRequest('/api/competitions', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Конкурс створено', 'success');
        }

        closeModal('addCompetitionModal');
        loadCompetitions();
        loadCompetitionsForSelect();

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteCompetition(id) {
    confirmAction('Ви впевнені, що хочете видалити цей конкурс? Всі пов\'язані дані будуть втрачені.', async () => {
        try {
            await apiRequest(`/api/competitions/${id}`, { method: 'DELETE' });
            showToast('Конкурс видалено', 'success');
            loadCompetitions();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== RESULTS ====================
async function loadResults() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Завантаження...</td></tr>';

    try {
        const competitionId = document.getElementById('resultCompetitionFilter')?.value || '';
        const search = document.getElementById('resultSearch')?.value || '';

        let url = '/api/results';
        if (competitionId) {
            url = `/api/results?competition_id=${competitionId}`;
        }

        const response = await apiRequest(url);
        let results = Array.isArray(response) ? response : response.results || [];

        // Filter by search
        if (search) {
            results = results.filter(r =>
                r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
                r.first_name?.toLowerCase().includes(search.toLowerCase()) ||
                r.last_name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        resultsData = results;
        pagination.results.total = results.length;

        renderResultsTable();
        renderPagination('results', pagination.results);

    } catch (error) {
        console.error('Error loading results:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Помилка завантаження</td></tr>';
    }
}

function renderResultsTable() {
    const tbody = document.getElementById('resultsTableBody');

    if (!resultsData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Результатів не знайдено</td></tr>';
        return;
    }

    const start = (pagination.results.page - 1) * pagination.results.limit;
    const paginatedData = resultsData.slice(start, start + pagination.results.limit);

    tbody.innerHTML = paginatedData.map(result => `
        <tr>
            <td>${result.id}</td>
            <td>${result.competition_title || '-'}</td>
            <td>${result.last_name || ''} ${result.first_name || result.user_name || '-'}</td>
            <td>${result.place || '-'}</td>
            <td>${result.score || '-'}</td>
            <td>${result.achievement || '-'}</td>
            <td>${formatDate(result.added_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editResult(${result.id})" title="Редагувати">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteResult(${result.id})" title="Видалити">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function editResult(id) {
    const result = resultsData.find(r => r.id === id);
    if (!result) return;

    document.getElementById('resultModalTitle').textContent = 'Редагувати результат';
    document.getElementById('resultId').value = result.id;
    document.getElementById('resultCompetition').value = result.competition_id;
    document.getElementById('resultPlace').value = result.place || '';
    document.getElementById('resultScore').value = result.score || '';
    document.getElementById('resultAchievement').value = result.achievement || '';
    document.getElementById('resultNotes').value = result.notes || '';

    // Load users and pre-select the current user
    await loadUsersForSelect(result.user_id);

    openModal('addResultModal');
}

async function saveResult(event) {
    event.preventDefault();

    const id = document.getElementById('resultId').value;
    const data = {
        competition_id: document.getElementById('resultCompetition').value,
        user_id: document.getElementById('resultUser').value,
        place: document.getElementById('resultPlace').value || null,
        score: document.getElementById('resultScore').value || null,
        achievement: document.getElementById('resultAchievement').value,
        notes: document.getElementById('resultNotes').value
    };

    try {
        if (id) {
            await apiRequest(`/api/results/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Результат оновлено', 'success');
        } else {
            await apiRequest('/api/results', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Результат додано', 'success');
        }

        closeModal('addResultModal');
        loadResults();

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteResult(id) {
    confirmAction('Ви впевнені, що хочете видалити цей результат?', async () => {
        try {
            await apiRequest(`/api/results/${id}`, { method: 'DELETE' });
            showToast('Результат видалено', 'success');
            loadResults();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== SCHOOLS ====================
async function loadSchools() {
    const tbody = document.getElementById('schoolsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Завантаження...</td></tr>';

    try {
        const search = document.getElementById('schoolSearch')?.value || '';

        const response = await apiRequest('/api/schools');
        let schools = Array.isArray(response) ? response : response.schools || [];

        if (search) {
            schools = schools.filter(s =>
                s.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        schoolsData = schools;
        renderSchoolsTable();

    } catch (error) {
        console.error('Error loading schools:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Помилка завантаження</td></tr>';
    }
}

function renderSchoolsTable() {
    const tbody = document.getElementById('schoolsTableBody');

    if (!schoolsData.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Шкіл не знайдено</td></tr>';
        return;
    }

    tbody.innerHTML = schoolsData.map(school => `
        <tr>
            <td>${school.id}</td>
            <td>${school.name}</td>
            <td>${school.students_count || 0}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editSchool(${school.id})" title="Редагувати">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteSchool(${school.id})" title="Видалити">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editSchool(id) {
    const school = schoolsData.find(s => s.id === id);
    if (!school) return;

    document.getElementById('schoolModalTitle').textContent = 'Редагувати школу';
    document.getElementById('schoolId').value = school.id;
    document.getElementById('schoolName').value = school.name;

    openModal('addSchoolModal');
}

async function saveSchool(event) {
    event.preventDefault();

    const id = document.getElementById('schoolId').value;
    const data = {
        name: document.getElementById('schoolName').value
    };

    try {
        if (id) {
            await apiRequest(`/api/schools/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Школу оновлено', 'success');
        } else {
            await apiRequest('/api/schools', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Школу додано', 'success');
        }

        closeModal('addSchoolModal');
        loadSchools();
        loadSchoolsForSelect();

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteSchool(id) {
    confirmAction('Ви впевнені, що хочете видалити цю школу?', async () => {
        try {
            await apiRequest(`/api/schools/${id}`, { method: 'DELETE' });
            showToast('Школу видалено', 'success');
            loadSchools();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== SUBJECTS ====================
async function loadSubjects() {
    const tbody = document.getElementById('subjectsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Завантаження...</td></tr>';

    try {
        const response = await apiRequest('/api/subjects');
        subjectsData = Array.isArray(response) ? response : response.subjects || [];
        renderSubjectsTable();

    } catch (error) {
        console.error('Error loading subjects:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Помилка завантаження</td></tr>';
    }
}

function renderSubjectsTable() {
    const tbody = document.getElementById('subjectsTableBody');

    if (!subjectsData.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Предметів не знайдено</td></tr>';
        return;
    }

    tbody.innerHTML = subjectsData.map(subject => `
        <tr>
            <td>${subject.id}</td>
            <td>${subject.name}</td>
            <td>${subject.category || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editSubject(${subject.id})" title="Редагувати">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteSubject(${subject.id})" title="Видалити">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editSubject(id) {
    const subject = subjectsData.find(s => s.id === id);
    if (!subject) return;

    document.getElementById('subjectModalTitle').textContent = 'Редагувати предмет';
    document.getElementById('subjectId').value = subject.id;
    document.getElementById('subjectName').value = subject.name;
    document.getElementById('subjectCategory').value = subject.category || '';

    openModal('addSubjectModal');
}

async function saveSubject(event) {
    event.preventDefault();

    const id = document.getElementById('subjectId').value;
    const data = {
        name: document.getElementById('subjectName').value,
        category: document.getElementById('subjectCategory').value
    };

    try {
        if (id) {
            await apiRequest(`/api/subjects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Предмет оновлено', 'success');
        } else {
            await apiRequest('/api/subjects', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Предмет додано', 'success');
        }

        closeModal('addSubjectModal');
        loadSubjects();
        loadSubjectsForSelect();

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteSubject(id) {
    confirmAction('Ви впевнені, що хочете видалити цей предмет?', async () => {
        try {
            await apiRequest(`/api/subjects/${id}`, { method: 'DELETE' });
            showToast('Предмет видалено', 'success');
            loadSubjects();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== NEWS ====================
async function loadNews() {
    const tbody = document.getElementById('newsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Завантаження...</td></tr>';

    try {
        const search = document.getElementById('newsSearch')?.value || '';

        const response = await apiRequest('/api/news');
        let news = Array.isArray(response) ? response : response.news || [];

        if (search) {
            news = news.filter(n =>
                n.title.toLowerCase().includes(search.toLowerCase())
            );
        }

        newsData = news;
        renderNewsTable();

    } catch (error) {
        console.error('Error loading news:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Помилка завантаження</td></tr>';
    }
}

function renderNewsTable() {
    const tbody = document.getElementById('newsTableBody');

    if (!newsData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Новин не знайдено</td></tr>';
        return;
    }

    tbody.innerHTML = newsData.map(news => `
        <tr>
            <td>${news.id}</td>
            <td>${news.title}</td>
            <td>${news.category || 'general'}</td>
            <td>${news.is_published ? '<span class="status-badge status-active">Так</span>' : '<span class="status-badge status-cancelled">Ні</span>'}</td>
            <td>${news.views_count || 0}</td>
            <td>${formatDate(news.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editNews(${news.id})" title="Редагувати">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteNews(${news.id})" title="Видалити">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editNews(id) {
    const news = newsData.find(n => n.id === id);
    if (!news) return;

    document.getElementById('newsModalTitle').textContent = 'Редагувати новину';
    document.getElementById('newsId').value = news.id;
    document.getElementById('newsTitle').value = news.title;
    document.getElementById('newsContent').value = news.content || '';
    document.getElementById('newsCategory').value = news.category || 'general';
    document.getElementById('newsImageUrl').value = news.image_url || '';
    document.getElementById('newsIsPublished').checked = news.is_published !== false;

    openModal('addNewsModal');
}

async function saveNews(event) {
    event.preventDefault();

    const id = document.getElementById('newsId').value;
    const data = {
        title: document.getElementById('newsTitle').value,
        content: document.getElementById('newsContent').value,
        category: document.getElementById('newsCategory').value,
        image_url: document.getElementById('newsImageUrl').value,
        is_published: document.getElementById('newsIsPublished').checked
    };

    try {
        if (id) {
            await apiRequest(`/api/news/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Новину оновлено', 'success');
        } else {
            await apiRequest('/api/news', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Новину створено', 'success');
        }

        closeModal('addNewsModal');
        loadNews();

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
    }
}

function deleteNews(id) {
    confirmAction('Ви впевнені, що хочете видалити цю новину?', async () => {
        try {
            await apiRequest(`/api/news/${id}`, { method: 'DELETE' });
            showToast('Новину видалено', 'success');
            loadNews();
        } catch (error) {
            showToast(error.message || 'Помилка видалення', 'error');
        }
    });
}

// ==================== LOGS ====================
async function loadLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = '<p class="loading">Завантаження...</p>';

    try {
        const type = document.getElementById('logTypeFilter')?.value || '';
        const date = document.getElementById('logDateFilter')?.value || '';

        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (date) params.append('date', date);

        const logs = await apiRequest(`/api/admin/logs?${params}`).catch(() => []);

        if (!logs.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p class="empty-state-text">Логів не знайдено</p>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-icon log-${log.type}">${getActivityIcon(log.type)}</div>
                <div class="log-content">
                    <div class="log-message">${log.message}</div>
                    <div class="log-time">${formatDateTime(log.created_at)}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<p class="loading">Помилка завантаження логів</p>';
    }
}

// ==================== SELECT LOADERS ====================
async function loadSchoolsForSelect() {
    try {
        const response = await apiRequest('/api/schools');
        const schools = Array.isArray(response) ? response : response.schools || [];
        const select = document.getElementById('userSchool');

        if (select) {
            select.innerHTML = '<option value="">Оберіть школу</option>' +
                schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading schools for select:', error);
    }
}

async function loadSubjectsForSelect() {
    try {
        const response = await apiRequest('/api/subjects');
        const subjects = Array.isArray(response) ? response : response.subjects || [];
        const select = document.getElementById('competitionSubject');

        if (select) {
            select.innerHTML = '<option value="">Оберіть предмет</option>' +
                subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading subjects for select:', error);
    }
}

async function loadCompetitionsForSelect() {
    try {
        const response = await apiRequest('/api/competitions');
        const competitions = Array.isArray(response) ? response : response.competitions || [];

        const filterSelect = document.getElementById('resultCompetitionFilter');
        const formSelect = document.getElementById('resultCompetition');

        const options = '<option value="">Всі конкурси</option>' +
            competitions.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

        if (filterSelect) filterSelect.innerHTML = options;
        if (formSelect) formSelect.innerHTML = options.replace('Всі конкурси', 'Оберіть конкурс');

    } catch (error) {
        console.error('Error loading competitions for select:', error);
    }
}

async function loadUsersForSelect(selectedId = null) {
    try {
        const response = await apiRequest('/api/admin/users?role=учень&limit=1000');
        const users = response.users || response || [];

        const select = document.getElementById('resultUser');

        if (select) {
            select.innerHTML = '<option value="">Оберіть учасника</option>' +
                users.map(u => {
                    const name = u.first_name || u.last_name ?
                        `${u.last_name || ''} ${u.first_name || ''}`.trim() : u.email;
                    const selected = selectedId && u.id == selectedId ? 'selected' : '';
                    return `<option value="${u.id}" ${selected}>${name}</option>`;
                }).join('');
        }
    } catch (error) {
        console.error('Error loading users for select:', error);
    }
}

// ==================== UTILITIES ====================
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA');
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function renderPagination(type, paginationData) {
    const container = document.getElementById(`${type}Pagination`);
    if (!container) return;

    const totalPages = Math.ceil(paginationData.total / paginationData.limit);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button ${paginationData.page === 1 ? 'disabled' : ''} onclick="changePage('${type}', ${paginationData.page - 1})">«</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= paginationData.page - 2 && i <= paginationData.page + 2)) {
            html += `<button class="${i === paginationData.page ? 'active' : ''}" onclick="changePage('${type}', ${i})">${i}</button>`;
        } else if (i === paginationData.page - 3 || i === paginationData.page + 3) {
            html += '<button disabled>...</button>';
        }
    }

    // Next button
    html += `<button ${paginationData.page === totalPages ? 'disabled' : ''} onclick="changePage('${type}', ${paginationData.page + 1})">»</button>`;

    container.innerHTML = html;
}

function changePage(type, page) {
    pagination[type].page = page;

    switch (type) {
        case 'users':
            renderUsersTable();
            renderUsersPagination();
            break;
        case 'competitions':
            renderCompetitionsTable();
            break;
        case 'results':
            renderResultsTable();
            break;
    }

    renderPagination(type, pagination[type]);
}

// ==================== MODALS ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');

        // Reset form if opening for new item
        if (modalId.includes('add')) {
            const form = modal.querySelector('form');
            if (form) {
                const titleEl = modal.querySelector('[id$="ModalTitle"]');
                const idInput = modal.querySelector('input[type="hidden"]');

                if (idInput && !idInput.value) {
                    form.reset();
                    if (titleEl) {
                        titleEl.textContent = titleEl.textContent.replace('Редагувати', 'Додати');
                    }

                    // Show password field for new user
                    if (modalId === 'addUserModal') {
                        document.getElementById('passwordGroup').style.display = 'block';
                        document.getElementById('userPassword').required = true;
                    }

                    // Load users for select when opening result modal
                    if (modalId === 'addResultModal') {
                        loadUsersForSelect();
                    }
                }
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');

        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const idInput = form.querySelector('input[type="hidden"]');
            if (idInput) idInput.value = '';
        }
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ==================== CONFIRMATION ====================
let confirmCallback = null;

function confirmAction(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('confirmModal');
}

document.getElementById('confirmBtn')?.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModal('confirmModal');
});

// ==================== TOAST ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== SEARCH DEBOUNCE ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add search event listeners
document.getElementById('userSearch')?.addEventListener('input', debounce(() => {
    pagination.users.page = 1;
    loadUsers();
}, 300));

document.getElementById('userRoleFilter')?.addEventListener('change', () => {
    pagination.users.page = 1;
    loadUsers();
});

document.getElementById('competitionSearch')?.addEventListener('input', debounce(() => {
    pagination.competitions.page = 1;
    loadCompetitions();
}, 300));

document.getElementById('competitionStatusFilter')?.addEventListener('change', () => {
    pagination.competitions.page = 1;
    loadCompetitions();
});

document.getElementById('resultCompetitionFilter')?.addEventListener('change', () => {
    pagination.results.page = 1;
    loadResults();
});

document.getElementById('resultSearch')?.addEventListener('input', debounce(() => {
    pagination.results.page = 1;
    loadResults();
}, 300));

document.getElementById('schoolSearch')?.addEventListener('input', debounce(loadSchools, 300));
document.getElementById('newsSearch')?.addEventListener('input', debounce(loadNews, 300));

document.getElementById('logTypeFilter')?.addEventListener('change', loadLogs);
document.getElementById('logDateFilter')?.addEventListener('change', loadLogs);
