-- ==============================================
-- МИГРАЦИЯ: Исправление RLS политик для админ-панели
-- Запустить один раз в Supabase SQL Editor
-- ==============================================

-- ===== 1. УЛУЧШЕННАЯ is_admin() =====
-- Теперь проверяет И JWT claim И users.role напрямую
-- SECURITY DEFINER обходит RLS, поэтому рекурсии нет
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

-- ===== 2. security_logs — админ может читать ВСЕ и вставлять для ЛЮБОГО =====
DROP POLICY IF EXISTS "logs_read_own" ON security_logs;
CREATE POLICY "logs_read_own" ON security_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "logs_insert_own" ON security_logs;
CREATE POLICY "logs_insert_own" ON security_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- Админ может вставлять логи для любого пользователя (бан, разбан и т.д.)
DROP POLICY IF EXISTS "logs_admin_insert" ON security_logs;
CREATE POLICY "logs_admin_insert" ON security_logs FOR INSERT WITH CHECK (is_admin());

-- ===== 3. user_notifications — админ может управлять уведомлениями других =====
DROP POLICY IF EXISTS "notifs_own" ON user_notifications;
CREATE POLICY "notifs_own" ON user_notifications FOR ALL USING (auth.uid() = user_id OR is_admin());

-- ===== 4. user_sessions — админ может управлять сессиями других =====
DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (auth.uid() = user_id OR is_admin());

-- ===== 5. friends — админ может читать для просмотра профилей =====
-- (уже есть friends_access с обеими сторонами, но добавим админу)
DROP POLICY IF EXISTS "friends_access" ON friends;
CREATE POLICY "friends_access" ON friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id OR is_admin());

-- ===== 6. friend_requests — админ может читать =====
DROP POLICY IF EXISTS "freq_access" ON friend_requests;
CREATE POLICY "freq_access" ON friend_requests FOR ALL USING (auth.uid() = from_id OR auth.uid() = to_id OR is_admin());

-- ===== 7. user_settings — админ может читать =====
DROP POLICY IF EXISTS "settings_own" ON user_settings;
CREATE POLICY "settings_own" ON user_settings FOR ALL USING (auth.uid() = user_id OR is_admin());

-- ===== 8. profile_links — все могут читать (для просмотра профилей друзей) =====
-- (уже есть profile_links_read, но убедимся)
DROP POLICY IF EXISTS "profile_links_read" ON profile_links;
CREATE POLICY "profile_links_read" ON profile_links FOR SELECT USING (true);

-- ===== 9. news — добавляем published колонку если нет =====
ALTER TABLE news ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ===== 10. Убедимся что set_admin_role работает корректно =====
CREATE OR REPLACE FUNCTION set_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = p_user_id;
  -- Обновляем JWT claim
  UPDATE auth.users SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 11. remove_admin_role — исправленная =====
CREATE OR REPLACE FUNCTION remove_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'user', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 12. Проверка: убедимся что у главного админа роль установлена =====
-- Если нужно назначить админа вручную, раскомментируй:
-- SELECT set_admin_role('f4ec7ea4-40c8-4f16-a5e3-3baa95ffb7db');

-- ===== ГОТОВО =====
-- После выполнения этой миграции:
-- 1. Админ-панель сможет банить/разбанять пользователей
-- 2. Уведомления будут отправляться забаненным пользователям
-- 3. Логи безопасности будут записываться для других пользователей
-- 4. Админ сможет завершать сессии других пользователей
-- 5. is_admin() будет работать даже если JWT не обновился
