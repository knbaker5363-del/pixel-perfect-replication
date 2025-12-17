import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Percent, Bell, Shield, Building2, Loader2 } from 'lucide-react';
import { UniversitiesManager } from '@/components/admin/UniversitiesManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlatformSettings {
  commission_rate: number;
  email_notifications: boolean;
  auto_approve_teachers: boolean;
}

export default function AdminSettings() {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<PlatformSettings>({
    commission_rate: 10,
    email_notifications: true,
    auto_approve_teachers: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['commission_rate', 'email_notifications', 'auto_approve_teachers']);

      if (error) throw error;

      const loadedSettings: Partial<PlatformSettings> = {};
      data?.forEach((item: { key: string; value: unknown }) => {
        if (item.key === 'commission_rate') {
          loadedSettings.commission_rate = item.value as number;
        } else if (item.key === 'email_notifications') {
          loadedSettings.email_notifications = item.value as boolean;
        } else if (item.key === 'auto_approve_teachers') {
          loadedSettings.auto_approve_teachers = item.value as boolean;
        }
      });

      setSettings(prev => ({ ...prev, ...loadedSettings }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'commission_rate', value: settings.commission_rate },
        { key: 'email_notifications', value: settings.email_notifications },
        { key: 'auto_approve_teachers', value: settings.auto_approve_teachers },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(
            { key: setting.key, value: setting.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast.success(language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'الإعدادات' : 'Settings'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إعدادات المنصة العامة' : 'Platform general settings'}
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 me-2" />
            {language === 'ar' ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="universities">
            <Building2 className="h-4 w-4 me-2" />
            {language === 'ar' ? 'الجامعات' : 'Universities'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات العمولة' : 'Commission Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تحديد نسبة العمولة على الجلسات المدفوعة' : 'Set commission rate for paid sessions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</Label>
                <Input
                  type="number"
                  value={settings.commission_rate}
                  onChange={(e) => setSettings(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
                  min="0"
                  max="100"
                  className="max-w-[200px]"
                />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'النسبة المقتطعة من أرباح المعلمين' 
                    : 'Percentage deducted from teacher earnings'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'التحكم في إشعارات المنصة' : 'Control platform notifications'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'إرسال إشعارات عبر البريد الإلكتروني' 
                      : 'Send notifications via email'}
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_notifications: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إعدادات الأمان والموافقات' : 'Security and approval settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'الموافقة التلقائية على المعلمين' : 'Auto-approve Teachers'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'الموافقة تلقائياً على طلبات المعلمين الجدد' 
                      : 'Automatically approve new teacher applications'}
                  </p>
                </div>
                <Switch
                  checked={settings.auto_approve_teachers}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_approve_teachers: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              <Settings className="h-4 w-4 me-2" />
              {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="universities">
          <UniversitiesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
