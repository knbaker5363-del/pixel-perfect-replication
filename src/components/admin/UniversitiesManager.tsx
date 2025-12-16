import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface University {
  id: string;
  name: string;
  email_domain: string;
  is_active: boolean;
  require_email_verification: boolean;
}

export function UniversitiesManager() {
  const { language } = useLanguage();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUniversity, setNewUniversity] = useState({
    name: '',
    email_domain: '',
    require_email_verification: true
  });

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
      toast.error(language === 'ar' ? 'فشل في تحميل الجامعات' : 'Failed to load universities');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('universities')
        .insert({
          name: newUniversity.name,
          email_domain: newUniversity.email_domain.toLowerCase().replace('@', ''),
          require_email_verification: newUniversity.require_email_verification
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تمت إضافة الجامعة' : 'University added');
      setNewUniversity({ name: '', email_domain: '', require_email_verification: true });
      setShowForm(false);
      fetchUniversities();
    } catch (error: any) {
      console.error('Error adding university:', error);
      if (error.code === '23505') {
        toast.error(language === 'ar' ? 'هذا النطاق مسجل مسبقاً' : 'This domain is already registered');
      } else {
        toast.error(language === 'ar' ? 'فشل في إضافة الجامعة' : 'Failed to add university');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('universities')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setUniversities(prev =>
        prev.map(u => u.id === id ? { ...u, is_active: !isActive } : u)
      );
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
    } catch (error) {
      console.error('Error toggling university:', error);
      toast.error(language === 'ar' ? 'فشل في تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذه الجامعة؟' : 'Delete this university?')) return;

    try {
      const { error } = await supabase
        .from('universities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUniversities(prev => prev.filter(u => u.id !== id));
      toast.success(language === 'ar' ? 'تم حذف الجامعة' : 'University deleted');
    } catch (error) {
      console.error('Error deleting university:', error);
      toast.error(language === 'ar' ? 'فشل في حذف الجامعة' : 'Failed to delete university');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {language === 'ar' ? 'إدارة الجامعات' : 'Universities Management'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'إضافة وإدارة الجامعات ونطاقات البريد الإلكتروني' 
                : 'Add and manage universities and email domains'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 me-2" />
            {language === 'ar' ? 'إضافة جامعة' : 'Add University'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم الجامعة' : 'University Name'}</Label>
                    <Input
                      value={newUniversity.name}
                      onChange={(e) => setNewUniversity({ ...newUniversity, name: e.target.value })}
                      placeholder={language === 'ar' ? 'مثال: جامعة خضوري' : 'e.g., Khadoori University'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نطاق البريد الإلكتروني' : 'Email Domain'}</Label>
                    <Input
                      value={newUniversity.email_domain}
                      onChange={(e) => setNewUniversity({ ...newUniversity, email_domain: e.target.value })}
                      placeholder="ptuk.edu.ps"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newUniversity.require_email_verification}
                      onCheckedChange={(checked) => setNewUniversity({ ...newUniversity, require_email_verification: checked })}
                    />
                    <Label>{language === 'ar' ? 'تتطلب التحقق من البريد' : 'Require email verification'}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'ar' ? 'إضافة' : 'Add')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {universities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'لا توجد جامعات' : 'No universities'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {universities.map(univ => (
              <div
                key={univ.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{univ.name}</h4>
                    <p className="text-sm text-muted-foreground" dir="ltr">@{univ.email_domain}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={univ.is_active ? 'default' : 'secondary'}>
                    {univ.is_active 
                      ? (language === 'ar' ? 'مفعّل' : 'Active')
                      : (language === 'ar' ? 'معطّل' : 'Inactive')
                    }
                  </Badge>
                  <Switch
                    checked={univ.is_active}
                    onCheckedChange={() => toggleActive(univ.id, univ.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(univ.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
