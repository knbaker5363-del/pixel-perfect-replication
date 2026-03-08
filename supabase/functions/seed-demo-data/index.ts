import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { action } = await req.json();

  try {
    if (action === 'reset') {
      // Delete demo data in reverse dependency order
      // First get all demo user IDs
      const { data: users } = await supabase.auth.admin.listUsers();
      const demoEmails = [
        ...Array.from({length: 5}, (_, i) => `teacher${i+1}@test.com`),
        ...Array.from({length: 20}, (_, i) => `student${i+1}@test.com`),
      ];
      const demoUserIds = users?.users
        ?.filter((u: any) => demoEmails.includes(u.email || ''))
        .map((u: any) => u.id) || [];

      // Delete demo subjects
      const demoSubjectNames = [
        'JavaScript Basics', 'React for Beginners', 'UI UX Design',
        'Python Fundamentals', 'Database Basics', 'Node.js Advanced',
        'CSS Mastery', 'TypeScript Essentials', 'Data Structures', 'Machine Learning Intro'
      ];
      
      // Get subject IDs
      const { data: subjects } = await supabase.from('subjects').select('id').in('name', demoSubjectNames);
      const subjectIds = subjects?.map(s => s.id) || [];

      if (subjectIds.length > 0) {
        // Delete related data
        await supabase.from('quiz_answers').delete().in('attempt_id', 
          (await supabase.from('quiz_attempts').select('id').in('quiz_id',
            (await supabase.from('quizzes').select('id').in('subject_id', subjectIds)).data?.map(q => q.id) || []
          )).data?.map(a => a.id) || []
        );
        
        const quizIds = (await supabase.from('quizzes').select('id').in('subject_id', subjectIds)).data?.map(q => q.id) || [];
        if (quizIds.length > 0) {
          const questionIds = (await supabase.from('quiz_questions').select('id').in('quiz_id', quizIds)).data?.map(q => q.id) || [];
          if (questionIds.length > 0) {
            await supabase.from('quiz_options').delete().in('question_id', questionIds);
          }
          await supabase.from('quiz_questions').delete().in('quiz_id', quizIds);
          await supabase.from('quiz_attempts').delete().in('quiz_id', quizIds);
        }
        await supabase.from('quizzes').delete().in('subject_id', subjectIds);

        // Delete sessions and related
        const sessionIds = (await supabase.from('sessions').select('id').in('subject_id', subjectIds)).data?.map(s => s.id) || [];
        if (sessionIds.length > 0) {
          await supabase.from('session_enrollments').delete().in('session_id', sessionIds);
          await supabase.from('session_attendance').delete().in('session_id', sessionIds);
          await supabase.from('reviews').delete().in('session_id', sessionIds);
          await supabase.from('teacher_earnings').delete().in('session_id', sessionIds);
          await supabase.from('assignments').delete().in('session_id', sessionIds);
        }
        await supabase.from('sessions').delete().in('subject_id', subjectIds);
        
        await supabase.from('subject_posts').delete().in('subject_id', subjectIds);
        await supabase.from('subject_subscriptions').delete().in('subject_id', subjectIds);
        await supabase.from('subject_prices').delete().in('subject_id', subjectIds);
        await supabase.from('teacher_applications').delete().in('subject_id', subjectIds);
        await supabase.from('subjects').delete().in('id', subjectIds);
      }

      // Delete demo user data
      if (demoUserIds.length > 0) {
        await supabase.from('notifications').delete().in('user_id', demoUserIds);
        await supabase.from('todos').delete().in('user_id', demoUserIds);
        await supabase.from('notes').delete().in('user_id', demoUserIds);
        await supabase.from('user_roles').delete().in('user_id', demoUserIds);
        await supabase.from('profiles').delete().in('user_id', demoUserIds);
        
        // Delete auth users
        for (const uid of demoUserIds) {
          await supabase.auth.admin.deleteUser(uid);
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Demo data reset' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === SEED ACTION ===
    const password = 'Test123!';

    // Helper to create user
    async function createUser(email: string, fullName: string, role: 'teacher' | 'student') {
      // Check if exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === email);
      
      let userId: string;
      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, { password });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
        userId = data.user.id;
      }

      // Ensure role
      await supabase.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
      
      // Update profile name
      await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', userId);

      return userId;
    }

    // Create teachers
    const teacherNames = ['أحمد محمد', 'سارة علي', 'خالد حسن', 'نور الدين', 'فاطمة يوسف'];
    const teacherIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await createUser(`teacher${i+1}@test.com`, teacherNames[i], 'teacher');
      teacherIds.push(id);
    }

    // Create students
    const studentNames = [
      'محمد أحمد', 'ليلى عمر', 'يوسف حسين', 'مريم صالح', 'عمر خالد',
      'هدى محمود', 'كريم طارق', 'جنى سعيد', 'أيمن فهد', 'دينا وليد',
      'سامي ناصر', 'رنا حسام', 'باسل عادل', 'لمى زياد', 'طارق بشير',
      'سلمى ماجد', 'فيصل راشد', 'نادين صلاح', 'حسام كمال', 'ريم عبدالله'
    ];
    const studentIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const id = await createUser(`student${i+1}@test.com`, studentNames[i], 'student');
      studentIds.push(id);
    }

    // Create 10 subjects (approved)
    const subjectData = [
      { name: 'JavaScript Basics', description: 'تعلم أساسيات JavaScript من الصفر', objectives: 'فهم المتغيرات والدوال والمصفوفات', syllabus: 'المتغيرات - الدوال - المصفوفات - الكائنات - DOM' },
      { name: 'React for Beginners', description: 'مقدمة في React لبناء واجهات المستخدم', objectives: 'بناء تطبيقات React كاملة', syllabus: 'Components - Props - State - Hooks - Routing' },
      { name: 'UI UX Design', description: 'تصميم واجهات المستخدم وتجربة المستخدم', objectives: 'تصميم واجهات احترافية', syllabus: 'Figma - Wireframes - Prototyping - User Research' },
      { name: 'Python Fundamentals', description: 'أساسيات لغة بايثون البرمجية', objectives: 'كتابة برامج بايثون', syllabus: 'المتغيرات - الحلقات - الدوال - الملفات - OOP' },
      { name: 'Database Basics', description: 'مقدمة في قواعد البيانات و SQL', objectives: 'إدارة قواعد البيانات', syllabus: 'SQL - Joins - Normalization - Indexes' },
      { name: 'Node.js Advanced', description: 'تطوير الخوادم باستخدام Node.js', objectives: 'بناء REST APIs', syllabus: 'Express - Middleware - Authentication - Deployment' },
      { name: 'CSS Mastery', description: 'إتقان CSS وتقنيات التصميم', objectives: 'تصميم صفحات متجاوبة', syllabus: 'Flexbox - Grid - Animations - Responsive Design' },
      { name: 'TypeScript Essentials', description: 'أساسيات TypeScript', objectives: 'كتابة كود TypeScript', syllabus: 'Types - Interfaces - Generics - Decorators' },
      { name: 'Data Structures', description: 'هياكل البيانات والخوارزميات', objectives: 'حل المسائل البرمجية', syllabus: 'Arrays - Trees - Graphs - Sorting - Searching' },
      { name: 'Machine Learning Intro', description: 'مقدمة في تعلم الآلة', objectives: 'فهم أساسيات ML', syllabus: 'Regression - Classification - Neural Networks' },
    ];

    const subjectIds: string[] = [];
    for (let i = 0; i < subjectData.length; i++) {
      const { data, error } = await supabase.from('subjects').insert({
        ...subjectData[i],
        proposed_by: teacherIds[i % 5],
        status: 'approved',
      }).select('id').single();
      if (error) throw new Error(`Subject error: ${error.message}`);
      subjectIds.push(data.id);
    }

    // Create subject prices
    for (const subjectId of subjectIds) {
      await supabase.from('subject_prices').insert({
        subject_id: subjectId,
        points_price: Math.floor(Math.random() * 100) + 20,
        money_price: Math.floor(Math.random() * 50) + 10,
        is_free: Math.random() > 0.7,
      });
    }

    // Create 3 pending subject proposals
    const pendingSubjects = [
      { name: 'Docker & Kubernetes', description: 'حاويات وإدارة التطبيقات', status: 'pending', proposed_by: teacherIds[0] },
      { name: 'GraphQL Basics', description: 'بديل REST APIs', status: 'pending', proposed_by: teacherIds[1] },
      { name: 'Cybersecurity 101', description: 'أساسيات الأمن السيبراني', status: 'pending', proposed_by: teacherIds[2] },
    ];
    for (const s of pendingSubjects) {
      await supabase.from('subjects').insert(s);
    }

    // Create sessions (2 per subject = 20 sessions)
    const sessionIds: string[] = [];
    for (let i = 0; i < subjectIds.length; i++) {
      for (let j = 0; j < 2; j++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const { data, error } = await supabase.from('sessions').insert({
          subject_id: subjectIds[i],
          teacher_id: teacherIds[i % 5],
          title: `${subjectData[i].name} - الجلسة ${j + 1}`,
          description: `جلسة تعليمية في ${subjectData[i].name}`,
          scheduled_at: futureDate.toISOString(),
          duration_minutes: [60, 90, 120][Math.floor(Math.random() * 3)],
          max_students: 20,
          price: Math.floor(Math.random() * 30) + 5,
          is_free: Math.random() > 0.7,
          zoom_link: 'https://zoom.us/j/demo-session',
        }).select('id').single();
        if (data) sessionIds.push(data.id);
      }
    }

    // Create enrollments (random students in random sessions)
    for (const studentId of studentIds) {
      const numEnrollments = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...sessionIds].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(numEnrollments, shuffled.length); i++) {
        await supabase.from('session_enrollments').insert({
          session_id: shuffled[i],
          student_id: studentId,
        }).select().maybeSingle(); // ignore duplicate errors
      }
    }

    // Create subject subscriptions
    for (const studentId of studentIds) {
      const numSubs = Math.floor(Math.random() * 4) + 1;
      const shuffled = [...subjectIds].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(numSubs, shuffled.length); i++) {
        await supabase.from('subject_subscriptions').insert({
          subject_id: shuffled[i],
          student_id: studentId,
          payment_type: Math.random() > 0.5 ? 'points' : 'money',
          amount_paid: Math.floor(Math.random() * 50),
        }).select().maybeSingle();
      }
    }

    // Create teacher applications (3 pending, 2 approved, 1 rejected)
    const appStatuses = ['pending', 'pending', 'pending', 'approved', 'approved', 'rejected'];
    for (let i = 0; i < 6; i++) {
      // Use random students as applicants
      await supabase.from('teacher_applications').insert({
        user_id: studentIds[i],
        subject_id: subjectIds[i],
        proof_url: 'https://example.com/proof.pdf',
        status: appStatuses[i],
      });
    }

    // Create quizzes (1 per subject)
    for (let i = 0; i < subjectIds.length; i++) {
      const { data: quiz } = await supabase.from('quizzes').insert({
        subject_id: subjectIds[i],
        teacher_id: teacherIds[i % 5],
        title: `اختبار ${subjectData[i].name}`,
        description: `اختبار شامل في ${subjectData[i].name}`,
        duration_minutes: 30,
        passing_score: 60,
        is_active: true,
      }).select('id').single();

      if (quiz) {
        // 5 questions per quiz
        for (let q = 0; q < 5; q++) {
          const { data: question } = await supabase.from('quiz_questions').insert({
            quiz_id: quiz.id,
            question_text: `سؤال ${q + 1} في ${subjectData[i].name}؟`,
            question_order: q,
            points: 2,
          }).select('id').single();

          if (question) {
            // 4 options per question
            for (let o = 0; o < 4; o++) {
              await supabase.from('quiz_options').insert({
                question_id: question.id,
                option_text: `الخيار ${o + 1}`,
                option_order: o,
                is_correct: o === 0, // first option is correct
              });
            }
          }
        }
      }
    }

    // Create subject posts
    for (let i = 0; i < subjectIds.length; i++) {
      await supabase.from('subject_posts').insert({
        subject_id: subjectIds[i],
        teacher_id: teacherIds[i % 5],
        title: `مرحباً بكم في ${subjectData[i].name}`,
        content: `أهلاً وسهلاً بجميع الطلاب في مادة ${subjectData[i].name}. سنبدأ الدروس قريباً.`,
        post_type: 'update',
      });
    }

    // Create some notifications
    for (let i = 0; i < 5; i++) {
      await supabase.from('notifications').insert({
        user_id: studentIds[i],
        type: 'info',
        title: 'مرحباً بك في المنصة',
        message: 'تم تسجيلك بنجاح. ابدأ بتصفح المواد المتاحة.',
      });
    }

    // Create todos for some students
    for (let i = 0; i < 10; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 1);
      await supabase.from('todos').insert({
        user_id: studentIds[i],
        title: [`مراجعة الدرس`, `حل الواجب`, `تحضير للاختبار`, `قراءة المحتوى`][Math.floor(Math.random() * 4)],
        due_date: dueDate.toISOString().split('T')[0],
        completed: Math.random() > 0.7,
      });
    }

    // Create reviews
    for (let i = 0; i < 10; i++) {
      if (sessionIds[i]) {
        // Get session teacher
        const { data: session } = await supabase.from('sessions').select('teacher_id').eq('id', sessionIds[i]).single();
        if (session) {
          await supabase.from('reviews').insert({
            session_id: sessionIds[i],
            student_id: studentIds[i % 20],
            teacher_id: session.teacher_id,
            rating: Math.floor(Math.random() * 3) + 3, // 3-5
            comment: ['ممتاز!', 'جلسة رائعة', 'استفدت كثيراً', 'معلم متميز', 'شكراً جزيلاً'][Math.floor(Math.random() * 5)],
          });
        }
      }
    }

    // Update student points
    for (const studentId of studentIds) {
      await supabase.from('profiles').update({ points: Math.floor(Math.random() * 500) + 50 }).eq('user_id', studentId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo data seeded successfully',
      stats: {
        teachers: teacherIds.length,
        students: studentIds.length,
        subjects: subjectIds.length,
        sessions: sessionIds.length,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
