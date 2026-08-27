# Деплой AresCraftX на Cloudflare Pages

Проект — **Cloudflare Pages**, `arescraftx.pages.dev` открывается,
домен `arescraftx.online` в Cloudflare в статусе **Active**.

## 1. Почему падает сборка: `Authentication error [code: 10000]`

Строка из лога:

```
Executing user deploy command: npx wrangler pages deploy . --project-name=arescraftx
ℹ️  The API Token is read from the CLOUDFLARE_API_TOKEN environment variable.
```

Происходит вот что: **внутри сборки Pages запускается ещё один деплой Pages
через Wrangler**. Это лишний слой, и он ломается, потому что переменная
`CLOUDFLARE_API_TOKEN` перебивает встроенную авторизацию Pages, а у самого
токена **нет права `Cloudflare Pages: Edit`**.

Важно: «Super Administrator» в логе — это роль **твоего пользователя**,
а не токена. У API-токена свой отдельный, гораздо более узкий набор прав.
Поэтому `whoami` отрабатывает (хватает `User Details: Read`),
а `pages deploy` — нет.

То, что `arescraftx.pages.dev` открывается, означает, что **старый деплой
успел пройти раньше**. Сейчас публикуется именно он — все новые коммиты
на сайт не попадают, пока сборка падает.

### Решение А (рекомендуется) — убрать Wrangler из сборки

Сайт полностью статический, собирать нечего. Pages опубликует файлы из Git сам.

1. Dashboard → **Workers & Pages** → `arescraftx` → **Settings**
2. Раздел **Build**:

   | Поле | Значение |
   |---|---|
   | Build command | *(пусто)* |
   | **Deploy command** | *(пусто — удалить `npx wrangler pages deploy ...`)* |
   | Build output directory | `/` |
   | Framework preset | `None` |
   | Production branch | `main` |

3. Раздел **Variables and Secrets**: удалить `CLOUDFLARE_API_TOKEN`
   и `CLOUDFLARE_ACCOUNT_ID`, если они там есть.
4. **Deployments** → **Retry deployment**.

### Решение Б — оставить Wrangler, но дать токену права

Нужно, только если деплой обязан идти через Wrangler (например, из GitHub Actions).

1. https://dash.cloudflare.com/profile/api-tokens → нужный токен → **Edit**
   (или **Create Token** → шаблон **«Edit Cloudflare Workers»**)
2. Права минимум:

   | Тип | Ресурс | Уровень |
   |---|---|---|
   | Account | **Cloudflare Pages** | **Edit** |
   | Account | Account Settings | Read |
   | User | User Details | Read |

3. **Account Resources** → `Mhrtvb.a304093@gmail.com's Account`
   (`3677ffcd173c6591fbcfd8a888ec8ca2`)
4. Обновить переменную `CLOUDFLARE_API_TOKEN` в настройках проекта → Retry.

> Про шаблоны токенов: «Read All Resources» не подходит — он умеет только
> читать. Нужен именно **Edit**-шаблон, иначе будет ровно та же ошибка 10000.

---

## 2. Домен arescraftx.online не открывается

Зона в статусе Active — это значит, что **домен управляется Cloudflare**,
но это ещё **не** значит, что он привязан к проекту Pages. Это два разных шага.

1. Dashboard → **Workers & Pages** → `arescraftx` → вкладка **Custom domains**
2. **Set up a domain** → ввести `arescraftx.online` → подтвердить
3. Повторить для `www.arescraftx.online`
4. Дождаться статуса **Active** у самого домена в этой вкладке
   (обычно 1–5 минут, сертификат — до 15)

Проверить, что домен реально указывает на Pages:
**DNS** зоны `arescraftx.online` → должна быть запись

```
CNAME   @    arescraftx.pages.dev   (Proxied, оранжевое облако)
```

Если там A-запись на старый хостинг или запись вообще отсутствует —
сайт открываться не будет, даже когда зона Active.

---

## 3. Сайт не находится через поиск

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

## 4. Обслуживание метатегов

Все SEO-теги генерируются скриптом:

```bash
python3 tools/seo_inject.py
```

Скрипт **идемпотентен** — его можно запускать сколько угодно раз, дубликатов
не будет. Тексты title/description лежат в словаре `PAGES` внутри скрипта;
чтобы поменять описание страницы, правьте словарь и перезапускайте скрипт,
а не HTML вручную (ручные правки внутри блока `SEO:auto-*` затрутся).
