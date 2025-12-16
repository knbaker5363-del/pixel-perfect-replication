import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Upload, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
}

interface TeacherApplication {
  id: string;
  status: string;
  created_at: string;
  subject_id: string;
  subjects?: { name: string } | null;
}

export function TeacherApplicationForm() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<TeacherApplication | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);

  useEffect(() => {
    fetchSubjects();
    if (user) {
      checkExistingApplication();
    }
  }, [user]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    if (data) setSubjects(data);
  };

  const checkExistingApplication = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('teacher_applications')
      .select('id, status, created_at, subject_id, subjects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setExistingApplication(data as TeacherApplication);
    }
    setCheckingApplication(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف كبير جداً. الحد الأقصى 5MB');
        return;
      }
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('نوع الملف غير مدعوم. يُقبل PDF, JPG, PNG فقط');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSubject || !file) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      // Upload proof file
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proof-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('proof-documents')
        .getPublicUrl(fileName);

      // Create application
      const { error: applicationError } = await supabase
        .from('teacher_applications')
        .insert({
          user_id: user.id,
          subject_id: selectedSubject,
          proof_url: urlData.publicUrl,
          status: 'pending'
        });

      if (applicationError) throw applicationError;

      toast.success('تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.');
      checkExistingApplication();
    } catch (error: any) {
      console.error('Application error:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3" />
            مقبول
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  if (checkingApplication) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            طلب التدريس
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحالة:</span>
              {getStatusBadge(existingApplication.status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المادة:</span>
              <span className="font-medium">{existingApplication.subjects?.name || 'غير محدد'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تاريخ التقديم:</span>
              <span className="text-sm">
                {new Date(existingApplication.created_at).toLocaleDateString('ar-SA')}
              </span>
            </div>
          </div>

          {existingApplication.status === 'rejected' && (
            <Button 
              onClick={() => setExistingApplication(null)} 
              className="w-full"
              variant="outline"
            >
              تقديم طلب جديد
            </Button>
          )}

          {existingApplication.status === 'approved' && (
            <p className="text-sm text-green-600 text-center">
              🎉 تهانينا! يمكنك الآن إنشاء جلسات تعليمية من صفحة الجلسات
            </p>
          )}

          {existingApplication.status === 'pending' && (
            <p className="text-sm text-muted-foreground text-center">
              سيتم إشعارك عند مراجعة طلبك
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          أريد أن أُدرّس
        </CardTitle>
        <CardDescription>
          شارك معرفتك وساعد زملاءك واكسب نقاط
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>المادة التي تريد تدريسها</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة" />
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

          <div className="space-y-2">
            <Label>إثبات النجاح (كشف درجات أو شهادة)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="proof-file"
              />
              <label htmlFor="proof-file" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <CheckCircle className="w-5 h-5" />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      اضغط لرفع الملف (PDF, JPG, PNG)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الحد الأقصى: 5MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !selectedSubject || !file}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              'إرسال الطلب'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
