-- ============================================
-- Full Database Schema for Education Platform
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create ENUM types
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create sequence for display IDs
CREATE SEQUENCE IF NOT EXISTS public.profile_display_id_seq START 1;

-- ============================================
-- TABLES
-- ============================================

-- Universities
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  require_email_verification BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  education_place TEXT,
  university_id UUID REFERENCES public.universities(id),
  is_profile_public BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  display_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'student'
);

-- Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'approved',
  proposed_by UUID,
  objectives TEXT,
  syllabus TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subject Prices
CREATE TABLE IF NOT EXISTS public.subject_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) UNIQUE,
  points_price INTEGER DEFAULT 50,
  money_price NUMERIC DEFAULT 10,
  is_free BOOLEAN DEFAULT false,
  duration_type TEXT DEFAULT 'semester',
  duration_value INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subject Subscriptions
CREATE TABLE IF NOT EXISTS public.subject_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  student_id UUID NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'points',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Subject Posts
CREATE TABLE IF NOT EXISTS public.subject_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'update',
  session_link TEXT,
  session_date TIMESTAMPTZ,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER DEFAULT 20,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  zoom_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session Enrollments
CREATE TABLE IF NOT EXISTS public.session_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now()
);

-- Session Attendance
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  student_id UUID NOT NULL,
  marked_by UUID NOT NULL,
  status TEXT DEFAULT 'present',
  notes TEXT,
  marked_at TIMESTAMPTZ DEFAULT now()
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id),
  student_id UUID NOT NULL,
  file_url TEXT,
  notes TEXT,
  grade NUMERIC,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  passing_score INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  question_text TEXT NOT NULL,
  question_order INTEGER DEFAULT 0,
  points INTEGER DEFAULT 1
);

-- Quiz Options
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id),
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  option_order INTEGER DEFAULT 0
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  student_id UUID NOT NULL,
  score INTEGER,
  total_points INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Quiz Answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id),
  selected_option_id UUID REFERENCES public.quiz_options(id),
  is_correct BOOLEAN
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  student_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  certificate_number TEXT NOT NULL,
  sessions_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  issued_at TIMESTAMPTZ DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.sessions(id),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Todos
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher Applications
CREATE TABLE IF NOT EXISTS public.teacher_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher Messages
CREATE TABLE IF NOT EXISTS public.teacher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'inquiry',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher Earnings
CREATE TABLE IF NOT EXISTS public.teacher_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  amount NUMERIC NOT NULL,
  commission_rate NUMERIC DEFAULT 10,
  net_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_details TEXT,
  admin_notes TEXT,
  processed_by UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id),
  sender_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled Reminders
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Generate display ID
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = NEW.user_id LIMIT 1;
  
  CASE user_role
    WHEN 'admin' THEN prefix := 'ADM';
    WHEN 'teacher' THEN prefix := 'TCH';
    ELSE prefix := 'STU';
  END CASE;
  
  seq_num := nextval('profile_display_id_seq');
  NEW.display_id := prefix || LPAD(seq_num::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$;

-- Notify on session enrollment
CREATE OR REPLACE FUNCTION public.notify_session_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_record RECORD;
  teacher_name TEXT;
BEGIN
  SELECT s.*, sub.name as subject_name INTO session_record
  FROM sessions s LEFT JOIN subjects sub ON s.subject_id = sub.id
  WHERE s.id = NEW.session_id;

  SELECT full_name INTO teacher_name FROM profiles WHERE user_id = session_record.teacher_id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.student_id, 'session_enrolled', 'تم التسجيل في الجلسة',
    'تم تسجيلك في جلسة "' || session_record.title || '" مع المعلم ' || COALESCE(teacher_name, 'غير محدد') || ' بتاريخ ' || TO_CHAR(session_record.scheduled_at, 'DD/MM/YYYY HH24:MI'),
    NEW.session_id
  );

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    session_record.teacher_id, 'new_enrollment', 'تسجيل جديد في جلستك',
    'طالب جديد سجّل في جلسة "' || session_record.title || '"', NEW.session_id
  );

  IF session_record.scheduled_at > (now() + interval '24 hours') THEN
    INSERT INTO scheduled_reminders (user_id, session_id, reminder_type, scheduled_for)
    VALUES (NEW.student_id, NEW.session_id, '24h_before', session_record.scheduled_at - interval '24 hours');
  END IF;

  IF session_record.scheduled_at > (now() + interval '1 hour') THEN
    INSERT INTO scheduled_reminders (user_id, session_id, reminder_type, scheduled_for)
    VALUES (NEW.student_id, NEW.session_id, '1h_before', session_record.scheduled_at - interval '1 hour');
  END IF;

  RETURN NEW;
END;
$$;

-- Notify subject subscribers on new post
CREATE OR REPLACE FUNCTION public.notify_subject_subscribers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT ss.student_id, 'new_subject_content',
    'محتوى جديد في ' || (SELECT name FROM subjects WHERE id = NEW.subject_id),
    'تم نشر: ' || NEW.title, NEW.id
  FROM subject_subscriptions ss
  WHERE ss.subject_id = NEW.subject_id AND ss.is_active = true AND ss.student_id != NEW.teacher_id;
  RETURN NEW;
END;
$$;

-- Notify subject subscribers on new session
CREATE OR REPLACE FUNCTION public.notify_subject_subscribers_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT ss.student_id, 'new_session_available', 'جلسة جديدة متاحة',
    'جلسة جديدة: ' || NEW.title, NEW.id
  FROM subject_subscriptions ss
  WHERE ss.subject_id = NEW.subject_id AND ss.is_active = true AND ss.student_id != NEW.teacher_id;
  RETURN NEW;
END;
$$;

-- Notify teacher application status
CREATE OR REPLACE FUNCTION public.notify_teacher_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'approved' THEN 'teacher_approved' ELSE 'teacher_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'تمت الموافقة على طلبك' ELSE 'تم رفض طلبك' END,
      CASE WHEN NEW.status = 'approved' 
        THEN 'تهانينا! تمت الموافقة على طلبك كمعلم. يمكنك الآن إنشاء جلسات تعليمية.'
        ELSE 'نأسف، تم رفض طلبك كمعلم. يمكنك التقديم مرة أخرى لاحقاً.'
      END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate display ID
DROP TRIGGER IF EXISTS generate_profile_display_id ON public.profiles;
CREATE TRIGGER generate_profile_display_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION public.generate_display_id();

-- Notify on enrollment
DROP TRIGGER IF EXISTS on_session_enrollment ON public.session_enrollments;
CREATE TRIGGER on_session_enrollment
  AFTER INSERT ON public.session_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_enrollment();

-- Notify subscribers on new post
DROP TRIGGER IF EXISTS on_subject_post_created ON public.subject_posts;
CREATE TRIGGER on_subject_post_created
  AFTER INSERT ON public.subject_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_subject_subscribers();

-- Notify subscribers on new session
DROP TRIGGER IF EXISTS on_session_created ON public.sessions;
CREATE TRIGGER on_session_created
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_subject_subscribers_new_session();

-- Notify teacher application status change
DROP TRIGGER IF EXISTS on_teacher_application_status_change ON public.teacher_applications;
CREATE TRIGGER on_teacher_application_status_change
  AFTER UPDATE ON public.teacher_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_application_status();

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Universities
CREATE POLICY "Anyone can view universities" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Admins can manage universities" ON public.universities FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "View profiles with restrictions" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin') OR is_profile_public = true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Subjects
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can propose subjects" ON public.subjects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher') AND auth.uid() = proposed_by AND status = 'pending');

-- Subject Prices
CREATE POLICY "Anyone can view prices" ON public.subject_prices FOR SELECT USING (true);
CREATE POLICY "Admins can manage prices" ON public.subject_prices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can set prices for their subjects" ON public.subject_prices FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher') AND EXISTS (SELECT 1 FROM subjects WHERE id = subject_prices.subject_id AND proposed_by = auth.uid()));
CREATE POLICY "Teachers can update prices for their subjects" ON public.subject_prices FOR UPDATE
  USING (has_role(auth.uid(), 'teacher') AND EXISTS (SELECT 1 FROM subjects WHERE id = subject_prices.subject_id AND proposed_by = auth.uid()));

-- Subject Subscriptions
CREATE POLICY "Students can view own subscriptions" ON public.subject_subscriptions FOR SELECT
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can subscribe" ON public.subject_subscriptions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can cancel own subscriptions" ON public.subject_subscriptions FOR UPDATE USING (auth.uid() = student_id);

-- Subject Posts
CREATE POLICY "Anyone can view posts" ON public.subject_posts FOR SELECT USING (true);
CREATE POLICY "Teachers can create posts" ON public.subject_posts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own posts" ON public.subject_posts FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own posts" ON public.subject_posts FOR DELETE USING (auth.uid() = teacher_id);

-- Sessions
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Teachers can create sessions" ON public.sessions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = teacher_id);

-- Session Enrollments
CREATE POLICY "View own enrollments" ON public.session_enrollments FOR SELECT
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM sessions WHERE id = session_enrollments.session_id AND teacher_id = auth.uid()));
CREATE POLICY "Students can enroll" ON public.session_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can unenroll" ON public.session_enrollments FOR DELETE USING (auth.uid() = student_id);

-- Session Attendance
CREATE POLICY "Students can view own attendance" ON public.session_attendance FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can manage attendance" ON public.session_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_attendance.session_id AND s.teacher_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Assignments
CREATE POLICY "View assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Teachers can create assignments" ON public.assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE id = assignments.session_id AND teacher_id = auth.uid()));
CREATE POLICY "Teachers can update assignments" ON public.assignments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sessions WHERE id = assignments.session_id AND teacher_id = auth.uid()));

-- Assignment Submissions
CREATE POLICY "View own submissions" ON public.assignment_submissions FOR SELECT
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM assignments a JOIN sessions s ON a.session_id = s.id WHERE a.id = assignment_submissions.assignment_id AND s.teacher_id = auth.uid()));
CREATE POLICY "Students can submit" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own submissions" ON public.assignment_submissions FOR UPDATE USING (auth.uid() = student_id);

-- Quizzes
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes FOR SELECT
  USING (is_active = true OR auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = teacher_id);

-- Quiz Questions
CREATE POLICY "View questions for accessible quizzes" ON public.quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND (q.is_active = true OR q.teacher_id = auth.uid())));
CREATE POLICY "Teachers can manage questions" ON public.quiz_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND q.teacher_id = auth.uid()));

-- Quiz Options
CREATE POLICY "View options for accessible questions" ON public.quiz_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE qq.id = quiz_options.question_id AND (q.is_active = true OR q.teacher_id = auth.uid())));
CREATE POLICY "Teachers can manage options" ON public.quiz_options FOR ALL
  USING (EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE qq.id = quiz_options.question_id AND q.teacher_id = auth.uid()));

-- Quiz Attempts
CREATE POLICY "Students can view own attempts" ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = student_id);

-- Quiz Answers
CREATE POLICY "View own answers" ON public.quiz_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid()) OR has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students can submit answers" ON public.quiz_answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid()));

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Students can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = student_id);

-- Certificates
CREATE POLICY "Anyone can view certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "System can create certificates" ON public.certificates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Notes
CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Todos
CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create todos" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System and admins can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Teacher Applications
CREATE POLICY "Users can view own applications" ON public.teacher_applications FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply" ON public.teacher_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update applications" ON public.teacher_applications FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Teacher Messages
CREATE POLICY "Teachers can view their messages" ON public.teacher_messages FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Students can send messages" ON public.teacher_messages FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can update messages" ON public.teacher_messages FOR UPDATE USING (auth.uid() = teacher_id);

-- Teacher Earnings
CREATE POLICY "Teachers can view own earnings" ON public.teacher_earnings FOR SELECT
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));

-- Withdrawal Requests
CREATE POLICY "Teachers can view own requests" ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can create requests" ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can update requests" ON public.withdrawal_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Chat Conversations
CREATE POLICY "Participants can view conversations" ON public.chat_conversations FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = teacher_id);
CREATE POLICY "Students can create conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Chat Messages
CREATE POLICY "Participants can view messages" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())));
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())) AND auth.uid() = sender_id);
CREATE POLICY "Users can mark own messages as read" ON public.chat_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = chat_messages.conversation_id AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())));

-- Scheduled Reminders
CREATE POLICY "Users can view own reminders" ON public.scheduled_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage reminders" ON public.scheduled_reminders FOR ALL USING (true) WITH CHECK (true);

-- Platform Settings
CREATE POLICY "Anyone can view settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-documents', 'proof-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('subject-files', 'subject-files', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies - Avatars
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policies - Proof Documents
CREATE POLICY "Users can upload proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proof-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proof-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin')));

-- Storage Policies - Subject Files
CREATE POLICY "Public subject files access" ON storage.objects FOR SELECT USING (bucket_id = 'subject-files');
CREATE POLICY "Teachers can upload subject files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'subject-files' AND has_role(auth.uid(), 'teacher'));
