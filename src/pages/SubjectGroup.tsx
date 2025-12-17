import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Plus, Megaphone, FileText, BookOpen, Loader2, Trash2, 
  Calendar, Link as LinkIcon, Copy, Upload, File, Download, X, Lock, Coins 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import SubjectSubscribeDialog from '@/components/subjects/SubjectSubscribeDialog';

interface Post {
  id: string;
  title: string;
  content: string;
  post_type: string;
  created_at: string;
  teacher_id: string;
  session_link?: string | null;
  session_date?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  profiles?: { full_name: string | null };
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

interface SubjectPrice {
  points_price: number;
  money_price: number;
  is_free: boolean;
}

export default function SubjectGroup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subjectPrice, setSubjectPrice] = useState<SubjectPrice | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'update',
    session_link: '',
    session_date: '',
  });

  const isTeacher = hasRole('teacher');
  const isAdmin = hasRole('admin');
  const canAccessContent = isTeacher || isAdmin || isSubscribed;
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);

  const texts = {
    ar: {
      attachFile: 'إرفاق ملف',
      removeFile: 'إزالة الملف',
      downloadFile: 'تحميل الملف',
      fileAttached: 'ملف مرفق',
      fileTypes: 'PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX',
      maxSize: 'الحد الأقصى: 10MB',
      uploading: 'جاري رفع الملف...',
      fileTooLarge: 'حجم الملف كبير جداً (الحد الأقصى 10MB)',
      uploadError: 'حدث خطأ أثناء رفع الملف',
      subscribePrompt: 'اشترك في هذه المادة للوصول إلى المحتوى والإشعارات',
      subscribeNow: 'اشتراك الآن',
      points: 'نقطة',
      free: 'مجاني',
    },
    en: {
      attachFile: 'Attach File',
      removeFile: 'Remove File',
      downloadFile: 'Download File',
      fileAttached: 'File Attached',
      fileTypes: 'PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX',
      maxSize: 'Max size: 10MB',
      uploading: 'Uploading file...',
      fileTooLarge: 'File too large (max 10MB)',
      uploadError: 'Error uploading file',
      subscribePrompt: 'Subscribe to this subject to access content and notifications',
      subscribeNow: 'Subscribe Now',
      points: 'points',
      free: 'Free',
    },
  };

  const txt = texts[language];

  useEffect(() => {
    if (id) {
      fetchSubjectAndPosts();
      subscribeToUpdates();
    }
  }, [id]);

  const fetchSubjectAndPosts = async () => {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch price
      const { data: priceData } = await supabase
        .from('subject_prices')
        .select('points_price, money_price, is_free')
        .eq('subject_id', id)
        .maybeSingle();
      
      setSubjectPrice(priceData || { points_price: 50, money_price: 10, is_free: false });

      // Check subscription status
      if (user) {
        const { data: subData } = await supabase
          .from('subject_subscriptions')
          .select('id')
          .eq('subject_id', id)
          .eq('student_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        setIsSubscribed(!!subData);

        // Get user points
        const { data: profileData } = await supabase
          .from('profiles')
          .select('points')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserPoints(profileData?.points || 0);
      }

      const { data: postsData, error: postsError } = await supabase
        .from('subject_posts')
        .select('*')
        .eq('subject_id', id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(txt.fileTooLarge);
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (): Promise<{ url: string; name: string; type: string; size: number } | null> => {
    if (!selectedFile || !user) return null;

    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('subject-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('subject-files')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        name: selectedFile.name,
        type: selectedFile.type || fileExt || 'unknown',
        size: selectedFile.size,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(txt.uploadError);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setSubmitting(true);
    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile();
      }

      const insertData = {
        subject_id: id,
        teacher_id: user.id,
        title: newPost.title,
        content: newPost.content,
        post_type: newPost.post_type,
        session_link: newPost.post_type === 'schedule' ? newPost.session_link || null : null,
        session_date: newPost.post_type === 'schedule' ? newPost.session_date || null : null,
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
        file_size: fileData?.size || null,
      };

      const { error } = await supabase
        .from('subject_posts')
        .insert(insertData);

      if (error) throw error;

      toast.success(t.common.success);
      setNewPost({ title: '', content: '', post_type: 'update', session_link: '', session_date: '' });
      setSelectedFile(null);
      setShowForm(false);
      fetchSubjectAndPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string, fileUrl?: string | null) => {
    try {
      // Delete file from storage if exists
      if (fileUrl) {
        const filePath = fileUrl.split('/subject-files/')[1];
        if (filePath) {
          await supabase.storage.from('subject-files').remove([filePath]);
        }
      }

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('presentation') || type.includes('ppt')) return '📊';
    if (type.includes('sheet') || type.includes('xls')) return '📈';
    return '📎';
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
        <div className="flex items-center gap-2">
          {!canAccessContent && (
            <Button onClick={() => setSubscribeDialogOpen(true)}>
              <Coins className="h-4 w-4 me-2" />
              {txt.subscribeNow}
            </Button>
          )}
          {(isTeacher || isAdmin) && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 me-2" />
              {t.groups.newPost}
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Prompt for non-subscribers */}
      {!canAccessContent && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-primary/60" />
            <h3 className="text-lg font-semibold mb-2">{txt.subscribePrompt}</h3>
            {subjectPrice && (
              <p className="text-muted-foreground mb-4">
                {subjectPrice.is_free 
                  ? txt.free 
                  : `${subjectPrice.points_price} ${txt.points}`
                }
              </p>
            )}
            <Button onClick={() => setSubscribeDialogOpen(true)}>
              <Coins className="h-4 w-4 me-2" />
              {txt.subscribeNow}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Post Form */}
      {showForm && (isTeacher || isAdmin) && (
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

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {txt.attachFile}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <File className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 me-2" />
                    {txt.attachFile}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {txt.fileTypes} • {txt.maxSize}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || uploadingFile}>
                  {submitting || uploadingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                      {uploadingFile ? txt.uploading : t.groups.publish}
                    </>
                  ) : (
                    t.groups.publish
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setSelectedFile(null);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Posts List - Only for subscribers/teachers/admins */}
      {canAccessContent && (
        <>
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
                          onClick={() => handleDelete(post.id, post.file_url)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                    
                    {/* File Attachment */}
                    {post.file_url && post.file_name && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(post.file_type || '')}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{post.file_name}</p>
                            {post.file_size && (
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(post.file_size)}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={post.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4 me-1" />
                              {txt.downloadFile}
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                    
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
        </>
      )}

      {/* Subscribe Dialog */}
      {subject && user && subjectPrice && (
        <SubjectSubscribeDialog
          open={subscribeDialogOpen}
          onOpenChange={setSubscribeDialogOpen}
          subjectId={subject.id}
          subjectName={subject.name}
          pointsPrice={subjectPrice.points_price}
          moneyPrice={subjectPrice.money_price}
          isFree={subjectPrice.is_free}
          userPoints={userPoints}
          userId={user.id}
          onSuccess={fetchSubjectAndPosts}
        />
      )}
    </div>
  );
}
