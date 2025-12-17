import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export default function CreateQuiz() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('30');
  const [passingScore, setPassingScore] = useState('60');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', options: [
      { id: '1', text: '', isCorrect: true },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
    ]}
  ]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('status', 'approved');
    setSubjects(data || []);
  };

  const addQuestion = () => {
    const newId = String(questions.length + 1);
    setQuestions([...questions, {
      id: newId,
      text: '',
      options: [
        { id: '1', text: '', isCorrect: true },
        { id: '2', text: '', isCorrect: false },
        { id: '3', text: '', isCorrect: false },
        { id: '4', text: '', isCorrect: false },
      ]
    }]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== questionId));
    }
  };

  const updateQuestion = (questionId: string, text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, text } : q
    ));
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => 
            o.id === optionId ? { ...o, text } : o
          )
        };
      }
      return q;
    }));
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => ({ ...o, isCorrect: o.id === optionId }))
        };
      }
      return q;
    }));
  };

  const handleSubmit = async () => {
    if (!title || !subjectId) {
      toast.error(language === 'ar' ? 'أكمل جميع الحقول المطلوبة' : 'Fill in all required fields');
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.text.trim()) {
        toast.error(language === 'ar' ? 'أدخل نص السؤال لجميع الأسئلة' : 'Enter question text for all questions');
        return;
      }
      const filledOptions = q.options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error(language === 'ar' ? 'كل سؤال يحتاج خيارين على الأقل' : 'Each question needs at least 2 options');
        return;
      }
    }

    setLoading(true);
    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          teacher_id: user?.id,
          subject_id: subjectId,
          title,
          description,
          duration_minutes: Number(duration),
          passing_score: Number(passingScore),
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: question, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quiz.id,
            question_text: q.text,
            question_order: i,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Create options
        const optionsToInsert = q.options
          .filter(o => o.text.trim())
          .map((o, idx) => ({
            question_id: question.id,
            option_text: o.text,
            is_correct: o.isCorrect,
            option_order: idx,
          }));

        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      toast.success(language === 'ar' ? 'تم إنشاء الاختبار بنجاح' : 'Quiz created successfully');
      navigate('/quizzes');
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(language === 'ar' ? 'فشل إنشاء الاختبار' : 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'إنشاء اختبار جديد' : 'Create New Quiz'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'أنشئ اختبار متعدد الخيارات للطلاب' : 'Create a multiple choice quiz for students'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'معلومات الاختبار' : 'Quiz Information'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'عنوان الاختبار' : 'Quiz Title'} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: اختبار الوحدة الأولى' : 'e.g., Unit 1 Test'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المادة' : 'Subject'} *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select subject'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'ar' ? 'وصف مختصر للاختبار...' : 'Brief description of the quiz...'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المدة (دقيقة)' : 'Duration (minutes)'}</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="180"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'درجة النجاح (%)' : 'Passing Score (%)'}</Label>
              <Input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{language === 'ar' ? 'الأسئلة' : 'Questions'}</h2>
          <Button onClick={addQuestion} variant="outline" size="sm">
            <Plus className="h-4 w-4 me-2" />
            {language === 'ar' ? 'إضافة سؤال' : 'Add Question'}
          </Button>
        </div>

        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {language === 'ar' ? `السؤال ${qIndex + 1}` : `Question ${qIndex + 1}`}
                </CardTitle>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={question.text}
                onChange={(e) => updateQuestion(question.id, e.target.value)}
                placeholder={language === 'ar' ? 'نص السؤال...' : 'Question text...'}
              />

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الخيارات (اختر الإجابة الصحيحة)' : 'Options (select correct answer)'}</Label>
                {question.options.map((option, oIndex) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={option.isCorrect}
                      onChange={() => setCorrectOption(question.id, option.id)}
                      className="h-4 w-4"
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                      placeholder={`${language === 'ar' ? 'الخيار' : 'Option'} ${oIndex + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/quizzes')}>
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          {language === 'ar' ? 'إنشاء الاختبار' : 'Create Quiz'}
        </Button>
      </div>
    </div>
  );
}
