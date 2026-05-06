# Roadmap расширенных фич PUBG Stat Tracker

Документ — карта развития поверх текущего MVP. Сохраняем архитектуру (Next.js 15 + TypeScript + Tailwind + next-intl + server-side PUBG proxy + mock-режим) и добавляем фичи слоями.

## Принципы

- Не ломаем существующий MVP.
- Не делаем scraping pubg.report и других ресурсов.
- Не используем undocumented endpoints.
- Любая фича должна gracefully degrade без `PUBG_API_KEY` (через mock-режим) и без telemetry.
- Сначала data layer, потом UI.
- После каждой итерации: typecheck + lint + build + smoke test.

## Stage 1.5 — быстрые продуктовые фичи (без telemetry)

Источник данных: уже доступные эндпоинты PUBG API (`/players`, `/matches/:id`).

| Фича | Источник | Mock | Файлы |
|---|---|---|---|
| **Recent Form** — агрегаты последних N матчей (avg kills, avg damage, placement, top10) | matches | да | `src/lib/pubg/form.ts`, `src/components/player/RecentForm.tsx` |
| **Best Match Card** — лучший матч по kills/damage/placement | matches | да | `src/lib/pubg/form.ts`, `src/components/player/BestMatchCard.tsx` |
| **External Links** — копировать профиль/матч + ссылка в PUBG Report | URL builders | n/a | `src/lib/external-links.ts`, `src/components/common/ExternalLinks.tsx` |
| **Compare Players** — сравнение двух игроков по lifetime + form | matches + lifetime | да | `/[locale]/compare`, `src/components/compare/*` |

## Stage 2 — telemetry analytics

Источник данных: telemetry (`telemetryUrl` из match details). Большие JSON-файлы (мегабайты), требуют парсинга в стабильный data layer.

**Data layer (создаётся первым):**

| Модуль | Назначение |
|---|---|
| `src/lib/pubg/telemetry/types.ts` | Типы событий PUBG telemetry (LogPlayerKillV2, LogMatchStart, LogPlayerTakeDamage, etc) |
| `src/lib/pubg/telemetry/parser.ts` | Принимает сырой telemetry массив, возвращает нормализованную сцену матча |
| `src/lib/pubg/telemetry/timeline.ts` | Хронологический индекс событий с привязкой к игроку и команде |
| `src/lib/pubg/telemetry/players.ts` | Per-player aggregations (positions, kills, damage taken/dealt) |
| `src/lib/pubg/telemetry/zones.ts` | Состояние синей и красной зоны во времени |

**UI на странице матча:**

| Фича | Что показывает |
|---|---|
| **Kill Tree** | Кто кого нокнул и кто добил — по командам |
| **Damage Timeline** | По шагам: получил/нанёс урон, оружие, дистанция |
| **Death Analysis** | Кто убил выбранного игрока, чем, с какой дистанции, был ли knock |
| **Weapon Analytics** | Per-match: kills/damage/headshots по каждому оружию игрока |
| **Loot Timeline** | Когда и что подобрал/выкинул/сменил |
| **Care Package Tracker** | Где упали drops и кто залутал |

## Stage 2A — 2D Match Replay

Запускается **только** после стабильного telemetry parser.

| Модуль | Назначение |
|---|---|
| `src/lib/pubg/maps.ts` | Метаданные карт (название, размер, bounds, фоновое изображение) |
| `src/lib/pubg/telemetry/coordinates.ts` | Перевод game x/y → canvas pixels с учётом размера карты |
| `/[locale]/matches/[id]/replay` | Страница replay (canvas/SVG renderer) |
| `src/components/replay/MapCanvas.tsx` | Базовый рендер карты + overlay |
| `src/components/replay/PlayerLayer.tsx` | Точки игроков + следы |
| `src/components/replay/EventMarkers.tsx` | Kill markers, knock markers |
| `src/components/replay/ZoneLayer.tsx` | Синяя зона |
| `src/components/replay/ReplayControls.tsx` | Play/pause, скорость x1/x2/x4 |
| `src/components/replay/PlayerSelector.tsx` | Выбор focus-игрока + auto-follow |

Fallback: если ассет карты отсутствует — рисуем placeholder grid.

## Stage 2B — Heatmaps и визуальные отчёты

| Фича | Что показывает |
|---|---|
| **Player Route Map** | Маршрут одного игрока, place of landing, place of death, kills locations |
| **Kill heatmap** | Все убийства матча — горячие точки на карте |
| **Death heatmap** | Все смерти матча |
| **Movement heatmap** | Плотность перемещений |
| **Landing heatmap** | Куда игроки приземляются (по матчу или по агрегату) |

## Stage 3 — внешние интеграции

| Фича | Источник | Что можно / нельзя |
|---|---|---|
| **PUBG Report links** | external URL builder | Только внешние ссылки, без scraping |
| **Twitch live indicator** | Twitch Helix API | Опционально, требует Twitch app credentials |
| **YouTube clip search** | external URL (search-by-name) | Только ссылка-поиск, не embed |

## Stage 4 — persistence

Без БД сейчас. Можно добавить когда понадобится:

| Хранилище | Кейсы |
|---|---|
| `localStorage` (без сервера) | Избранные игроки, последние просмотренные, настройки |
| Vercel KV / Upstash Redis | Distributed rate-limit, persistent fetch cache, name history |
| Supabase / Neon (Postgres) | Snapshots stats для tracking прогресса, shared profile cards |

Правило: добавлять storage только когда фича не работает без него.

## Stage 5 — продвинутые фичи

| Фича | Замечание |
|---|---|
| **Clan Page** | Зависит от Clans endpoint и наличия `clanId` у игрока |
| **Extended Leaderboards** | По ADR / K/D / win rate / rising stars |
| **Name History** | Требует БД (Stage 4) |
| **Suspicious Stats Indicators** | Только формулировка «статистическая аномалия», без слов «читер»/«ban»/«cheat» |
| **3D Replay** | three.js / WebGL — намного дороже 2D, делать только если 2D устоится |

## Порядок реализации

1. **Roadmap doc** (этот файл) ✓
2. Stage 1.5: Recent Form + Best Match + External Links (текущая итерация)
3. Compare Players
4. Telemetry Parser (data layer)
5. Kill Tree + Damage Timeline + Death Analysis
6. Weapon / Loot / Care Package analytics
7. 2D Replay v1
8. Heatmaps
9. PUBG Report links + опционально Twitch
10. Local Favorites (localStorage)
11. Clan / Extended Leaderboards / Name History (с БД)

## Что не делаем

- Scraping pubg.report.
- Undocumented PUBG endpoints.
- Хранение API key на клиенте.
- Поломку mock-режима.
- Большие миграции архитектуры без причины.
