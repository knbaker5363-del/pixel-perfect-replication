
-- 1. Add display_id to profiles
ALTER TABLE profiles ADD COLUMN display_id TEXT UNIQUE;

-- 2. Create sequence for display_id generation
CREATE SEQUENCE IF NOT EXISTS profile_display_id_seq START WITH 1;

-- 3. Create function to generate display_id based on role
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  user_role TEXT;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role FROM user_roles WHERE user_id = NEW.user_id LIMIT 1;
  
  -- Determine prefix based on role
  CASE user_role
    WHEN 'admin' THEN prefix := 'ADM';
    WHEN 'teacher' THEN prefix := 'TCH';
    ELSE prefix := 'STU';
  END CASE;
  
  -- Get next sequence number
  seq_num := nextval('profile_display_id_seq');
  
  -- Set display_id
  NEW.display_id := prefix || LPAD(seq_num::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger for new profiles
CREATE TRIGGER set_profile_display_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION generate_display_id();

-- 5. Generate display_id for existing profiles
DO $$
DECLARE
  rec RECORD;
  prefix TEXT;
  seq_num INTEGER;
  user_role TEXT;
BEGIN
  FOR rec IN SELECT p.id, p.user_id FROM profiles p WHERE p.display_id IS NULL ORDER BY p.created_at
  LOOP
    SELECT role INTO user_role FROM user_roles WHERE user_id = rec.user_id LIMIT 1;
    CASE user_role
      WHEN 'admin' THEN prefix := 'ADM';
      WHEN 'teacher' THEN prefix := 'TCH';
      ELSE prefix := 'STU';
    END CASE;
    seq_num := nextval('profile_display_id_seq');
    UPDATE profiles SET display_id = prefix || LPAD(seq_num::TEXT, 5, '0') WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 6. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 7. Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. Add objectives and syllabus to subjects
ALTER TABLE subjects ADD COLUMN objectives TEXT;
ALTER TABLE subjects ADD COLUMN syllabus TEXT;

-- 9. Add duration fields to subject_prices
ALTER TABLE subject_prices ADD COLUMN duration_type TEXT DEFAULT 'semester';
ALTER TABLE subject_prices ADD COLUMN duration_value INTEGER DEFAULT 1;
