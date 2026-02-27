# LinkedIn Profile Scoring Methodology

> Source: ChatGPT export (LinkedIn Profile Evaluation Engine project)
> Version: v3 Conservative (production)
> Updated: 2026-02-27

---

## 1. Архитектурный контекст

```
INPUT (PDF | LINK | MANUAL FIELDS)
    → Extraction (Apify / Telegram file / raw text)
    → Normalization  [GPT-4o-mini]
    → Free Score Engine  [GPT-4o, temp=0]
    → Telegram Summary Generator  [GPT-4o]
    → Upsell → Paid Deep Analysis (не реализован)
```

**Ключевое правило:** Score Engine работает ТОЛЬКО с `normalized_profile`. Никакой прямой работы с PDF или сырой ссылкой.

---

## 2. Структура входных данных (Score Engine)

```json
{
  "goal_type": "job|freelance|brand",
  "result_lang": "ru|en",
  "normalized_profile": {
    "language_detected": "string|null",
    "goal_type": "string|null",
    "headline": "string|null",
    "about": "string|null",
    "experience": [
      {
        "company": "string|null",
        "role": "string|null",
        "dates": "string|null",
        "achievements": ["string"]
      }
    ],
    "skills": ["string"],
    "link": "string|null"
  }
}
```

---

## 3. Scoring Model v3 Conservative (production)

Профиль оценивается по **5 блокам**, каждый 0–20 баллов, итог 0–100.
Оценка **детерминированная**: если правило не выполнено чётко → 0.

### HEADLINE (0–20)

| Критерий | Баллы |
|---|---|
| Длина ≥ 30 символов | +5 |
| Явная роль (engineer, developer, manager, analyst...) | +5 |
| Специализация (SaaS, FinTech, AI, Marketing...) | +5 |
| Goal-aligned формулировка (help, open to work, freelance...) | +5 |

Ограничения: нет role keyword → макс 12 / длина < 30 → макс 8

### ABOUT (0–20)

| Критерий | Баллы |
|---|---|
| Длина ≥ 300 символов | +5 |
| ≥ 2 из: ниша, аудитория, измеримый результат, CTA | +5 |
| Число + action verb (built 5..., increased 30%...) | +5 |
| Видимая структура (буллеты/разделы) | +5 |

Ограничения: нет чисел → макс 12 / длина < 200 → макс 10

### EXPERIENCE (0–20)

| Критерий | Баллы |
|---|---|
| ≥ 2 ролей | +5 |
| Company + role заполнены | +5 |
| Даты присутствуют | +5 |
| Видна карьерная прогрессия (Junior → Senior) | +5 |

Ограничения: 1 роль → макс 12

### ACHIEVEMENTS (0–20)

| Критерий | Баллы |
|---|---|
| ≥ 3 достижений | +5 |
| Есть числа | +5 |
| Есть measurable verbs (увеличил, запустил...) | +5 |
| Outcome-based, а не task-based | +5 |

Ограничения: task-only → макс 14

### SKILLS (0–20)

| Критерий | Баллы |
|---|---|
| ≥ 10 навыков | +5 |
| ≥ 3 навыка соответствуют специализации | +5 |
| Нет дублей | +5 |
| Согласованы с headline | +5 |

Ограничения: < 5 → макс 8 / 5–9 → макс 12

---

## 4. Итоговый балл и caps

```
total = headline + about + experience + achievements + skills
```

| Условие | Cap |
|---|---|
| experience < 2 ИЛИ skills < 8 | total ≤ 70 |
| Free mode (всегда) | total ≤ 85 |
| total должен равняться точной сумме | — |

---

## 5. INSUFFICIENT_DATA (финальная логика)

Возвращается **ТОЛЬКО** если хотя бы одно из:
1. `headline` отсутствует или пустой
2. `about` отсутствует или пустой
3. `experience` отсутствует, не массив или пустой массив

**НЕ** возвращается при: коротком тексте, мало навыков, 1 роль.

> Ключевое изменение vs v1/v1.2: убрана "too short rule" (< 20 / < 120 символов), которая давала нестабильные INSUFFICIENT_DATA с одними и теми же данными.

---

## 6. goal_type — различия

В Free версии `goal_type` влияет только на проверку goal-aligned формулировок:

| goal_type | Ключевые слова |
|---|---|
| job | open to work, available, seeking, готов к, ищу, в поиске |
| freelance | freelance, consulting, project, консалтинг, проект, фриланс |
| brand | help, build, grow, помогаю, строю, развиваю |

Веса одинаковы для всех goal_type. В Paid версии (планируется): разные веса + сложная alignment-логика.

---

## 7. Free vs Paid

| | Free | Paid (планируется) |
|---|---|---|
| Потолок скора | 85 | Нет ceiling |
| Cap при слабой структуре | 70 | Нет |
| Рекомендации | Направления | Rewrite-ready тексты |
| Field-level анализ | Нет | Да |
| Веса goal_type | Одинаковые | Различаются |

---

## 8. Эволюция модели

| Версия | Файл | Изменение |
|---|---|---|
| v1 | `../prompts/scoring-engine-v1.md` | Базовая модель (+6/+6/+4/+4 схема) |
| v1.2 | `../prompts/scoring-engine-v1.2-lang-hard.md` | Hard language enforcement |
| **v3 (production)** | `../prompts/scoring-engine-v3-final.md` | Conservative caps, strict total=sum |

**Почему v3:** на тестовом профиле (1 роль, 3 навыка) v1 дал score=84. Subscore skills вышел > 20 — нарушение правил. Total не совпадал с суммой subscores.

---

## 9. Ограничения и договорённости

- Источник истины — только `normalized_profile`, никаких домыслов и веб-поиска
- `temperature=0`, `json_object` response format
- Результат всегда на `result_lang` (для ru — кириллица, исключения: proper nouns, tech terms)
- Scoring mechanics не раскрываются в Telegram-сообщении пользователю
- Рекомендации — направления, не копипаст
