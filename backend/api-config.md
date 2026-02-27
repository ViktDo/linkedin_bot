# API & Infrastructure Config

> Extracted: 2026-02-27

---

## 🌐 Endpoints

| Endpoint | Метод | Описание |
|---|---|---|
| `https://n8n.bot-craft.ru/webhook/linkedin/audit` | POST | Запуск аудита LinkedIn профиля |

---

## 📥 Webhook Input Format

Salebot отправляет данные в теле запроса в поле `data`:

```json
{
  "data": {
    "platform_id": "string",
    "client_id": "string",
    "lang": "ru|en",
    "profile_language": "ru|en|null",
    "goal_type": "Job|Clients|Brand|null",
    "profile_link": "string|null",
    "profile_file_id_tg": "string|null",
    "profile_headline": "string|null",
    "profile_about": "string|null",
    "profile_experience": "string|null",
    "profile_skills": "string|null"
  }
}
```

---

## 📤 Webhook Response → Salebot Callback

После завершения анализа n8n делает POST-запрос в Salebot:

`POST https://chatter.salebot.pro/api/ecb44fd627bddcd16d449c7860848051/callback`

**Payload:**
```json
{
  "status": "free_audit",
  "result": "...",
  "..."
}
```

Salebot получает callback и парсит через:
```
split = splitter('#{question}', ';')
status = split[1]
```

---

## 🗄️ PostgreSQL

```
host: safasuedubap.beget.app
port: 5432
dbname: linkedin_bot
user: ViktDo
sslmode: disable
```

---

## 🗂️ Database Schema

### users
Хранит пользователей по platform_id (salebot user id).

```sql
CREATE TABLE users (
  platform_id   TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### requests
Каждый запрос на анализ. Хэш профиля для дедупликации.

```sql
CREATE TABLE requests (
  id             BIGSERIAL PRIMARY KEY,
  platform_id    TEXT NOT NULL,
  request_id     TEXT NOT NULL,               -- UUID, gen_random_uuid()
  analysis_type  TEXT NOT NULL,               -- 'free_score'
  input_type     TEXT NOT NULL,               -- 'pdf' | 'link' | 'manual_fields'
  goal           TEXT NOT NULL,               -- goal_type из Salebot
  result_lang    TEXT NOT NULL,               -- 'ru' | 'en'
  profile_hash   TEXT NOT NULL,               -- sha256(canonical_json)
  status         TEXT NOT NULL,               -- 'RECEIVED' | 'OK' | 'ERROR'
  response_json  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(platform_id, request_id),
  INDEX idx_requests_platform_created (platform_id, created_at DESC),
  INDEX idx_requests_profile_hash (profile_hash)
);
```

### artifacts
Нормализованные профили. Уникальны по (platform_id, profile_hash) — кэш повторных запросов.

```sql
CREATE TABLE artifacts (
  id                 BIGSERIAL PRIMARY KEY,
  platform_id        TEXT NOT NULL,
  profile_hash       TEXT NOT NULL,
  normalized_profile JSONB NOT NULL,          -- output GPT-4o-mini normalization
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(platform_id, profile_hash)
);
```

### reports
Результаты полного анализа (пока не используется).

```sql
CREATE TABLE reports (
  id             BIGSERIAL PRIMARY KEY,
  report_id      UUID NOT NULL DEFAULT gen_random_uuid(),
  platform_id    TEXT NOT NULL,
  analysis_type  TEXT NOT NULL,
  profile_hash   TEXT NOT NULL,
  score_value    INTEGER,
  score_max      INTEGER,
  result_json    JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(platform_id, analysis_type, profile_hash),
  INDEX idx_reports_platform_created (platform_id, created_at DESC)
);
```

### daily_limits
Лимиты на бесплатные запросы в день (таблица создана, в workflow пока не используется).

```sql
CREATE TABLE daily_limits (
  platform_id       TEXT NOT NULL,
  day               DATE NOT NULL,
  free_score_count  INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY(platform_id, day)
);
```

### llm_logs
Логи вызовов LLM (таблица создана, в workflow пока не используется).

```sql
CREATE TABLE llm_logs (
  id           BIGSERIAL PRIMARY KEY,
  platform_id  TEXT NOT NULL,
  request_id   TEXT NOT NULL,
  prompt_name  TEXT NOT NULL,
  model        TEXT NOT NULL,
  input_hash   TEXT NOT NULL,
  output_hash  TEXT NOT NULL,
  tokens_in    INTEGER,
  tokens_out   INTEGER,
  latency_ms   INTEGER,
  status       TEXT NOT NULL,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  INDEX idx_llm_logs_platform_created (platform_id, created_at DESC)
);
```

---

## 🤖 AI Models

| Нода | Модель | Назначение | Temperature |
|---|---|---|---|
| Message a model | gpt-4o-mini | Нормализация профиля → JSON | default |
| Message a model1 | gpt-4o | Скоринг 0–100 | 0 (детерминированный) |
| Message a model2 | gpt-4o | Генерация Telegram-сообщения | default |

---

## 📊 Текущая статистика БД (на 2026-02-27)

| Таблица | Строк |
|---|---|
| users | 1 |
| requests | 5 |
| artifacts | 4 |
| reports | 0 |
| daily_limits | 0 |
| llm_logs | 0 |

---

## 🔧 n8n

```
URL: https://n8n.bot-craft.ru
API: /api/v1/
```

**Активные воркфлоу проекта linkedin_bot:**
| ID | Название | Статус |
|---|---|---|
| 1ZYJR6Mum95E4buU | audit_linkedin | ✅ Active |
