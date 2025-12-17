import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Video, Plus, Star, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, differenceInMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ContactTeacherDialog } from '@/components/sessions/ContactTeacherDialog';
import { SessionReviewDialog } from '@/components/sessions/SessionReviewDialog';
import { TeacherRatingBadge } from '@/components/teacher/TeacherReviews';

interface Session {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price: number;
  is_free: boolean;
  max_students: number;
  teacher_id: string;
  zoom_link: string | null;
  profiles: { full_name: string | null } | null;
  subjects: { name: string } | null;
  enrollment_count?: number;
}

export default function Sessions() {
  const { user, hasRole } = useAuth();
  const { language } = useLanguage();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  const t = {
    ar: {
      sessions: 'الجلسات',
      upcomingDescription: 'الجلسات القادمة المتاحة للتسجيل',
      pastDescription: 'الجلسات السابقة التي شاركت فيها',
      createSession: 'إنشاء جلسة',
      upcoming: 'القادمة',
      past: 'السابقة',
      free: 'مجانية',
      enrolled: 'مسجّل ✓',
      yourSession: 'جلستك',
      enroll: 'التسجيل في الجلسة',
      noDescription: 'لا يوجد وصف',
      minutes: 'دقيقة',
      maxStudents: 'طالب كحد أقصى',
      teacher: 'المعلم',
      notSpecified: 'غير محدد',
      noUpcoming: 'لا توجد جلسات قادمة',
      noPast: 'لا توجد جلسات سابقة',
      reviewed: 'تم التقييم ✓',
      joinSession: 'دخول الجلسة',
      sessionFull: 'الجلسة ممتلئة',
      enrolledCount: 'مسجل',
      availableSoon: 'الرابط متاح قبل 15 دقيقة',
    },
    en: {
      sessions: 'Sessions',
      upcomingDescription: 'Upcoming sessions available for enrollment',
      pastDescription: 'Past sessions you participated in',
      createSession: 'Create Session',
      upcoming: 'Upcoming',
      past: 'Past',
      free: 'Free',
      enrolled: 'Enrolled ✓',
      yourSession: 'Your Session',
      enroll: 'Enroll',
      noDescription: 'No description',
      minutes: 'minutes',
      maxStudents: 'max students',
      teacher: 'Teacher',
      notSpecified: 'Not specified',
      noUpcoming: 'No upcoming sessions',
      noPast: 'No past sessions',
      reviewed: 'Reviewed ✓',
      joinSession: 'Join Session',
      sessionFull: 'Session Full',
      enrolledCount: 'enrolled',
      availableSoon: 'Link available 15 min before',
    },
  };

  const text = t[language];

  const fetchData = async () => {
    const now = new Date().toISOString();

    // Fetch upcoming sessions with enrollment count
    const { data: upcoming } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles:teacher_id (full_name),
        subjects (name)
      `)
      .gte('scheduled_at', now)
      .order('scheduled_at');

    if (upcoming) {
      // Fetch enrollment counts for each session
      const sessionIds = upcoming.map(s => s.id);
      const { data: enrollmentCounts } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .in('session_id', sessionIds);

      const countMap: Record<string, number> = {};
      enrollmentCounts?.forEach(e => {
        countMap[e.session_id] = (countMap[e.session_id] || 0) + 1;
      });

      const sessionsWithCount = upcoming.map(s => ({
        ...s,
        enrollment_count: countMap[s.id] || 0,
      }));

      setUpcomingSessions(sessionsWithCount as unknown as Session[]);
    }

    // Fetch past sessions the user enrolled in
    if (user) {
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .eq('student_id', user.id);

      if (enrollments) {
        const enrolledSessionIds = enrollments.map(e => e.session_id);
        setEnrolledIds(enrolledSessionIds);

        // Fetch past sessions
        if (enrolledSessionIds.length > 0) {
          const { data: past } = await supabase
            .from('sessions')
            .select(`
              *,
              profiles:teacher_id (full_name),
              subjects (name)
            `)
            .in('id', enrolledSessionIds)
            .lt('scheduled_at', now)
            .order('scheduled_at', { ascending: false });

          if (past) {
            setPastSessions(past as unknown as Session[]);
          }
        }

        // Fetch already reviewed sessions
        const { data: reviews } = await supabase
          .from('reviews')
          .select('session_id')
          .eq('student_id', user.id);

        if (reviews) {
          setReviewedIds(reviews.map(r => r.session_id));
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleEnroll = async (session: Session) => {
    if (!user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    // Check if session is full
    if ((session.enrollment_count || 0) >= session.max_students) {
      toast.error(language === 'ar' ? 'الجلسة ممتلئة' : 'Session is full');
      return;
    }

    const { error } = await supabase
      .from('session_enrollments')
      .insert({ session_id: session.id, student_id: user.id });

    if (error) {
      if (error.code === '23505') {
        toast.error(language === 'ar' ? 'أنت مسجل بالفعل في هذه الجلسة' : 'Already enrolled');
      } else {
        toast.error(language === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Enrollment failed');
      }
    } else {
      toast.success(language === 'ar' ? 'تم التسجيل بنجاح' : 'Enrolled successfully');
      setEnrolledIds([...enrolledIds, session.id]);
      // Update enrollment count locally
      setUpcomingSessions(prev => 
        prev.map(s => 
          s.id === session.id 
            ? { ...s, enrollment_count: (s.enrollment_count || 0) + 1 }
            : s
        )
      );
    }
  };

  const handleReviewSubmitted = () => {
    fetchData();
  };

  const isTeacher = hasRole('teacher');

  const canJoinSession = (session: Session) => {
    const sessionTime = new Date(session.scheduled_at);
    const now = new Date();
    const minutesUntilSession = differenceInMinutes(sessionTime, now);
    // Allow joining 15 minutes before and during the session
    return minutesUntilSession <= 15 && minutesUntilSession >= -session.duration_minutes;
  };

  const renderSessionCard = (session: Session, isPast: boolean = false) => {
    const isFull = (session.enrollment_count || 0) >= session.max_students;
    const isEnrolled = enrolledIds.includes(session.id);
    const isOwner = session.teacher_id === user?.id;
    const showJoinButton = (isEnrolled || isOwner) && session.zoom_link && canJoinSession(session);

    return (
      <Card key={session.id} className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{session.title}</h3>
                <Badge variant={session.is_free ? 'secondary' : 'default'}>
                  {session.is_free ? text.free : `$${session.price}`}
                </Badge>
                {isPast && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {language === 'ar' ? 'منتهية' : 'Completed'}
                  </Badge>
                )}
                {!isPast && isFull && (
                  <Badge variant="destructive">
                    {text.sessionFull}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {session.description || text.noDescription}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(session.scheduled_at), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(session.scheduled_at), 'HH:mm')}
                </span>
                <span className="flex items-center gap-1">
                  <Video className="w-4 h-4" />
                  {session.duration_minutes} {text.minutes}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className={isFull ? 'text-destructive font-medium' : ''}>
                    {session.enrollment_count || 0}/{session.max_students}
                  </span>
                  {text.enrolledCount}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>{text.teacher}:</span>
                <Link 
                  to={`/teacher/${session.teacher_id}`}
                  className="font-medium hover:text-primary hover:underline transition-colors"
                >
                  {session.profiles?.full_name || text.notSpecified}
                </Link>
                <TeacherRatingBadge teacherId={session.teacher_id} />
                {session.subjects && (
                  <span className="text-muted-foreground">• {session.subjects.name}</span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2">
              {isPast ? (
                // Past session - show review button
                reviewedIds.includes(session.id) ? (
                  <Badge variant="outline" className="text-sm px-4 py-2">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {text.reviewed}
                  </Badge>
                ) : session.teacher_id !== user?.id ? (
                  <SessionReviewDialog
                    sessionId={session.id}
                    sessionTitle={session.title}
                    teacherId={session.teacher_id}
                    onReviewSubmitted={handleReviewSubmitted}
                  />
                ) : null
              ) : (
                // Upcoming session - show enroll/join buttons
                <>
                  {showJoinButton && (
                    <Button asChild variant="default" className="bg-green-600 hover:bg-green-700">
                      <a href={session.zoom_link!} target="_blank" rel="noopener noreferrer">
                        <Video className="w-4 h-4 mr-2" />
                        {text.joinSession}
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </a>
                    </Button>
                  )}
                  
                  {isEnrolled ? (
                    <>
                      <Badge variant="outline" className="text-sm px-4 py-2">
                        {text.enrolled}
                      </Badge>
                      {!showJoinButton && session.zoom_link && (
                        <span className="text-xs text-muted-foreground text-center">
                          {text.availableSoon}
                        </span>
                      )}
                    </>
                  ) : isOwner ? (
                    <>
                      <Badge variant="secondary" className="text-sm px-4 py-2">
                        {text.yourSession}
                      </Badge>
                      {showJoinButton && (
                        <Button asChild variant="outline" size="sm">
                          <a href={session.zoom_link!} target="_blank" rel="noopener noreferrer">
                            <Video className="w-4 h-4 mr-2" />
                            {text.joinSession}
                          </a>
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      onClick={() => handleEnroll(session)}
                      disabled={isFull}
                    >
                      {isFull ? text.sessionFull : text.enroll}
                    </Button>
                  )}
                  
                  {!isOwner && user && (
                    <ContactTeacherDialog
                      teacherId={session.teacher_id}
                      teacherName={session.profiles?.full_name || text.teacher}
                      sessionTitle={session.title}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{text.sessions}</h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'upcoming' ? text.upcomingDescription : text.pastDescription}
          </p>
        </div>
        {isTeacher && (
          <Button asChild>
            <Link to="/sessions/create">
              <Plus className="w-4 h-4 ml-2" />
              {text.createSession}
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">{text.upcoming}</TabsTrigger>
          <TabsTrigger value="past">{text.past}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="space-y-4">
              {upcomingSessions.map((session) => renderSessionCard(session, false))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{text.noUpcoming}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : pastSessions.length > 0 ? (
            <div className="space-y-4">
              {pastSessions.map((session) => renderSessionCard(session, true))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{text.noPast}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
