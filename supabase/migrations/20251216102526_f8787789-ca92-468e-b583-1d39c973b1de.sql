-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  zoom_link TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session_enrollments table
CREATE TABLE public.session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (session_id, student_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT,
  notes TEXT,
  grade DECIMAL(5,2),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teacher_applications table
CREATE TABLE public.teacher_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teacher_earnings table
CREATE TABLE public.teacher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10,
  net_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (student_id, session_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: Users can view all profiles, update their own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles: Users can view their own roles, admins can manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Subjects: Anyone can view, admins can manage
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Sessions: Anyone can view, teachers can create/update their own
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Teachers can create sessions" ON public.sessions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = teacher_id);

-- Session enrollments
CREATE POLICY "View own enrollments" ON public.session_enrollments FOR SELECT USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()));
CREATE POLICY "Students can enroll" ON public.session_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can unenroll" ON public.session_enrollments FOR DELETE USING (auth.uid() = student_id);

-- Assignments
CREATE POLICY "View assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Teachers can create assignments" ON public.assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()));
CREATE POLICY "Teachers can update assignments" ON public.assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()));

-- Assignment submissions
CREATE POLICY "View own submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.assignments a JOIN public.sessions s ON a.session_id = s.id WHERE a.id = assignment_id AND s.teacher_id = auth.uid()));
CREATE POLICY "Students can submit" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own submissions" ON public.assignment_submissions FOR UPDATE USING (auth.uid() = student_id);

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

-- Teacher applications
CREATE POLICY "Users can view own applications" ON public.teacher_applications FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply" ON public.teacher_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update applications" ON public.teacher_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Teacher earnings
CREATE POLICY "Teachers can view own earnings" ON public.teacher_earnings FOR SELECT USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'));

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Students can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = student_id);