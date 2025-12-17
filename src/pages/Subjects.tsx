import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, GraduationCap, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  proposed_by: string | null;
  teacher?: {
    full_name: string | null;
    university?: { name: string } | null;
  } | null;
}

export default function Subjects() {
  const { language } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      title: 'المواد الدراسية',
      subtitle: 'تصفح المواد المتاحة',
      searchPlaceholder: 'ابحث عن مادة...',
      noDescription: 'لا يوجد وصف',
      noSubjects: 'لا توجد مواد متاحة',
      teacher: 'المعلم',
      university: 'الجامعة',
      notSpecified: 'غير محدد',
    },
    en: {
      title: 'Subjects',
      subtitle: 'Browse available subjects',
      searchPlaceholder: 'Search for a subject...',
      noDescription: 'No description',
      noSubjects: 'No subjects available',
      teacher: 'Teacher',
      university: 'University',
      notSpecified: 'Not specified',
    },
  };

  const text = t[language];

  useEffect(() => {
    const fetchSubjects = async () => {
      // First fetch approved subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, description, proposed_by')
        .eq('status', 'approved')
        .order('name');

      if (subjectsData && subjectsData.length > 0) {
        // Get unique teacher IDs
        const teacherIds = [...new Set(subjectsData.map(s => s.proposed_by).filter(Boolean))];
        
        if (teacherIds.length > 0) {
          // Fetch teacher profiles with universities
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, university:university_id(name)')
            .in('user_id', teacherIds as string[]);

          // Map subjects with teacher info
          const subjectsWithTeachers = subjectsData.map(subject => ({
            ...subject,
            teacher: profiles?.find(p => p.user_id === subject.proposed_by) || null,
          }));

          setSubjects(subjectsWithTeachers as Subject[]);
        } else {
          setSubjects(subjectsData as Subject[]);
        }
      } else {
        setSubjects([]);
      }
      setLoading(false);
    };

    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.subtitle}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={text.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => (
            <Link key={subject.id} to={`/subjects/${subject.id}/group`}>
              <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {subject.description || text.noDescription}
                      </p>
                      
                      {/* Teacher & University Info */}
                      <div className="mt-3 space-y-1">
                        {subject.teacher?.full_name && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{subject.teacher.full_name}</span>
                          </div>
                        )}
                        {subject.teacher?.university?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <GraduationCap className="w-3 h-3" />
                            <span>{subject.teacher.university.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{text.noSubjects}</p>
        </div>
      )}
    </div>
  );
}
