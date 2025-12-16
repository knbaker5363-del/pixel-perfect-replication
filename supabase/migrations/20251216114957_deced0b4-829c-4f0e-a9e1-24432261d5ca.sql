-- Create universities table
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email_domain text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  require_email_verification boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Anyone can view universities
CREATE POLICY "Anyone can view universities" ON public.universities
FOR SELECT USING (true);

-- Admins can manage universities
CREATE POLICY "Admins can manage universities" ON public.universities
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert Khadoori University
INSERT INTO public.universities (name, email_domain) 
VALUES ('جامعة فلسطين التقنية - خضوري', 'ptuk.edu.ps');

-- Update profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_id uuid REFERENCES public.universities(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_place text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_public boolean DEFAULT false;

-- Create teacher_messages table
CREATE TABLE public.teacher_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'inquiry',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for teacher_messages
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

-- Teachers can view their messages
CREATE POLICY "Teachers can view their messages" ON public.teacher_messages
FOR SELECT USING (auth.uid() = teacher_id);

-- Students can send messages to teachers
CREATE POLICY "Students can send messages" ON public.teacher_messages
FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can update (mark as read)
CREATE POLICY "Teachers can update messages" ON public.teacher_messages
FOR UPDATE USING (auth.uid() = teacher_id);

-- Update subject_posts table
ALTER TABLE public.subject_posts ADD COLUMN IF NOT EXISTS session_link text;
ALTER TABLE public.subject_posts ADD COLUMN IF NOT EXISTS session_date timestamp with time zone;

-- Drop existing SELECT policy on profiles and create new one
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "View profiles with restrictions" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'teacher') OR
  has_role(auth.uid(), 'admin') OR
  is_profile_public = true
);