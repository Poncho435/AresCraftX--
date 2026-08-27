# Деплой AresCraftX на Cloudflare Workers

Проект развёрнут как **Worker со статическими ассетами** (Workers Builds),
а не как Pages. Определяется по команде деплоя в логе сборки:

```
Executing user deploy command: npx wrangler versions upload
```

`wrangler versions upload` — команда **исключительно Workers**.
У Cloudflare Pages такой команды не существует.

## 1. История двух ошибок

### `Authentication error [code: 10000]` — ИСПРАВЛЕНО

Возникала, пока команда деплоя была `npx wrangler pages deploy .`:
токен Workers Builds не имеет прав на Pages API, поэтому запрос
к `/accounts/.../pages/projects/arescraftx` отклонялся.
После смены команды на Workers-вариант ошибка ушла.

### `Missing entry-point to Worker script or to assets directory` — ИСПРАВЛЕНО

Wrangler не понимал, что публиковать: в репозитории не было `wrangler.jsonc`.
Файл добавлен:

```jsonc
{
	"name": "arescraftx",
	"compatibility_date": "2026-08-27",
	"assets": {
		"directory": "./",
		"not_found_handling": "404-page"
	},
	"observability": { "enabled": true }
}
```

Проверено локально — `npx wrangler versions upload --dry-run` проходит без ошибок.

| Файл | Зачем |
|---|---|
| `wrangler.jsonc` | точка входа: публикуем корень репозитория как статику |
| `.assetsignore` | `.git`, `tools/`, `LICENSE`, `_headers` не попадают в публичный доступ |
| `404.html` | страница ошибки для `not_found_handling: "404-page"` |

---

## 2. ВАЖНО: `versions upload` не публикует сайт

Это главный подвох Workers Builds. Есть две разные команды:

| Команда | Что делает |
|---|---|
| `npx wrangler versions upload` | загружает **версию**, но НЕ включает её. Сайт не меняется. |
| `npx wrangler deploy` | загружает **и публикует**. Сайт обновляется. |

Workers Builds подставляет `versions upload` для **непроизводственных веток**
и `deploy` — для production-ветки.

Раз в логе `versions upload`, значит собирается **не production-ветка**
(скорее всего рабочая ветка `arena/01a043a9-arescraftx`).
Даже когда сборка станет зелёной, **сайт не обновится**, пока изменения
не попадут в production-ветку.

### Что делать

1. Влить рабочую ветку в `main` (Pull Request).
2. Убедиться, что в проекте **Settings → Build**:

   | Поле | Значение |
   |---|---|
   | Production branch | `main` |
   | Build command | *(пусто)* |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler versions upload` |

3. После мержа в `main` сборка выполнит `wrangler deploy` и сайт обновится.

Опубликовать уже загруженную версию вручную можно так:
**Workers & Pages** → `arescraftx` → **Deployments** → найти нужную версию →
**Deploy version**.

---

## 3. Домен arescraftx.online

У Worker'а домены настраиваются **не там**, где у Pages:

**Workers & Pages** → `arescraftx` → **Settings** → **Domains & Routes** →
**Add** → **Custom domain** → `arescraftx.online`.

Cloudflare сам создаст нужную DNS-запись, так как зона уже Active.
Повторить для `www.arescraftx.online`.

Технический адрес Worker'а — `arescraftx.<твой-субдомен>.workers.dev`
(включается там же, в **Domains & Routes**).

> Если `arescraftx.pages.dev` открывается — значит рядом существует **ещё и
> старый Pages-проект**. Тогда домен `arescraftx.online` может быть привязан
> к нему, и после переезда на Worker его нужно перепривязать, иначе
> посетители продолжат видеть старую версию сайта.

---

## 4. Сайт не находится через поиск

Индексация не происходит автоматически и не мгновенно. Что было не так в коде:

| Проблема | Статус |
|---|---|
| Ни на одной из 28 страниц не было `<meta name="description">` | ✅ исправлено |
| Не было `<link rel="canonical">` — Google видел дубли | ✅ исправлено |
| Не было `hreflang` — ru и en конкурировали друг с другом | ✅ исправлено |
| `robots.txt` полностью закрывал `/en/` | ✅ исправлено |
| `robots.txt` закрывал CSS и JS — Google не мог отрендерить страницу | ✅ исправлено |
| В `sitemap.xml` было 8 URL из 20 (без en и без проектов) | ✅ исправлено |
| Не было микроразметки Schema.org | ✅ добавлена |
| Заголовки `<title>` без ключевых слов | ✅ переписаны |

Что нужно сделать **вручную** (это невозможно сделать из кода):

1. **Google Search Console** — https://search.google.com/search-console
   - Add property → **Domain** → `arescraftx.online`
   - Подтвердить владение TXT-записью (Cloudflare добавляет её в один клик)
   - **Sitemaps** → отправить `https://arescraftx.online/sitemap.xml`
   - **URL Inspection** → вставить `https://arescraftx.online/` →
     **Request Indexing**
2. **Яндекс.Вебмастер** — https://webmaster.yandex.ru
   - То же самое: добавить сайт, подтвердить, отправить sitemap
3. **Подождать.** Индексация нового домена занимает **от 3 дней до 3–4 недель**.
   По запросу `arescraftx` сайт появится раньше, чем по
   `майнкрафт сервер` — по конкурентным запросам нужны месяцы и ссылки.
4. **Поставить ссылки** на сайт с Discord, Telegram, из мониторингов
   Minecraft-серверов. Без внешних ссылок новый домен ранжируется очень плохо.

Проверить, проиндексирован ли сайт, можно запросом в Google:

```
site:arescraftx.online
```

Пустая выдача = сайт ещё не в индексе.

---

## 5. Обслуживание метатегов

Все SEO-теги генерируются скриптом:

```bash
python3 tools/seo_inject.py
```

Скрипт **идемпотентен** — его можно запускать сколько угодно раз, дубликатов
не будет. Тексты title/description лежат в словаре `PAGES` внутри скрипта;
чтобы поменять описание страницы, правьте словарь и перезапускайте скрипт,
а не HTML вручную (ручные правки внутри блока `SEO:auto-*` затрутся).
