# 🔒 AresCraftX — Руководство по безопасности

## Что реализовано

### 1. Защита кода (deterrent-уровень)
| Метод | Файл | Описание |
|---|---|---|
| Блокировка F12, Ctrl+U, Ctrl+Shift+I | security.js | Горячие клавиши DevTools заблокированы |
| Отключение правого клика | security.js | Контекстное меню отключено |
| Детектор DevTools | security.js | При открытии DevTools — страница очищается + редирект |
| Защита от выделения/копирования | security.js | Текст нельзя выделить (кроме input) |
| Защита от drag-and-drop | security.js | Нельзя перетащить элементы |
| Предупреждение в консоли | security.js | Красное предупреждение о мошенничестве |
| Защита от iframe (clickjacking) | security.js | Автовыход из iframe |

> ⚠️ **ПРАВДА**: Полностью скрыть код браузера НЕВОЗМОЖНО. Всё выше — усложнение, не гарантия. Настоящая защита — на сервере.

### 2. Защита данных (реальная)
| Метод | Файл | Описание |
|---|---|---|
| Row Level Security (RLS) | database.sql | Каждый юзер видит ТОЛЬКО свои данные |
| Sanitization ввода | security.js | Очистка от XSS: username, MC-ник, описание |
| Rate Limiting | security.js | Защита от спама: max 5 запросов/мин на действие |
| Усиленная проверка пароля | script.js | Минимум 8 символов, заглавная + строчная + цифра |
| CSP заголовки | _headers, .htaccess, nginx | Блокировка посторонних скриптов |
| X-Frame-Options: DENY | все страницы | Защита от clickjacking |
| HSTS | _headers, .htaccess, nginx | Принудительный HTTPS |
| Security Logs | database.sql | Логирование входов, изменений, 2FA |
| Защита от tabnabbing | security.js | noopener + noreferrer на внешних ссылках |
| Блокировка удаления текущей сессии | database.sql | Нельзя удалить свою текущую сессию |

### 3. Журнал безопасности
Таблица `security_logs` записывает:
- 🔑 Вход в аккаунт
- ❌ Неудачные попытки входа
- 🚪 Выход
- 🔒 Смена пароля
- 🛡️ Включение/отключение 2FA
- 💀 Удаление сессии
- ✏️ Изменение профиля

---

## Что нужно настроить в Supabase Dashboard

### Обязательно:

1. **Выполнить database.sql** — в SQL Editor запустить обновлённый файл

2. **Включить Email Confirmation** — Authentication → Settings → Email:
   - ✅ Enable email confirmations
   - ✅ Secure email change

3. **Настроить минимальную длину пароля** — Authentication → Settings:
   - Min password length: **8**

4. **Включить Rate Limiting** — Authentication → Settings:
   - Rate limiting: **Включить**

5. **Настроить MFA** — Authentication → Settings:
   - MFA: **Включить** (если доступно в тарифе)

6. **Проверить RLS** — Table Editor → каждая таблица:
   - RLS Enabled: ✅ для ВСЕХ таблиц
   - Проверить что нет политики `USING (true)` — это = доступ всем!

### Рекомендуется:

7. **Custom SMTP** — Authentication → SMTP Settings:
   - Настроить свой SMTP (SendGrid, Mailgun и т.д.)
   - Ограничить кол-во писем

8. **Audit Logs** — Database → Audit Logs (Pro тариф):
   - Включить если доступно

9. **Hook: Проверка пароля** — Database → Database Webhooks:
   - Создать webhook на `users.update` для логирования

10. **Очистка сессий** — Database → Cron Jobs (нужен pg_cron):
    - Раскомментировать строки в database.sql

---

## Чеклист перед запуском

- [ ] database.sql выполнен в Supabase SQL Editor
- [ ] RLS включён на ВСЕХ таблицах (users, user_sessions, security_logs)
- [ ] Email confirmation включена
- [ ] Минимальная длина пароля = 8
- [ ] Rate limiting включён в Supabase
- [ ] Настроен _headers / .htaccess / nginx на хостинге
- [ ] HTTPS включён (бесплатный через Cloudflare/Let's Encrypt)
- [ ] config.json НЕ доступен по URL (проверь: https://твой-сайт/config.json)
- [ ] .env файлы НЕ в публичной директории
- [ ] Supabase Service Role Key НИГДЕ не светится в клиентском коде
- [ ] Тест: попробуй зайти с другого аккаунта — видишь ли чужие данные?

---

## Частые ошибки

### ❌ Service Role Key в клиенте
НИКОГДА не вставляй `service_role` key в HTML/JS. Он обходит RLS и даёт полный доступ к БД.

### ❌ Открытый доступ к таблице
Если RLS включён, но нет политик — никто не может читать. Если есть политика `USING (true)` — ВСЕ могут читать. Проверяй!

### ❌ Хранение 2FA секрета в user_metadata (ИСПРАВЛЕНО)
Секрет 2FA теперь хранится в таблице `users.mfa_secret` (защищённой RLS), а НЕ в `user_metadata`. Пользователь не может прочитать `mfa_secret` напрямую через API, потому что RLS ограничивает доступ.

**Для максимальной защиты:** Создай отдельную таблицу `mfa_secrets(user_id, secret)` с политикой:
- `INSERT`: пользователь может вставить (при включении 2FA)
- `UPDATE`: запретить (секрет не должен меняться — только delete + insert)
- `SELECT`: запретить (пользователь не должен видеть свой секрет)
- `DELETE`: запретить (только через серверную функцию)

### ❌ SVG аватар с встроенным JS (ИСПРАВЛЕНО)
Теперь загружать аватар можно только в форматах JPG, PNG, GIF, WebP, BMP. SVG запрещён — он может содержать `<script>`.

### ❌ javascript: URI в avatar_url (ИСПРАВЛЕНО)
Если кто-то вручную запишет `javascript:alert(1)` в avatar_url через API — теперь это обнаруживается и блокируется.

### ❌ Prototype Pollution (ИСПРАВЛЕНО)
`Object.prototype` заморожен — нельзя добавить или изменить свойства прототипа.

### ❌ Supply Chain Attack (ИСПРАВЛЕНО)
При загрузке страницы проверяется что Supabase JS SDK действительно загрузился. MutationObserver блокирует инъекции неизвестных `<script>` и `<iframe>`. Критические функции (fetch, XMLHttpRequest) проверяются на подмену.

### ❌ Отсутствие HTTPS
Без HTTPS все данные (включая пароли и токены) передаются в открытом виде. Обязательно включите HTTPS!
