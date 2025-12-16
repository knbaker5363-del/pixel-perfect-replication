import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, CheckCircle, Award, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
}

interface StudentDashboardProps {
  profile: Profile | null;
}

interface SessionWithSubject {
  id: string;
  title: string;
  scheduled_at: string;
  subjects: { name: string } | null;
}

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

export function StudentDashboard({ profile }: StudentDashboardProps) {
  const { user } = useAuth();
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionWithSubject[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch enrolled sessions count
      const { count: enrolled } = await supabase
        .from('session_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id);

      setEnrolledCount(enrolled || 0);

      // Fetch upcoming sessions
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select(`
          session_id,
          sessions (
            id,
            title,
            scheduled_at,
            subjects (name)
          )
        `)
        .eq('student_id', user.id)
        .limit(5);

      if (enrollments) {
        const sessions = enrollments
          .map(e => e.sessions as unknown as SessionWithSubject)
          .filter(s => s && new Date(s.scheduled_at) > new Date())
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        setUpcomingSessions(sessions);
      }

      // Fetch todos
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (todosData) {
        setTodos(todosData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const stats = [
    { 
      title: 'المواد المسجّلة', 
      value: enrolledCount, 
      icon: BookOpen, 
      color: 'text-foreground' 
    },
    { 
      title: 'الجلسات القادمة', 
      value: upcomingSessions.length, 
      icon: Calendar, 
      color: 'text-foreground' 
    },
    { 
      title: 'المهام المتبقية', 
      value: todos.length, 
      icon: CheckCircle, 
      color: 'text-foreground' 
    },
    { 
      title: 'النقاط', 
      value: profile?.points || 0, 
      icon: Award, 
      color: 'text-foreground' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">
          مرحباً، {profile?.full_name || 'طالب'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          إليك نظرة سريعة على نشاطك
        </p>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الجلسات القادمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.subjects?.name}
                      </p>
                    </div>
                    <div className="text-left">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 ml-1" />
                        {format(new Date(session.scheduled_at), 'dd MMM', { locale: ar })}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد جلسات قادمة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Todos */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              المهام
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : todos.length > 0 ? (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <div 
                    key={todo.id}
                    className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                  >
                    <p className="font-medium">{todo.title}</p>
                    {todo.due_date && (
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(todo.due_date), 'dd MMM', { locale: ar })}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد مهام متبقية</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
