import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface TeacherApplication {
  id: string;
  user_id: string;
  proof_url: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  subjects: { name: string } | null;
}

export function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [pendingApplications, setPendingApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Fetch total users
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    setTotalUsers(usersCount || 0);

    // Fetch total subjects
    const { count: subjectsCount } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true });

    setTotalSubjects(subjectsCount || 0);

    // Fetch pending applications
    const { data: applications } = await supabase
      .from('teacher_applications')
      .select(`
        *,
        profiles:user_id (full_name),
        subjects (name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (applications) {
      setPendingApplications(applications as unknown as TeacherApplication[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplication = async (applicationId: string, userId: string, approved: boolean) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('teacher_applications')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      if (approved) {
        // Add teacher role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'teacher' });

        if (roleError) throw roleError;
      }

      toast.success(approved ? 'تم قبول الطلب بنجاح' : 'تم رفض الطلب');
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ أثناء معالجة الطلب');
    }
  };

  const stats = [
    { 
      title: 'إجمالي المستخدمين', 
      value: totalUsers, 
      icon: Users, 
      color: 'text-foreground' 
    },
    { 
      title: 'المواد', 
      value: totalSubjects, 
      icon: BookOpen, 
      color: 'text-foreground' 
    },
    { 
      title: 'طلبات معلقة', 
      value: pendingApplications.length, 
      icon: Clock, 
      color: 'text-foreground' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">لوحة تحكم الإدارة</h1>
        <p className="text-muted-foreground mt-1">
          إدارة المنصة والمستخدمين
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Pending Applications */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            طلبات التدريس المعلقة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : pendingApplications.length > 0 ? (
            <div className="space-y-3">
              {pendingApplications.map((application) => (
                <div 
                  key={application.id}
                  className="p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {application.profiles?.full_name || 'مستخدم'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        يريد تدريس: {application.subjects?.name || 'غير محدد'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(application.created_at), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={application.proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        عرض الإثبات
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplication(application.id, application.user_id, false)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApplication(application.id, application.user_id, true)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد طلبات معلقة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
