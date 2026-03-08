
-- Fix RLS on teacher_messages: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Students can send messages" ON public.teacher_messages;
DROP POLICY IF EXISTS "Teachers can update messages" ON public.teacher_messages;
DROP POLICY IF EXISTS "Teachers can view their messages" ON public.teacher_messages;

CREATE POLICY "Students can send messages" ON public.teacher_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view their messages" ON public.teacher_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Teachers can update messages" ON public.teacher_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);

-- Fix RLS on chat_conversations: allow updating last_message_at
DROP POLICY IF EXISTS "Participants can update conversations" ON public.chat_conversations;
CREATE POLICY "Participants can update conversations" ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = teacher_id);
