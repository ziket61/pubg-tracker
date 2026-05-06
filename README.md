# PUBG Stat Tracker

**🟧 Live: [pubg-tracker-phi.vercel.app](https://pubg-tracker-phi.vercel.app)**

Веб-приложение для просмотра статистики игроков **PUBG: BATTLEGROUNDS**: профили, история матчей, лидерборды, мастерство оружия, **2D-replay матчей**, анализ смертей, маршрут на карте, тепловые карты. Без рекламы и регистрации, на официальном публичном PUBG API.

[English version below](#english-version)

---

## Что умеет

### Поиск и профили
- Поиск игрока по нику на любой платформе (Steam, PSN, Xbox, Kakao, Console, Stadia)
- Lifetime stats и stats по сезонам, разрезы по режимам (Solo/Duo/Squad × TPP/FPP)
- Производные метрики: K/D, Win Rate, Top‑10 Rate, средний урон, headshot %, среднее выживание
- **Recent Form** — агрегаты последних 5 матчей плюс хронологический strip placement‑бейджей
- **Best Match** — лучший матч по композитному score (kills + damage + placement)
- Мастерство оружия и выживания
- **Избранное и недавние игроки** (хранятся локально, на сервер не уходят)

### Сравнение игроков
- `/<locale>/compare?a=<name1>&b=<name2>` — два игрока side‑by‑side
- Lifetime + recent form, зелёная подсветка победителя по каждой метрике

### Матчи
- Список последних матчей с местом, K/D в матче, картой, режимом, временем
- Детальная страница матча с составом лобби и хайлайтами по телеметрии
- **Хроника боёв** (Kill Tree) — кто кого нокнул и кто добил, по командам жертв
- **Care packages** — карта дропов, время появления, киллы поблизости
- **Per‑player вид** при клике на свой матч из профиля:
    - **Как я умер** — киллер, оружие, дистанция, был ли knock, последние удары перед смертью
    - **Маршрут на карте** — точка приземления, путь, киллы, точка смерти
    - **По оружию** — kills/knocks/damage/HS/longest kill для каждого оружия в матче
    - **Хронология урона** — таймлайн событий с разделением «дал/получил/нокаут/смерть»

### 2D Replay
- `/<locale>/matches/<id>/replay` — воспроизведение матча на тактической карте
- Play/pause, скорость x1/x2/x4/x8, scrubber по таймлайну
- Точки игроков с цветами по командам, fade для отключённых/мёртвых
- Trail focus‑игрока (60 секунд)
- Overlay синей и белой зон, kill markers с пульсацией
- **Heatmaps** — kill heatmap (красный) или landing heatmap (cyan)
- Селектор focus‑игрока (60+ участников лобби в матче)

### Лидерборды и сезоны
- Топ‑100 текущего сезона по любому режиму
- Медали top‑3 (золото/серебро/бронза), zebra‑строки, цветовое кодирование столбцов
- Сезоны: список с пометкой текущего и межсезонья

### Двуязычный интерфейс
- 🇷🇺 Русский (по умолчанию) и 🇬🇧 Английский, переключение в правом верхнем углу

---

## Локальный запуск

### 1. Node.js 20+ и API key

```bash
node --version    # 20+
git clone https://github.com/ziket61/pubg-tracker.git
cd pubg-tracker
npm install
cp .env.example .env.local
```

Получить ключ бесплатно: [developer.pubg.com](https://developer.pubg.com/) → создать app → скопировать API key в `.env.local`:

```
PUBG_API_KEY=eyJ0eXAi...
```

> ⚠️ `.env.local` уже в `.gitignore` — реальный ключ не попадёт в репозиторий.

### 2. Запуск

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) (редирект на `/ru`)

### Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Dev‑сервер с HMR |
| `npm run build` | Production‑сборка |
| `npm start` | Production‑сервер |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (62 теста для pure libs) |
| `npm run sync-assets` | Подтянуть иконки и словари из [pubg/api-assets](https://github.com/pubg/api-assets) |
| `bash scripts/deploy.sh` | One‑shot деплой на GitHub + Vercel (см. ниже) |

---

## Архитектура

- **Server‑side proxy**: все запросы к `api.pubg.com` идут через единый эндпоинт `/api/pubg/[...path]`. API‑ключ никогда не попадает в клиентский бандл.
- **Авторизация и заголовки**: `Authorization: Bearer <PUBG_API_KEY>` и `Accept: application/vnd.api+json`.
- **Защита проксика**: origin‑check + per‑IP rate‑limit (30 запросов/мин на IP) — без этого деплой можно использовать как бесплатный фронт PUBG API на чужой ключ.
- **Rate limit к PUBG**: in‑process token bucket в `src/lib/pubg/rate-limit.ts` соблюдает лимит **10 запросов/мин**, плюс 8‑секундный таймаут на каждый upstream‑вызов.
- **Кэширование**: Next.js `fetch` с `revalidate` под каждый ресурс — матчи 30 дней, профили 5 минут, лидерборды 10 минут, сезоны 24 часа, телеметрия 30 дней.
- **Дедупликация**: `RecentForm` и `RecentMatches` шарят один fetch матчей через `getPlayerRecentMatches` — page lifts the fetch into one Suspense boundary, не дублируя upstream‑вызовы.
- **Telemetry layer**: permissive parser в `src/lib/pubg/telemetry/parser.ts` — нормализует события (`LogPlayerKillV2`, `LogPlayerMakeGroggy`, `LogPlayerTakeDamage`, `LogPlayerPosition`, `LogGameStatePeriodic`, `LogCarePackageLand`), неизвестные события игнорируются. На этом слое: kill‑tree, death analysis, damage timeline, route, weapon analytics, heatmap, replay scene.
- **i18n**: next‑intl, локаль в URL (`/ru/...`, `/en/...`), сообщения в `messages/{ru,en}.json`.
- **Внутренние ограничения матчей**: PUBG API хранит данные матчей не более **14 дней** — поэтому показывается только то, что доступно через `relationships.matches` игрока.

---

## Деплой на Vercel

Бесплатный план Vercel Hobby подходит. Репозиторий уже подключён к auto‑deploy: каждый `git push` на `main` автоматически собирает и катит прод.

### Первый раз

```bash
# 1. Логины (один раз каждый, открывают браузер)
"/c/Program Files/GitHub CLI/gh.exe" auth login --web -h github.com -p https
vercel login

# 2. One‑shot деплой — создаёт репо, пушит, прокидывает PUBG_API_KEY в Vercel env, деплоит
bash scripts/deploy.sh
```

`scripts/deploy.sh` идемпотентный: запусти повторно, если что‑то упало посередине.

### После первого деплоя

Подключи GitHub в Vercel project → Settings → Git → Connect Git Repository → выбрать `<your>/pubg-tracker`. После этого `git push` сам триггерит деплой, скрипт больше не нужен.

### Что важно знать про serverless

- In‑process token bucket для rate‑limit к PUBG работает в рамках **одного** инстанса Vercel. При высокой нагрузке несколько инстансов могут параллельно превысить 10 RPM. Для MVP это приемлемо.
- Для распределённого rate‑limit и устойчивого кэша между инстансами — можно подключить **Vercel KV / Upstash Redis**. В MVP не требуется.

---

## Дисклеймер

Этот проект не связан с KRAFTON, Inc. или PUBG STUDIOS. PUBG — зарегистрированный товарный знак KRAFTON, Inc. Все данные предоставлены публичным PUBG API и относятся к их владельцу.

---

## English version

A web app for **PUBG: BATTLEGROUNDS** stats: profiles, match history, leaderboards, weapon mastery, **2D match replay**, death analysis, route maps, heatmaps. No ads, no signup, built on the official public PUBG API.

**🟧 Live: [pubg-tracker-phi.vercel.app](https://pubg-tracker-phi.vercel.app)**

### Features

- **Search & profile**: lifetime + per‑season stats, derived metrics (K/D, win rate, top‑10 rate, avg damage, HS%, avg survival), Recent Form (last‑5 aggregates + placement strip), Best Match teaser, weapon + survival mastery
- **Compare**: side‑by‑side at `/en/compare?a=...&b=...`, with green highlight on winner of each metric
- **Match deep‑dive**: kill tree, care package tracker, per‑player Death Analysis, Route Map, Weapon Breakdown, Damage Timeline (when navigating from your profile)
- **2D Replay**: full match playback with rAF playback, x1/x2/x4/x8 speed, scrubber, focus‑player picker, blue/safe zone overlay, kill markers, kill/landing heatmaps
- **Local favorites**: pin players, recently viewed, all stored in localStorage
- **i18n**: Russian (default) / English

### Quick start

```bash
node --version    # v20+ required
npm install
cp .env.example .env.local
# Paste your PUBG API key from https://developer.pubg.com into PUBG_API_KEY=
npm run dev
# Open http://localhost:3000
```

### Tech stack

Next.js 15 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind CSS 3 · next‑intl · Zod · Vitest

### Architecture

All `api.pubg.com` calls go through `/api/pubg/[...path]`. The API key never reaches the client bundle. Origin‑check + per‑IP rate‑limit guard the proxy from being used as a free PUBG frontend on someone else's key. The 10 RPM PUBG limit is honored via an in‑process token bucket with an 8s per‑request timeout. Match details are cached 30 days, profiles 5 min, leaderboards 10 min. Telemetry is parsed permissively — unknown events are ignored. PUBG only retains match data for 14 days, so only what's exposed via `relationships.matches` is shown.

### Deploy to Vercel

Repo is wired to Vercel auto‑deploy on push. First time:

```bash
gh auth login --web && vercel login
bash scripts/deploy.sh
```

The script creates the GitHub repo, pushes `main`, links to Vercel, sets `PUBG_API_KEY` as a production env var (the value never leaves your machine), and deploys to prod.

### Disclaimer

This project is not affiliated with KRAFTON, Inc. or PUBG STUDIOS. PUBG is a registered trademark of KRAFTON, Inc. Data is provided by the public PUBG API.
