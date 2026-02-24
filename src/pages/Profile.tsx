import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, GraduationCap, MapPin, Save, Loader2, Camera, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface University {
  id: string;
  name: string;
  email_domain: string;
}

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  university_id: string | null;
  education_place: string | null;
  bio: string | null;
  is_profile_public: boolean;
  points: number;
  display_id: string | null;
}

export default function Profile() {
  const { user, profile: authProfile, roles } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    avatar_url: null,
    university_id: null,
    education_place: '',
    bio: '',
    is_profile_public: false,
    points: 0,
    display_id: null
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [{ data: univData }, { data: profileData }] = await Promise.all([
        supabase.from('universities').select('*').eq('is_active', true),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      ]);
      
      setUniversities(univData || []);

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          avatar_url: profileData.avatar_url,
          university_id: profileData.university_id,
          education_place: profileData.education_place || '',
          bio: profileData.bio || '',
          is_profile_public: profileData.is_profile_public || false,
          points: profileData.points || 0,
          display_id: (profileData as any).display_id || null
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة' : 'Please select an image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'الحد الأقصى 2 ميجابايت' : 'Max size is 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      toast.success(language === 'ar' ? 'تم تحديث الصورة' : 'Avatar updated');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          university_id: profile.university_id,
          education_place: profile.education_place,
          bio: profile.bio,
          is_profile_public: profile.is_profile_public
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const copyId = () => {
    if (profile.display_id) {
      navigator.clipboard.writeText(profile.display_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = () => {
    if (roles.includes('admin')) return { label: language === 'ar' ? 'مسؤول' : 'Admin', variant: 'destructive' as const };
    if (roles.includes('teacher')) return { label: language === 'ar' ? 'معلم' : 'Teacher', variant: 'default' as const };
    return { label: language === 'ar' ? 'طالب' : 'Student', variant: 'secondary' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleBadge = getRoleBadge();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إدارة معلوماتك الشخصية' : 'Manage your personal information'}
        </p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-4 border-border">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile.full_name || (language === 'ar' ? 'مستخدم' : 'User')}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                <span className="text-sm text-muted-foreground">
                  {profile.points} {language === 'ar' ? 'نقطة' : 'points'}
                </span>
              </div>
              {profile.display_id && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {profile.display_id}
                  </span>
                  <button onClick={copyId} className="text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
            <Input
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder={language === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نبذة عنك' : 'Bio'}</Label>
            <Textarea
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder={language === 'ar' ? 'اكتب نبذة مختصرة عنك...' : 'Write a short bio...'}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Education Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {language === 'ar' ? 'معلومات التعليم' : 'Education Information'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'يُفضل إضافة معلومات التعليم للحصول على تجربة أفضل' 
              : 'Adding education info is recommended for a better experience'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الجامعة' : 'University'}</Label>
            <Select
              value={profile.university_id || 'none'}
              onValueChange={(value) => setProfile({ ...profile, university_id: value === 'none' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الجامعة' : 'Select university'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {language === 'ar' ? 'لم أحدد' : 'Not specified'}
                </SelectItem>
                {universities.map(univ => (
                  <SelectItem key={univ.id} value={univ.id}>
                    {univ.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {language === 'ar' ? 'مكان الدراسة (إذا لم تكن جامعة معروفة)' : 'Education Place (if not listed above)'}
            </Label>
            <Input
              value={profile.education_place || ''}
              onChange={(e) => setProfile({ ...profile, education_place: e.target.value })}
              placeholder={language === 'ar' ? 'مثال: كلية المجتمع' : 'e.g., Community College'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'إعدادات الخصوصية' : 'Privacy Settings'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{language === 'ar' ? 'جعل الملف الشخصي عام' : 'Make profile public'}</Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'يمكن للجميع رؤية ملفك الشخصي' 
                  : 'Anyone can view your profile'}
              </p>
            </div>
            <Switch
              checked={profile.is_profile_public}
              onCheckedChange={(checked) => setProfile({ ...profile, is_profile_public: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin me-2" />
        ) : (
          <Save className="h-4 w-4 me-2" />
        )}
        {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
      </Button>
    </div>
  );
}
