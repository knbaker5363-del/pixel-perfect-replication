import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wallet, DollarSign, Clock, CheckCircle, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Earning {
  id: string;
  amount: number;
  net_amount: number;
  commission_rate: number;
  created_at: string;
  session: {
    title: string;
  } | null;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  requested_at: string;
  processed_at: string | null;
}

export default function TeacherWallet() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.net_amount), 0);
  const pendingWithdrawals = withdrawals
    .filter(w => w.status === 'pending' || w.status === 'approved')
    .reduce((sum, w) => sum + Number(w.amount), 0);
  const paidWithdrawals = withdrawals
    .filter(w => w.status === 'paid')
    .reduce((sum, w) => sum + Number(w.amount), 0);
  const availableBalance = totalEarnings - pendingWithdrawals - paidWithdrawals;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [earningsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('teacher_earnings')
          .select('*, session:sessions(title)')
          .eq('teacher_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('teacher_id', user?.id)
          .order('requested_at', { ascending: false }),
      ]);

      if (earningsRes.error) throw earningsRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;

      setEarnings(earningsRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0 || amount > availableBalance) {
      toast.error(language === 'ar' ? 'مبلغ غير صالح' : 'Invalid amount');
      return;
    }

    if (!paymentMethod) {
      toast.error(language === 'ar' ? 'اختر طريقة الدفع' : 'Select payment method');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        teacher_id: user?.id,
        amount,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
      });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إرسال طلب السحب' : 'Withdrawal request submitted');
      setDialogOpen(false);
      setWithdrawAmount('');
      setPaymentMethod('');
      setPaymentDetails('');
      loadData();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast.error(language === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: language === 'ar' ? 'قيد الانتظار' : 'Pending', variant: 'secondary' },
      approved: { label: language === 'ar' ? 'موافق عليه' : 'Approved', variant: 'default' },
      rejected: { label: language === 'ar' ? 'مرفوض' : 'Rejected', variant: 'destructive' },
      paid: { label: language === 'ar' ? 'تم الدفع' : 'Paid', variant: 'outline' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'المحفظة' : 'Wallet'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إدارة أرباحك وطلبات السحب' : 'Manage your earnings and withdrawals'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'إجمالي الأرباح' : 'Total Earnings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">${totalEarnings.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'قيد السحب' : 'Pending Withdrawal'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">${pendingWithdrawals.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'تم سحبه' : 'Withdrawn'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">${paidWithdrawals.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              {language === 'ar' ? 'الرصيد المتاح' : 'Available Balance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <span className="text-2xl font-bold">${availableBalance.toFixed(2)}</span>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={availableBalance <= 0}>
                    {language === 'ar' ? 'سحب' : 'Withdraw'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{language === 'ar' ? 'طلب سحب' : 'Withdrawal Request'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'المبلغ ($)' : 'Amount ($)'}</Label>
                      <Input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        max={availableBalance}
                        min={1}
                      />
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الحد الأقصى:' : 'Max:'} ${availableBalance.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر طريقة الدفع' : 'Select method'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="wise">Wise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}</Label>
                      <Textarea
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        placeholder={language === 'ar' ? 'أدخل تفاصيل حساب الدفع...' : 'Enter payment account details...'}
                      />
                    </div>
                    <Button onClick={handleWithdrawal} disabled={submitting} className="w-full">
                      {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                      {language === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-green-500" />
              {language === 'ar' ? 'سجل الأرباح' : 'Earnings History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'ar' ? 'لا توجد أرباح بعد' : 'No earnings yet'}
              </p>
            ) : (
              <div className="space-y-3">
                {earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{earning.session?.title || 'جلسة'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(earning.created_at), 'PPP', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-green-600">+${Number(earning.net_amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? `عمولة ${earning.commission_rate}%` : `${earning.commission_rate}% fee`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-500" />
              {language === 'ar' ? 'طلبات السحب' : 'Withdrawal Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'ar' ? 'لا توجد طلبات سحب' : 'No withdrawal requests'}
              </p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">${Number(withdrawal.amount).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {withdrawal.payment_method === 'bank_transfer' 
                          ? (language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer')
                          : withdrawal.payment_method}
                      </p>
                    </div>
                    <div className="text-end">
                      {getStatusBadge(withdrawal.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(withdrawal.requested_at), 'PP', { locale: language === 'ar' ? ar : undefined })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
