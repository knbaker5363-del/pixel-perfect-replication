import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Coins, CreditCard, MessageCircle, X, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ContactTeacherDialog } from '@/components/sessions/ContactTeacherDialog';

interface Subscription {
  id: string;
  subject_id: string;
  subscribed_at: string;
  expires_at: string | null;
  payment_type: string;
  amount_paid: number;
  is_active: boolean;
  subjects: {
    id: string;
    name: string;
    description: string | null;
    proposed_by: string | null;
  } | null;
  teacher_profile?: {
    full_name: string | null;
    user_id: string;
  } | null;
}

export default function MySubscriptions() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'اشتراكاتي',
      description: 'المواد التي اشتركت فيها',
      noSubscriptions: 'لا توجد اشتراكات حالية',
      browseSubjects: 'تصفح المواد',
      subscribedOn: 'تاريخ الاشتراك',
      expiresOn: 'ينتهي في',
      noExpiry: 'غير محدد',
      paymentType: 'طريقة الدفع',
      points: 'نقاط',
      money: 'نقدي',
      free: 'مجاني',
      amountPaid: 'المبلغ المدفوع',
      active: 'فعّال',
      inactive: 'غير فعّال',
      cancelSubscription: 'إلغاء الاشتراك',
      contactTeacher: 'تواصل مع المعلم',
      viewSubject: 'عرض المادة',
      cancelConfirmTitle: 'إلغاء الاشتراك',
      cancelConfirmDescription: 'هل أنت متأكد من إلغاء الاشتراك في هذه المادة؟ ننصحك بالتواصل مع المعلم أولاً.',
      cancel: 'إلغاء',
      confirm: 'تأكيد الإلغاء',
      cancelSuccess: 'تم إلغاء الاشتراك بنجاح',
      cancelError: 'حدث خطأ أثناء إلغاء الاشتراك',
      teacher: 'المعلم',
    },
    en: {
      title: 'My Subscriptions',
      description: 'Subjects you have subscribed to',
      noSubscriptions: 'No active subscriptions',
      browseSubjects: 'Browse Subjects',
      subscribedOn: 'Subscribed on',
      expiresOn: 'Expires on',
      noExpiry: 'No expiry',
      paymentType: 'Payment type',
      points: 'Points',
      money: 'Money',
      free: 'Free',
      amountPaid: 'Amount paid',
      active: 'Active',
      inactive: 'Inactive',
      cancelSubscription: 'Cancel Subscription',
      contactTeacher: 'Contact Teacher',
      viewSubject: 'View Subject',
      cancelConfirmTitle: 'Cancel Subscription',
      cancelConfirmDescription: 'Are you sure you want to cancel this subscription? We recommend contacting the teacher first.',
      cancel: 'Cancel',
      confirm: 'Confirm Cancellation',
      cancelSuccess: 'Subscription cancelled successfully',
      cancelError: 'Error cancelling subscription',
      teacher: 'Teacher',
    },
  };

  const text = t[language];

  const fetchSubscriptions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('subject_subscriptions')
      .select(`
        *,
        subjects (
          id,
          name,
          description,
          proposed_by
        )
      `)
      .eq('student_id', user.id)
      .order('subscribed_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    // Fetch teacher profiles for each subject
    if (data) {
      const subsWithTeachers = await Promise.all(
        data.map(async (sub) => {
          if (sub.subjects?.proposed_by) {
            const { data: teacherProfile } = await supabase
              .from('profiles')
              .select('full_name, user_id')
              .eq('user_id', sub.subjects.proposed_by)
              .single();
            return { ...sub, teacher_profile: teacherProfile };
          }
          return sub;
        })
      );
      setSubscriptions(subsWithTeachers as Subscription[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  const handleCancelSubscription = async (subscriptionId: string) => {
    setCancellingId(subscriptionId);

    const { error } = await supabase
      .from('subject_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId);

    if (error) {
      toast.error(text.cancelError);
    } else {
      toast.success(text.cancelSuccess);
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscriptionId ? { ...sub, is_active: false } : sub
        )
      );
    }

    setCancellingId(null);
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'points':
        return text.points;
      case 'money':
        return text.money;
      case 'free':
        return text.free;
      default:
        return type;
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'points':
        return <Coins className="w-4 h-4" />;
      case 'money':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">{text.title}</h1>
          <p className="text-muted-foreground mt-1">{text.description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.description}</p>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground mb-4">{text.noSubscriptions}</p>
            <Button asChild>
              <Link to="/subjects">{text.browseSubjects}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {subscription.subjects?.name || 'Unknown Subject'}
                    </CardTitle>
                    {subscription.subjects?.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {subscription.subjects.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                    {subscription.is_active ? text.active : text.inactive}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{text.subscribedOn}:</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(subscription.subscribed_at), 'dd MMM yyyy', {
                      locale: language === 'ar' ? ar : undefined,
                    })}
                  </span>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    {getPaymentIcon(subscription.payment_type)}
                    <span>{text.paymentType}:</span>
                  </div>
                  <span className="font-medium">
                    {getPaymentTypeLabel(subscription.payment_type)}
                  </span>

                  {subscription.amount_paid > 0 && (
                    <>
                      <div className="text-muted-foreground">{text.amountPaid}:</div>
                      <span className="font-medium">
                        {subscription.payment_type === 'points'
                          ? `${subscription.amount_paid} ${text.points}`
                          : `$${subscription.amount_paid}`}
                      </span>
                    </>
                  )}

                  {subscription.teacher_profile && (
                    <>
                      <div className="text-muted-foreground">{text.teacher}:</div>
                      <Link
                        to={`/teacher/${subscription.teacher_profile.user_id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {subscription.teacher_profile.full_name || '-'}
                      </Link>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/subjects/${subscription.subject_id}`}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      {text.viewSubject}
                    </Link>
                  </Button>

                  {subscription.teacher_profile && subscription.is_active && (
                    <ContactTeacherDialog
                      teacherId={subscription.teacher_profile.user_id}
                      teacherName={subscription.teacher_profile.full_name || text.teacher}
                      sessionTitle={subscription.subjects?.name || ''}
                    >
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {text.contactTeacher}
                      </Button>
                    </ContactTeacherDialog>
                  )}

                  {subscription.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <X className="w-4 h-4 mr-2" />
                          {text.cancelSubscription}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{text.cancelConfirmTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {text.cancelConfirmDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelSubscription(subscription.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={cancellingId === subscription.id}
                          >
                            {cancellingId === subscription.id && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {text.confirm}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
