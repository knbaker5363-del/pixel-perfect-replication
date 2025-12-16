import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  sessions: { title: string } | null;
}

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;

      // Get enrolled session IDs
      const { data: enrollments } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .eq('student_id', user.id);

      if (enrollments && enrollments.length > 0) {
        const sessionIds = enrollments.map(e => e.session_id);

        const { data } = await supabase
          .from('assignments')
          .select(`
            *,
            sessions (title)
          `)
          .in('session_id', sessionIds)
          .order('due_date', { ascending: true });

        if (data) {
          setAssignments(data as unknown as Assignment[]);
        }
      }

      setLoading(false);
    };

    fetchAssignments();
  }, [user]);

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">الواجبات</h1>
        <p className="text-muted-foreground mt-1">
          واجباتك من الجلسات المسجّل فيها
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      {assignment.due_date && (
                        <Badge variant={isOverdue(assignment.due_date) ? 'destructive' : 'secondary'}>
                          {isOverdue(assignment.due_date) ? 'متأخر' : 'قادم'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.description || 'لا يوجد وصف'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {assignment.sessions && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {assignment.sessions.title}
                        </span>
                      )}
                      {assignment.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(assignment.due_date), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">لا توجد واجبات</p>
          <p className="text-sm mt-2">سجّل في جلسات لتظهر واجباتك هنا</p>
        </div>
      )}
    </div>
  );
}
