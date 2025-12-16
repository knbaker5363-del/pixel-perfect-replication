import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
  profiles: { full_name: string | null } | null;
  subjects: { name: string } | null;
  _count?: { enrollments: number };
}

export default function Sessions() {
  const { user, hasRole } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:teacher_id (full_name),
          subjects (name)
        `)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at');

      if (data) {
        setSessions(data as unknown as Session[]);
      }

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

    fetchSessions();
  }, [user]);

  const handleEnroll = async (sessionId: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    const { error } = await supabase
      .from('session_enrollments')
      .insert({ session_id: sessionId, student_id: user.id });

    if (error) {
      if (error.code === '23505') {
        toast.error('أنت مسجل بالفعل في هذه الجلسة');
      } else {
        toast.error('حدث خطأ أثناء التسجيل');
      }
    } else {
      toast.success('تم التسجيل بنجاح');
      setEnrolledIds([...enrolledIds, sessionId]);
    }
  };

  const isTeacher = hasRole('teacher');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الجلسات</h1>
          <p className="text-muted-foreground mt-1">
            الجلسات القادمة المتاحة للتسجيل
          </p>
        </div>
        {isTeacher && (
          <Button asChild>
            <Link to="/sessions/create">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء جلسة
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                      <Badge variant={session.is_free ? 'secondary' : 'default'}>
                        {session.is_free ? 'مجانية' : `$${session.price}`}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.description || 'لا يوجد وصف'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.scheduled_at), 'dd MMM yyyy', { locale: ar })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(session.scheduled_at), 'HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        {session.duration_minutes} دقيقة
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.max_students} طالب كحد أقصى
                      </span>
                    </div>
                    <p className="text-sm">
                      المعلم: <span className="font-medium">{session.profiles?.full_name || 'غير محدد'}</span>
                      {session.subjects && (
                        <span className="text-muted-foreground"> • {session.subjects.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {enrolledIds.includes(session.id) ? (
                      <Badge variant="outline" className="text-sm px-4 py-2">
                        مسجّل ✓
                      </Badge>
                    ) : session.teacher_id === user?.id ? (
                      <Badge variant="secondary" className="text-sm px-4 py-2">
                        جلستك
                      </Badge>
                    ) : (
                      <Button onClick={() => handleEnroll(session.id)}>
                        التسجيل في الجلسة
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">لا توجد جلسات قادمة</p>
        </div>
      )}
    </div>
  );
}
