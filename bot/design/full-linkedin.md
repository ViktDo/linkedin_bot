# /full_linkedin — Design Document (Paid Full Report)

> Статус: ❌ Не реализовано
> Источник: концепция из обсуждения

---

## Назначение

Полный платный разбор LinkedIn-профиля с готовыми текстами для вставки. В отличие от `/test_linkedin` (free audit) — предоставляет конкретные переписанные блоки, а не только направления.

---

## Отличия от Free Audit

| Параметр | Free (/test_linkedin) | Paid (/full_linkedin) |
|---|---|---|
| Балл | ≤ 85, cap 70 при слабой структуре | Без artificial ceiling |
| Рекомендации | "Направления" | Rewrite-ready тексты |
| Headline | Нет примеров | 3 варианта Headline под цель |
| About | Нет текста | Переписанный раздел About |
| Experience | Нет переформулировок | Улучшенные bullet points |
| Keywords | Нет | Подборка ключевых слов для visibility |
| Plan | Нет | 30-дневный план действий |
| CTA | Upsell | — |

---

## Структура выдачи (концепция)

1. **Headline** — 3 варианта под цель пользователя (job/freelance/brand)
2. **About** — полностью переписанный раздел (~300-500 символов)
3. **Experience** — улучшенные bullet points по каждой роли
4. **Keyword Pack** — список ключевых слов для visibility в поиске LinkedIn/ATS
5. **30-Day Plan** — конкретные шаги для улучшения профиля
6. **Visibility Breakdown** — анализ текущей видимости и точки роста

---

## Флоу бота

```
[Результат free audit + Upsell сообщение]
    → Кнопка "Получить полный разбор"
    → Prodamus paywall
    → Подтверждение оплаты
    → POST /webhook/linkedin/full
    → Серия сообщений в Telegram (не одно, а несколько блоков)
    → /my_cab: доступ к отчёту
```

---

## Backend задачи (не спроектированы)

- Отдельный n8n workflow: `full_linkedin`
- API endpoint: `POST /webhook/linkedin/full`
- Промпты:
  - Headline generator (3 варианта)
  - About rewriter
  - Experience bullet points rewriter
  - Keyword extractor
  - 30-day action plan generator
- Схема хранения оплаты
- Доступ через /my_cab

---

> ⚠️ Данный раздел требует полного проектирования. Это placeholder на основе концепции.
