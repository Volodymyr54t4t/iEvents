<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/platform-web-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/license-private-red.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<h1 align="center">iEvents</h1>

<p align="center">
  <strong>Веборієнтована система автоматизованого керування інтелектуальними заходами</strong>
</p>

<p align="center">
  Повнофункціональна система для організації, відстеження та аналітики інтелектуальних змагань у навчальних закладах з підтримкою машинного навчання для прогнозування результатів.
</p>

<p align="center">
  <a href="#-швидкий-старт">Швидкий старт</a> •
  <a href="#-можливості">Можливості</a> •
  <a href="#-архітектура">Архітектура</a> •
  <a href="#-api-документація">API</a> •
  <a href="#-деплоймент">Деплоймент</a>
</p>

---

## Зміст

- [Огляд проекту](#-огляд-проекту)
- [Швидкий старт](#-швидкий-старт)
- [Можливості](#-можливості)
- [Архітектура](#-архітектура)
- [Технологічний стек](#-технологічний-стек)
- [Структура проекту](#-структура-проекту)
- [Встановлення](#-встановлення)
- [Конфігурація](#-конфігурація)
- [База даних](#-база-даних)
- [Ролі та доступ](#-ролі-та-доступ)
- [Модулі платформи](#-модулі-платформи)
- [API Документація](#-api-документація)
- [Telegram Bot](#-telegram-bot)
- [PWA функціонал](#-pwa-функціонал)
- [Деплоймент](#-деплоймент)


---

## Огляд проекту

### Проблема

Організація інтелектуальних конкурсів у школах характеризується низкою суттєвих недоліків:

| Проблема                     | Наслідки                                         |
| ---------------------------- | ------------------------------------------------ |
| Ручний збір заявок           | Високий ризик помилок, втрата часу               |
| Відсутність єдиної платформи | Складна координація між закладами                |
| Розрізнена інформація        | Неможливість аналізу та прогнозування            |
| Ручна обробка результатів    | Затримки в публікації, незадоволеність учасників |

### Рішення

**iEvents** об'єднує всі етапи проведення конкурсів:

```
Створення конкурсу → Реєстрація учасників → Автоматичні сповіщення → Збір результатів → Аналітика та прогнози
```

---

## Швидкий старт

```bash
# 1. Клонування репозиторію
git clone <repository-url>
cd edu-platform

# 2. Встановлення залежностей
npm install

# 3. Налаштування змінних середовища
cp .env.example .env
# Відредагуйте .env файл

# 4. Запуск сервера
npm start          # Production
npm run dev        # Development (з hot-reload)

# 5. Відкрийте браузер
open http://localhost:3000
```

> **Примітка:** При першому запуску сервер автоматично створить всі необхідні таблиці в базі даних.

---

## Можливості

### Основний функціонал

<table>
<tr>
<td width="50%">

**Для методистів**

- Створення та управління конкурсами
- Налаштування кастомних форм заявок
- Підтвердження результатів
- Розширена статистика по регіону
- Управління користувачами

</td>
<td width="50%">

**Для вчителів**

- Реєстрація учнів на конкурси
- Відстеження прогресу учнів
- Планування репетицій
- Перегляд статистики класу
- Підписка на конкурси

</td>
</tr>
<tr>
<td width="50%">

**Для учнів**

- Перегляд доступних конкурсів
- Особистий профіль з досягненнями
- Матеріали для підготовки
- Чат з вчителями
- Персоналізовані прогнози

</td>
<td width="50%">

**Аналітика та AI**

- Статистика по класах, школах, регіонах
- Прогнозування результатів (ML)
- Competency Radar (6 вимірів)
- STEM-індекс
- Персоналізовані рекомендації

</td>
</tr>
</table>

### AIC 2.0 — Adaptive Intelligence Core

Інноваційний модуль машинного навчання для прогнозування успіху учнів:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AIC 2.0 ENGINE                           │
├─────────────────────────────────────────────────────────────────┤
│  Історія конкурсів  →  Feature Engineering  →  ML Model        │
│         ↓                      ↓                   ↓            │
│  Динаміка учня      →  Аналіз патернів      →  Прогноз         │
│         ↓                      ↓                   ↓            │
│  Характеристики     →  Ваги факторів        →  Рекомендації    │
└─────────────────────────────────────────────────────────────────┘
```

**Можливості:**

- Прогноз ймовірності призового місця
- Рекомендація оптимального рівня конкурсу
- Competency Radar по 6 вимірах компетенцій
- Індекс стабільності результатів
- Персоналізовані рекомендації для підготовки

---

## Архітектура

### Системна архітектура

```
                                    ┌─────────────────┐
                                    │   Telegram Bot  │
                                    │   (bot.js)      │
                                    └────────┬────────┘
                                             │
┌─────────────────┐                          │
│     Клієнт      │                          │
│  (HTML/CSS/JS)  │                          │
│                 │     ┌────────────────────┼────────────────────┐
│  ┌───────────┐  │     │                    ▼                    │
│  │ Browser   │◄─┼────►│         Express.js Server              │
│  │           │  │     │          (server.js)                   │
│  └───────────┘  │     │              :3000                     │
│                 │     │                                         │
│  ┌───────────┐  │     │    ┌─────────────────────────────┐     │
│  │ Service   │  │     │    │        API Layer            │     │
│  │ Worker    │  │     │    │                             │     │
│  └───────────┘  │     │    │  /api/auth      /api/admin  │     │
│                 │     │    │  /api/users     /api/news   │     │
│  ┌───────────┐  │     │    │  /api/compete   /api/chat   │     │
│  │ PWA       │  │     │    │  /api/stats     /api/mentor │     │
│  │ Manifest  │  │     │    └─────────────────────────────┘     │
│  └───────────┘  │     │                    │                    │
└─────────────────┘     └────────────────────┼────────────────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    ▼                    │
                        │  ┌──────────────────────────────────┐   │
                        │  │         PostgreSQL (Neon)        │   │
                        │  │                                  │   │
                        │  │  users │ profiles │ competitions │   │
                        │  │  results │ chats │ news │ ...    │   │
                        │  └──────────────────────────────────┘   │
                        │                                         │
                        │  ┌──────────────────────────────────┐   │
                        │  │       Google Gemini AI API       │   │
                        │  │       (Аналітика & Прогнози)     │   │
                        │  └──────────────────────────────────┘   │
                        │                                         │
                        │  ┌──────────────────────────────────┐   │
                        │  │       File System Storage        │   │
                        │  │   uploads/ │ documents/          │   │
                        │  └──────────────────────────────────┘   │
                        └─────────────────────────────────────────┘
```

### Потік даних

```
┌──────────┐    HTTP     ┌──────────┐    SQL      ┌──────────┐
│  Client  │ ──────────► │  Server  │ ──────────► │ Database │
│          │ ◄────────── │          │ ◄────────── │          │
└──────────┘    JSON     └──────────┘   Results   └──────────┘
                              │
                              │ Webhook
                              ▼
                        ┌──────────┐
                        │ Telegram │
                        │   Bot    │
                        └──────────┘
```

---

## Технологічний стек

### Backend

| Технологія                | Версія    | Призначення                  |
| ------------------------- | --------- | ---------------------------- |
| **Node.js**               | >= 18     | Runtime-середовище           |
| **Express.js**            | 4.18      | HTTP-сервер та маршрутизація |
| **PostgreSQL**            | -         | Реляційна база даних         |
| **pg**                    | 8.11      | PostgreSQL-клієнт            |
| **bcrypt** / **bcryptjs** | 5.1 / 3.0 | Хешування паролів            |
| **multer**                | 1.4       | Завантаження файлів          |
| **node-telegram-bot-api** | 0.66      | Telegram-бот                 |
| **@google/generative-ai** | 0.21      | Google Gemini AI             |
| **axios**                 | 1.6       | HTTP-клієнт                  |
| **cheerio**               | 1.0       | Web scraping                 |

### Frontend

| Технологія             | Призначення                       |
| ---------------------- | --------------------------------- |
| **HTML5**              | Семантична розмітка               |
| **CSS3**               | Стилізація (модульна архітектура) |
| **Vanilla JavaScript** | Клієнтська логіка                 |
| **Chart.js**           | Графіки та візуалізації           |
| **Service Worker**     | PWA, офлайн-кешування             |

### Інфраструктура

| Сервіс               | Призначення             |
| -------------------- | ----------------------- |
| **Render**           | Хостинг сервера         |
| **Neon**             | PostgreSQL (serverless) |
| **Telegram Bot API** | Сповіщення              |

---

## Структура проекту

```
iEvents/
├── server.js                    # Головний серверний файл
├── config.js                    # Конфігурація API URL
├── role.js                      # Контроль доступу за ролями
├── components.js                # Динамічний header/footer
├── bot.js                       # Telegram-бот
├── parser.js                    # Парсер шкіл ІСУО
├── service-worker.js            # PWA Service Worker
├── manifest.json                # PWA маніфест
├── package.json                 # Залежності
├── .env                         # Змінні середовища
│
├── # ══════════════════════════════════════════════════════════
├── # СТОРІНКИ АВТЕНТИФІКАЦІЇ
├── # ══════════════════════════════════════════════════════════
├── auth.html / auth.css / auth.js
│
├── # ══════════════════════════════════════════════════════════
├── # ГОЛОВНА ТА ПРОФІЛІ
├── # ══════════════════════════════════════════════════════════
├── index.html / index.css / index.js          # Головна
├── profile.html / profile.css / profile.js    # Профіль учня
├── profilesT.html / profilesT.css / profilesT.js  # Профіль вчителя
│
├── # ══════════════════════════════════════════════════════════
├── # КОНКУРСИ (за ролями)
├── # ══════════════════════════════════════════════════════════
├── competitionsP.* (учень) │ competitionsT.* (вчитель) │ competitionsM.* (методист)
│
├── # ══════════════════════════════════════════════════════════
├── # АНАЛІТИКА ТА ПРОГНОЗИ
├── # ══════════════════════════════════════════════════════════
├── results.html / results.css / results.js       # Результати
├── statistics.html / statistics.css / statistics.js  # Статистика
├── predictions.html / predictions.css / predictions.js  # Прогнози
├── aic-2-0.html / aic-2-0.css / aic-2-0.js                   # AIC 2.0
│
├── # ══════════════════════════════════════════════════════════
├── # КОМУНІКАЦІЯ
├── # ══════════════════════════════════════════════════════════
├── newsP.* / newsT.*                             # Новини
├── chat.html / chat.css / chat.js                # Чат
│
├── # ══════════════════════════════════════════════════════════
├── # ПІДГОТОВКА ТА РЕПЕТИЦІЇ
├── # ══════════════════════════════════════════════════════════
├── rehearsalP.* / rehearsalT.*                   # Репетиції
├── preparationP.* / preparationAdmin.*           # Підготовка
├── mentor.* / mentorT.* / mentorM.*              # Менторство
│
├── # ══════════════════════════════════════════════════════════
├── # АДМІНІСТРУВАННЯ
├── # ══════════════════════════════════════════════════════════
├── admin.html / admin.css / admin.js             # Панель адміна
├── adminUser.* / adminTeacher.*                  # Управління користувачами
│
├── # ══════════════════════════════════════════════════════════
├── # ДОДАТКОВІ МОДУЛІ
├── # ══════════════════════════════════════════════════════════
├── calendar.html / calendar.css / calendar.js    # Календар
├── students-list.* / parser_results.*            # Списки та парсер
├── contest-database.* / achievex.*               # База конкурсів, досягнення
│
├── # ══════════════════════════════════════════════════════════
├── # ІНФОРМАЦІЙНІ СТОРІНКИ
├── # ══════════════════════════════════════════════════════════
├── about.* / contacts.* / support.* / privacy-policy.* / question.*
│
├── # ══════════════════════════════════════════════════════════
├── # СПІЛЬНІ РЕСУРСИ
├── # ══════════════════════════════════════════════════════════
├── header.css / footer.css / page-spacing.css
├── notifications.css / notifications.js
│
├── # ══════════════════════════════════════════════════════════
├── # ДИРЕКТОРІЇ
├── # ══════════════════════════════════════════════════════════
├── uploads/                      # Аватарки (до 5MB)
├── documents/                    # Документи (до 50MB)
└── scripts/                      # SQL міграції
    ├── complete-database-setup.sql
    ├── seed-students-and-results.sql
    ├── init-competitions-forms.sql
    ├── team-competitions-*.sql
    ├── create-chat-tables*.sql
    ├── create-news-tables.sql
    ├── notifications-setup.sql
    └── ...
```

---

## Встановлення

### Передумови

- **Node.js** >= 18.0.0
- **npm** або **pnpm**
- **PostgreSQL** (рекомендується Neon)
- **Telegram Bot Token** (отримати через [@BotFather](https://t.me/BotFather))

### Покрокова інструкція

#### 1. Клонування репозиторію

```bash
git clone <repository-url>
cd edu-platform
```

#### 2. Встановлення залежностей

```bash
npm install
```

#### 3. Налаштування бази даних

Створіть базу даних PostgreSQL (рекомендується [Neon](https://neon.tech)):

```sql
-- База автоматично ініціалізується при першому запуску
-- Але ви можете виконати скрипти вручну:
-- \i scripts/complete-database-setup.sql
```

#### 4. Налаштування змінних середовища

```bash
cp .env.example .env
```

Відредагуйте `.env` файл (див. [Конфігурація](#-конфігурація)).

#### 5. Запуск

```bash
# Production
npm start

# Development (з hot-reload)
npm run dev

# Парсинг шкіл ІСУО
npm run parse-schools
```

#### 6. Перевірка

Відкрийте браузер: `http://localhost:3000`

---

## Конфігурація

### Змінні середовища

Створіть файл `.env` у кореневій директорії:

```env
# ═══════════════════════════════════════════════════════════════
# БАЗА ДАНИХ (обов'язково)
# ═══════════════════════════════════════════════════════════════
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# ═══════════════════════════════════════════════════════════════
# ГОЛОВНИЙ МЕТОДИСТ (обов'язково)
# ═══════════════════════════════════════════════════════════════
SUPER_METHODIST_EMAIL=admin@example.com
SUPER_METHODIST_PASSWORD=secure_password_here

# ═══════════════════════════════════════════════════════════════
# TELEGRAM BOT (обов'язково)
# ═══════════════════════════════════════════════════════════════
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# ═══════════════════════════════════════════════════════════════
# AI АНАЛІТИКА (опціонально)
# ═══════════════════════════════════════════════════════════════
GEMINI_API_KEY=your_gemini_api_key

# ═══════════════════════════════════════════════════════════════
# СЕРВЕР (опціонально)
# ═══════════════════════════════════════════════════════════════
PORT=3000
```

### Опис змінних

| Змінна                     | Тип             | Опис                                 |
| -------------------------- | --------------- | ------------------------------------ |
| `DATABASE_URL`             | **Обов'язково** | Connection string для PostgreSQL     |
| `SUPER_METHODIST_EMAIL`    | **Обов'язково** | Email головного методиста            |
| `SUPER_METHODIST_PASSWORD` | **Обов'язково** | Пароль головного методиста           |
| `TELEGRAM_BOT_TOKEN`       | **Обов'язково** | Токен Telegram-бота                  |
| `GEMINI_API_KEY`           | Опціонально     | API-ключ Google Gemini AI            |
| `PORT`                     | Опціонально     | Порт сервера (за замовчуванням 3000) |

### Конфігурація клієнта

Файл `config.js` автоматично визначає URL API:

```javascript
// Для localhost
const API_URL = "http://localhost:3000";

// Для production
const API_URL = "https://ievents-qf5k.onrender.com";
```

---

## База даних

### ER-діаграма (спрощена)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      users      │       │    profiles     │       │    subjects     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────►│ user_id (FK)    │       │ id (PK)         │
│ email           │       │ first_name      │       │ name            │
│ password        │       │ last_name       │       │ category        │
│ role            │       │ school          │       └────────┬────────┘
│ phone           │       │ city            │                │
│ telegram        │       │ grade           │                │
└────────┬────────┘       │ avatar          │                │
         │                │ subjects_ids    │                │
         │                └─────────────────┘                │
         │                                                   │
         │                ┌─────────────────┐                │
         │                │  competitions   │                │
         │                ├─────────────────┤                │
         │                │ id (PK)         │◄───────────────┘
         │                │ title           │
         │                │ subject_id (FK) │
         │                │ start_date      │
         │                │ end_date        │
         │                │ level           │
         │                │ custom_fields   │
         │                └────────┬────────┘
         │                         │
         ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│              competition_participants                        │
├─────────────────────────────────────────────────────────────┤
│ id (PK) │ competition_id (FK) │ user_id (FK) │ created_at   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 competition_results                          │
├─────────────────────────────────────────────────────────────┤
│ id │ competition_id │ user_id │ place │ score │ achievement │
└─────────────────────────────────────────────────────────────┘
```

### Основні таблиці

<details>
<summary><b>Користувачі та профілі</b></summary>

| Таблиця    | Опис                 | Ключові поля                                                                                        |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `users`    | Облікові записи      | `id`, `email`, `password`, `role`, `phone`, `telegram`                                              |
| `profiles` | Профілі користувачів | `user_id`, `first_name`, `last_name`, `school`, `city`, `grade`, `avatar`, `subjects_ids`, `awards` |

</details>

<details>
<summary><b>Конкурси та результати</b></summary>

| Таблиця                      | Опис               | Ключові поля                                                                            |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `subjects`                   | Навчальні предмети | `id`, `name`, `category`                                                                |
| `competitions`               | Конкурси           | `id`, `title`, `start_date`, `end_date`, `subject_id`, `level`, `custom_fields` (JSONB) |
| `competition_participants`   | Учасники           | `competition_id`, `user_id`                                                             |
| `competition_results`        | Результати         | `competition_id`, `user_id`, `place`, `score`, `achievement`, `is_confirmed`            |
| `competition_documents`      | Документи          | `competition_id`, `user_id`, `file_path`, `file_size`                                   |
| `competition_form_responses` | Відповіді на форми | `competition_id`, `user_id`, `form_data` (JSONB)                                        |

</details>

<details>
<summary><b>Комунікація</b></summary>

| Таблиця         | Опис           | Ключові поля                                                        |
| --------------- | -------------- | ------------------------------------------------------------------- |
| `chats`         | Чат-кімнати    | `id`, `name`, `created_by`                                          |
| `chat_members`  | Учасники чатів | `chat_id`, `user_id`                                                |
| `chat_messages` | Повідомлення   | `chat_id`, `user_id`, `content`                                     |
| `news`          | Новини         | `id`, `title`, `content`, `category`, `is_published`, `views_count` |
| `news_comments` | Коментарі      | `news_id`, `user_id`, `comment`                                     |

</details>

<details>
<summary><b>Підготовка та репетиції</b></summary>

| Таблиця                 | Опис                 | Ключові поля                                                                           |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `rehearsals`            | Репетиції            | `competition_id`, `teacher_id`, `student_id`, `rehearsal_date`, `duration`, `location` |
| `preparation_materials` | Матеріали підготовки | `id`, `title`, `content`, `subject_id`, `created_by`                                   |

</details>

### Базові предмети (seed-дані)

При першому запуску автоматично створюються 13 предметів:

| Категорія         | Предмети                                  |
| ----------------- | ----------------------------------------- |
| Точні науки       | Математика, Інформатика                   |
| Природничі науки  | Фізика, Хімія, Біологія, Географія        |
| Гуманітарні науки | Українська мова, Українська література    |
| Іноземні мови     | Англійська мова, Німецька мова            |
| Суспільні науки   | Історія України, Економіка, Правознавство |

---

## Ролі та доступ

### Система ролей

```
┌─────────────────────────────────────────────────────────────┐
│                       МЕТОДИСТ                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    ВЧИТЕЛЬ                           │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │                   УЧЕНЬ                        │  │    │
│  │  │                                               │  │    │
│  │  │  • Перегляд конкурсів                         │  │    │
│  │  │  • Особистий профіль                          │  │    │
│  │  │  • Підготовчі матеріали                       │  │    │
│  │  │  • Чат з вчителями                            │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │                                                     │    │
│  │  + Реєстрація учнів                                 │    │
│  │  + Планування репетицій                             │    │
│  │  + Перегляд статистики класу                        │    │
│  │  + Управління новинами                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  + Створення конкурсів                                      │
│  + Підтвердження результатів                                │
│  + Управління користувачами                                 │
│  + Регіональна статистика                                   │
│  + Адміністративна панель                                   │
└─────────────────────────────────────────────────────────────┘
```

### Матриця доступу

| Сторінка             | Учень | Вчитель | Методист | Гість |
| -------------------- | :---: | :-----: | :------: | :---: |
| `index.html`         |   ✓   |    ✓    |    ✓     |   ✓   |
| `auth.html`          |   -   |    -    |    -     |   ✓   |
| `competitionsP.html` |   ✓   |    -    |    -     |   -   |
| `competitionsT.html` |   -   |    ✓    |    ✓     |   -   |
| `competitionsM.html` |   -   |    -    |    ✓     |   -   |
| `profile.html`       |   ✓   |    -    |    -     |   -   |
| `profilesT.html`     |   -   |    ✓    |    ✓     |   -   |
| `results.html`       |   -   |    ✓    |    ✓     |   -   |
| `statistics.html`    |   -   |    ✓    |    ✓     |   -   |
| `predictions.html`   |   ✓   |    ✓    |    ✓     |   -   |
| `aic-2-0.html` (AIC)     |   ✓   |    ✓    |    ✓     |   -   |
| `admin.html`         |   -   |    -    |    ✓     |   -   |
| `rehearsalP.html`    |   ✓   |    -    |    -     |   -   |
| `rehearsalT.html`    |   -   |    ✓    |    ✓     |   -   |
| `newsP.html`         |   ✓   |    -    |    -     |   -   |
| `newsT.html`         |   -   |    ✓    |    ✓     |   -   |
| `chat.html`          |   ✓   |    ✓    |    ✓     |   -   |
| `calendar.html`      |   ✓   |    ✓    |    ✓     |   -   |
| `mentor*.html`       |   ✓   |    ✓    |    ✓     |   -   |

### Головний методист

Обліковий запис головного методиста визначається через змінні середовища:

```env
SUPER_METHODIST_EMAIL=admin@example.com
SUPER_METHODIST_PASSWORD=secure_password
```

**Додаткові права:**

- Призначення ролі "методист" іншим користувачам
- Повний доступ до всіх адміністративних функцій
- Перегляд глобальної статистики

---

## Модулі платформи

### 1. Автентифікація

**Файли:** `auth.html`, `auth.css`, `auth.js`

- Реєстрація з email, паролем, телефоном та Telegram
- Вхід з email та паролем
- Хешування паролів через bcrypt (10 salt rounds)
- Сесії в localStorage (`userId`, `userEmail`, `userRole`)

### 2. Профілі

**Файли:** `profile.html`, `profilesT.html`

| Тип                  | Поля                                                     |
| -------------------- | -------------------------------------------------------- |
| **Учень**            | ПІБ, дата народження, місто, школа, клас, гуртки, досвід |
| **Вчитель/Методист** | ПІБ, предмети, класи, спеціалізація, нагороди            |

- Завантаження аватарок (до 5MB, JPEG/PNG/GIF)
- Автоматичне видалення старих аватарок

### 3. Конкурси

**Файли:** `competitionsP.html`, `competitionsT.html`, `competitionsM.html`

```javascript
// Структура конкурсу
{
  id: number,
  title: string,
  description: string,
  subject_id: number,
  level: 'шкільний' | 'районний' | 'обласний' | 'всеукраїнський' | 'міжнародний',
  start_date: Date,
  end_date: Date,
  organizer: string,
  is_online: boolean,
  custom_fields: JSONB  // Довільні поля форми
}
```

**Можливості:**

- Створення конкурсів з детальною інформацією
- Кастомні поля через JSONB (`custom_fields`)
- Реєстрація учасників
- Завантаження документів (до 50MB)
- Заповнення форм відповідей

### 4. Результати та статистика

**Файли:** `results.html`, `statistics.html`, `predictions.html`, `aic-2-0.html`

**Статистика включає:**

- Загальний огляд (учні, конкурси, результати)
- Статистика по класах та школах
- Топ учнів
- Рівень успішності
- Середні бали
- Хронологія участі

**AIC 2.0 (aic-2-0.html):**

- Прогноз ймовірності призового місця
- Рекомендація рівня конкурсу
- Competency Radar (6 вимірів)
- STEM-індекс
- Індекс стабільності

### 5. Репетиції

**Файли:** `rehearsalP.html`, `rehearsalT.html`

```javascript
// Структура репетиції
{
  id: number,
  competition_id: number,
  teacher_id: number,
  student_id: number,
  rehearsal_date: Date,
  duration: number,  // хвилини
  location: string,
  is_online: boolean
}
```

### 6. Новини

**Файли:** `newsP.html`, `newsT.html`

- Публікація з категоріями
- Обкладинка та галерея зображень
- Коментарі та лайки
- Лічильник переглядів

### 7. Чат

**Файл:** `chat.html`

- Створення чат-кімнат
- Учасники чатів
- Повідомлення в реальному часі
- Статус прочитання
- Завантаження файлів

### 8. Менторство

**Файли:** `mentor.html`, `mentorT.html`, `mentorM.html`

- Призначення менторів
- Матеріали для підготовки
- Відстеження прогресу

### 9. Календар

**Файл:** `calendar.html`

- Відображення конкурсів та подій
- Фільтрація за датами
- Інтеграція з конкурсами

### 10. Адміністрування

**Файли:** `admin.html`, `adminUser.html`, `adminTeacher.html`

> **Пароль адмін-панелі:** `319560`

- Управління користувачами (CRUD)
- Зміна ролей
- Статистика платформи
- Журнал активності

---

## API Документація

### Базовий URL

```
Development: http://localhost:3000/api
Production:  https://ievents-qf5k.onrender.com/api
```

### Автентифікація

<details>
<summary><code>POST</code> <code>/register</code> — Реєстрація</summary>

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "учень",
  "phone": "+380501234567",
  "telegram": "@username"
}
```

**Response:**

```json
{
  "success": true,
  "userId": 1,
  "message": "Реєстрація успішна"
}
```

</details>

<details>
<summary><code>POST</code> <code>/login</code> — Авторизація</summary>

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "учень"
  }
}
```

</details>

### Профілі

<details>
<summary><code>GET</code> <code>/profile/:userId</code> — Отримання профілю учня</summary>

**Response:**

```json
{
  "user_id": 1,
  "first_name": "Іван",
  "last_name": "Петренко",
  "school": "ЗОШ №1",
  "city": "Київ",
  "grade": 10,
  "avatar": "/uploads/avatar-1.jpg"
}
```

</details>

<details>
<summary><code>POST</code> <code>/profile</code> — Оновлення профілю</summary>

**Content-Type:** `multipart/form-data`

**Fields:**

- `userId` (required)
- `firstName`, `lastName`, `school`, `city`, `grade`
- `avatar` (file, optional)

</details>

### Конкурси

| Метод    | Endpoint                         | Опис               |
| -------- | -------------------------------- | ------------------ |
| `GET`    | `/competitions`                  | Список конкурсів   |
| `GET`    | `/competitions/:id`              | Деталі конкурсу    |
| `POST`   | `/competitions`                  | Створення конкурсу |
| `PUT`    | `/competitions/:id`              | Оновлення конкурсу |
| `DELETE` | `/competitions/:id`              | Видалення конкурсу |
| `GET`    | `/competitions/my/:userId`       | Мої конкурси       |
| `POST`   | `/competitions/:id/participants` | Додати учасника    |
| `GET`    | `/competitions/:id/participants` | Список учасників   |

### Результати

| Метод    | Endpoint                         | Опис                           |
| -------- | -------------------------------- | ------------------------------ |
| `GET`    | `/results/:competitionId`        | Результати конкурсу            |
| `GET`    | `/results`                       | Всі результати (з фільтрацією) |
| `POST`   | `/results`                       | Додати результат               |
| `PUT`    | `/results/:resultId`             | Оновити результат              |
| `DELETE` | `/results/:resultId`             | Видалити результат             |
| `GET`    | `/results/:competitionId/export` | Експорт результатів            |

### Статистика

| Метод | Endpoint                             | Опис                 |
| ----- | ------------------------------------ | -------------------- |
| `GET` | `/statistics/overview`               | Загальний огляд      |
| `GET` | `/statistics/by-grade`               | По класах            |
| `GET` | `/statistics/top-students`           | Топ учнів            |
| `GET` | `/statistics/competitions`           | Статистика конкурсів |
| `GET` | `/statistics/participation-timeline` | Хронологія           |
| `GET` | `/statistics/by-school`              | По школах            |
| `GET` | `/statistics/average-scores`         | Середні бали         |
| `GET` | `/statistics/institution/*`          | Статистика закладу   |

### Чат

| Метод  | Endpoint                 | Опис                   |
| ------ | ------------------------ | ---------------------- |
| `GET`  | `/chats`                 | Список чатів           |
| `POST` | `/chats`                 | Створення чату         |
| `GET`  | `/messages/:chatId`      | Повідомлення           |
| `POST` | `/messages`              | Відправка повідомлення |
| `POST` | `/chats/:chatId/members` | Додати учасника        |
| `POST` | `/chats/:chatId/read`    | Позначити прочитаним   |

### Новини

| Метод    | Endpoint             | Опис          |
| -------- | -------------------- | ------------- |
| `GET`    | `/news`              | Всі новини    |
| `GET`    | `/news/published`    | Опубліковані  |
| `GET`    | `/news/:id`          | Деталі новини |
| `POST`   | `/news`              | Створення     |
| `PUT`    | `/news/:id`          | Оновлення     |
| `DELETE` | `/news/:id`          | Видалення     |
| `POST`   | `/news/:id/like`     | Лайк          |
| `POST`   | `/news/:id/comments` | Коментар      |

### Адміністрування

| Метод    | Endpoint             | Опис              |
| -------- | -------------------- | ----------------- |
| `GET`    | `/admin/users`       | Всі користувачі   |
| `POST`   | `/admin/users`       | Створення         |
| `PUT`    | `/admin/users/:id`   | Оновлення         |
| `DELETE` | `/admin/users/:id`   | Видалення         |
| `POST`   | `/admin/change-role` | Зміна ролі        |
| `POST`   | `/admin/validate`    | Валідація пароля  |
| `GET`    | `/admin/stats/*`     | Статистика        |
| `GET`    | `/admin/activity`    | Журнал активності |

---

## Telegram Bot

### Ініціалізація

```javascript
const {
  initBot,
  notifyUserAddedToCompetition,
  notifyNewCompetition,
} = require("./bot");

// При старті сервера
initBot(pool);
```

### Функції сповіщень

```javascript
// Сповіщення про додавання до конкурсу
await notifyUserAddedToCompetition({
  telegram: "@username",
  competitionTitle: "Олімпіада з математики",
  competitionDate: "2024-03-15",
});

// Сповіщення про новий конкурс
await notifyNewCompetition({
  title: "Олімпіада з фізики",
  subject: "Фізика",
  level: "обласний",
  startDate: "2024-04-01",
});

// Сповіщення про результат
await notifyUserNewResult({
  telegram: "@username",
  competitionTitle: "Олімпіада з математики",
  place: 1,
  score: 95,
});
```

### Особливості

- Автоматичне розділення довгих повідомлень (>4000 символів)
- Повторне підключення при помилках (до 3 спроб)
- Conversation flow через `userStates`
- Підтримка inline-кнопок

---

## PWA функціонал

### Manifest

```json
{
  "name": "iEvents",
  "short_name": "iEvents",
  "theme_color": "#1976d2",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [...]
}
```

### Service Worker

**Стратегія кешування:** Cache-first з fallback на мережу

**Кешовані ресурси:**

- `index.html`
- `index.css`
- `index.js`
- Основні шрифти та іконки

---

## Деплоймент

### Render (Production)

**URL:** `https://ievents-qf5k.onrender.com`

#### Налаштування

1. Створіть новий Web Service на [Render](https://render.com)
2. Підключіть GitHub репозиторій
3. Налаштуйте змінні середовища:
   - `DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `SUPER_METHODIST_EMAIL`
   - `SUPER_METHODIST_PASSWORD`
   - `GEMINI_API_KEY` (опціонально)
4. Build Command: `npm install`
5. Start Command: `npm start`

#### Вимоги

- Папки `uploads/` та `documents/` доступні для запису
- PostgreSQL база (рекомендується Neon)
- Node.js >= 18

### Docker (альтернатива)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t ievents .
docker run -p 3000:3000 --env-file .env ievents
```

---

## Troubleshooting

### Часті проблеми

<details>
<summary><b>Помилка підключення до бази даних</b></summary>

Перевірте:

1. Правильність `DATABASE_URL` в `.env`
2. SSL-сертифікат (`?sslmode=require`)
3. Доступність бази з вашого IP

```bash
# Тест підключення
psql $DATABASE_URL -c "SELECT 1"
```

</details>

<details>
<summary><b>Telegram-бот не працює</b></summary>

1. Перевірте токен через [@BotFather](https://t.me/BotFather)
2. Переконайтеся, що бот не заблокований
3. Перевірте логи сервера

```javascript
// Тест підключення
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.getMe().then(console.log);
```

</details>

<details>
<summary><b>Файли не завантажуються</b></summary>

1. Перевірте права на папки `uploads/` та `documents/`
2. Перевірте ліміти multer (5MB/50MB)
3. Перевірте вільне місце на диску
</details>

---

## Ліцензія

Проект є приватним та не має відкритої ліцензії.

---

<p align="center">
  <strong>iEvents</strong> — Розумне управління освітніми конкурсами
</p>

<p align="center">
  Створено з ❤️ для української освіти
</p>
