import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Percent, Bell, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { language } = useLanguage();
  const [commissionRate, setCommissionRate] = useState('10');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoApproveTeachers, setAutoApproveTeachers] = useState(false);

  const handleSaveSettings = () => {
    // In a real app, this would save to database
    toast.success(language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'الإعدادات' : 'Settings'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إعدادات المنصة العامة' : 'Platform general settings'}
        </p>
      </div>

      {/* Commission Settings */}
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
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
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

      {/* Notification Settings */}
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
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
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
              checked={autoApproveTeachers}
              onCheckedChange={setAutoApproveTeachers}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          <Settings className="h-4 w-4 me-2" />
          {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}