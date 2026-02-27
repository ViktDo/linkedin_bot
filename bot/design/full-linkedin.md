# /full_linkedin — Design Document (Paid Full Report)

> Статус: ❌ Не реализовано
> Цена: 999–1499 Stars (~$9–15)
> Источник: маркетинговый экспорт 2026-02-27

---

## Назначение

Полный платный разбор LinkedIn-профиля с готовыми текстами для вставки. В отличие от `/test_linkedin` (free audit) — предоставляет конкретные переписанные блоки, не только направления.

---

## Отличия от Free Audit

| Параметр | Free (/test_linkedin) | Paid (/full_linkedin) |
|---|---|---|
| Балл | ≤ 85, cap 70 при слабой структуре | Без artificial ceiling |
| Рекомендации | "Направления" (без текстов) | Rewrite-ready тексты для вставки |
| Headline | Нет примеров | 3 варианта под цель (job/freelance/brand) |
| About | Нет текста | Полностью переписанный раздел |
| Experience | Нет переформулировок | Улучшенные bullet points по каждой роли |
| Keywords | Нет | Keyword Pack для visibility |
| Plan | Нет | 30-day action plan |
| CTA формулировки | Нет | Для всех разделов |
| Visibility breakdown | Нет | Анализ видимости + точки роста |
| AI-фильтр оценка | Нет | Оценка ATS-готовности |

---

## Структура выдачи (7 блоков)

### 1. Headline × 3
3 варианта под goal_type пользователя:
- Job: акцент на роль + специализацию + "open to"
- Freelance: акцент на оффер + нишу
- Brand: акцент на value + "I help"

### 2. Переписанный About
~300–500 символов, включает:
- Нишу и специализацию
- Измеримый результат (если есть в профиле)
- CTA-формулировку

### 3. Experience bullets (по каждой роли)
- Переформулированы под STAR/CAR
- Outcome-based, не task-based
- Добавлены числа (если есть в оригинале)

### 4. Keyword Pack
- Список 10–20 ключевых слов для visibility в поиске LinkedIn
- Разбит на: Primary / Secondary / Niche

### 5. CTA формулировки
- Для About (финальная строка)
- Для Featured section

### 6. 30-Day Action Plan
- Конкретные шаги с приоритетами
- Week 1 / Week 2 / Week 3–4

### 7. Visibility Breakdown
- Текущая оценка видимости (по критериям)
- Что блокирует visibility сейчас
- Оценка ATS-готовности

---

## Флоу бота

```
[Результат free audit]
    → Upsell-сообщение (3 проблемы + CTA)
        → Кнопка "Получить полный отчёт"
            → Prodamus paywall (999–1499 Stars)
                → Подтверждение оплаты
                    → POST /webhook/linkedin/full
                        → Серия сообщений в Telegram (7 блоков)
                            → Предложение ATS Resume (/new_resume)
                                → /my_cab: отчёт сохранён
```

---

## Paid mode ограничения

- После оплаты: 1 полный анализ
- Разрешена 1 регенерация в сутки (если профиль не изменился — из кэша)
- Refresh = отдельная покупка (599 Stars через 14+ дней)

---

## Backend задачи (не спроектированы)

- Отдельный n8n workflow: `full_linkedin`
- API endpoint: `POST /webhook/linkedin/full`
- Промпты (по одному на каждый блок выдачи):
  - Headline generator × 3
  - About rewriter
  - Experience bullet points rewriter
  - Keyword extractor
  - CTA generator
  - 30-day plan generator
  - Visibility breakdown analyzer
- Схема хранения результата в `reports` (type = 'full')
- Доступ к отчёту из /my_cab
