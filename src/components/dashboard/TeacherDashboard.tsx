import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Star, Users, Plus, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
}

interface TeacherDashboardProps {
  profile: Profile | null;
}

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  price: number;
  is_free: boolean;
}

export function TeacherDashboard({ profile }: TeacherDashboardProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (sessionsData) {
        setSessions(sessionsData);
      }

      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from('teacher_earnings')
        .select('net_amount')
        .eq('teacher_id', user.id);

      if (earningsData) {
        const total = earningsData.reduce((sum, e) => sum + Number(e.net_amount), 0);
        setTotalEarnings(total);
      }

      // Fetch average rating
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('teacher_id', user.id);

      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }

      // Fetch total students
      const { count } = await supabase
        .from('session_enrollments')
        .select('student_id', { count: 'exact', head: true })
        .in('session_id', sessionsData?.map(s => s.id) || []);

      setTotalStudents(count || 0);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const stats = [
    { 
      title: 'الجلسات', 
      value: sessions.length, 
      icon: Calendar, 
      color: 'text-foreground' 
    },
    { 
      title: 'الأرباح', 
      value: `$${totalEarnings}`, 
      icon: DollarSign, 
      color: 'text-foreground' 
    },
    { 
      title: 'التقييم', 
      value: averageRating || '-', 
      icon: Star, 
      color: 'text-foreground' 
    },
    { 
      title: 'الطلاب', 
      value: totalStudents, 
      icon: Users, 
      color: 'text-foreground' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            مرحباً، {profile?.full_name || 'معلم'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            إليك نظرة سريعة على نشاطك التعليمي
          </p>
        </div>
        <Button asChild>
          <Link to="/sessions/create">
            <Plus className="w-4 h-4 ml-2" />
            إنشاء جلسة
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            جلساتي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="p-4 bg-muted/50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(session.scheduled_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </span>
                    </div>
                  </div>
                  <Badge variant={session.is_free ? 'secondary' : 'default'}>
                    {session.is_free ? 'مجانية' : `$${session.price}`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لم تنشئ أي جلسات بعد</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/sessions/create">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء جلسة جديدة
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
