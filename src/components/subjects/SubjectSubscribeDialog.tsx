import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Coins, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubjectSubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
  pointsPrice: number;
  moneyPrice: number;
  isFree: boolean;
  userPoints: number;
  userId: string;
  onSuccess: () => void;
}

export default function SubjectSubscribeDialog({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  pointsPrice,
  moneyPrice,
  isFree,
  userPoints,
  userId,
  onSuccess,
}: SubjectSubscribeDialogProps) {
  const { language } = useLanguage();
  const [paymentType, setPaymentType] = useState<'points' | 'money'>('points');
  const [loading, setLoading] = useState(false);

  const t = {
    ar: {
      title: 'الاشتراك في المادة',
      description: 'اشترك في هذه المادة لتلقي إشعارات عند نشر محتوى أو جلسات جديدة',
      subscriptionPrice: 'سعر الاشتراك',
      paymentMethod: 'طريقة الدفع',
      payWithPoints: 'الدفع بالنقاط',
      payWithMoney: 'الدفع المباشر',
      yourBalance: 'رصيدك الحالي',
      points: 'نقطة',
      currency: 'ش',
      subscribe: 'اشتراك',
      subscribing: 'جاري الاشتراك...',
      insufficientPoints: 'نقاط غير كافية',
      freeSubscription: 'اشتراك مجاني',
      success: 'تم الاشتراك بنجاح!',
      error: 'حدث خطأ أثناء الاشتراك',
      comingSoon: 'قريباً',
    },
    en: {
      title: 'Subscribe to Subject',
      description: 'Subscribe to receive notifications when new content or sessions are posted',
      subscriptionPrice: 'Subscription Price',
      paymentMethod: 'Payment Method',
      payWithPoints: 'Pay with Points',
      payWithMoney: 'Direct Payment',
      yourBalance: 'Your Balance',
      points: 'points',
      currency: '$',
      subscribe: 'Subscribe',
      subscribing: 'Subscribing...',
      insufficientPoints: 'Insufficient points',
      freeSubscription: 'Free Subscription',
      success: 'Subscribed successfully!',
      error: 'Error subscribing',
      comingSoon: 'Coming Soon',
    },
  };

  const text = t[language];
  const hasEnoughPoints = userPoints >= pointsPrice;

  const handleSubscribe = async () => {
    if (!isFree && paymentType === 'points' && !hasEnoughPoints) {
      toast.error(text.insufficientPoints);
      return;
    }

    setLoading(true);
    try {
      // Deduct points if paying with points
      if (!isFree && paymentType === 'points') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: userPoints - pointsPrice })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      // Create subscription
      const { error: subscribeError } = await supabase
        .from('subject_subscriptions')
        .insert({
          subject_id: subjectId,
          student_id: userId,
          payment_type: isFree ? 'points' : paymentType,
          amount_paid: isFree ? 0 : (paymentType === 'points' ? pointsPrice : moneyPrice),
          is_active: true,
        });

      if (subscribeError) throw subscribeError;

      toast.success(text.success);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(text.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Subject Name */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">{subjectName}</h3>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{text.subscriptionPrice}</span>
            {isFree ? (
              <Badge variant="secondary" className="text-green-600">
                {text.freeSubscription}
              </Badge>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{pointsPrice} {text.points}</Badge>
                <span className="text-muted-foreground">/</span>
                <Badge variant="outline">{text.currency}{moneyPrice}</Badge>
              </div>
            )}
          </div>

          {/* Your Balance */}
          {!isFree && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{text.yourBalance}</span>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{userPoints} {text.points}</span>
                {!hasEnoughPoints && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
          )}

          {/* Payment Method */}
          {!isFree && (
            <div className="space-y-3">
              <Label>{text.paymentMethod}</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={(value) => setPaymentType(value as 'points' | 'money')}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="points"
                    id="points"
                    className="peer sr-only"
                    disabled={!hasEnoughPoints}
                  />
                  <Label
                    htmlFor="points"
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors
                      ${hasEnoughPoints 
                        ? 'peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-muted' 
                        : 'opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <span className="text-sm font-medium">{text.payWithPoints}</span>
                    <span className="text-xs text-muted-foreground">{pointsPrice} {text.points}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="money"
                    id="money"
                    className="peer sr-only"
                    disabled
                  />
                  <Label
                    htmlFor="money"
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 opacity-50 cursor-not-allowed"
                  >
                    <CreditCard className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">{text.payWithMoney}</span>
                    <span className="text-xs text-muted-foreground">{text.comingSoon}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Subscribe Button */}
          <Button
            onClick={handleSubscribe}
            disabled={loading || (!isFree && paymentType === 'points' && !hasEnoughPoints)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {text.subscribing}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 me-2" />
                {text.subscribe}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}