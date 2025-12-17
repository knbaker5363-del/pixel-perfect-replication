import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  session: {
    title: string;
  } | null;
}

interface TeacherReviewsProps {
  teacherId: string;
  compact?: boolean;
}

export function TeacherReviews({ teacherId, compact = false }: TeacherReviewsProps) {
  const { language } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      reviews: 'التقييمات والمراجعات',
      averageRating: 'متوسط التقييم',
      totalReviews: 'تقييم',
      noReviews: 'لا توجد تقييمات بعد',
      anonymous: 'طالب',
    },
    en: {
      reviews: 'Reviews & Ratings',
      averageRating: 'Average Rating',
      totalReviews: 'reviews',
      noReviews: 'No reviews yet',
      anonymous: 'Student',
    },
  };

  const text = t[language];

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          student:student_id (full_name, avatar_url),
          session:session_id (title)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(compact ? 3 : 10);

      if (!error && data) {
        setReviews(data as unknown as Review[]);

        // Calculate stats
        if (data.length > 0) {
          const total = data.reduce((sum, r) => sum + (r.rating || 0), 0);
          setStats({
            average: total / data.length,
            count: data.length,
          });
        }
      }

      setLoading(false);
    };

    fetchReviews();
  }, [teacherId, compact]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{text.reviews}</CardTitle>
          {stats.count > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-4 h-4',
                      star <= Math.round(stats.average)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">
                {stats.average.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({stats.count} {text.totalReviews})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            {text.noReviews}
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="flex gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.student?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {review.student?.full_name || text.anonymous}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), {
                      addSuffix: true,
                      locale: language === 'ar' ? arLocale : enUS,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-3 h-3',
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>
                {review.session && (
                  <p className="text-xs text-muted-foreground">
                    {review.session.title}
                  </p>
                )}
                {review.comment && (
                  <p className="text-sm text-foreground/80 mt-2">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Compact component for showing rating inline
export function TeacherRatingBadge({ teacherId }: { teacherId: string }) {
  const [stats, setStats] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('teacher_id', teacherId);

      if (data && data.length > 0) {
        const total = data.reduce((sum, r) => sum + (r.rating || 0), 0);
        setStats({
          average: total / data.length,
          count: data.length,
        });
      }
    };

    fetchStats();
  }, [teacherId]);

  if (!stats) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{stats.average.toFixed(1)}</span>
      <span className="text-muted-foreground">({stats.count})</span>
    </span>
  );
}
