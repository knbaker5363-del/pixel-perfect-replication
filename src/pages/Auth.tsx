import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';
import { GraduationCap, Loader2, BookOpen, Calendar, Trophy, Video, Users, Coins, Star, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface University {
  id: string;
  name: string;
  email_domain: string;
  require_email_verification: boolean;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUniversities = async () => {
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (data) {
        setUniversities(data);
      }
    };
    fetchUniversities();
  }, []);

  const validateEmailDomain = () => {
    if (!selectedUniversity) return true;
    const university = universities.find(u => u.id === selectedUniversity);
    if (!university || !university.require_email_verification) return true;
    
    const emailDomain = email.split('@')[1];
    if (emailDomain !== university.email_domain) {
      toast.error(
        language === 'ar' 
          ? `يجب استخدام بريد إلكتروني من ${university.email_domain}` 
          : `Must use email from ${university.email_domain}`
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t.errors.invalidCredentials);
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t.success.loginSuccess);
          navigate('/dashboard');
        }
      } else {
        if (!fullName.trim()) {
          toast.error(t.errors.enterFullName);
          setIsSubmitting(false);
          return;
        }

        if (!validateEmailDomain()) {
          setIsSubmitting(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, selectedUniversity || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(t.errors.emailExists);
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t.success.signupSuccess);
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error(t.errors.unexpected);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(language === 'ar' ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first');
      return;
    }
    
    setIsResettingPassword(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        language === 'ar' 
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' 
          : 'Password reset link sent to your email'
      );
    }
    setIsResettingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = [
    { icon: BookOpen, title: t.auth.step1Title, description: t.auth.step1Description },
    { icon: Calendar, title: t.auth.step2Title, description: t.auth.step2Description },
    { icon: Trophy, title: t.auth.step3Title, description: t.auth.step3Description },
  ];

  const features = [
    { icon: Video, text: t.auth.features.zoom },
    { icon: Users, text: t.auth.features.teachers },
    { icon: Coins, text: t.auth.features.prices },
    { icon: Star, text: t.auth.features.points },
  ];

  return (
    <div className="min-h-screen flex" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Section - Promotional */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div>
          {/* Logo & Title */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">{t.auth.platformName}</span>
          </div>

          {/* Description */}
          <h1 className="text-3xl font-bold mb-4">{t.auth.platformDescription}</h1>

          {/* How it works */}
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-6 text-primary-foreground/80">{t.auth.howItWorks}</h2>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-primary-foreground/70">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <Check className="w-4 h-4 text-primary-foreground/60" />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{t.auth.platformName}</span>
            </div>

            {/* Welcome */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{t.auth.welcome}</h2>
              <p className="text-muted-foreground">
                {isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t.auth.fullName}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t.auth.fullNamePlaceholder}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="university">
                      {language === 'ar' ? 'الجامعة' : 'University'}
                    </Label>
                    <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر جامعتك' : 'Select your university'} />
                      </SelectTrigger>
                      <SelectContent>
                        {universities.map((uni) => (
                          <SelectItem key={uni.id} value={uni.id}>
                            {uni.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUniversity && universities.find(u => u.id === selectedUniversity)?.require_email_verification && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' 
                          ? `يجب استخدام بريد إلكتروني من ${universities.find(u => u.id === selectedUniversity)?.email_domain}`
                          : `Must use email from ${universities.find(u => u.id === selectedUniversity)?.email_domain}`
                        }
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  required
                  dir="ltr"
                  className={isRTL ? 'text-left' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  required
                  minLength={6}
                  dir="ltr"
                  className={isRTL ? 'text-left' : ''}
                />
              </div>

              {isLogin && (
                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {isResettingPassword ? (
                      <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                    ) : null}
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isLogin ? t.auth.login : t.auth.signup}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t.auth.orContinueWith}</span>
              </div>
            </div>

            {/* Toggle */}
            <div className="text-center">
              <span className="text-muted-foreground">
                {isLogin ? t.auth.noAccount : t.auth.haveAccount}
              </span>{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-foreground hover:underline"
              >
                {isLogin ? t.auth.createAccount : t.auth.loginNow}
              </button>
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex justify-center pb-6">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
