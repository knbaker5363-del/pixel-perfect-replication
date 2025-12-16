-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow system/admin to create notifications
CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create storage bucket for proof documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-documents', 'proof-documents', false);

-- Storage policies for proof-documents bucket
CREATE POLICY "Users can upload their own proof documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proof-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proof documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'proof-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all proof documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'proof-documents' AND has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification when teacher application status changes
CREATE OR REPLACE FUNCTION public.notify_teacher_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for teacher application status changes
CREATE TRIGGER on_teacher_application_status_change
AFTER UPDATE ON public.teacher_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_teacher_application_status();