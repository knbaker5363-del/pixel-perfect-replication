import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Star, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen,
  GraduationCap,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { TeacherReviews } from '@/components/teacher/TeacherReviews';
import { ContactTeacherDialog } from '@/components/sessions/ContactTeacherDialog';
import { cn } from '@/lib/utils';

interface TeacherData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education_place: string | null;
  university: { name: string } | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price: number;
  is_free: boolean;
  max_students: number;
  subjects: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface ReviewStats {
  average: number;
  count: number;
}

export default function TeacherProfile() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ average: 0, count: 0 });
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      teacherProfile: 'بروفايل المعلم',
      notFound: 'المعلم غير موجود',
      backToSessions: 'العودة للجلسات',
      about: 'نبذة',
      sessions: 'الجلسات',
      subjects: 'المواد',
      reviews: 'التقييمات',
      upcomingSessions: 'الجلسات القادمة',
      noSessions: 'لا توجد جلسات قادمة',
      noSubjects: 'لا توجد مواد',
      noBio: 'لا توجد نبذة',
      free: 'مجانية',
      minutes: 'دقيقة',
      maxStudents: 'طالب كحد أقصى',
      enroll: 'التسجيل',
      enrolled: 'مسجّل ✓',
      contact: 'تواصل',
      rating: 'التقييم',
      reviewsCount: 'تقييم',
      sessionsCount: 'جلسة',
      subjectsCount: 'مادة',
      university: 'الجامعة',
      education: 'مكان الدراسة',
      loginToEnroll: 'سجل دخولك للتسجيل',
      alreadyEnrolled: 'أنت مسجل بالفعل',
      enrollSuccess: 'تم التسجيل بنجاح',
      enrollError: 'حدث خطأ أثناء التسجيل',
    },
    en: {
      teacherProfile: 'Teacher Profile',
      notFound: 'Teacher not found',
      backToSessions: 'Back to Sessions',
      about: 'About',
      sessions: 'Sessions',
      subjects: 'Subjects',
      reviews: 'Reviews',
      upcomingSessions: 'Upcoming Sessions',
      noSessions: 'No upcoming sessions',
      noSubjects: 'No subjects',
      noBio: 'No bio available',
      free: 'Free',
      minutes: 'minutes',
      maxStudents: 'max students',
      enroll: 'Enroll',
      enrolled: 'Enrolled ✓',
      contact: 'Contact',
      rating: 'Rating',
      reviewsCount: 'reviews',
      sessionsCount: 'sessions',
      subjectsCount: 'subjects',
      university: 'University',
      education: 'Education',
      loginToEnroll: 'Login to enroll',
      alreadyEnrolled: 'Already enrolled',
      enrollSuccess: 'Enrolled successfully',
      enrollError: 'Enrollment failed',
    },
  };

  const text = t[language];

  useEffect(() => {
    if (!teacherId) return;
    fetchTeacherData();
  }, [teacherId, user]);

  const fetchTeacherData = async () => {
    if (!teacherId) return;

    // Fetch teacher profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        avatar_url,
        bio,
        education_place,
        university:university_id (name)
      `)
      .eq('user_id', teacherId)
      .maybeSingle();

    if (profileData) {
      setTeacher(profileData as unknown as TeacherData);
    }

    // Fetch upcoming sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        price,
        is_free,
        max_students,
        subjects (name)
      `)
      .eq('teacher_id', teacherId)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(5);

    if (sessionsData) {
      setSessions(sessionsData as unknown as Session[]);
    }

    // Fetch subjects taught by this teacher
    const { data: teacherSessions } = await supabase
      .from('sessions')
      .select('subject_id')
      .eq('teacher_id', teacherId);

    if (teacherSessions) {
      const subjectIds = [...new Set(teacherSessions.map(s => s.subject_id))];
      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id, name, description')
          .in('id', subjectIds);

        if (subjectsData) {
          setSubjects(subjectsData);
        }
      }
    }

    // Fetch review stats
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('teacher_id', teacherId);

    if (reviewsData && reviewsData.length > 0) {
      const total = reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0);
      setReviewStats({
        average: total / reviewsData.length,
        count: reviewsData.length,
      });
    }

    // Fetch user enrollments
    if (user) {
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .eq('student_id', user.id);

      if (enrollments) {
        setEnrolledIds(enrollments.map(e => e.session_id));
      }
    }

    setLoading(false);
  };

  const handleEnroll = async (sessionId: string) => {
    if (!user) {
      toast.error(text.loginToEnroll);
      return;
    }

    const { error } = await supabase
      .from('session_enrollments')
      .insert({ session_id: sessionId, student_id: user.id });

    if (error) {
      if (error.code === '23505') {
        toast.error(text.alreadyEnrolled);
      } else {
        toast.error(text.enrollError);
      }
    } else {
      toast.success(text.enrollSuccess);
      setEnrolledIds([...enrolledIds, sessionId]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">{text.notFound}</h2>
        <Button asChild variant="outline">
          <Link to="/sessions">{text.backToSessions}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="w-24 h-24 mx-auto md:mx-0">
              <AvatarImage src={teacher.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-start">
              <h1 className="text-2xl font-bold mb-2">
                {teacher.full_name || (language === 'ar' ? 'معلم' : 'Teacher')}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
                {reviewStats.count > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{reviewStats.average.toFixed(1)}</span>
                    <span>({reviewStats.count} {text.reviewsCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{sessions.length} {text.sessionsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{subjects.length} {text.subjectsCount}</span>
                </div>
              </div>

              {(teacher.university || teacher.education_place) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  {teacher.university && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span>{teacher.university.name}</span>
                    </div>
                  )}
                  {teacher.education_place && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span>{teacher.education_place}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {user && user.id !== teacherId && (
                <ContactTeacherDialog
                  teacherId={teacherId!}
                  teacherName={teacher.full_name || (language === 'ar' ? 'المعلم' : 'Teacher')}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="sessions">{text.sessions}</TabsTrigger>
          <TabsTrigger value="subjects">{text.subjects}</TabsTrigger>
          <TabsTrigger value="reviews">{text.reviews}</TabsTrigger>
          <TabsTrigger value="about">{text.about}</TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{text.upcomingSessions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">{text.noSessions}</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        <Badge variant={session.is_free ? 'secondary' : 'default'}>
                          {session.is_free ? text.free : `$${session.price}`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {session.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(session.scheduled_at), 'dd MMM yyyy', {
                            locale: language === 'ar' ? arLocale : undefined,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(session.scheduled_at), 'HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {session.max_students} {text.maxStudents}
                        </span>
                        {session.subjects && (
                          <Badge variant="outline" className="text-xs">
                            {session.subjects.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {enrolledIds.includes(session.id) ? (
                        <Badge variant="outline">{text.enrolled}</Badge>
                      ) : user?.id === teacherId ? null : (
                        <Button size="sm" onClick={() => handleEnroll(session.id)}>
                          {text.enroll}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {subjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">{text.noSubjects}</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      to={`/subjects/${subject.id}/group`}
                      className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{subject.name}</h3>
                          {subject.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {subject.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-4">
          <TeacherReviews teacherId={teacherId!} />
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {teacher.bio || text.noBio}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
