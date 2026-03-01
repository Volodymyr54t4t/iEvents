# iEvents -- Платформа управління учнівськими конкурсами та олімпіадами

**iEvents** -- це повнофункціональна веб-платформа для організації, відстеження та аналітики учнівських конкурсів, олімпіад та змагань. Система підтримує ролі учнів, вчителів і методистів з різними рівнями доступу, забезпечуючи повний цикл управління конкурсами -- від реєстрації до аналітики результатів.

---

## Зміст

- [Архітектура](#архітектура)
- [Технологічний стек](#технологічний-стек)
- [Структура проекту](#структура-проекту)
- [Встановлення та запуск](#встановлення-та-запуск)
- [Змінні середовища](#змінні-середовища)
- [База даних](#база-даних)
- [Ролі та доступ](#ролі-та-доступ)
- [Модулі платформи](#модулі-платформи)
- [API Endpoints](#api-endpoints)
- [Telegram Bot](#telegram-bot)
- [PWA та Service Worker](#pwa-та-service-worker)

---

## Архітектура

Платформа побудована як монолітний додаток з Express.js сервером, що обслуговує як API, так і статичні HTML-файли. Фронтенд реалізований як набір HTML-сторінок з ванільним JavaScript, без фреймворку. Кожна сторінка складається з трьох файлів: `.html`, `.css`, `.js`.

```
Клієнт (HTML/CSS/JS)
    |
    v
Express.js сервер (server.js, порт 3000)
    |
    +---> PostgreSQL (Neon)
    |
    +---> Telegram Bot API (bot.js)
    |
    +---> Google Gemini AI API
    |
    +---> Файлова система (uploads/, documents/)
```

Конфігурація API URL визначається автоматично через `config.js` -- для `localhost` використовується `http://localhost:3000`, для продакшену -- `https://ievents-qf5k.onrender.com`.

---

## Технологічний стек

### Backend

| Технологія | Призначення |
|---|---|
| **Node.js** | Runtime-середовище |
| **Express.js** 4.18 | HTTP-сервер та маршрутизація |
| **PostgreSQL** (Neon) | Реляційна база даних |
| **pg** 8.11 | PostgreSQL-клієнт для Node.js |
| **bcrypt** / **bcryptjs** | Хешування паролів |
| **multer** 1.4 | Завантаження файлів (аватарки, документи) |
| **dotenv** | Змінні середовища |
| **node-telegram-bot-api** | Telegram-бот для сповіщень |
| **@google/generative-ai** | Google Gemini AI для аналітики |
| **axios** + **cheerio** | Парсинг зовнішніх веб-ресурсів |

### Frontend

| Технологія | Призначення |
|---|---|
| **HTML5** | Розмітка сторінок |
| **CSS3** | Стилі (окремий файл на кожну сторінку) |
| **Vanilla JavaScript** | Клієнтська логіка |
| **Chart.js** (CDN) | Графіки та візуалізації |
| **Service Worker** | PWA-функціонал, кешування |

### Інфраструктура

| Сервіс | Призначення |
|---|---|
| **Render** | Хостинг сервера |
| **Neon** | PostgreSQL-хостинг (serverless) |
| **Telegram Bot API** | Сповіщення та інтерактивний бот |

---

## Структура проекту

```
/
|-- server.js                  # Головний серверний файл (Express, API, ініціалізація БД)
|-- config.js                  # Конфігурація API URL (клієнтський)
|-- role.js                    # Контроль доступу до сторінок за ролями
|-- components.js              # Динамічний header/footer з навігацією
|-- bot.js                     # Telegram-бот (сповіщення, команди)
|-- parser.js                  # Парсер шкіл з ІСУО
|-- service-worker.js          # PWA Service Worker
|-- manifest.json              # PWA маніфест
|-- .env                       # Змінні середовища
|-- package.json               # Залежності та скрипти
|
|-- # === СТОРІНКИ АВТЕНТИФІКАЦІЇ ===
|-- auth.html / auth.css / auth.js              # Вхід та реєстрація
|
|-- # === ГОЛОВНА СТОРІНКА ===
|-- index.html / index.css / index.js           # Головна (дашборд)
|
|-- # === ПРОФІЛІ ===
|-- profile.html / profile.css / profile.js     # Профіль учня
|-- profilesT.html / profilesT.css / profilesT.js  # Профіль вчителя/методиста
|
|-- # === КОНКУРСИ ===
|-- competitionsP.html / .css / .js             # Конкурси (вигляд учня)
|-- competitionsT.html / .css / .js             # Конкурси (вигляд вчителя)
|-- competitionsM.html / .css / .js             # Конкурси (вигляд методиста)
|
|-- # === РЕЗУЛЬТАТИ ТА АНАЛІТИКА ===
|-- results.html / results.css / results.js     # Результати конкурсів
|-- statistics.html / statistics.css / statistics.js  # Статистика та аналітика
|-- predictions.html / predictions.css / predictions.js  # Прогнози результатів
|-- new.html / new.css / new.js                 # AIC 2.0 -- Adaptive Intelligence Core
|
|-- # === НОВИНИ ===
|-- newsP.html / newsP.css / newsP.js           # Новини (вигляд учня)
|-- newsT.html / newsT.css / newsT.js           # Новини (вигляд вчителя)
|
|-- # === РЕПЕТИЦІЇ ===
|-- rehearsalP.html / rehearsalP.css / rehearsalP.js  # Репетиції (учень)
|-- rehearsalT.html / rehearsalT.css / rehearsalT.js  # Репетиції (вчитель)
|
|-- # === ПІДГОТОВКА ===
|-- preparationP.html / preparationP.css / preparationP.js    # Підготовка (учень)
|-- preparationAdmin.html / .css / .js          # Підготовка (адмін)
|
|-- # === ЧАТ ===
|-- chat.html / chat.css / chat.js              # Система чатів
|
|-- # === АДМІНІСТРУВАННЯ ===
|-- admin.html / admin.css / admin.js           # Панель адміністратора
|-- adminUser.html / adminUser.css / adminUser.js    # Управління користувачами
|-- adminTeacher.html / adminTeacher.css / adminTeacher.js  # Управління вчителями
|
|-- # === КАЛЕНДАР ===
|-- calendar.html / calendar.css / calendar.js  # Календар подій
|
|-- # === СПИСОК УЧНІВ ===
|-- students-list.html / students-list.css / students-list.js  # Список учнів
|
|-- # === ПАРСЕР РЕЗУЛЬТАТІВ ===
|-- parser_results.html / parser_results.css / parser_results.js  # UI парсера
|
|-- # === ІНФОРМАЦІЙНІ СТОРІНКИ ===
|-- about.html / about.css / about.js           # Про платформу
|-- contacts.html / contacts.css / contacts.js  # Контакти
|-- support.html                                 # Підтримка
|-- privacy-policy.html                          # Політика конфіденційності
|-- question.html                                # FAQ
|
|-- # === СПІЛЬНІ СТИЛІ ===
|-- header.css                                   # Стилі хедера
|-- footer.css                                   # Стилі футера
|-- page-spacing.css                             # Загальні відступи
|-- notifications.css / notifications.js         # Система сповіщень
|
|-- # === ПАПКИ ===
|-- uploads/                                     # Завантажені аватарки (до 5MB)
|-- documents/                                   # Завантажені документи (до 50MB)
|-- scripts/                                     # SQL-міграції
```

---

## Встановлення та запуск

### Передумови

- Node.js >= 18
- npm або pnpm
- PostgreSQL база даних (рекомендується Neon)

### Кроки

1. Клонуйте репозиторій:
```bash
git clone <url>
cd edu-platform
```

2. Встановіть залежності:
```bash
npm install
```

3. Налаштуйте файл `.env` (див. розділ [Змінні середовища](#змінні-середовища)).

4. Запустіть сервер:
```bash
# Продакшн
npm start

# Розробка (з автоперезапуском через nodemon)
npm run dev
```

5. Відкрийте браузер: `http://localhost:3000`

При першому запуску сервер автоматично створить всі необхідні таблиці та enum-типи в базі даних.

---

## Змінні середовища

Файл `.env` у кореневій директорії:

| Змінна | Опис | Обов'язково |
|---|---|---|
| `DATABASE_URL` | Connection string для PostgreSQL (Neon) | Так |
| `SUPER_METHODIST_EMAIL` | Email головного методиста | Так |
| `SUPER_METHODIST_PASSWORD` | Пароль головного методиста | Так |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота | Так |
| `GEMINI_API_KEY` | API-ключ Google Gemini AI | Ні |
| `PORT` | Порт сервера (за замовчуванням 3000) | Ні |

---

## База даних

### Схема таблиць

База даних автоматично ініціалізується при запуску сервера (`initializeDatabase()` у `server.js`). Нижче наведені основні таблиці:

#### Користувачі та профілі

| Таблиця | Призначення | Ключові поля |
|---|---|---|
| `users` | Облікові записи | `id`, `email`, `password`, `role` (enum: учень, вчитель, методист) |
| `profiles` | Профілі користувачів | `user_id`, `first_name`, `last_name`, `school`, `city`, `grade`, `avatar`, `subjects_ids`, `awards` та ін. |

#### Конкурси та результати

| Таблиця | Призначення | Ключові поля |
|---|---|---|
| `subjects` | Навчальні предмети | `id`, `name`, `category` |
| `competitions` | Конкурси | `id`, `title`, `start_date`, `end_date`, `subject_id`, `level`, `organizer`, `is_online`, `custom_fields` (JSONB) |
| `competition_participants` | Учасники конкурсів | `competition_id`, `user_id` (UNIQUE pair) |
| `competition_results` | Результати | `competition_id`, `user_id`, `place`, `score`, `achievement`, `is_confirmed` |
| `competition_documents` | Документи конкурсів | `competition_id`, `user_id`, `file_path`, `file_size` |
| `competition_form_responses` | Відповіді на форми | `competition_id`, `user_id`, `form_data` (JSONB) |
| `teacher_competition_subscriptions` | Підписки вчителів на конкурси | `teacher_id`, `competition_id` |

#### Репетиції

| Таблиця | Призначення | Ключові поля |
|---|---|---|
| `rehearsals` | Репетиції/тренування | `competition_id`, `teacher_id`, `student_id`, `rehearsal_date`, `duration`, `location` |

#### Чат

| Таблиця | Призначення | Ключові поля |
|---|---|---|
| `chats` | Чат-кімнати | `id`, `name`, `created_by` |
| `chat_members` | Учасники чатів | `chat_id`, `user_id` |
| `chat_messages` | Повідомлення | `chat_id`, `user_id`, `content` |
| `chat_read_status` | Статус прочитання | `chat_id`, `user_id`, `last_read_at` |

#### Новини

| Таблиця | Призначення | Ключові поля |
|---|---|---|
| `news` | Публікації | `title`, `content`, `category`, `is_published`, `cover_image_url`, `gallery_images`, `views_count` |
| `news_comments` | Коментарі | `news_id`, `user_id`, `comment` |
| `news_likes` | Лайки | `news_id`, `user_id` |

### Базові предмети (seed-дані)

При першому запуску автоматично створюються 13 базових предметів:
- Точні науки: Математика, Інформатика
- Природничі науки: Фізика, Хімія, Біологія, Географія
- Гуманітарні науки: Українська мова, Українська література
- Іноземні мови: Англійська мова, Німецька мова
- Суспільні науки: Історія України, Економіка, Правознавство

---

## Ролі та доступ

Система використує PostgreSQL enum тип `user_role` з трьома основними значеннями: **учень**, **вчитель**, **методист**.

### Матриця доступу до сторінок

| Сторінка | Учень | Вчитель | Методист | Гість |
|---|---|---|---|---|
| `index.html` (Головна) | + | + | + | + |
| `auth.html` (Вхід) | - | - | - | + |
| `competitionsP.html` | + | - | - | - |
| `competitionsT.html` | - | + | + | - |
| `competitionsM.html` | - | - | + | - |
| `profile.html` | + | - | - | - |
| `profilesT.html` | - | + | + | - |
| `results.html` | - | + | + | - |
| `statistics.html` | - | + | + | - |
| `predictions.html` | + | + | + | - |
| `new.html` (AIC 2.0) | + | + | + | - |
| `admin.html` | - | - | + | - |
| `rehearsalP.html` | + | - | - | - |
| `rehearsalT.html` | - | + | + | - |
| `newsP.html` | + | - | - | - |
| `newsT.html` | - | + | + | - |
| `chat.html` | + | + | + | - |
| `calendar.html` | + | + | + | - |

Контроль доступу реалізований у `role.js` через об'єкт `pageAccess`. Кожні 30 секунд роль оновлюється з сервера для синхронізації.

### Головний методист

Обліковий запис головного методиста (super methodist) визначається через змінні середовища та автоматично створюється при першому запуску сервера. Він має всі права методиста + можливість призначати роль "методист" іншим користувачам.

---

## Модулі платформи

### 1. Автентифікація (`auth.html/js`)

- Реєстрація з email, паролем, телефоном та Telegram
- Вхід з email та паролем
- Паролі хешуються через bcrypt (10 salt rounds)
- Сесії зберігаються в localStorage (userId, userEmail, userRole)

### 2. Профілі (`profile.html`, `profilesT.html`)

- Учні: ПІБ, дата народження, місто, школа, клас, гуртки, досвід
- Вчителі/методисти: ПІБ, предмети, класи, спеціалізація, нагороди, область консультацій
- Завантаження аватарок (до 5MB, формати: JPEG/PNG/GIF)
- Автоматичне видалення старих аватарок при оновленні

### 3. Конкурси (`competitionsP/T/M.html`)

- Створення конкурсів з детальною інформацією (предмет, рівень, організатор, онлайн/офлайн)
- Довільні поля через JSONB (`custom_fields`)
- Реєстрація учасників
- Завантаження документів (до 50MB)
- Заповнення форм відповідей
- Підписка вчителів на конкурси

### 4. Результати (`results.html`)

- Додавання результатів з місцем, балами, досягненням
- Підтвердження результатів (`is_confirmed`)
- Експорт результатів

### 5. Статистика (`statistics.html`)

- Загальний огляд (кількість учнів, конкурсів, результатів)
- Статистика по класах та школах
- Топ учнів
- Рівень успішності конкурсів
- Середні бали
- Хронологія участі
- Окрема статистика по закладу (institution)

### 6. Прогнози (`predictions.html`)

- Аналітика на основі історичних даних
- Візуалізація трендів через Chart.js

### 7. AIC 2.0 -- Adaptive Intelligence Core (`new.html`)

- ML-модель прогнозування успіху (на основі історії конкурсів)
- Прогноз ймовірності призового місця
- Рекомендація рівня конкурсу
- Competency Radar (6 вимірів)
- STEM-індекс
- Індекс стабільності результатів
- Рекомендації на основі аналітики

### 8. Репетиції (`rehearsalP/T.html`)

- Створення репетицій з прив'язкою до конкурсу
- Призначення вчителя та учня
- Дата, тривалість, локація, онлайн-режим

### 9. Новини (`newsP/T.html`)

- Публікація новин з категоріями
- Обкладинка та галерея зображень
- Коментарі та лайки
- Лічильник переглядів

### 10. Чат (`chat.html`)

- Створення чат-кімнат
- Учасники чатів
- Повідомлення в реальному часі
- Статус прочитання

### 11. Календар (`calendar.html`)

- Відображення конкурсів та подій у форматі календаря

### 12. Адміністрування (`admin.html`, `adminUser.html`, `adminTeacher.html`)

- Пароль адмін панелі: **319560**
- Управління користувачами (CRUD)
- Зміна ролей
- Статистика платформи
- Журнал активності

### 13. Список учнів (`students-list.html`)

- Перегляд списку учнів з фільтрацією
- Інформація про участь у конкурсах

### 14. Підготовка (`preparationP/Admin.html`)

- Матеріали для підготовки до конкурсів
- Управління підготовчими матеріалами (адмін)

---

## API Endpoints

### Автентифікація та користувачі

| Метод | Шлях | Опис |
|---|---|---|
| POST | `/api/register` | Реєстрація нового користувача |
| POST | `/api/login` | Авторизація |
| GET | `/api/user/role/:userId` | Отримання ролі |
| POST | `/api/change-password` | Зміна пароля |
| POST | `/api/create-user` | Створення користувача (адмін) |

### Профілі

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/profile/:userId` | Профіль учня |
| POST | `/api/profile` | Оновлення профілю (multipart/form-data) |
| GET | `/api/profile/teacher/:userId` | Профіль вчителя |
| POST | `/api/profile/teacher` | Оновлення профілю вчителя |

### Конкурси

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/competitions` | Список конкурсів |
| GET | `/api/competitions/:id` | Деталі конкурсу |
| POST | `/api/competitions` | Створення конкурсу |
| PUT | `/api/competitions/:id` | Оновлення конкурсу |
| DELETE | `/api/competitions/:id` | Видалення конкурсу |
| GET | `/api/competitions/my/:userId` | Конкурси користувача |
| POST | `/api/competitions/:id/participants` | Додавання учасника |
| GET | `/api/competitions/:id/participants` | Список учасників |
| GET | `/api/competitions/:id/participants-with-results` | Учасники з результатами |

### Документи конкурсів

| Метод | Шлях | Опис |
|---|---|---|
| POST | `/api/competitions/:id/documents/upload` | Завантаження документа |
| GET | `/api/competitions/:id/documents` | Список документів |
| GET | `/api/competitions/:id/documents/my/:userId` | Мої документи |
| DELETE | `/api/competitions/documents/:id` | Видалення документа |

### Форми конкурсів

| Метод | Шлях | Опис |
|---|---|---|
| POST | `/api/competitions/:id/form-response` | Відповідь на форму |
| GET | `/api/competitions/:id/form-response/:userId` | Моя відповідь |
| GET | `/api/competitions/:id/form-responses` | Всі відповіді |
| POST | `/api/competitions/:id/form-file-upload` | Завантаження файлу форми |

### Результати

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/results/:competitionId` | Результати конкурсу |
| GET | `/api/results` | Всі результати (з фільтрацією) |
| POST | `/api/results` | Додавання результату |
| PUT | `/api/results/:resultId` | Оновлення результату |
| DELETE | `/api/results/:resultId` | Видалення результату |
| GET | `/api/results/:competitionId/export` | Експорт результатів |

### Статистика

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/statistics/overview` | Загальний огляд |
| GET | `/api/statistics/by-grade` | По класах |
| GET | `/api/statistics/top-students` | Топ учнів |
| GET | `/api/statistics/competitions` | Статистика конкурсів |
| GET | `/api/statistics/participation-timeline` | Хронологія |
| GET | `/api/statistics/by-school` | По школах |
| GET | `/api/statistics/average-scores` | Середні бали |
| GET | `/api/statistics/competition-success` | Успішність |
| GET | `/api/statistics/participation-rate` | Рівень участі |
| GET | `/api/statistics/class-details` | Деталі класів |
| GET | `/api/statistics/competitions-detailed` | Детальна статистика |
| GET | `/api/statistics/my-school` | Моя школа |
| GET | `/api/statistics/institution/*` | Статистика закладу (7 ендпоінтів) |

### Студенти

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/students` | Список учнів |
| GET | `/api/students/:studentId` | Деталі учня |
| GET | `/api/students/:studentId/results` | Результати учня |
| GET | `/api/students/:studentId/participations` | Участь учня |
| GET | `/api/teacher/:teacherId/students` | Учні вчителя |
| POST | `/api/teacher/students` | Додавання учня |
| PUT | `/api/teacher/students/:studentId` | Оновлення учня |
| DELETE | `/api/teacher/students/:studentId` | Видалення учня |

### Підписки вчителів

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/teacher/:id/competition-subscriptions` | Підписки вчителя |
| POST | `/api/teacher/:id/competition-subscriptions/:compId` | Підписатися |
| DELETE | `/api/teacher/:id/competition-subscriptions/:compId` | Відписатися |

### Предмети та школи

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/subjects` | Список предметів |
| POST | `/api/subjects` | Додати предмет |
| PUT | `/api/subjects/:id` | Оновити предмет |
| DELETE | `/api/subjects/:id` | Видалити предмет |
| GET | `/api/schools` | Список шкіл |
| POST | `/api/schools` | Додати школу |
| PUT | `/api/schools/:id` | Оновити школу |
| DELETE | `/api/schools/:id` | Видалити школу |

### Репетиції

| Метод | Шлях | Опис |
|---|---|---|
| POST | `/api/rehearsals` | Створення репетиції |
| GET | `/api/rehearsals/teacher/:teacherId` | Репетиції вчителя |
| GET | `/api/rehearsals/student/:studentId` | Репетиції учня |
| PUT | `/api/rehearsals/:id` | Оновлення репетиції |
| DELETE | `/api/rehearsals/:id` | Видалення репетиції |

### Чат

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/chats` | Список чатів |
| POST | `/api/chats` | Створення чату |
| GET | `/api/messages/:chatId` | Повідомлення чату |
| POST | `/api/messages` | Відправка повідомлення |
| POST | `/api/chats/:chatId/members` | Додавання учасника |
| GET | `/api/chats/:chatId/members` | Учасники чату |
| POST | `/api/chats/:chatId/read` | Позначити прочитаним |

### Новини

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/news` | Всі новини |
| GET | `/api/news/published` | Опубліковані новини |
| GET | `/api/news/:id` | Деталі новини |
| POST | `/api/news` | Створення новини |
| PUT | `/api/news/:id` | Оновлення новини |
| DELETE | `/api/news/:id` | Видалення новини |
| GET | `/api/news/:id/comments` | Коментарі |
| POST | `/api/news/:id/comments` | Додати коментар |
| DELETE | `/api/news/comments/:id` | Видалити коментар |
| POST | `/api/news/:id/like` | Лайкнути |
| DELETE | `/api/news/:id/like` | Прибрати лайк |
| GET | `/api/news/likes/user/:userId` | Лайки користувача |

### Календар

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/calendar/competitions` | Конкурси для календаря |

### Адмін

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/admin/users` | Всі користувачі |
| POST | `/api/admin/users` | Створення користувача |
| PUT | `/api/admin/users/:id` | Оновлення користувача |
| DELETE | `/api/admin/users/:id` | Видалення користувача |
| POST | `/api/admin/change-role` | Зміна ролі |
| POST | `/api/admin/validate` | Валідація адмін-пароля |
| GET | `/api/admin/all-participants` | Всі учасники |
| DELETE | `/api/admin/participants/:id` | Видалення учасника |
| GET | `/api/admin/all-results` | Всі результати |
| GET | `/api/admin/stats/users` | Статистика користувачів |
| GET | `/api/admin/stats/competitions` | Статистика конкурсів |
| GET | `/api/admin/stats/results` | Статистика результатів |
| GET | `/api/admin/activity` | Журнал активності |
| GET | `/api/admin/logs` | Логи |

### Telegram та зображення

| Метод | Шлях | Опис |
|---|---|---|
| POST | `/api/telegram/notify` | Відправка Telegram-сповіщення |
| GET | `/api/telegram/subscribers` | Список підписників |
| POST | `/api/upload-image` | Завантаження зображення |

---

## Telegram Bot

Бот (`bot.js`) підключається до Telegram Bot API та надає наступні можливості:

- Отримання сповіщень про нові конкурси
- Сповіщення про додавання учня до конкурсу
- Сповіщення про нові результати
- Розмова з ботом (conversation flow через `userStates`)
- Автоматичне розділення довгих повідомлень (4000 символів)
- Повторне підключення при помилках (до 3 спроб)

### Експортовані функції:

```javascript
initBot(pool)                          // Ініціалізація бота
notifyUserAddedToCompetition(data)     // Сповіщення про додавання
notifyUserNewResult(data)              // Сповіщення про результат
notifyNewCompetition(data)             // Сповіщення про новий конкурс
```

---

## PWA та Service Worker

Додаток підтримує PWA (Progressive Web App):

- `manifest.json` -- конфігурація PWA (назва: iEvents, тема: #1976d2)
- `service-worker.js` -- кешування основних ресурсів (index.html, index.css, index.js)
- Стратегія: cache-first з fallback на мережу

---

## Деплоймент

### Render (поточний хостинг)

Сервер деплоїться на Render за адресою `https://ievents-qf5k.onrender.com`. Конфігурація визначається автоматично через `config.js` на клієнті.

### Вимоги для деплою:

1. Встановіть змінну середовища `DATABASE_URL` на хостингу
2. Встановіть `TELEGRAM_BOT_TOKEN` для роботи бота
3. Встановіть `SUPER_METHODIST_EMAIL` та `SUPER_METHODIST_PASSWORD`
4. Команда запуску: `npm start`
5. Переконайтеся, що папки `uploads/` та `documents/` доступні для запису

---

## Ліцензія

Проект є приватним та не має відкритої ліцензії.
