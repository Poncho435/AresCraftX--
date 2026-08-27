# Деплой AresCraftX на Cloudflare

## 0. САМОЕ ГЛАВНОЕ: у тебя Worker, а команда — от Pages

В логе сборки есть строка:

```
Executing user deploy command: npx wrangler pages deploy . --project-name=arescraftx
```

Отдельное поле **«deploy command»** существует у **Workers Builds**.
У Cloudflare **Pages** такого поля нет — там есть «build command», а публикация
происходит автоматически.

Значит, в дашборде создан **Worker**, а не Pages-проект. Токен, который
Workers Builds генерирует сам, имеет права **только на Workers** и не имеет прав
на Pages. Поэтому запрос к `/accounts/.../pages/projects/arescraftx` возвращает
`Authentication error [code: 10000]`. Никакие правки в репозитории это не
чинят — команда задана в дашборде.

### Что сделать (2 минуты)

1. Cloudflare Dashboard → **Workers & Pages** → `arescraftx`
2. **Settings** → **Build** → **Deploy command**
3. Заменить

   ```
   npx wrangler pages deploy . --project-name=arescraftx
   ```

   на

   ```
   npx wrangler deploy
   ```

4. **Build command** оставить пустым
5. Сохранить → **Retry deployment**

Всё остальное уже подготовлено в репозитории:

| Файл | Зачем |
|---|---|
| `wrangler.jsonc` | конфиг Worker'а со статикой (`assets.directory = "./"`) |
| `.assetsignore` | чтобы `.git`, `tools/`, `LICENSE` и т. п. не публиковались |
| `404.html` | корневая страница ошибки для `not_found_handling` |

Проверено локально: `npx wrangler deploy --dry-run` проходит без ошибок.

> Примечание: количество файлов, которое печатает `--dry-run`
> («Read 285 files»), — это обход каталога **до** применения `.assetsignore`,
> фильтрация происходит на этапе загрузки. Не пугайся большого числа.

---

## 1. Если ты всё-таки хочешь именно Pages, а не Worker

Тогда команду менять не надо, но надо чинить права токена.

### Ошибка сборки: `Authentication error [code: 10000]`

Лог сборки:

```
✘ [ERROR] A request to the Cloudflare API
  (/accounts/3677ffcd173c6591fbcfd8a888ec8ca2/pages/projects/arescraftx) failed.
  Authentication error [code: 10000]
📎 It looks like you are authenticating Wrangler via a custom API token
   set in an environment variable.
```

### Что это значит

Токен **валидный** (Wrangler успешно показал аккаунт и написал
«Super Administrator»), но у него **нет права `Cloudflare Pages: Edit`**.

Важно: роль «Super Administrator» относится к вашему **пользователю**, а не к
API-токену. У токена есть свой собственный, отдельный и обычно гораздо более
узкий набор разрешений. Именно поэтому `wrangler whoami` работает
(нужен только `User Details: Read`), а `pages deploy` — нет.

### Решение А — убрать `CLOUDFLARE_API_TOKEN`

Если сборка запускается **самим Cloudflare Pages** (через Git-интеграцию),
то токен вообще не нужен: Pages авторизует деплой внутренне.
Переменная `CLOUDFLARE_API_TOKEN` в окружении сборки **перебивает** встроенную
авторизацию и ломает её.

1. Cloudflare Dashboard → **Workers & Pages** → проект `arescraftx`
2. **Settings** → **Environment variables** (и **Build** → variables)
3. Удалить `CLOUDFLARE_API_TOKEN` **и** `CLOUDFLARE_ACCOUNT_ID`,
   если они там заданы
4. **Deployments** → **Retry deployment**

### Решение Б — выдать токену нужные права

Если токен нужен (например, деплой идёт из GitHub Actions):

1. Открыть https://dash.cloudflare.com/profile/api-tokens
2. Найти используемый токен → **Edit** (или создать новый по шаблону
   **«Edit Cloudflare Workers»**)
3. Права должны включать как минимум:

   | Тип     | Ресурс                | Уровень |
   |---------|-----------------------|---------|
   | Account | **Cloudflare Pages**  | **Edit** |
   | Account | Workers Scripts       | Edit    |
   | Account | Account Settings      | Read    |
   | User    | User Details          | Read    |

4. **Account Resources** → выбрать
   `Mhrtvb.a304093@gmail.com's Account` (`3677ffcd173c6591fbcfd8a888ec8ca2`)
5. Сохранить, скопировать токен, обновить переменную и перезапустить сборку

### Решение В — создать настоящий Pages-проект

Cloudflare Dashboard → **Workers & Pages** → **Create** → вкладка **Pages** →
**Connect to Git** → выбрать репозиторий `Poncho435/AresCraftX--`.

Настройки:

| Настройка | Значение |
|---|---|
| Production branch | `main` |
| Build command | *(пусто)* |
| Build output directory | `/` |
| Framework preset | `None` |

Тогда ни Wrangler, ни токен не нужны совсем — Pages просто заберёт файлы из
репозитория и опубликует их.

### Решение Г — упростить саму команду деплоя

Текущая команда:

```
npx wrangler pages deploy . --project-name=arescraftx
```

Проблема: сайт статический и лежит в корне репозитория, поэтому Wrangler
загружает вообще всё, включая `LICENSE`, `SECURITY.md`, `nginx-security.conf`
и `tools/`. Для чистого статического сайта на Pages **команда сборки не нужна
совсем**:

- **Build command:** *(пусто)*
- **Build output directory:** `/` (корень)
- **Framework preset:** `None`

Тогда Pages просто заберёт файлы из репозитория и опубликует их — ни Wrangler,
ни токен не понадобятся. Это самый надёжный вариант для этого проекта.

---

## 2. «Не могу найти сайт в браузере»

Здесь нужно разделять **два разных действия**.

### Открыть сайт напрямую

В адресной строке нужно вводить **полный домен**, а не название проекта:

```
arescraftx.online
```

Если написать в адресной строке просто `arescraftx`, браузер воспримет это как
**поисковый запрос**, а не как адрес, и отправит в Google/Яндекс.

Проверьте по очереди:

1. `https://arescraftx.online` — рабочий домен
2. `https://arescraftx.pages.dev` — технический адрес Cloudflare Pages
   (работает сразу после успешного деплоя, даже если домен не настроен)

Если `*.pages.dev` открывается, а `arescraftx.online` — нет, значит проблема в
привязке домена: Pages → проект → **Custom domains** → **Set up a domain**, и
домен должен быть в статусе **Active**, а его NS-серверы — указывать на
Cloudflare.

**Пока деплой падает с ошибкой (пункт 1), сайта на хостинге просто нет** —
и открываться ему неоткуда. Сначала чиним деплой.

### Найти сайт через поиск (Google / Яндекс)

Это не происходит автоматически и не мгновенно. Что было не так:

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

## 3. Обслуживание метатегов

Все SEO-теги генерируются скриптом:

```bash
python3 tools/seo_inject.py
```

Скрипт **идемпотентен** — его можно запускать сколько угодно раз, дубликатов
не будет. Тексты title/description лежат в словаре `PAGES` внутри скрипта;
чтобы поменять описание страницы, правьте словарь и перезапускайте скрипт,
а не HTML вручную (ручные правки внутри блока `SEO:auto-*` затрутся).
