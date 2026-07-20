-- ==============================================
-- AresCraftX — Полная схема базы данных
-- Supabase (PostgreSQL 15+)
-- ==============================================

-- Расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 1. ПОЛЬЗОВАТЕЛИ =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  birthday DATE,
  gender TEXT DEFAULT 'not_specified' CHECK (gender IN ('male','female','other','not_specified')),
  description TEXT DEFAULT '',
  mc_nick TEXT DEFAULT '',
  mc_mode TEXT DEFAULT '' CHECK (mc_mode IN ('','anarchy','vanilla')),
  avatar_url TEXT,
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online','dnd','offline')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Миграция: добавляем колонки, если таблица уже существовала без них
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'not_specified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mc_nick TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mc_mode TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Добавляем CHECK-ограничения, если их нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (gender IN ('male','female','other','not_specified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_mc_mode_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_mc_mode_check CHECK (mc_mode IN ('','anarchy','vanilla'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','admin','moderator'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('online','dnd','offline'));
  END IF;
END
$$;

-- ===== 2. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ =====
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notif_email BOOLEAN DEFAULT FALSE,
  notif_login BOOLEAN DEFAULT TRUE,
  notif_news BOOLEAN DEFAULT TRUE,
  notif_events BOOLEAN DEFAULT TRUE,
  notif_mc_chat BOOLEAN DEFAULT TRUE,
  notif_pvp BOOLEAN DEFAULT TRUE,
  notif_pm BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'ru',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 3. СЕССИИ =====
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_key TEXT UNIQUE,
  device TEXT,
  user_agent TEXT,
  ip_address INET,
  is_current BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Миграция: добавляем session_key если его нет
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_key TEXT;
-- Уникальный индекс для upsert по session_key (без дубликатов)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_key ON user_sessions(session_key);

-- ===== 4. ЖУРНАЛ БЕЗОПАСНОСТИ =====
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  device TEXT,
  user_agent TEXT,
  ip_address INET,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 5. ДРУЗЬЯ =====
CREATE TABLE IF NOT EXISTS friends (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- ===== 6. ЗАПРОСЫ ДРУЖБЫ =====
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_id, to_id),
  CHECK (from_id != to_id)
);

-- ===== 7. УВЕДОМЛЕНИЯ =====
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Миграция: добавляем action_url если его нет
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- ===== 8. PUSH-ПОДПИСКИ =====
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- ===== 9. НАСТРОЙКИ САЙТА =====
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 10. НОВОСТИ =====
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'info',
  date TEXT,
  published BOOLEAN DEFAULT TRUE,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Миграция: добавляем колонки если нет
ALTER TABLE news ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'info';
ALTER TABLE news ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ===== 11. БАНЫ (старая таблица, оставлена для совместимости) =====
CREATE TABLE IF NOT EXISTS banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 12. ССЫЛКИ ПРОФИЛЯ =====
CREATE TABLE IF NOT EXISTS profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'custom' CHECK (link_type IN ('telegram','youtube','discord','vk','twitter','website','custom')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT DEFAULT '',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 13. БАНЫ ПОЛЬЗОВАТЕЛЕЙ (админ) =====
CREATE TABLE IF NOT EXISTS user_bans (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'Нарушение правил',
  banned_until TIMESTAMPTZ,
  banned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Миграция: добавляем колонки если нет
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Нарушение правил';
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS banned_by UUID;
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================
-- ИНДЕКСЫ
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_freq_to ON friend_requests(to_id, status);
CREATE INDEX IF NOT EXISTS idx_freq_from ON friend_requests(from_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON user_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user ON security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_key ON user_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profile_links_user ON profile_links(user_id, "order");
CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);

-- ==============================================
-- ФУНКЦИЯ is_admin() — БЕЗ РЕКУРСИИ RLS
-- Проверяет И JWT claim И users.role напрямую
-- SECURITY DEFINER обходит RLS, рекурсии нет
-- ==============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Способ 1: Проверяем JWT claim (быстро, если JWT актуален)
  IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE) THEN
    RETURN TRUE;
  END IF;
  -- Способ 2: Проверяем users.role напрямую (SECURITY DEFINER обходит RLS)
  RETURN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- ПОЛИТИКИ RLS (с поддержкой is_admin())
-- ==============================================

-- users: читать все (поиск друзей), обновлять только себя, админ всё
DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users FOR ALL USING (is_admin());

-- user_settings: свои настройки + админ может читать
DROP POLICY IF EXISTS "settings_own" ON user_settings;
CREATE POLICY "settings_own" ON user_settings FOR ALL USING (auth.uid() = user_id OR is_admin());

-- user_sessions: свои сессии + админ может управлять всеми
DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (auth.uid() = user_id OR is_admin());

-- security_logs: свои логи + админ видит все и может вставлять для других
DROP POLICY IF EXISTS "logs_read_own" ON security_logs;
CREATE POLICY "logs_read_own" ON security_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "logs_insert_own" ON security_logs;
CREATE POLICY "logs_insert_own" ON security_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- friends: обе стороны видят дружбу + админ
DROP POLICY IF EXISTS "friends_access" ON friends;
CREATE POLICY "friends_access" ON friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id OR is_admin());

-- friend_requests: обе стороны видят запрос + админ
DROP POLICY IF EXISTS "freq_access" ON friend_requests;
CREATE POLICY "freq_access" ON friend_requests FOR ALL USING (auth.uid() = from_id OR auth.uid() = to_id OR is_admin());

-- user_notifications: свои уведомления + админ может вставлять для других
DROP POLICY IF EXISTS "notifs_own" ON user_notifications;
CREATE POLICY "notifs_own" ON user_notifications FOR ALL USING (auth.uid() = user_id OR is_admin());

-- push_subscriptions: свои подписки
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- site_settings: все читают, админ пишет
DROP POLICY IF EXISTS "settings_read" ON site_settings;
CREATE POLICY "settings_read" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_admin" ON site_settings;
CREATE POLICY "settings_admin" ON site_settings FOR ALL USING (is_admin());

-- news: все читают опубликованные, админ всё
DROP POLICY IF EXISTS "news_read" ON news;
CREATE POLICY "news_read" ON news FOR SELECT USING (published = true OR is_admin());
DROP POLICY IF EXISTS "news_admin" ON news;
CREATE POLICY "news_admin" ON news FOR ALL USING (is_admin());

-- banned_users: читать свой бан, админ всё
DROP POLICY IF EXISTS "banned_read_own" ON banned_users;
CREATE POLICY "banned_read_own" ON banned_users FOR SELECT USING (
  auth.uid() = user_id OR is_admin()
);
DROP POLICY IF EXISTS "banned_admin" ON banned_users;
CREATE POLICY "banned_admin" ON banned_users FOR ALL USING (is_admin());

-- profile_links: свои ссылки + все могут читать (для просмотра профилей)
DROP POLICY IF EXISTS "profile_links_own" ON profile_links;
CREATE POLICY "profile_links_own" ON profile_links FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profile_links_read" ON profile_links;
CREATE POLICY "profile_links_read" ON profile_links FOR SELECT USING (true);

-- user_bans: читать свой бан, админ всё
DROP POLICY IF EXISTS "user_bans_read_own" ON user_bans;
CREATE POLICY "user_bans_read_own" ON user_bans FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "user_bans_admin" ON user_bans;
CREATE POLICY "user_bans_admin" ON user_bans FOR ALL USING (is_admin());

-- ==============================================
-- ДАННЫЕ ПО УМОЛЧАНИЮ
-- ==============================================
INSERT INTO site_settings (key, value) VALUES ('launch_date', '"2026-08-20"') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('dev_start_date', '"2026-07-15"') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('site_version', '"2.1.0"') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('donations_open', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('registration_open', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('maintenance', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('show_online', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('server_ip', '"play.arescraftx.online"') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('server_versions', '"1.20-1.21.11"') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('ranks_visible', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('announcement', 'null') ON CONFLICT (key) DO NOTHING;

-- ==============================================
-- ФУНКЦИИ
-- ==============================================

-- Авто-создание пользователя при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Установить роль админа (обновляет users.role И auth.users JWT claim)
CREATE OR REPLACE FUNCTION set_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Снять роль админа (убирает из users.role и app_metadata)
CREATE OR REPLACE FUNCTION remove_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'user', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Отправить запрос дружбы
CREATE OR REPLACE FUNCTION send_friend_request(p_target_id UUID)
RETURNS VOID AS $$
DECLARE
  my_id UUID;
BEGIN
  my_id := auth.uid();
  IF my_id = p_target_id THEN RAISE EXCEPTION 'Нельзя добавить себя'; END IF;
  IF EXISTS (SELECT 1 FROM friends WHERE user_id = my_id AND friend_id = p_target_id) THEN RAISE EXCEPTION 'Уже друзья'; END IF;
  IF EXISTS (SELECT 1 FROM friend_requests WHERE from_id = p_target_id AND to_id = my_id AND status = 'pending') THEN
    PERFORM accept_friend_request((SELECT id FROM friend_requests WHERE from_id = p_target_id AND to_id = my_id AND status = 'pending' LIMIT 1));
    RETURN;
  END IF;
  INSERT INTO friend_requests (from_id, to_id, status)
  VALUES (my_id, p_target_id, 'pending')
  ON CONFLICT (from_id, to_id) DO UPDATE SET status = 'pending', updated_at = NOW();
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (p_target_id, 'friend_request', 'Запрос дружбы',
    (SELECT username FROM users WHERE id = my_id) || ' хочет добавить вас в друзья',
    jsonb_build_object('from_id', my_id, 'request_id', 
      (SELECT id FROM friend_requests WHERE from_id = my_id AND to_id = p_target_id AND status = 'pending' LIMIT 1))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Принять запрос дружбы
CREATE OR REPLACE FUNCTION accept_friend_request(p_req_id UUID)
RETURNS VOID AS $$
DECLARE
  v_from UUID; v_to UUID;
BEGIN
  SELECT from_id, to_id INTO v_from, v_to FROM friend_requests WHERE id = p_req_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Запрос не найден'; END IF;
  IF v_to != auth.uid() THEN RAISE EXCEPTION 'Нет доступа'; END IF;
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_req_id;
  INSERT INTO friends (user_id, friend_id) VALUES (v_from, v_to), (v_to, v_from) ON CONFLICT DO NOTHING;
  INSERT INTO user_notifications (user_id, type, title, message)
  VALUES (v_from, 'friend_accepted', 'Запрос принят',
    (SELECT username FROM users WHERE id = v_to) || ' принял(а) ваш запрос дружбы');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Отклонить запрос дружбы
CREATE OR REPLACE FUNCTION decline_friend_request(p_req_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE friend_requests SET status = 'declined', updated_at = NOW()
  WHERE id = p_req_id AND to_id = auth.uid() AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Отменить исходящий запрос дружбы
CREATE OR REPLACE FUNCTION cancel_friend_request(p_req_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM friend_requests WHERE id = p_req_id AND from_id = auth.uid() AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удалить из друзей
CREATE OR REPLACE FUNCTION remove_friend(p_target_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM friends WHERE (user_id = auth.uid() AND friend_id = p_target_id)
                     OR (user_id = p_target_id AND friend_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пометить уведомления как прочитанные
CREATE OR REPLACE FUNCTION mark_notifications_read(p_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE user_notifications SET read = TRUE
  WHERE id = ANY(p_ids) AND user_id = auth.uid() AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Поиск пользователей (для добавления в друзья)
CREATE OR REPLACE FUNCTION search_users(p_query TEXT)
RETURNS TABLE(id UUID, username TEXT, avatar_url TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.avatar_url, u.status
  FROM users u
  WHERE u.username ILIKE p_query || '%'
    AND u.id != auth.uid()
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создать уведомление (для серверных триггеров)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB DEFAULT NULL, p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удалить все сессии кроме текущей
CREATE OR REPLACE FUNCTION kill_other_sessions(p_current_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE user_id = auth.uid() AND session_key != p_current_key;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удалить ВСЕ сессии пользователя (для админа)
CREATE OR REPLACE FUNCTION kill_all_user_sessions(p_target_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Нет доступа'; END IF;
  DELETE FROM user_sessions WHERE user_id = p_target_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Очистить старые уведомления (старше 30 дней, прочитанные)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_notifications 
  WHERE read = TRUE AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
