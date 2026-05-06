# PUBG Stat Tracker

Веб-приложение для просмотра статистики игроков PUBG: BATTLEGROUNDS, истории матчей, лидербордов и мастерства оружия. Построено на официальном публичном PUBG API.

[English version below](#english-version)

---

## Возможности

- Поиск игроков на всех платформах: Steam, PSN, Xbox, Kakao, Console, Stadia
- Пожизненная статистика и статистика по сезонам во всех режимах: Solo / Duo / Squad × TPP / FPP
- Производные метрики: K/D, Win Rate, Top‑10 Rate, средний урон, средняя длительность жизни, % хедшотов
- Последние матчи с полным составом лобби и статистикой каждого участника
- Детали матча с хайлайтами из телеметрии (longest kill, top damage, top kills)
- Прогресс мастерства оружия и выживания
- Лидерборды по сезонам
- Двуязычный интерфейс: **русский (по умолчанию) / английский** — выбор через URL (`/ru/...`, `/en/...`)
- Встроенный mock‑режим — приложение **запускается без API‑ключа** на локальных фикстурах для разработки и демонстрации

## Стек

Next.js 15 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind CSS 3 · next-intl · Zod

## Быстрый старт

### 1. Установите Node.js 20+

Скачайте с [nodejs.org](https://nodejs.org/). Проверьте версию:

```bash
node --version    # требуется v20 или новее
npm --version
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Настройте окружение

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:

- **Нет ключа?** Оставьте `PUBG_API_KEY` пустым или поставьте `PUBG_USE_MOCKS=1` — приложение запустится на локальных фикстурах из `src/lib/pubg/mocks/`. Это удобно для первого запуска и для демо.
- **Есть ключ?** Вставьте его в `PUBG_API_KEY=...` и оставьте `PUBG_USE_MOCKS=0`.

Получить ключ можно бесплатно на [developer.pubg.com](https://developer.pubg.com/).

> ⚠️ Никогда не коммитьте `.env.local` — он уже в `.gitignore`. Реальный ключ должен жить только локально и в Environment Variables хостинга.

### 4. Запустите dev-сервер

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) — корневой URL автоматически редиректит на `/ru`.

В шапке появится бейдж «Демо-режим», если приложение работает на моках.

### 5. (Опционально) Загрузите иконки

```bash
npm run sync-assets
```

Скрипт скачивает иконки оружия и словари из репозитория [pubg/api-assets](https://github.com/pubg/api-assets) в `public/assets/`. Без этого UI использует placeholder‑иконки.

## Доступные команды

| Команда | Действие |
|---|---|
| `npm run dev` | Запустить dev‑сервер |
| `npm run build` | Production‑сборка |
| `npm run start` | Запустить production‑сервер |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sync-assets` | Подтянуть иконки и словари из `pubg/api-assets` |

## Архитектура

- **Серверный proxy**: все запросы к `api.pubg.com` идут через единый эндпоинт `/api/pubg/[...path]`. API‑ключ никогда не попадает в клиентский бандл.
- **Авторизация и заголовки**: `Authorization: Bearer <PUBG_API_KEY>` и `Accept: application/vnd.api+json`.
- **Кэширование**: Next.js `fetch` с `revalidate` под каждый ресурс — матчи 30 дней, профили 5 минут, лидерборды 10 минут, сезоны 24 часа, телеметрия 30 дней.
- **Rate limit**: in‑process token bucket в `src/lib/pubg/rate-limit.ts` соблюдает лимит PUBG API в **10 запросов/мин**. На 429 возвращается понятное сообщение пользователю с указанием времени ожидания.
- **Mock‑режим**: при пустом `PUBG_API_KEY` или `PUBG_USE_MOCKS=1` все запросы перехватываются и обслуживаются фикстурами из `src/lib/pubg/mocks/`.
- **Внутренние ограничения матчей**: PUBG API хранит данные матчей не более 14 дней — приложение не обещает «всю историю», только то, что доступно через relationships.matches игрока.

## Деплой на Vercel

Бесплатный план Vercel Hobby подходит для этого проекта.

### Шаг 1. Создайте репозиторий на GitHub

```bash
git init
git add .
git commit -m "init pubg tracker"
# Создайте пустой репозиторий на github.com, затем:
git remote add origin https://github.com/<ваш-логин>/<имя-репозитория>.git
git branch -M main
git push -u origin main
```

> Файл `.env.local` уже исключён через `.gitignore` — секреты не попадут в репозиторий.

### Шаг 2. Импортируйте проект в Vercel

1. Откройте [vercel.com/new](https://vercel.com/new).
2. Подключите GitHub и выберите ваш репозиторий.
3. Vercel автоматически определит фреймворк как **Next.js** — менять ничего не нужно.

### Шаг 3. Добавьте Environment Variables

В разделе **Environment Variables** перед первым деплоем добавьте:

| Имя переменной | Значение | Обязательно |
|---|---|---|
| `PUBG_API_KEY` | ваш ключ с [developer.pubg.com](https://developer.pubg.com/) | да |
| `PUBG_USE_MOCKS` | `0` | нет (по умолчанию `0`) |
| `PUBG_DEFAULT_SHARD` | `steam` | нет (по умолчанию `steam`) |

### Шаг 4. Deploy

Нажмите **Deploy**. Через 1–2 минуты получите ссылку вида `https://<project>.vercel.app`. Откройте `https://<project>.vercel.app/ru` — должна загрузиться главная страница.

### Что важно знать про serverless

- In‑process token bucket для rate‑limit работает в рамках **одного** инстанса Vercel. При высокой нагрузке несколько инстансов могут параллельно сделать больше 10 запросов в минуту суммарно. Для MVP это приемлемо.
- Если в будущем нужен распределённый rate‑limit и более устойчивый кэш — можно подключить **Vercel KV / Upstash Redis / Cloudflare KV** как второй этап. В MVP это не требуется.

## Дисклеймер

Этот проект не связан с KRAFTON, Inc. или PUBG STUDIOS. PUBG — зарегистрированный товарный знак KRAFTON, Inc. Все данные предоставлены публичным PUBG API.

---

## English version

A web application for viewing PUBG: BATTLEGROUNDS player statistics, match history, leaderboards, and weapon mastery — built on the official public PUBG API.

### Features

- Search players across all platforms (Steam, PSN, Xbox, Kakao, Console, Stadia)
- Lifetime + per-season stats across all game modes (Solo / Duo / Squad × TPP/FPP)
- Derived metrics: K/D, win rate, top‑10 rate, average damage, average survival time, headshot %
- Recent matches with full lobby roster and per-participant stats
- Match details with telemetry-derived highlights (longest kill, top damage, top kills)
- Weapon and survival mastery
- Season leaderboards
- Bilingual UI: **Russian (default) / English** — URL-based locale (`/ru/...`, `/en/...`)
- Built-in mock mode — the app **runs without an API key** for development and demos

### Tech stack

Next.js 15 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind CSS 3 · next-intl · Zod

### Quick start

```bash
node --version    # v20+ required
npm install
cp .env.example .env.local
# Either leave PUBG_API_KEY empty for mock mode,
# or paste your key from https://developer.pubg.com
npm run dev
# Open http://localhost:3000 (redirects to /ru by default; switch via /en)
```

### Available scripts

| Command | Action |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sync-assets` | Fetch icons + dictionaries from `pubg/api-assets` |

### Architecture

- All requests to `api.pubg.com` go through the server proxy at `/api/pubg/[...path]`. The API key never reaches the client bundle.
- Caching uses Next.js `fetch` with `revalidate` per resource type (matches: 30 days, profiles: 5 min, leaderboards: 10 min, seasons: 24 h).
- An in-process token bucket guards against the PUBG API 10 RPM rate limit; HTTP 429 is converted into a user-friendly message with retry-after seconds.
- Mock mode (`PUBG_USE_MOCKS=1` or empty key) serves fixtures from `src/lib/pubg/mocks/`.
- The PUBG API only retains match data for 14 days, so the app shows what is currently exposed via the player's `relationships.matches`, not full history.

### Deploy to Vercel

```bash
git init && git add . && git commit -m "init pubg tracker"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
# Then on https://vercel.com/new:
#   1. Import the GitHub repo
#   2. Framework preset: Next.js (auto)
#   3. Environment Variables → add PUBG_API_KEY (from https://developer.pubg.com)
#   4. Deploy
# Visit https://<project>.vercel.app/ru
```

The in-process rate limiter works per serverless instance. For distributed rate-limit + persistent cache across instances, plug in Vercel KV / Upstash Redis as a second-stage upgrade — not required for MVP.

### Disclaimer

This project is not affiliated with KRAFTON, Inc. or PUBG STUDIOS. PUBG is a registered trademark of KRAFTON, Inc. Data is provided by the public PUBG API.
