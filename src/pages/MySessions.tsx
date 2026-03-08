import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, ExternalLink, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface MySession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  zoom_link: string | null;
  teacher_id: string;
  profiles: { full_name: string | null } | null;
  subjects: { name: string } | null;
}

export default function MySessions() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchMySessions = async () => {
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .eq('student_id', user.id);

      if (enrollments && enrollments.length > 0) {
        const ids = enrollments.map(e => e.session_id);
        const { data } = await supabase
          .from('sessions')
          .select('*, profiles:teacher_id(full_name), subjects(name)')
          .in('id', ids)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at');

        setSessions((data as unknown as MySession[]) || []);
      }
      setLoading(false);
    };
    fetchMySessions();
  }, [user]);

  const getCountdown = (scheduledAt: string) => {
    const target = new Date(scheduledAt);
    const days = differenceInDays(target, now);
    const hours = differenceInHours(target, now) % 24;
    const minutes = differenceInMinutes(target, now) % 60;

    if (days > 0) return `${days}${language === 'ar' ? 'ي ' : 'd '}${hours}${language === 'ar' ? 'س' : 'h'}`;
    if (hours > 0) return `${hours}${language === 'ar' ? 'س ' : 'h '}${minutes}${language === 'ar' ? 'د' : 'm'}`;
    if (minutes > 0) return `${minutes} ${language === 'ar' ? 'دقيقة' : 'min'}`;
    return language === 'ar' ? 'الآن!' : 'Now!';
  };

  const canJoin = (s: MySession) => {
    const mins = differenceInMinutes(new Date(s.scheduled_at), now);
    return mins <= 15 && mins >= -s.duration_minutes;
  };

  const isLive = (s: MySession) => {
    const mins = differenceInMinutes(new Date(s.scheduled_at), now);
    return mins <= 0 && mins >= -s.duration_minutes;
  };

  const text = {
    ar: { title: 'جلساتي', desc: 'الجلسات المسجل فيها القادمة', noSessions: 'لا توجد جلسات قادمة مسجل فيها', join: 'دخول الجلسة', startsIn: 'تبدأ خلال', live: 'مباشر الآن', teacher: 'المعلم', viewAll: 'جميع الجلسات' },
    en: { title: 'My Sessions', desc: 'Your upcoming enrolled sessions', noSessions: 'No upcoming enrolled sessions', join: 'Join Session', startsIn: 'Starts in', live: 'Live Now', teacher: 'Teacher', viewAll: 'All Sessions' },
  };
  const t = text[language];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.desc}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/sessions">{t.viewAll}</Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{t.noSessions}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <Card key={session.id} className={`border-border/50 ${isLive(session) ? 'ring-2 ring-green-500' : ''}`}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                      {isLive(session) && (
                        <Badge className="bg-green-600 text-white animate-pulse">{t.live}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.scheduled_at), 'dd MMM yyyy HH:mm', { locale: language === 'ar' ? ar : undefined })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {session.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}
                      </span>
                      {session.subjects && <span>• {session.subjects.name}</span>}
                      <span>{t.teacher}: {session.profiles?.full_name || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isLive(session) && (
                      <div className="text-center px-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Timer className="w-4 h-4" />
                          {t.startsIn}
                        </div>
                        <p className="font-bold text-lg">{getCountdown(session.scheduled_at)}</p>
                      </div>
                    )}
                    {canJoin(session) && session.zoom_link && (
                      <Button asChild className="bg-green-600 hover:bg-green-700">
                        <a href={session.zoom_link} target="_blank" rel="noopener noreferrer">
                          <Video className="w-4 h-4 me-2" />
                          {t.join}
                          <ExternalLink className="w-3 h-3 ms-2" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
