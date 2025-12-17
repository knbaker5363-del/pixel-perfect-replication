-- Create subject subscriptions table
CREATE TABLE public.subject_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'points' CHECK (payment_type IN ('points', 'money')),
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(subject_id, student_id)
);

-- Create subject prices table
CREATE TABLE public.subject_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE UNIQUE,
  points_price INTEGER DEFAULT 50,
  money_price NUMERIC DEFAULT 10,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subject_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subject_subscriptions
CREATE POLICY "Students can subscribe"
ON public.subject_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own subscriptions"
ON public.subject_subscriptions
FOR SELECT
USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can cancel own subscriptions"
ON public.subject_subscriptions
FOR UPDATE
USING (auth.uid() = student_id);

-- RLS Policies for subject_prices
CREATE POLICY "Anyone can view prices"
ON public.subject_prices
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage prices"
ON public.subject_prices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can set prices for their subjects"
ON public.subject_prices
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (SELECT 1 FROM subjects WHERE id = subject_id AND proposed_by = auth.uid())
);

CREATE POLICY "Teachers can update prices for their subjects"
ON public.subject_prices
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (SELECT 1 FROM subjects WHERE id = subject_id AND proposed_by = auth.uid())
);

-- Trigger to notify subscribers on new post
CREATE OR REPLACE FUNCTION public.notify_subject_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT 
    ss.student_id,
    'new_subject_content',
    'محتوى جديد في ' || (SELECT name FROM subjects WHERE id = NEW.subject_id),
    'تم نشر: ' || NEW.title,
    NEW.id
  FROM subject_subscriptions ss
  WHERE ss.subject_id = NEW.subject_id
    AND ss.is_active = true
    AND ss.student_id != NEW.teacher_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_subject_post
  AFTER INSERT ON public.subject_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subject_subscribers();

-- Trigger to notify subscribers on new session
CREATE OR REPLACE FUNCTION public.notify_subject_subscribers_new_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  SELECT 
    ss.student_id,
    'new_session_available',
    'جلسة جديدة متاحة',
    'جلسة جديدة: ' || NEW.title,
    NEW.id
  FROM subject_subscriptions ss
  WHERE ss.subject_id = NEW.subject_id
    AND ss.is_active = true
    AND ss.student_id != NEW.teacher_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_session_created
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subject_subscribers_new_session();

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.subject_subscriptions;