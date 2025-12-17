import { useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export interface ContactTeacherDialogProps {
  teacherId: string;
  teacherName: string;
  sessionTitle?: string;
  children?: ReactNode;
}

export function ContactTeacherDialog({ teacherId, teacherName, sessionTitle, children }: ContactTeacherDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: sessionTitle ? `استفسار عن: ${sessionTitle}` : '',
    message: '',
    type: 'inquiry'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    if (user.id === teacherId) {
      toast.error(language === 'ar' ? 'لا يمكنك مراسلة نفسك' : 'You cannot message yourself');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_messages')
        .insert({
          teacher_id: teacherId,
          student_id: user.id,
          subject: formData.subject,
          message: formData.message,
          type: formData.type
        });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إرسال الرسالة بنجاح' : 'Message sent successfully');
      setFormData({ subject: '', message: '', type: 'inquiry' });
      setOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(language === 'ar' ? 'فشل في إرسال الرسالة' : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 me-2" />
            {language === 'ar' ? 'تواصل مع المعلم' : 'Contact Teacher'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'مراسلة المعلم' : 'Contact Teacher'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? `إرسال رسالة إلى ${teacherName}`
              : `Send a message to ${teacherName}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع الرسالة' : 'Message Type'}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">
                  {language === 'ar' ? 'استفسار عام' : 'General Inquiry'}
                </SelectItem>
                <SelectItem value="session_request">
                  {language === 'ar' ? 'طلب جلسة خاصة' : 'Session Request'}
                </SelectItem>
                <SelectItem value="question">
                  {language === 'ar' ? 'سؤال تعليمي' : 'Educational Question'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموضوع' : 'Subject'}</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={language === 'ar' ? 'موضوع الرسالة' : 'Message subject'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الرسالة' : 'Message'}</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {language === 'ar' ? 'إرسال' : 'Send'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
