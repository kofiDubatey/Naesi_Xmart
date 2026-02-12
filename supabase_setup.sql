
-- NAESI XMART UNIVERSAL CUMULATIVE DATABASE SCRIPT
-- RUN THIS IN A CLEAN SQL EDITOR WINDOW

-- 1. BASE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text,
  avatar text,
  title text,
  bio text,
  role text DEFAULT 'student',
  points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- REPAIR PROFILES TABLE (Ensure email and other columns exist if table was created earlier)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='points') THEN
    ALTER TABLE public.profiles ADD COLUMN points integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='title') THEN
    ALTER TABLE public.profiles ADD COLUMN title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
  END IF;
END $$;

-- 2. COURSES TABLE REPAIR
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='academicYear') THEN
    ALTER TABLE public.courses RENAME COLUMN "academicYear" TO academic_year;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='academic_year') THEN
    ALTER TABLE public.courses ADD COLUMN academic_year text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='description') THEN
    ALTER TABLE public.courses ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='code') THEN
    ALTER TABLE public.courses ADD COLUMN code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='progress') THEN
    ALTER TABLE public.courses ADD COLUMN progress integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='image') THEN
    ALTER TABLE public.courses ADD COLUMN image text;
  END IF;
END $$;

-- 3. MATERIALS TABLE REPAIR
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='courseId') THEN
    ALTER TABLE public.materials RENAME COLUMN "courseId" TO course_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='type') THEN
    ALTER TABLE public.materials ADD COLUMN type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='content') THEN
    ALTER TABLE public.materials ADD COLUMN content text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='file_url') THEN
    ALTER TABLE public.materials ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='date') THEN
    ALTER TABLE public.materials ADD COLUMN date text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='bookmarked') THEN
    ALTER TABLE public.materials ADD COLUMN bookmarked boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='reminder_time') THEN
    ALTER TABLE public.materials ADD COLUMN reminder_time text;
  END IF;
END $$;

-- 4. QUIZZES TABLE REPAIR
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='courseId') THEN
    ALTER TABLE public.quizzes RENAME COLUMN "courseId" TO course_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='completed') THEN
    ALTER TABLE public.quizzes ADD COLUMN completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='score') THEN
    ALTER TABLE public.quizzes ADD COLUMN score numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='user_answers') THEN
    ALTER TABLE public.quizzes ADD COLUMN user_answers jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='current_index') THEN
    ALTER TABLE public.quizzes ADD COLUMN current_index integer DEFAULT 0;
  END IF;
END $$;

-- 5. GROUPS & PEER SYNC ARCHITECTURE
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  admin_id uuid REFERENCES auth.users(id),
  members integer DEFAULT 1,
  active_challenge boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  -- Repair adminId to admin_id if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='adminId') THEN
    ALTER TABLE public.groups RENAME COLUMN "adminId" TO admin_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='active_quiz_id') THEN
    ALTER TABLE public.groups ADD COLUMN active_quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text,
  text text,
  is_admin boolean DEFAULT false,
  timestamp timestamp with time zone DEFAULT now()
);

-- 6. ADDITIONAL SUPPORT TABLES
CREATE TABLE IF NOT EXISTS public.study_guides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  title text,
  learning_path jsonb,
  concept_breakdown jsonb,
  practice_questions jsonb,
  clinical_scenarios jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  date text,
  time text,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text,
  history jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. SECURITY & ROW LEVEL ACCESS (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Clean up old policies to avoid duplicates
    DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users manage own courses" ON public.courses;
    DROP POLICY IF EXISTS "Users manage own materials" ON public.materials;
    DROP POLICY IF EXISTS "Users manage own quizzes" ON public.quizzes;
    DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
    DROP POLICY IF EXISTS "Anyone can create groups" ON public.groups;
    DROP POLICY IF EXISTS "Group members view members" ON public.group_members;
    DROP POLICY IF EXISTS "Anyone can join groups" ON public.group_members;
    DROP POLICY IF EXISTS "Group members view messages" ON public.messages;
    DROP POLICY IF EXISTS "Group members send messages" ON public.messages;
    DROP POLICY IF EXISTS "Users manage own study guides" ON public.study_guides;
    DROP POLICY IF EXISTS "Users manage own events" ON public.events;
    DROP POLICY IF EXISTS "Users manage own discussions" ON public.discussions;
END $$;

-- 8. APPLY NEW POLICIES
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own courses" ON public.courses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Anyone can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Group members view members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Group members view messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Group members send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users manage own study guides" ON public.study_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own events" ON public.events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own discussions" ON public.discussions FOR ALL USING (auth.uid() = user_id);

-- 9. NOTIFY SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
