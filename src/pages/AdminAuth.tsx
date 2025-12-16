import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAuth() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check if user has admin role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id);

        if (rolesError) throw rolesError;

        const isAdmin = roles?.some(r => r.role === 'admin');

        if (isAdmin) {
          toast.success(t.success.loginSuccess);
          navigate('/dashboard');
        } else {
          // Sign out if not admin
          await supabase.auth.signOut();
          toast.error(t.adminAuth.notAuthorized);
        }
      }
    } catch (error: any) {
      toast.error(error.message || t.errors.unexpected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Card className="w-full max-w-md border-2 border-foreground/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t.adminAuth.title}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {t.adminAuth.subtitle}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                required
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t.common.loading}
                </>
              ) : (
                t.auth.login
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
