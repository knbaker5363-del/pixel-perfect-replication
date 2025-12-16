import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (data) {
        setSubjects(data);
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
        <h1 className="text-2xl font-bold">المواد الدراسية</h1>
        <p className="text-muted-foreground mt-1">
          تصفح المواد المتاحة
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن مادة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id} className="border-border/50 hover:border-border transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {subject.description || 'لا يوجد وصف'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">لا توجد مواد متاحة</p>
        </div>
      )}
    </div>
  );
}
