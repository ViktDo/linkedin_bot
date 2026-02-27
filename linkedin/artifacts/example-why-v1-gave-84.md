# Разбор: почему v1 дал score=84 на слабом профиле

> Этот файл фиксирует диагностику, которая привела к созданию Score Engine v3 conservative.

---

## Тестовый профиль

- 1 роль в опыте
- 3 навыка
- Цель: Brand / result_lang: ru / профиль на EN

Файл: `example-input-brand-ru.json`

---

## Что пошло не так в v1

| Проблема | Описание |
|---|---|
| `skills` subscore > 20 | Баллы вышли за границу (например, 22) — нарушение рубрики |
| `total ≠ sum(subscores)` | Итог 84 не соответствовал арифметической сумме (~58 по правилам) |
| `strengths` галлюцинировал | "В заголовке указаны роль и специализация" — роль по словарю может не совпадать |
| Завышение без обоснования | Модель "расщедрилась" при детерминированном температура=0 |

---

## Что изменено в v3

| Правило | v1 | v3 |
|---|---|---|
| Subscore cap | Не было жёсткого контроля | Каждый subscore integer 0–20, если >20 → recompute |
| Total validation | Не обязательно | total MUST equal exact sum of subscores |
| Structural cap | Нет | total ≤ 70, если experience<2 ИЛИ skills<8 |
| Free mode ceiling | Не фиксировалось | total ≤ 85 всегда |
| INSUFFICIENT_DATA | "Too short" rule (нестабильная) | Только при отсутствии headline/about/experience |

---

## Итог

v3 conservative с теми же данными даст score ~42–48:
- headline: ~12 (есть специализация, но роль неочевидна для словаря)
- about: ~10 (короткий, нет чисел)
- experience: 12 (1 роль → cap 12)
- achievements: ~14 (есть числа, но не все outcome-based)
- skills: 8 (<5 навыков → cap 8)
- structural cap: total ≤ 70 (experience<2, skills<8)
