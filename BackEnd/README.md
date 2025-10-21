# Contest Management System - Backend

Backend API для системи управління конкурсами з підтримкою ролей (методист, вчитель, учень).

## Технології

- Node.js + Express.js
- PostgreSQL (Neon)
- JWT Authentication
- bcrypt для хешування паролів
- Telegram Bot API
- node-telegram-bot-api

## Встановлення

1. Клонуйте репозиторій
2. Встановіть залежності:
\`\`\`bash
npm install
\`\`\`

3. Налаштуйте змінні середовища у файлі `.env`:
\`\`\`
DATABASE_URL=postgresql://neondb_owner:npg_biUf1Vr7SYkW@ep-blue-recipe-adlni3pe-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
\`\`\`

4. Ініціалізуйте базу даних:
\`\`\`bash
psql -h your_host -U your_user -d your_database -f db/init.sql
\`\`\`

Або використайте будь-який PostgreSQL клієнт для виконання SQL скрипта з `db/init.sql`

5. Запустіть сервер:

**Режим розробки (з автоперезавантаженням):**
\`\`\`bash
npm run dev
\`\`\`

**Продакшн режим:**
\`\`\`bash
npm start
\`\`\`

## API Endpoints

### Аутентифікація (`/api/auth`)
- `POST /register` - Реєстрація користувача (name, email, password, role)
- `POST /login` - Вхід (отримання JWT токена)
- `GET /me` - Отримати інформацію про поточного користувача (потрібна авторизація)
- `GET /users` - Список всіх користувачів (тільки методист)

### Конкурси (`/api/contests`)
- `GET /` - Список конкурсів (можна фільтрувати за статусом)
- `POST /` - Створити конкурс (тільки методист)
- `GET /:id` - Деталі конкурсу
- `PATCH /:id` - Редагувати конкурс (тільки методист)
- `DELETE /:id` - Архівувати конкурс (тільки методист)
- `GET /:id/results` - Результати конкурсу
- `POST /:id/results` - Додати результат учня (тільки методист)

### Участь у конкурсах (`/api/contests`)
- `POST /:id/register` - Зареєструвати учнів на конкурс (тільки вчитель)
- `GET /:id/participants` - Список учасників конкурсу
- `PATCH /:id/participants/:participantId` - Підтвердити/відхилити участь (тільки методист)
- `GET /registrations` - Реєстрації учня
- `DELETE /:id/participants/:participantId` - Скасувати реєстрацію (учень або вчитель)

### Дашборди

**Методист** (`/api/methodist`)
- `GET /dashboard` - Дашборд методиста (конкурси, статистика, активність)
- `GET /statistics` - Детальна статистика (топ учні, тренди)

**Вчитель** (`/api/teacher`)
- `GET /dashboard` - Дашборд вчителя (класи, учні, конкурси, реєстрації)
- `GET /students` - Список учнів вчителя
- `POST /classes` - Створити клас
- `POST /classes/students` - Додати учня до класу

**Учень** (`/api/student`)
- `GET /dashboard` - Дашборд учня (реєстрації, результати, доступні конкурси)
- `GET /performance` - Історія результатів учня

### Сповіщення (`/api/notifications`)
- `GET /` - Отримати сповіщення користувача
- `PATCH /:id/read` - Позначити сповіщення як прочитане
- `PATCH /read-all` - Позначити всі сповіщення як прочитані

### Прогнози (`/api/predictions`)
- `POST /` - Згенерувати прогноз для учня (методист, вчитель)
- `GET /student` - Отримати прогнози учня
- `POST /contest/:contest_id` - Згенерувати прогнози для всіх учнів конкурсу (методист)

## Telegram Bot

Бот підтримує наступні команди:

- `/start` - Початок роботи з ботом
- `/link <email>` - Зв'язати акаунт з Telegram
- `/unlink` - Відв'язати акаунт від Telegram
- `/help` - Показати доступні команди

### Автоматичні сповіщення:
- Створення нового конкурсу (для всіх вчителів)
- Підтвердження/відхилення участі (для учнів)
- Додавання результатів (для учнів)

## Структура проєкту

\`\`\`
BackEnd/
├── controllers/       # Бізнес-логіка
│   ├── authController.js
│   ├── contestController.js
│   ├── participantController.js
│   ├── methodistController.js
│   ├── teacherController.js
│   ├── studentController.js
│   ├── notificationController.js
│   └── predictionController.js
├── db/               # Підключення до БД та SQL скрипти
│   ├── pool.js
│   └── init.sql
├── middleware/       # Middleware (auth, roles)
│   ├── authMiddleware.js
│   └── roleMiddleware.js
├── routes/           # API маршрути
│   ├── authRoutes.js
│   ├── contestRoutes.js
│   ├── participantRoutes.js
│   ├── methodistRoutes.js
│   ├── teacherRoutes.js
│   ├── studentRoutes.js
│   ├── notificationRoutes.js
│   └── predictionRoutes.js
├── services/         # Сервіси (Telegram bot)
│   └── telegramBot.js
├── .env              # Змінні середовища
├── .gitignore
├── server.js         # Точка входу
├── package.json      # Залежності
└── README.md
\`\`\`

## Ролі користувачів

- **methodist** - Створює та управляє конкурсами, підтверджує участь, додає результати
- **teacher** - Реєструє учнів на конкурси, управляє класами
- **student** - Бере участь у конкурсах, переглядає результати

## Безпека

- Паролі хешуються за допомогою bcrypt (10 rounds)
- JWT токени для авторизації (термін дії: 7 днів)
- Role-based access control (RBAC)
- CORS налаштований для фронтенду
- SQL injection захист через параметризовані запити

## База даних

### Таблиці:
- `users` - Користувачі системи
- `classes` - Класи вчителів
- `students_classes` - Зв'язок учнів та класів
- `contests` - Конкурси
- `contest_participants` - Учасники конкурсів
- `results` - Результати конкурсів
- `notifications` - Сповіщення користувачів
- `predictions` - Прогнози результатів

## Розробка

Використовуйте `nodemon` для автоматичного перезапуску сервера при змінах:
\`\`\`bash
npm run dev
\`\`\`

## Приклади запитів

### Реєстрація
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Іван Петренко",
    "email": "ivan@example.com",
    "password": "securepassword",
    "role": "student"
  }'
\`\`\`

### Логін
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "password": "securepassword"
  }'
\`\`\`

### Створення конкурсу (потрібен токен методиста)
\`\`\`bash
curl -X POST http://localhost:5000/api/contests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Олімпіада з математики",
    "description": "Шкільна олімпіада",
    "rules": "Правила участі...",
    "deadline": "2025-12-31T23:59:59Z"
  }'
\`\`\`

## Ліцензія

ISC
