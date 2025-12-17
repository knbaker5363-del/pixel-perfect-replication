import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  subject: {
    name: string;
  } | null;
  questions_count: number;
  attempt?: {
    score: number;
    passed: boolean;
    completed_at: string;
  };
}

export default function Quizzes() {
  const { language } = useLanguage();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const isTeacher = hasRole('teacher') || hasRole('admin');

  useEffect(() => {
    if (user) {
      loadQuizzes();
    }
  }, [user]);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          subject:subjects(name),
          questions:quiz_questions(id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user's attempts
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, passed, completed_at')
        .eq('student_id', user?.id)
        .not('completed_at', 'is', null);

      const attemptsMap = new Map(attempts?.map(a => [a.quiz_id, a]));

      const quizzesWithDetails = (data || []).map(quiz => ({
        ...quiz,
        questions_count: quiz.questions?.length || 0,
        attempt: attemptsMap.get(quiz.id),
      }));

      setQuizzes(quizzesWithDetails);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'الاختبارات' : 'Quizzes'}</h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'اختبر معلوماتك في المواد المختلفة' : 'Test your knowledge in different subjects'}
          </p>
        </div>
        {isTeacher && (
          <Button asChild>
            <Link to="/quizzes/create">
              <Plus className="h-4 w-4 me-2" />
              {language === 'ar' ? 'إنشاء اختبار' : 'Create Quiz'}
            </Link>
          </Button>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {language === 'ar' ? 'لا توجد اختبارات متاحة' : 'No quizzes available'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'ستظهر الاختبارات هنا عند إضافتها' : 'Quizzes will appear here when added'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.subject?.name}</CardDescription>
                  </div>
                  {quiz.attempt?.passed !== undefined && (
                    <Badge variant={quiz.attempt.passed ? 'default' : 'destructive'}>
                      {quiz.attempt.passed 
                        ? (language === 'ar' ? 'ناجح' : 'Passed')
                        : (language === 'ar' ? 'راسب' : 'Failed')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{quiz.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {quiz.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}
                  </div>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    {quiz.questions_count} {language === 'ar' ? 'سؤال' : 'questions'}
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {quiz.passing_score}%
                  </div>
                </div>

                {quiz.attempt ? (
                  <div className="p-3 rounded-lg bg-muted mb-4">
                    <p className="text-sm">
                      {language === 'ar' ? 'نتيجتك:' : 'Your score:'} 
                      <span className="font-bold ms-2">{quiz.attempt.score}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(quiz.attempt.completed_at), 'PPP', { locale: language === 'ar' ? ar : undefined })}
                    </p>
                  </div>
                ) : null}

                <Button 
                  className="w-full" 
                  variant={quiz.attempt ? 'outline' : 'default'}
                  onClick={() => navigate(`/quizzes/${quiz.id}/take`)}
                >
                  {quiz.attempt 
                    ? (language === 'ar' ? 'إعادة الاختبار' : 'Retake Quiz')
                    : (language === 'ar' ? 'بدء الاختبار' : 'Start Quiz')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
