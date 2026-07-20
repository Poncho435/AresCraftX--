-- ================================================================
-- AresCraftX — ПОЛНЫЙ ФИКС АДМИН-ПАНЕЛИ
-- ЗАПУСТИТЬ ОДИН РАЗ в Supabase SQL Editor
-- ================================================================

-- ===== 1. ПРАВИЛЬНАЯ is_admin() =====
-- Проверяет И JWT claim И users.role напрямую
-- SECURITY DEFINER = обходит RLS = нет рекурсии
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Быстрая проверка через JWT (если актуален)
  IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE) THEN
    RETURN TRUE;
  END IF;
  -- Прямая проверка users.role (SECURITY DEFINER обходит RLS)
  RETURN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===== 2. УБИРАЕМ СТАРЫЕ ПОЛИТИКИ И СТАВИМ НОВЫЕ =====

-- users: все читают, себя обновляют, админ всё
DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- user_settings: свои + админ
DROP POLICY IF EXISTS "settings_own" ON user_settings;
CREATE POLICY "settings_own" ON user_settings FOR ALL USING (auth.uid() = user_id OR is_admin());

-- user_sessions: свои + админ всё
DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- security_logs: свои логи + админ видит все + админ может вставлять для других
DROP POLICY IF EXISTS "logs_read_own" ON security_logs;
CREATE POLICY "logs_read_own" ON security_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "logs_insert_own" ON security_logs;
CREATE POLICY "logs_insert_own" ON security_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- friends: обе стороны + админ
DROP POLICY IF EXISTS "friends_access" ON friends;
CREATE POLICY "friends_access" ON friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id OR is_admin());

-- friend_requests: обе стороны + админ
DROP POLICY IF EXISTS "freq_access" ON friend_requests;
CREATE POLICY "freq_access" ON friend_requests FOR ALL USING (auth.uid() = from_id OR auth.uid() = to_id OR is_admin());

-- user_notifications: свои + админ может вставлять для других
DROP POLICY IF EXISTS "notifs_own" ON user_notifications;
CREATE POLICY "notifs_own" ON user_notifications FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- push_subscriptions: свои
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id OR is_admin());

-- site_settings: все читают, админ пишет
DROP POLICY IF EXISTS "settings_read" ON site_settings;
CREATE POLICY "settings_read" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_admin" ON site_settings;
CREATE POLICY "settings_admin" ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- news: опубликованные все читают, админ всё
DROP POLICY IF EXISTS "news_read" ON news;
CREATE POLICY "news_read" ON news FOR SELECT USING (published = true OR is_admin());
DROP POLICY IF EXISTS "news_admin" ON news;
CREATE POLICY "news_admin" ON news FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- banned_users: свой бан + админ
DROP POLICY IF EXISTS "banned_read_own" ON banned_users;
CREATE POLICY "banned_read_own" ON banned_users FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "banned_admin" ON banned_users;
CREATE POLICY "banned_admin" ON banned_users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- profile_links: свои ссылки + все читают
DROP POLICY IF EXISTS "profile_links_own" ON profile_links;
CREATE POLICY "profile_links_own" ON profile_links FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "profile_links_read" ON profile_links;
CREATE POLICY "profile_links_read" ON profile_links FOR SELECT USING (true);

-- user_bans: свой бан + админ всё
DROP POLICY IF EXISTS "user_bans_read_own" ON user_bans;
CREATE POLICY "user_bans_read_own" ON user_bans FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "user_bans_admin" ON user_bans;
CREATE POLICY "user_bans_admin" ON user_bans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ===== 3. ФУНКЦИЯ kill_all_user_sessions =====
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

-- ===== 4. ОБНОВЛЁННАЯ set_admin_role =====
CREATE OR REPLACE FUNCTION set_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 5. ОБНОВЛЁННАЯ remove_admin_role =====
CREATE OR REPLACE FUNCTION remove_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'user', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 6. НОВЫЕ КОЛОНКИ (если нет) =====
ALTER TABLE news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ===== 7. УБЕДИТЬСЯ ЧТО ГЛАВНЫЙ АДМИН ИМЕЕТ РОЛЬ =====
-- Раскомментируй если нужно:
-- SELECT set_admin_role('f4ec7ea4-40c8-4f16-a5e3-3baa95ffb7db');

-- ===== ПРОВЕРКА =====
-- После запуска проверь:
-- SELECT id, username, role FROM users WHERE role = 'admin';
-- Должен быть хотя бы 1 пользователь с role = 'admin'
