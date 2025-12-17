-- Create scheduled_reminders table for session reminders
CREATE TABLE public.scheduled_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- '24h_before', '1h_before'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders" ON public.scheduled_reminders
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert reminders (via trigger with SECURITY DEFINER)
CREATE POLICY "System can manage reminders" ON public.scheduled_reminders
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to notify student on enrollment
CREATE OR REPLACE FUNCTION public.notify_session_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
  teacher_name TEXT;
BEGIN
  -- Get session details
  SELECT s.*, sub.name as subject_name
  INTO session_record
  FROM sessions s
  LEFT JOIN subjects sub ON s.subject_id = sub.id
  WHERE s.id = NEW.session_id;

  -- Get teacher name
  SELECT full_name INTO teacher_name
  FROM profiles
  WHERE user_id = session_record.teacher_id;

  -- Create enrollment confirmation notification for student
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.student_id,
    'session_enrolled',
    'تم التسجيل في الجلسة',
    'تم تسجيلك في جلسة "' || session_record.title || '" مع المعلم ' || COALESCE(teacher_name, 'غير محدد') || ' بتاريخ ' || TO_CHAR(session_record.scheduled_at, 'DD/MM/YYYY HH24:MI'),
    NEW.session_id
  );

  -- Create notification for teacher about new enrollment
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    session_record.teacher_id,
    'new_enrollment',
    'تسجيل جديد في جلستك',
    'طالب جديد سجّل في جلسة "' || session_record.title || '"',
    NEW.session_id
  );

  -- Schedule 24h reminder (if session is more than 24h away)
  IF session_record.scheduled_at > (now() + interval '24 hours') THEN
    INSERT INTO scheduled_reminders (user_id, session_id, reminder_type, scheduled_for)
    VALUES (
      NEW.student_id,
      NEW.session_id,
      '24h_before',
      session_record.scheduled_at - interval '24 hours'
    );
  END IF;

  -- Schedule 1h reminder (if session is more than 1h away)
  IF session_record.scheduled_at > (now() + interval '1 hour') THEN
    INSERT INTO scheduled_reminders (user_id, session_id, reminder_type, scheduled_for)
    VALUES (
      NEW.student_id,
      NEW.session_id,
      '1h_before',
      session_record.scheduled_at - interval '1 hour'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for session enrollment
CREATE TRIGGER on_session_enrollment
  AFTER INSERT ON public.session_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_session_enrollment();

-- Update notifications policy to allow system inserts
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

CREATE POLICY "System and admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);