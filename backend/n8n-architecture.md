# n8n Backend Architecture — audit_linkedin workflow

> Extracted live from n8n API: n8n.bot-craft.ru
> Workflow ID: 1ZYJR6Mum95E4buU | Status: Active
> Extracted: 2026-02-27

---

## 📡 Trigger

**Webhook** `POST https://n8n.bot-craft.ru/webhook/linkedin/audit`

Вызывается из Salebot после нажатия кнопки "Провести аудит".

---

## 🗺️ Полный граф потока

```
[Webhook]
    └── [Extract from File]          ← извлекает data из тела запроса
        └── [Normalize input]        ← валидация + нормализация входных данных
            └── [Select rows from a table]   ← проверяем users в Postgres
                └── [Switch1]
                    ├── [0: новый юзер] → [Insert or update rows in a table] → [Postgres: Requests: create]
                    └── [1: существующий] → [Postgres: Requests: create]
                        └── [Init bundle]    ← собираем структуру источников данных
                            ├── [If1: есть PDF?]
                            │   └── YES → [Get a file]    ← скачиваем из Telegram по file_id
                            │             └── [Extract from File1]
                            │                 └── [Build raw_text (pdf)]
                            │                     └── [Merge]
                            ├── [If2: есть fields?]
                            │   └── YES → [Build raw_text (fields)]
                            │             └── [Merge]
                            └── [If3: есть link?]
                                └── YES → [Run an Actor]    ← Apify: парсим LinkedIn
                                          └── [Get dataset items]
                                              └── [Set link into bundle]
                                                  └── [Merge]

[Merge] (объединяет все источники)
    └── [Enrich sources]             ← приоритизация данных: link > pdf > fields
        └── [Message a model]        ← GPT-4o-mini: нормализация профиля в JSON
            └── [Code in JavaScript] ← парсинг + валидация JSON из LLM
                └── [If: статус OK?]
                    ├── YES → [Execute a SQL query]    ← сохраняем artifacts
                    │         └── [Message a model1]   ← GPT-4o: скоринг 0-100
                    │             └── [Message a model2] ← GPT-4o: генерация Telegram-сообщения
                    │                 └── [Send a text message]   ← Telegram: отправка юзеру
                    │                     └── [HTTP Request]      ← callback в Salebot
                    │                         └── [Respond to Webhook]
                    └── NO (INSUFFICIENT_DATA/ERROR) → ... (обработка ошибок)
```

---

## 🔧 Описание ключевых нод

### 1. Normalize input (Code)
Валидирует и нормализует входящий payload из Salebot.

**Входные поля:**
| Поле | Описание |
|---|---|
| `platform_id` | ID пользователя в Salebot (обязательный) |
| `client_id` | ID клиента Telegram |
| `lang` | Язык бота (ru/en) |
| `profile_language` | Язык профиля LinkedIn |
| `goal_type` | Цель (Job/Clients/Brand) |
| `profile_link` | Ссылка на LinkedIn |
| `profile_file_id_tg` | Telegram file_id PDF |
| `profile_headline` | Текст Headline |
| `profile_about` | Текст About |
| `profile_experience` | Текст Experience |
| `profile_skills` | Текст Skills |

**Определяет `input_type`:**
- `pdf` — если есть file_id
- `link` — если есть ссылка
- `manual_fields` — только текстовые поля

**Формирует `canonical_json`** для хэширования (дедупликация одинаковых запросов).

---

### 2. Switch1
Проверяет — новый пользователь или существующий:
- **Ветка 0** (новый): создаёт запись в `users`, затем в `requests`
- **Ветка 1** (существующий): сразу в `requests`

---

### 3. Init bundle (Code)
Создаёт структуру `bundle` — контейнер для сбора данных из всех источников:

```json
{
  "payload": { ... },
  "sources": {
    "pdf":    { "present": bool, "raw_text": null, "error": null },
    "fields": { "present": bool, "raw_text": null, "error": null },
    "link":   { "present": bool, "data": null,     "error": null }
  }
}
```

---

### 4. Параллельная обработка источников (If1/If2/If3)

**If1 → PDF ветка:**
- `Get a file` — скачивает файл из Telegram по `profile_file_id_tg`
- `Extract from File1` — извлекает текст из PDF
- `Build raw_text (pdf)` — записывает текст в `bundle.sources.pdf.raw_text`

**If2 → Fields ветка:**
- `Build raw_text (fields)` — собирает текст из Headline/About/Experience/Skills в структурированный raw_text

**If3 → Link ветка:**
- `Run an Actor` — запускает Apify актор для парсинга LinkedIn профиля
- `Get dataset items` — получает результат
- `Set link into bundle` — записывает структурированные данные профиля

---

### 5. Enrich sources (Code)
Приоритизирует и объединяет данные из всех источников:

**Приоритет данных:** link > pdf > fields

Формирует итоговый `raw_text` с маркерами источников:
```
SOURCE: LINK
HEADLINE: ...
ABOUT: ...

---

SOURCE: PDF
<текст из PDF>

---

SOURCE: FIELDS
HEADLINE: ...
```

---

### 6. LLM Pipeline (3 вызова OpenAI)

#### Message a model — GPT-4o-mini: Normalization
**Задача:** Преобразовать сырой текст профиля в строгий структурированный JSON.

**System prompt ключевые правила:**
- Output ONLY valid JSON, no markdown, no comments
- Do NOT invent/assume/infer missing data — null если нет
- Если суммарный контент < 200 символов → `INSUFFICIENT_DATA`

**Output schema:**
```json
{
  "status": "OK",
  "normalized_profile": {
    "language_detected": "string|null",
    "goal_type": "string|null",
    "headline": "string|null",
    "about": "string|null",
    "experience": [{ "company", "role", "dates", "achievements": [] }],
    "skills": ["string"],
    "link": "string|null"
  },
  "meta": {
    "input_completeness_score": 0.0,
    "duplicate_content_removed": true,
    "insufficient_fields": []
  }
}
```

---

#### Message a model1 — GPT-4o: Scoring
**Задача:** Оценить профиль по 5 критериям, суммарно 0–100 баллов.

**Модель:** GPT-4o, `temperature: 0`, `response_format: json_object`

**Критерии скоринга (каждый 0–20):**

| Критерий | Макс | Правила |
|---|---|---|
| Headline | 20 | +5 длина ≥30, +5 роль, +5 специализация, +5 goal-aligned фраза |
| About | 20 | +5 длина ≥300, +5 ≥2 из (ниша/аудитория/цифры/CTA), +5 число+глагол, +5 структура |
| Experience | 20 | +5 ≥2 роли, +5 company+role заполнены, +5 даты, +5 прогрессия |
| Achievements | 20 | +5 ≥3 достижений, +5 с цифрами, +5 глаголы результата, +5 outcome-focused |
| Skills | 20 | +5 ≥10 навыков, +5 ≥3 по специализации, +5 нет дублей, +5 соответствие headline |

**Ограничения:**
- Если experience < 2 или skills < 8 → total не может превышать 70
- В free mode total не может превышать 85
- Conservative bias: если неясно → 0

**Output schema:**
```json
{
  "status": "OK",
  "meta": { "goal_type": "...", "result_lang": "ru|en", "profile_language_detected": "..." },
  "scores": { "total": 0, "headline": 0, "about": 0, "experience": 0, "achievements": 0, "skills": 0 },
  "strengths": ["Факт → вывод"],
  "weaknesses": ["Факт → вывод"],
  "recommendations": ["..."]
}
```

---

#### Message a model2 — GPT-4o: Telegram Message Writer
**Задача:** Преобразовать scoring JSON в читаемое Telegram-сообщение (≤ ~900 символов).

**Правила:**
- Язык: `result_lang` (ru/en)
- Не упоминать внутренние категории скоринга
- Не давать готовых текстов для LinkedIn
- Не упоминать платную версию
- Нейтральный, аналитический тон, без эмодзи

**Структура сообщения:**
1. Итоговый балл: "Ваш текущий показатель профиля — X из 100."
2. Интерпретация (2–4 предложения)
3. Что работает хорошо (1 параграф)
4. Что ограничивает профиль (1 параграф)
5. Направление улучшений (2–3 предложения)

---

### 7. Postgres: Requests: create
```sql
insert into requests (
  platform_id, request_id, analysis_type, input_type,
  goal, result_lang, profile_hash, status, created_at, updated_at
)
values (
  $1, gen_random_uuid()::text, 'free_score', $2, $3, $4,
  encode(digest($5, 'sha256'), 'hex'), 'RECEIVED', now(), now()
)
returning id, platform_id, request_id, profile_hash, status;
```

### 8. Execute a SQL query — artifacts
```sql
insert into artifacts (platform_id, profile_hash, normalized_profile, created_at)
values ($1, $2, $3::jsonb, now())
on conflict (platform_id, profile_hash)
do update set normalized_profile = excluded.normalized_profile
returning id;
```

---

### 9. Send a text message + HTTP Request (Callback)
- Telegram-нода отправляет сообщение пользователю напрямую
- HTTP Request делает callback в Salebot:
  `POST https://chatter.salebot.pro/api/ecb44fd627bddcd16d449c7860848051/callback`
- Salebot обрабатывает ответ через переменную `free_audit` + status

---

## 🔗 Внешние интеграции

| Сервис | Использование |
|---|---|
| OpenAI GPT-4o-mini | Нормализация профиля |
| OpenAI GPT-4o | Скоринг + генерация сообщения |
| Apify | Парсинг LinkedIn по URL |
| Telegram Bot API | Скачивание PDF, отправка сообщений |
| Salebot.pro | Callback с результатом |
| PostgreSQL | Хранение users, requests, artifacts |

---

## ⚠️ Известные особенности и ограничения

- `profile_hash` = SHA-256 от `canonical_json` — дедупликация одинаковых запросов
- Free score cap: total ≤ 85 (платный режим не реализован)
- Обработка ошибок при `INSUFFICIENT_DATA` — редирект в главное меню через Salebot callback
- `reports` таблица пустая — используется `artifacts` + встроенный ответ в Salebot
- `daily_limits` и `llm_logs` — таблицы созданы, но пока не используются в workflow
