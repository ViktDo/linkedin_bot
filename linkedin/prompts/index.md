# Prompts Index

| Файл | Назначение | Статус |
|---|---|---|
| `scoring-engine-v1.md` | Score Engine v1 (исходный) | Устарел |
| `scoring-engine-v1.2-lang-hard.md` | v1.2 + жёсткий language enforcement | Устарел |
| `scoring-engine-v3-final.md` | **Score Engine v3 Conservative** | ✅ Production |
| `summary-json-v1.md` | Summary Generator (JSON output) | Отклонён |
| `telegram-summary-v2-final.md` | **Telegram Summary (plain text)** | ✅ Production |
| `normalization-engine.md` | Normalization (GPT-4o-mini) | ✅ Production (в n8n) |

## Пайплайн

```
raw input
    ↓
[normalization-engine]   → normalized_profile JSON
    ↓
[scoring-engine-v3]      → scores + strengths/weaknesses/recommendations JSON
    ↓
[telegram-summary-v2]    → plain text message для Telegram
    ↓
пользователь
```

## n8n артефакты

| Файл | Описание |
|---|---|
| `../artifacts/node-debug-presence.js` | Debug code node: проверка presence полей перед LLM |
| `../artifacts/expression-user-content.txt` | Стабильный expression для user.content (JSON.stringify + .first()) |
| `../artifacts/example-input-brand-ru.json` | Пример payload: Brand + ru + EN профиль |
| `../artifacts/example-why-v1-gave-84.md` | Разбор почему v1 дал score=84 на слабом профиле |

## Открытые вопросы

См. `../open-questions.md`
