import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, Calendar, User, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SubjectProposal {
  id: string;
  name: string;
  description: string | null;
  proposed_by: string | null;
  created_at: string | null;
  status: string | null;
}

interface SubjectProposalDetailsProps {
  proposal: SubjectProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const SubjectProposalDetails = ({
  proposal,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: SubjectProposalDetailsProps) => {
  const { language } = useLanguage();
  const [proposerName, setProposerName] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    const fetchProposerName = async () => {
      if (proposal?.proposed_by) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', proposal.proposed_by)
          .single();
        
        setProposerName(data?.full_name || null);
      }
    };

    if (open && proposal) {
      fetchProposerName();
    }
  }, [open, proposal]);

  if (!proposal) return null;

  const handleApprove = async () => {
    setLoadingAction('approve');
    await onApprove(proposal.id);
    setLoadingAction(null);
    onOpenChange(false);
  };

  const handleReject = async () => {
    setLoadingAction('reject');
    await onReject(proposal.id);
    setLoadingAction(null);
    onOpenChange(false);
  };

  const dateLocale = language === 'ar' ? ar : enUS;
  const formattedDate = proposal.created_at
    ? format(new Date(proposal.created_at), 'PPP', { locale: dateLocale })
    : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'تفاصيل اقتراح المادة' : 'Subject Proposal Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject Name */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'اسم المادة' : 'Subject Name'}
              </p>
              <p className="font-medium">{proposal.name}</p>
            </div>
          </div>

          {/* Description */}
          {proposal.description && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </p>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{proposal.description}</p>
            </div>
          )}

          <Separator />

          {/* Proposer */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'اقترحها' : 'Proposed by'}
              </p>
              <p className="font-medium">{proposerName || (language === 'ar' ? 'غير معروف' : 'Unknown')}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'تاريخ الاقتراح' : 'Proposal Date'}
              </p>
              <p className="font-medium">{formattedDate}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الحالة:' : 'Status:'}
            </p>
            <Badge variant="secondary">
              {proposal.status === 'pending'
                ? language === 'ar' ? 'قيد المراجعة' : 'Pending'
                : proposal.status}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleApprove}
            disabled={loadingAction !== null}
            className="flex-1"
          >
            {loadingAction === 'approve' ? (
              <Loader2 className="h-4 w-4 animate-spin mx-2" />
            ) : (
              <Check className="h-4 w-4 mx-2" />
            )}
            {language === 'ar' ? 'قبول' : 'Approve'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loadingAction !== null}
            className="flex-1"
          >
            {loadingAction === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin mx-2" />
            ) : (
              <X className="h-4 w-4 mx-2" />
            )}
            {language === 'ar' ? 'رفض' : 'Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectProposalDetails;
