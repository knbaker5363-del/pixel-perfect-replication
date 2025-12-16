import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Megaphone, FileText, BookOpen, Loader2, Trash2, Calendar, Link as LinkIcon, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  content: string;
  post_type: string;
  created_at: string;
  teacher_id: string;
  session_link?: string | null;
  session_date?: string | null;
  profiles?: { full_name: string | null };
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

export default function SubjectGroup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'update',
    session_link: '',
    session_date: '',
  });

  const isTeacher = hasRole('teacher');

  useEffect(() => {
    if (id) {
      fetchSubjectAndPosts();
      subscribeToUpdates();
    }
  }, [id]);

  const fetchSubjectAndPosts = async () => {
    try {
      // Fetch subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('subject_posts')
        .select('*')
        .eq('subject_id', id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch teacher profiles
      if (postsData && postsData.length > 0) {
        const teacherIds = [...new Set(postsData.map(p => p.teacher_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherIds);

        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profiles?.find(p => p.user_id === post.teacher_id),
        }));

        setPosts(postsWithProfiles);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('subject-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subject_posts',
          filter: `subject_id=eq.${id}`,
        },
        () => {
          fetchSubjectAndPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setSubmitting(true);
    try {
      const insertData: any = {
        subject_id: id,
        teacher_id: user.id,
        title: newPost.title,
        content: newPost.content,
        post_type: newPost.post_type,
      };
      
      if (newPost.post_type === 'schedule' && newPost.session_link) {
        insertData.session_link = newPost.session_link;
        insertData.session_date = newPost.session_date || null;
      }

      const { error } = await supabase
        .from('subject_posts')
        .insert(insertData);

      if (error) throw error;

      toast.success(t.common.success);
      setNewPost({ title: '', content: '', post_type: 'update', session_link: '', session_date: '' });
      setShowForm(false);
      fetchSubjectAndPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('subject_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success(t.common.success);
      fetchSubjectAndPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t.common.error);
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'resource':
        return <BookOpen className="h-4 w-4" />;
      case 'schedule':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPostBadgeVariant = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'default';
      case 'resource':
        return 'secondary';
      case 'schedule':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Subject not found</p>
        <Button variant="link" onClick={() => navigate('/subjects')}>
          Back to subjects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/subjects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{subject.name}</h1>
            <p className="text-muted-foreground">{t.groups.title}</p>
          </div>
        </div>
        {isTeacher && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 me-2" />
            {t.groups.newPost}
          </Button>
        )}
      </div>

      {/* New Post Form */}
      {showForm && isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>{t.groups.newPost}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.postTitle}</label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.postContent}</label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.postType}</label>
                <Select
                  value={newPost.post_type}
                  onValueChange={(value) => setNewPost({ ...newPost, post_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">{t.groups.update}</SelectItem>
                    <SelectItem value="announcement">{t.groups.announcement}</SelectItem>
                    <SelectItem value="resource">{t.groups.resource}</SelectItem>
                    <SelectItem value="schedule">{language === 'ar' ? 'جدول حصة' : 'Session Schedule'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPost.post_type === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      {language === 'ar' ? 'رابط الجلسة (Zoom)' : 'Session Link (Zoom)'}
                    </label>
                    <Input
                      value={newPost.session_link}
                      onChange={(e) => setNewPost({ ...newPost, session_link: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {language === 'ar' ? 'موعد الجلسة' : 'Session Date'}
                    </label>
                    <Input
                      type="datetime-local"
                      value={newPost.session_date}
                      onChange={(e) => setNewPost({ ...newPost, session_date: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.groups.publish}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t.groups.noPosts}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPostBadgeVariant(post.post_type)}>
                      {getPostIcon(post.post_type)}
                      <span className="ms-1">
                        {post.post_type === 'announcement' && t.groups.announcement}
                        {post.post_type === 'update' && t.groups.update}
                        {post.post_type === 'resource' && t.groups.resource}
                        {post.post_type === 'schedule' && (language === 'ar' ? 'جدول حصة' : 'Schedule')}
                      </span>
                    </Badge>
                  </div>
                  {user?.id === post.teacher_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-lg">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                
                {/* Session Link for schedule posts */}
                {post.post_type === 'schedule' && post.session_link && (
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                    {post.session_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {new Date(post.session_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      <a 
                        href={post.session_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm truncate flex-1"
                        dir="ltr"
                      >
                        {post.session_link}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(post.session_link || '');
                          toast.success(language === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <span>{t.groups.postedBy}: {post.profiles?.full_name || 'Unknown'}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: language === 'ar' ? ar : enUS,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}