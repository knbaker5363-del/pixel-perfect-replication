import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
}

const CreateSession = () => {
  const { user, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    scheduled_at: '',
    duration_minutes: 60,
    price: 0,
    is_free: false,
    max_students: 20,
    zoom_link: '',
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('status', 'approved')
        .order('name');

      if (!error && data) {
        setSubjects(data);
      }
      setLoadingSubjects(false);
    };

    fetchSubjects();
  }, []);

  const isTeacher = hasRole('teacher') || hasRole('admin');

  if (!isTeacher) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'عذراً، هذه الصفحة للمعلمين فقط' : 'Sorry, this page is for teachers only'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/sessions')}>
              <ArrowIcon className="h-4 w-4 mx-2" />
              {language === 'ar' ? 'العودة للجلسات' : 'Back to Sessions'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.subject_id || !formData.scheduled_at) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('sessions').insert({
      title: formData.title,
      description: formData.description || null,
      subject_id: formData.subject_id,
      teacher_id: user?.id,
      scheduled_at: formData.scheduled_at,
      duration_minutes: formData.duration_minutes,
      price: formData.is_free ? 0 : formData.price,
      is_free: formData.is_free,
      max_students: formData.max_students,
      zoom_link: formData.zoom_link || null,
    });

    setLoading(false);

    if (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إنشاء الجلسة' : 'Error creating session');
      console.error(error);
    } else {
      toast.success(language === 'ar' ? 'تم إنشاء الجلسة بنجاح' : 'Session created successfully');
      navigate('/sessions');
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/sessions')}>
        <ArrowIcon className="h-4 w-4 mx-2" />
        {language === 'ar' ? 'العودة للجلسات' : 'Back to Sessions'}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'إنشاء جلسة جديدة' : 'Create New Session'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{language === 'ar' ? 'عنوان الجلسة *' : 'Session Title *'}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: مراجعة الفصل الأول' : 'e.g., Chapter 1 Review'}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? 'وصف موجز للجلسة...' : 'Brief description of the session...'}
                rows={3}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المادة *' : 'Subject *'}</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                disabled={loadingSubjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select subject'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">{language === 'ar' ? 'التاريخ والوقت *' : 'Date & Time *'}</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">{language === 'ar' ? 'المدة (بالدقائق)' : 'Duration (minutes)'}</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                max={180}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>

            {/* Is Free */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_free"
                checked={formData.is_free}
                onCheckedChange={(checked) => setFormData({ ...formData, is_free: !!checked })}
              />
              <Label htmlFor="is_free" className="cursor-pointer">
                {language === 'ar' ? 'جلسة مجانية' : 'Free Session'}
              </Label>
            </div>

            {/* Price */}
            {!formData.is_free && (
              <div className="space-y-2">
                <Label htmlFor="price">{language === 'ar' ? 'السعر' : 'Price'}</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            {/* Max Students */}
            <div className="space-y-2">
              <Label htmlFor="max_students">{language === 'ar' ? 'الحد الأقصى للطلاب' : 'Max Students'}</Label>
              <Input
                id="max_students"
                type="number"
                min={1}
                max={100}
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 20 })}
              />
            </div>

            {/* Zoom Link */}
            <div className="space-y-2">
              <Label htmlFor="zoom_link">{language === 'ar' ? 'رابط Zoom' : 'Zoom Link'}</Label>
              <Input
                id="zoom_link"
                type="url"
                value={formData.zoom_link}
                onChange={(e) => setFormData({ ...formData, zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mx-2" />
                  {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                </>
              ) : (
                language === 'ar' ? 'إنشاء الجلسة' : 'Create Session'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSession;
