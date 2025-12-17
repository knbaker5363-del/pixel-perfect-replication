-- المرحلة 1: جدول إعدادات المنصة
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.platform_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings" ON public.platform_settings
FOR SELECT USING (true);

-- المرحلة 2: جدول طلبات السحب للمعلمين
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_method TEXT,
  payment_details TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own requests" ON public.withdrawal_requests
FOR SELECT USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can create requests" ON public.withdrawal_requests
FOR INSERT WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins can update requests" ON public.withdrawal_requests
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- المرحلة 4: جداول الدردشة
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, teacher_id)
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations" ON public.chat_conversations
FOR SELECT USING (auth.uid() = student_id OR auth.uid() = teacher_id);

CREATE POLICY "Students can create conversations" ON public.chat_conversations
FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages" ON public.chat_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
  )
  AND auth.uid() = sender_id
);

CREATE POLICY "Users can mark own messages as read" ON public.chat_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
  )
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- المرحلة 6: جداول الاختبارات
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  passing_score INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quizzes" ON public.quizzes
FOR SELECT USING (is_active = true OR auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can create quizzes" ON public.quizzes
FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own quizzes" ON public.quizzes
FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own quizzes" ON public.quizzes
FOR DELETE USING (auth.uid() = teacher_id);

CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER DEFAULT 0,
  points INTEGER DEFAULT 1
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View questions for accessible quizzes" ON public.quiz_questions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND (q.is_active = true OR q.teacher_id = auth.uid()))
);

CREATE POLICY "Teachers can manage questions" ON public.quiz_questions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.teacher_id = auth.uid())
);

CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  option_order INTEGER DEFAULT 0
);

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View options for accessible questions" ON public.quiz_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id AND (q.is_active = true OR q.teacher_id = auth.uid())
  )
);

CREATE POLICY "Teachers can manage options" ON public.quiz_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id AND q.teacher_id = auth.uid()
  )
);

CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score INTEGER,
  total_points INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  passed BOOLEAN
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attempts" ON public.quiz_attempts
FOR SELECT USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can create attempts" ON public.quiz_attempts
FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own attempts" ON public.quiz_attempts
FOR UPDATE USING (auth.uid() = student_id);

CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id),
  is_correct BOOLEAN
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own answers" ON public.quiz_answers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid())
  OR has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Students can submit answers" ON public.quiz_answers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid())
);

-- المرحلة 7: جدول الشهادات
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  certificate_number TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sessions_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certificates" ON public.certificates
FOR SELECT USING (true);

CREATE POLICY "System can create certificates" ON public.certificates
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- المرحلة 9: جدول الحضور
CREATE TABLE public.session_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  marked_by UUID NOT NULL,
  notes TEXT,
  UNIQUE(session_id, student_id)
);

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage attendance" ON public.session_attendance
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_attendance.session_id AND s.teacher_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can view own attendance" ON public.session_attendance
FOR SELECT USING (auth.uid() = student_id);