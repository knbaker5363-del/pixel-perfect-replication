import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, GraduationCap, FileText, Loader2, CheckCircle, XCircle, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface TeacherApplication {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  proof_url: string;
  profiles: { full_name: string | null } | null;
  subjects: { name: string } | null;
}

interface SubjectProposal {
  id: string;
  name: string;
  description: string | null;
  proposed_by: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

export function AdminDashboard() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalSubjects: 0,
    pendingApplications: 0,
    pendingSubjects: 0,
  });
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [subjectProposals, setSubjectProposals] = useState<SubjectProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch role counts
      const { data: roleCounts } = await supabase
        .from('user_roles')
        .select('role');
      
      const teachers = roleCounts?.filter(r => r.role === 'teacher').length || 0;
      const students = roleCounts?.filter(r => r.role === 'student').length || 0;
      
      // Fetch total users (unique)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch approved subjects count
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch pending applications count
      const { count: pendingCount } = await supabase
        .from('teacher_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch pending subjects count
      const { count: pendingSubjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: usersCount || 0,
        totalTeachers: teachers,
        totalStudents: students,
        totalSubjects: subjectsCount || 0,
        pendingApplications: pendingCount || 0,
        pendingSubjects: pendingSubjectsCount || 0,
      });

      // Fetch pending applications with details
      const { data: applicationsData } = await supabase
        .from('teacher_applications')
        .select(`
          *,
          profiles:user_id(full_name),
          subjects:subject_id(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setApplications((applicationsData as unknown as TeacherApplication[]) || []);

      // Fetch pending subject proposals
      const { data: proposalsData } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          description,
          proposed_by,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch proposer profiles separately
      if (proposalsData && proposalsData.length > 0) {
        const proposerIds = proposalsData.map(p => p.proposed_by).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', proposerIds);

        const proposalsWithProfiles = proposalsData.map(proposal => ({
          ...proposal,
          profiles: profiles?.find(p => p.user_id === proposal.proposed_by) || null,
        }));

        setSubjectProposals(proposalsWithProfiles as SubjectProposal[]);
      } else {
        setSubjectProposals([]);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplication = async (applicationId: string, userId: string, status: 'approved' | 'rejected') => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('teacher_applications')
        .update({ status })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If approved, add teacher role
      if (status === 'approved') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'teacher' });

        if (roleError && !roleError.message.includes('duplicate')) {
          throw roleError;
        }
      }

      toast.success(status === 'approved' ? t.admin.applicationApproved : t.admin.applicationRejected);
      fetchData();
    } catch (error) {
      console.error('Error handling application:', error);
      toast.error(t.common.error);
    }
  };

  const handleSubjectProposal = async (subjectId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ status })
        .eq('id', subjectId);

      if (error) throw error;

      toast.success(status === 'approved' ? t.admin.subjectApproved : t.admin.subjectRejected);
      fetchData();
    } catch (error) {
      console.error('Error handling subject proposal:', error);
      toast.error(t.common.error);
    }
  };

  const statCards = [
    { title: t.admin.totalUsers, value: stats.totalUsers, icon: Users },
    { title: t.admin.totalTeachers, value: stats.totalTeachers, icon: GraduationCap },
    { title: t.admin.totalStudents, value: stats.totalStudents, icon: UserCheck },
    { title: t.admin.totalSubjects, value: stats.totalSubjects, icon: BookOpen },
    { title: t.admin.pendingApplications, value: stats.pendingApplications, icon: Clock },
    { title: t.admin.pendingSubjects, value: stats.pendingSubjects, icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.dashboard}</h1>
        <p className="text-muted-foreground">{t.admin.statistics}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teacher Applications */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t.admin.teacherApplications}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t.admin.noApplications}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{app.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{app.subjects?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(app.created_at), 'dd MMM yyyy', { locale: language === 'ar' ? ar : enUS })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={app.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {language === 'ar' ? 'عرض الإثبات' : 'View Proof'}
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplication(app.id, app.user_id, 'approved')}
                    >
                      <CheckCircle className="h-4 w-4 me-1" />
                      {t.admin.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplication(app.id, app.user_id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 me-1" />
                      {t.admin.reject}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Proposals */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t.admin.subjectProposals}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjectProposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t.admin.noProposals}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectProposals.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{proposal.name}</p>
                    {proposal.description && (
                      <p className="text-sm text-muted-foreground">{proposal.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.groups.postedBy}: {proposal.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubjectProposal(proposal.id, 'approved')}
                    >
                      <CheckCircle className="h-4 w-4 me-1" />
                      {t.admin.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubjectProposal(proposal.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 me-1" />
                      {t.admin.reject}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}