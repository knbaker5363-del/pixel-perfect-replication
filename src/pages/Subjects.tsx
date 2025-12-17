import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, GraduationCap, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  proposed_by: string | null;
  teacher?: {
    full_name: string | null;
    university_id: string | null;
    university?: { name: string } | null;
  } | null;
}

interface University {
  id: string;
  name: string;
}

export default function Subjects() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [userUniversityId, setUserUniversityId] = useState<string | null>(null);
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
      allUniversities: 'جميع الجامعات',
      myUniversity: 'جامعتي',
      filterByUniversity: 'فلترة حسب الجامعة',
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
      allUniversities: 'All Universities',
      myUniversity: 'My University',
      filterByUniversity: 'Filter by University',
    },
  };

  const text = t[language];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // Fetch universities
    const { data: uniData } = await supabase
      .from('universities')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (uniData) {
      setUniversities(uniData);
    }

    // Get user's university
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.university_id) {
        setUserUniversityId(profile.university_id);
        setSelectedUniversity(profile.university_id); // Auto-select user's university
      }
    }

    // Fetch approved subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, description, proposed_by')
      .eq('status', 'approved')
      .order('name');

    if (subjectsData && subjectsData.length > 0) {
      const teacherIds = [...new Set(subjectsData.map(s => s.proposed_by).filter(Boolean))];
      
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, university_id, university:university_id(name)')
          .in('user_id', teacherIds as string[]);

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

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesUniversity = selectedUniversity === 'all' || 
      s.teacher?.university_id === selectedUniversity;
    return matchesSearch && matchesUniversity;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={text.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder={text.filterByUniversity} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{text.allUniversities}</SelectItem>
              {userUniversityId && (
                <SelectItem value={userUniversityId}>
                  ⭐ {text.myUniversity}
                </SelectItem>
              )}
              {universities.map((uni) => (
                <SelectItem key={uni.id} value={uni.id}>
                  {uni.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
