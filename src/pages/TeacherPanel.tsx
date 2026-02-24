import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  BookOpen, 
  Users, 
  Plus, 
  Mail, 
  Clock, 
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  student_id: string;
  subject: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  student_profile?: { full_name: string | null };
}

interface Subject {
  id: string;
  name: string;
  status: string;
}

export default function TeacherPanel() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposingSubject, setProposingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', objectives: '', syllabus: '', duration_type: 'semester', duration_value: 1, points_price: 50 });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    totalStudents: 0,
    totalSubjects: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch messages
      const { data: messagesData } = await supabase
        .from('teacher_messages')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (messagesData) {
        // Fetch student profiles
        const studentIds = [...new Set(messagesData.map(m => m.student_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        const messagesWithProfiles = messagesData.map(msg => ({
          ...msg,
          student_profile: profiles?.find(p => p.user_id === msg.student_id)
        }));
        setMessages(messagesWithProfiles);
      }

      // Fetch subjects where I'm a teacher (from sessions)
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('subject_id')
        .eq('teacher_id', user.id);

      if (sessionsData) {
        const subjectIds = [...new Set(sessionsData.map(s => s.subject_id))];
        if (subjectIds.length > 0) {
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .in('id', subjectIds);
          setMySubjects(subjectsData || []);
        }
      }

      // Fetch my proposed subjects
      const { data: proposedSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('proposed_by', user.id);

      if (proposedSubjects) {
        setMySubjects(prev => {
          const existingIds = prev.map(s => s.id);
          const newSubjects = proposedSubjects.filter(s => !existingIds.includes(s.id));
          return [...prev, ...newSubjects];
        });
      }

      // Count students enrolled in my sessions
      const { data: mySessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', user.id);

      let uniqueStudents = 0;
      if (mySessions && mySessions.length > 0) {
        const sessionIds = mySessions.map(s => s.id);
        const { data: enrollments } = await supabase
          .from('session_enrollments')
          .select('student_id')
          .in('session_id', sessionIds);
        
        if (enrollments) {
          uniqueStudents = new Set(enrollments.map(e => e.student_id)).size;
        }
      }

      // Calculate stats
      const unreadCount = messagesData?.filter(m => !m.is_read).length || 0;

      setStats({
        unreadMessages: unreadCount,
        totalStudents: uniqueStudents,
        totalSubjects: mySubjects.length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('teacher_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, is_read: true } : m)
      );
      setStats(prev => ({ ...prev, unreadMessages: prev.unreadMessages - 1 }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleProposeSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: subjectData, error } = await supabase
        .from('subjects')
        .insert({
          name: newSubject.name,
          description: newSubject.description,
          proposed_by: user.id,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert price info
      if (subjectData) {
        await supabase.from('subject_prices').insert({
          subject_id: subjectData.id,
          points_price: newSubject.points_price,
          is_free: newSubject.points_price === 0,
        });

        // Update subject with objectives/syllabus (using raw update since types may not be regenerated yet)
        await supabase
          .from('subjects')
          .update({
            objectives: newSubject.objectives || null,
            syllabus: newSubject.syllabus || null,
          } as any)
          .eq('id', subjectData.id);
      }

      toast.success(language === 'ar' ? 'تم إرسال الاقتراح للمراجعة' : 'Proposal submitted for review');
      setNewSubject({ name: '', description: '', objectives: '', syllabus: '', duration_type: 'semester', duration_value: 1, points_price: 50 });
      setProposingSubject(false);
      fetchData();
    } catch (error) {
      console.error('Error proposing subject:', error);
      toast.error(t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {language === 'ar' ? 'لوحة المعلم' : 'Teacher Panel'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إدارة رسائلك ومواداتك' : 'Manage your messages and subjects'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'رسائل غير مقروءة' : 'Unread Messages'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'طالب مسجل' : 'Enrolled Students'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mySubjects.length}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'مادة' : 'Subjects'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">
            <Mail className="h-4 w-4 me-2" />
            {language === 'ar' ? 'الرسائل' : 'Messages'}
            {stats.unreadMessages > 0 && (
              <Badge variant="destructive" className="ms-2">
                {stats.unreadMessages}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="h-4 w-4 me-2" />
            {language === 'ar' ? 'المواد' : 'Subjects'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد رسائل' : 'No messages yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map(msg => (
              <Card key={msg.id} className={!msg.is_read ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={msg.type === 'session_request' ? 'default' : 'secondary'}>
                        {msg.type === 'session_request' 
                          ? (language === 'ar' ? 'طلب جلسة' : 'Session Request')
                          : (language === 'ar' ? 'استفسار' : 'Inquiry')
                        }
                      </Badge>
                      {!msg.is_read && (
                        <Badge variant="destructive">
                          {language === 'ar' ? 'جديد' : 'New'}
                        </Badge>
                      )}
                    </div>
                    {!msg.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(msg.id)}>
                        <Check className="h-4 w-4 me-1" />
                        {language === 'ar' ? 'قراءة' : 'Mark read'}
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-lg">{msg.subject}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{msg.message}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <span>{language === 'ar' ? 'من:' : 'From:'} {msg.student_profile?.full_name || 'Unknown'}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: language === 'ar' ? ar : enUS,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {language === 'ar' ? 'المواد التي أدرسها' : 'My Subjects'}
            </h3>
            <Button onClick={() => setProposingSubject(!proposingSubject)}>
              <Plus className="h-4 w-4 me-2" />
              {language === 'ar' ? 'اقتراح مادة جديدة' : 'Propose New Subject'}
            </Button>
          </div>

          {proposingSubject && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'اقتراح مادة جديدة' : 'Propose New Subject'}</CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'سيتم مراجعة اقتراحك من قبل الإدارة' 
                    : 'Your proposal will be reviewed by admin'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProposeSubject} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'اسم المادة' : 'Subject Name'}
                    </label>
                    <Input
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'الوصف' : 'Description'}
                    </label>
                    <Textarea
                      value={newSubject.description}
                      onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'أهداف المادة' : 'Objectives'}
                    </label>
                    <Textarea
                      value={newSubject.objectives}
                      onChange={(e) => setNewSubject({ ...newSubject, objectives: e.target.value })}
                      placeholder={language === 'ar' ? 'اكتب أهداف المادة...' : 'Write course objectives...'}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'المنهج الدراسي' : 'Syllabus'}
                    </label>
                    <Textarea
                      value={newSubject.syllabus}
                      onChange={(e) => setNewSubject({ ...newSubject, syllabus: e.target.value })}
                      placeholder={language === 'ar' ? 'اكتب المنهج الدراسي...' : 'Write the syllabus...'}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'السعر بالنقاط (0 = مجاني)' : 'Price in points (0 = free)'}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={newSubject.points_price}
                      onChange={(e) => setNewSubject({ ...newSubject, points_price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'ar' ? 'إرسال' : 'Submit')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setProposingSubject(false)}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {mySubjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مواد بعد' : 'No subjects yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {mySubjects.map(subject => (
                <Card key={subject.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{subject.name}</h4>
                          <Badge variant={subject.status === 'approved' ? 'default' : 'secondary'}>
                            {subject.status === 'approved' 
                              ? (language === 'ar' ? 'معتمد' : 'Approved')
                              : (language === 'ar' ? 'قيد المراجعة' : 'Pending')
                            }
                          </Badge>
                        </div>
                      </div>
                      {subject.status === 'approved' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/subjects/${subject.id}/group`}>
                            <ExternalLink className="h-4 w-4 me-2" />
                            {language === 'ar' ? 'المجموعة' : 'Group'}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
