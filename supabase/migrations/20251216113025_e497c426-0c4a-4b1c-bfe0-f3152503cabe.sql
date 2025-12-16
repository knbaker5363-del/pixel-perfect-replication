-- Add status and proposed_by columns to subjects table
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS proposed_by uuid;

-- Update existing subjects to be approved
UPDATE public.subjects SET status = 'approved' WHERE status IS NULL;

-- Create subject_posts table for groups/announcements
CREATE TABLE IF NOT EXISTS public.subject_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  post_type text DEFAULT 'update',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on subject_posts
ALTER TABLE public.subject_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_posts
CREATE POLICY "Anyone can view posts" ON public.subject_posts 
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create posts" ON public.subject_posts 
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) AND auth.uid() = teacher_id
  );

CREATE POLICY "Teachers can update own posts" ON public.subject_posts 
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own posts" ON public.subject_posts 
  FOR DELETE USING (auth.uid() = teacher_id);

-- Update subjects RLS to allow teachers to propose new subjects
CREATE POLICY "Teachers can propose subjects" ON public.subjects 
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    auth.uid() = proposed_by AND 
    status = 'pending'
  );

-- Add realtime for subject_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.subject_posts;