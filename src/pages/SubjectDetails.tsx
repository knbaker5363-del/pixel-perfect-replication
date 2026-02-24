import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, User, Target, FileText, Clock, Coins, 
  ArrowLeft, CheckCircle, Loader2, Calendar 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SubjectSubscribeDialog from '@/components/subjects/SubjectSubscribeDialog';

interface SubjectData {
  id: string;
  name: string;
  description: string | null;
  objectives: string | null;
  syllabus: string | null;
  proposed_by: string | null;
}

interface PriceData {
  points_price: number;
  money_price: number;
  is_free: boolean;
  duration_type: string;
  duration_value: number;
}

export default function SubjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [price, setPrice] = useState<PriceData | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const t = language === 'ar' ? {
    back: 'العودة للمواد',
    objectives: 'أهداف المادة',
    syllabus: 'المنهج الدراسي',
    subscriptionDetails: 'تفاصيل الاشتراك',
    duration: 'المدة',
    price: 'السعر',
    points: 'نقطة',
    free: 'مجاني',
    subscribe: 'اشتراك',
    subscribed: 'مشترك ✓',
    teacher: 'المعلم',
    notFound: 'المادة غير موجودة',
    noObjectives: 'لم تُحدد الأهداف بعد',
    noSyllabus: 'لم يُحدد المنهج بعد',
    semester: 'فصل دراسي',
    month: 'شهر',
    week: 'أسبوع',
    lifetime: 'مدى الحياة',
    goToGroup: 'الذهاب للمجموعة',
    moneyDisabled: 'الدفع بالمال (قريباً)',
  } : {
    back: 'Back to Subjects',
    objectives: 'Course Objectives',
    syllabus: 'Syllabus',
    subscriptionDetails: 'Subscription Details',
    duration: 'Duration',
    price: 'Price',
    points: 'points',
    free: 'Free',
    subscribe: 'Subscribe',
    subscribed: 'Subscribed ✓',
    teacher: 'Teacher',
    notFound: 'Subject not found',
    noObjectives: 'No objectives specified yet',
    noSyllabus: 'No syllabus specified yet',
    semester: 'Semester',
    month: 'Month',
    week: 'Week',
    lifetime: 'Lifetime',
    goToGroup: 'Go to Group',
    moneyDisabled: 'Pay with money (coming soon)',
  };

  const durationLabels: Record<string, string> = {
    semester: t.semester,
    month: t.month,
    week: t.week,
    lifetime: t.lifetime,
  };

  useEffect(() => {
    if (id) fetchSubject();
  }, [id, user]);

  const fetchSubject = async () => {
    if (!id) return;
    try {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!subjectData) { setLoading(false); return; }
      setSubject(subjectData as SubjectData);

      const priceResult = await supabase.from('subject_prices').select('*').eq('subject_id', id).maybeSingle();
      if (priceResult.data) {
        setPrice(priceResult.data as PriceData);
      } else {
        setPrice({ points_price: 50, money_price: 10, is_free: false, duration_type: 'semester', duration_value: 1 });
      }

      if (subjectData.proposed_by) {
        const { data: teacherData } = await supabase.from('profiles').select('full_name').eq('user_id', subjectData.proposed_by).maybeSingle();
        setTeacherName(teacherData?.full_name || null);
      }

      if (user) {
        const [subResult, pointsResult] = await Promise.all([
          supabase.from('subject_subscriptions').select('id').eq('subject_id', id).eq('student_id', user.id).eq('is_active', true).maybeSingle(),
          supabase.from('profiles').select('points').eq('user_id', user.id).maybeSingle()
        ]);
        setIsSubscribed(!!subResult.data);
        setUserPoints(pointsResult.data?.points || 0);
      }
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">{t.notFound}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/subjects">{t.back}</Link>
        </Button>
      </div>
    );
  }

  const getDurationText = () => {
    if (!price) return '';
    if (price.duration_type === 'lifetime') return durationLabels.lifetime;
    const label = durationLabels[price.duration_type] || price.duration_type;
    return `${price.duration_value} ${label}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Button variant="ghost" asChild>
        <Link to="/subjects">
          <ArrowLeft className="h-4 w-4 me-2" />
          {t.back}
        </Link>
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{subject.name}</h1>
              {subject.description && (
                <p className="text-muted-foreground mt-2">{subject.description}</p>
              )}
              {teacherName && (
                <div className="flex items-center gap-2 mt-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t.teacher}: <strong>{teacherName}</strong></span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t.objectives}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subject.objectives ? (
            <div className="whitespace-pre-wrap text-sm">{subject.objectives}</div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noObjectives}</p>
          )}
        </CardContent>
      </Card>

      {/* Syllabus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.syllabus}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subject.syllabus ? (
            <div className="whitespace-pre-wrap text-sm">{subject.syllabus}</div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noSyllabus}</p>
          )}
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {t.subscriptionDetails}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {price && (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.duration}</span>
                </div>
                <Badge variant="outline">{getDurationText()}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.price}</span>
                </div>
                {price.is_free ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t.free}</Badge>
                ) : (
                  <span className="font-bold">{price.points_price} {t.points}</span>
                )}
              </div>
              {!price.is_free && price.money_price > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-50">
                  <span className="text-sm">{t.moneyDisabled}</span>
                  <span className="text-sm">${price.money_price}</span>
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            {isSubscribed ? (
              <div className="flex gap-2">
                <Badge variant="secondary" className="py-2 px-4 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 me-2" />
                  {t.subscribed}
                </Badge>
                <Button asChild variant="outline">
                  <Link to={`/subjects/${subject.id}/group`}>{t.goToGroup}</Link>
                </Button>
              </div>
            ) : (
              <Button onClick={() => setDialogOpen(true)} className="w-full">
                {t.subscribe}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscribe Dialog */}
      {user && price && (
        <SubjectSubscribeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          subjectId={subject.id}
          subjectName={subject.name}
          pointsPrice={price.points_price}
          moneyPrice={price.money_price}
          isFree={price.is_free}
          userPoints={userPoints}
          userId={user.id}
          onSuccess={() => {
            setIsSubscribed(true);
            fetchSubject();
          }}
        />
      )}
    </div>
  );
}
