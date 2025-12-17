-- Create storage bucket for subject files
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-files', 'subject-files', true)
ON CONFLICT (id) DO NOTHING;

-- Add file columns to subject_posts table
ALTER TABLE public.subject_posts
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Storage policies for subject-files bucket
CREATE POLICY "Anyone can view subject files"
ON storage.objects FOR SELECT
USING (bucket_id = 'subject-files');

CREATE POLICY "Teachers can upload subject files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subject-files' 
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'subject-files'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'subject-files'
  AND has_role(auth.uid(), 'teacher'::app_role)
);