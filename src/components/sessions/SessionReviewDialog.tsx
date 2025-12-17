import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SessionReviewDialogProps {
  sessionId: string;
  sessionTitle: string;
  teacherId: string;
  onReviewSubmitted?: () => void;
}

export function SessionReviewDialog({
  sessionId,
  sessionTitle,
  teacherId,
  onReviewSubmitted,
}: SessionReviewDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = {
    ar: {
      rateSession: 'تقييم الجلسة',
      howWasExperience: 'كيف كانت تجربتك في هذه الجلسة؟',
      writeComment: 'اكتب تعليقك (اختياري)...',
      commentPlaceholder: 'شاركنا رأيك عن الجلسة والمعلم...',
      cancel: 'إلغاء',
      submit: 'إرسال التقييم',
      submitting: 'جاري الإرسال...',
      selectRating: 'يرجى اختيار تقييم',
      success: 'تم إرسال تقييمك بنجاح',
      error: 'حدث خطأ أثناء إرسال التقييم',
      alreadyReviewed: 'لقد قمت بتقييم هذه الجلسة مسبقاً',
    },
    en: {
      rateSession: 'Rate Session',
      howWasExperience: 'How was your experience in this session?',
      writeComment: 'Write your comment (optional)...',
      commentPlaceholder: 'Share your thoughts about the session and teacher...',
      cancel: 'Cancel',
      submit: 'Submit Review',
      submitting: 'Submitting...',
      selectRating: 'Please select a rating',
      success: 'Your review was submitted successfully',
      error: 'An error occurred while submitting your review',
      alreadyReviewed: 'You have already reviewed this session',
    },
  };

  const text = t[language];

  const handleSubmit = async () => {
    if (!user) return;

    if (rating === 0) {
      toast.error(text.selectRating);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        session_id: sessionId,
        teacher_id: teacherId,
        student_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error(text.alreadyReviewed);
        } else {
          toast.error(text.error);
        }
      } else {
        toast.success(text.success);
        setOpen(false);
        setRating(0);
        setComment('');
        onReviewSubmitted?.();
      }
    } catch {
      toast.error(text.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="w-4 h-4 mr-1" />
          {text.rateSession}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.rateSession}</DialogTitle>
          <DialogDescription>{sessionTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {text.howWasExperience}
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      (hoveredRating || rating) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Textarea
              placeholder={text.commentPlaceholder}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {text.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? text.submitting : text.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
