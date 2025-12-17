import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Calendar, DollarSign, BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Stats {
  totalUsers: number;
  totalSessions: number;
  totalRevenue: number;
  totalSubjects: number;
  newUsersToday: number;
  sessionsThisWeek: number;
}

interface ChartData {
  date: string;
  users: number;
  sessions: number;
  revenue: number;
}

interface SubjectData {
  name: string;
  subscribers: number;
}

export default function AdminAnalytics() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSessions: 0,
    totalRevenue: 0,
    totalSubjects: 0,
    newUsersToday: 0,
    sessionsThisWeek: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b'];

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      // Fetch basic stats
      const [usersRes, sessionsRes, earningsRes, subjectsRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at', { count: 'exact' }),
        supabase.from('sessions').select('id, created_at, price', { count: 'exact' }),
        supabase.from('teacher_earnings').select('net_amount'),
        supabase.from('subjects').select('id, name', { count: 'exact' }),
      ]);

      // Calculate stats
      const totalRevenue = earningsRes.data?.reduce((sum, e) => sum + Number(e.net_amount), 0) || 0;
      const newUsersToday = usersRes.data?.filter(u => 
        new Date(u.created_at) >= today
      ).length || 0;
      const sessionsThisWeek = sessionsRes.data?.filter(s => 
        new Date(s.created_at) >= weekAgo
      ).length || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalSessions: sessionsRes.count || 0,
        totalRevenue,
        totalSubjects: subjectsRes.count || 0,
        newUsersToday,
        sessionsThisWeek,
      });

      // Generate chart data for last 30 days
      const days = eachDayOfInterval({ start: monthAgo, end: today });
      const chartDataMap: Record<string, ChartData> = {};
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        chartDataMap[dateStr] = { date: format(day, 'MM/dd'), users: 0, sessions: 0, revenue: 0 };
      });

      usersRes.data?.forEach(user => {
        const dateStr = format(new Date(user.created_at), 'yyyy-MM-dd');
        if (chartDataMap[dateStr]) {
          chartDataMap[dateStr].users++;
        }
      });

      sessionsRes.data?.forEach(session => {
        const dateStr = format(new Date(session.created_at), 'yyyy-MM-dd');
        if (chartDataMap[dateStr]) {
          chartDataMap[dateStr].sessions++;
          chartDataMap[dateStr].revenue += Number(session.price) || 0;
        }
      });

      setChartData(Object.values(chartDataMap));

      // Fetch subject subscription data
      const { data: subscriptionsData } = await supabase
        .from('subject_subscriptions')
        .select('subject_id, subjects(name)')
        .eq('is_active', true);

      const subjectCounts: Record<string, { name: string; count: number }> = {};
      subscriptionsData?.forEach((sub: any) => {
        const subjectName = sub.subjects?.name || 'Unknown';
        if (!subjectCounts[sub.subject_id]) {
          subjectCounts[sub.subject_id] = { name: subjectName, count: 0 };
        }
        subjectCounts[sub.subject_id].count++;
      });

      setSubjectData(
        Object.values(subjectCounts)
          .map(s => ({ name: s.name, subscribers: s.count }))
          .sort((a, b) => b.subscribers - a.subscribers)
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'التحليلات' : 'Analytics'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إحصائيات وتحليلات المنصة' : 'Platform statistics and analytics'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersToday} {language === 'ar' ? 'اليوم' : 'today'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'الجلسات' : 'Sessions'}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.sessionsThisWeek} {language === 'ar' ? 'هذا الأسبوع' : 'this week'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'صافي أرباح المعلمين' : 'Net teacher earnings'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'المواد' : 'Subjects'}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'مادة متاحة' : 'available subjects'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">{language === 'ar' ? 'المستخدمين' : 'Users'}</TabsTrigger>
          <TabsTrigger value="sessions">{language === 'ar' ? 'الجلسات' : 'Sessions'}</TabsTrigger>
          <TabsTrigger value="subjects">{language === 'ar' ? 'المواد' : 'Subjects'}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {language === 'ar' ? 'المستخدمين الجدد (آخر 30 يوم)' : 'New Users (Last 30 Days)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {language === 'ar' ? 'الجلسات (آخر 30 يوم)' : 'Sessions (Last 30 Days)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {language === 'ar' ? 'أكثر المواد اشتراكاً' : 'Most Subscribed Subjects'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="subscribers"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {subjectData.map((subject, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{subject.name}</span>
                      </div>
                      <span className="text-muted-foreground">{subject.subscribers} {language === 'ar' ? 'مشترك' : 'subscribers'}</span>
                    </div>
                  ))}
                  {subjectData.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
