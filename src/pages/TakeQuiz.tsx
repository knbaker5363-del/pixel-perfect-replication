import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  options: { id: string; option_text: string }[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  subject: { name: string } | null;
}

export default function TakeQuiz() {
  const { id } = useParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ score: number; passed: boolean; correctAnswers: Record<string, string> } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadQuiz();
    }
  }, [id, user]);

  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, showResults]);

  const loadQuiz = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*, subject:subjects(name)')
        .eq('id', id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);
      setTimeLeft(quizData.duration_minutes * 60);

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options:quiz_options(id, option_text)')
        .eq('quiz_id', id)
        .order('question_order');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Create attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: id,
          student_id: user?.id,
          total_points: questionsData?.length || 0,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      setAttemptId(attempt.id);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error(language === 'ar' ? 'فشل تحميل الاختبار' : 'Failed to load quiz');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      // Get correct answers
      const { data: correctOptions } = await supabase
        .from('quiz_options')
        .select('id, question_id')
        .eq('is_correct', true)
        .in('question_id', questions.map(q => q.id));

      const correctAnswersMap: Record<string, string> = {};
      correctOptions?.forEach(o => {
        correctAnswersMap[o.question_id] = o.id;
      });

      // Calculate score
      let correctCount = 0;
      const answersToInsert = [];

      for (const question of questions) {
        const selectedOption = answers[question.id];
        const isCorrect = selectedOption === correctAnswersMap[question.id];
        if (isCorrect) correctCount++;

        if (selectedOption) {
          answersToInsert.push({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option_id: selectedOption,
            is_correct: isCorrect,
          });
        }
      }

      // Save answers
      if (answersToInsert.length > 0) {
        await supabase.from('quiz_answers').insert(answersToInsert);
      }

      const score = Math.round((correctCount / questions.length) * 100);
      const passed = score >= (quiz?.passing_score || 60);

      // Update attempt
      await supabase
        .from('quiz_attempts')
        .update({
          score,
          passed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      setResults({ score, passed, correctAnswers: correctAnswersMap });
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error(language === 'ar' ? 'فشل إرسال الإجابات' : 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className={results.passed ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="py-12 text-center">
            {results.passed ? (
              <CheckCircle className="h-20 w-20 mx-auto mb-4 text-green-500" />
            ) : (
              <XCircle className="h-20 w-20 mx-auto mb-4 text-red-500" />
            )}
            <h2 className="text-3xl font-bold mb-2">
              {results.passed 
                ? (language === 'ar' ? 'مبروك! نجحت' : 'Congratulations! You Passed')
                : (language === 'ar' ? 'للأسف، لم تنجح' : 'Sorry, You Did Not Pass')}
            </h2>
            <p className="text-6xl font-bold mb-4">{results.score}%</p>
            <p className="text-muted-foreground">
              {language === 'ar' ? `درجة النجاح: ${quiz?.passing_score}%` : `Passing score: ${quiz?.passing_score}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'مراجعة الإجابات' : 'Review Answers'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => {
              const selectedOption = answers[question.id];
              const correctOption = results.correctAnswers[question.id];
              const isCorrect = selectedOption === correctOption;

              return (
                <div key={question.id} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <p className="font-medium">{index + 1}. {question.question_text}</p>
                  </div>
                  <div className="ms-7 space-y-1">
                    {question.options.map(option => (
                      <div
                        key={option.id}
                        className={`p-2 rounded text-sm ${
                          option.id === correctOption
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : option.id === selectedOption && option.id !== correctOption
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                            : ''
                        }`}
                      >
                        {option.option_text}
                        {option.id === correctOption && ' ✓'}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={() => navigate('/quizzes')}>
            {language === 'ar' ? 'العودة للاختبارات' : 'Back to Quizzes'}
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{quiz?.title}</h1>
              <p className="text-sm text-muted-foreground">{quiz?.subject?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Progress value={progress} className="w-24" />
                <span className="text-sm">{answeredCount}/{questions.length}</span>
              </div>
              <Badge variant={timeLeft < 60 ? 'destructive' : 'secondary'} className="text-lg px-3 py-1">
                <Clock className="h-4 w-4 me-2" />
                {formatTime(timeLeft)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {index + 1}. {question.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {question.options.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option.id }))}
                    className={`w-full p-3 rounded-lg text-start transition-colors ${
                      answers[question.id] === option.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {option.option_text}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={() => setShowConfirmDialog(true)}
          disabled={submitting}
        >
          {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          {language === 'ar' ? 'إنهاء الاختبار' : 'Submit Quiz'}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {language === 'ar' ? 'تأكيد الإرسال' : 'Confirm Submission'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {answeredCount < questions.length
                ? (language === 'ar' 
                    ? `لم تجب على ${questions.length - answeredCount} سؤال. هل تريد الإرسال على أي حال؟`
                    : `You haven't answered ${questions.length - answeredCount} questions. Submit anyway?`)
                : (language === 'ar'
                    ? 'هل أنت متأكد من إنهاء الاختبار؟'
                    : 'Are you sure you want to submit the quiz?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {language === 'ar' ? 'إرسال' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
