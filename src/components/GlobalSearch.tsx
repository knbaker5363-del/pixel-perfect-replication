import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, Calendar, User, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  type: 'subject' | 'session' | 'teacher';
  title: string;
  subtitle?: string;
  url: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (query.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, description')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'approved')
        .limit(5);

      subjects?.forEach(s => {
        searchResults.push({
          id: s.id,
          type: 'subject',
          title: s.name,
          subtitle: s.description?.substring(0, 50),
          url: `/subjects/${s.id}/group`,
        });
      });

      // Search sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      sessions?.forEach(s => {
        searchResults.push({
          id: s.id,
          type: 'session',
          title: s.title,
          subtitle: s.description?.substring(0, 50),
          url: '/sessions',
        });
      });

      // Search teachers
      const { data: teachers } = await supabase
        .from('profiles')
        .select('user_id, full_name, bio')
        .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(5);

      // Filter to only teachers
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      const teacherIds = new Set(teacherRoles?.map(r => r.user_id));

      teachers?.forEach(t => {
        if (teacherIds.has(t.user_id)) {
          searchResults.push({
            id: t.user_id,
            type: 'teacher',
            title: t.full_name || 'معلم',
            subtitle: t.bio?.substring(0, 50),
            url: `/teacher/${t.user_id}`,
          });
        }
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'subject': return <BookOpen className="h-4 w-4" />;
      case 'session': return <Calendar className="h-4 w-4" />;
      case 'teacher': return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subject': return language === 'ar' ? 'مادة' : 'Subject';
      case 'session': return language === 'ar' ? 'جلسة' : 'Session';
      case 'teacher': return language === 'ar' ? 'معلم' : 'Teacher';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {language === 'ar' ? 'بحث شامل' : 'Global Search'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'ابحث عن مواد، جلسات، معلمين...' : 'Search subjects, sessions, teachers...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9 pe-9"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {query.length >= 2 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  {language === 'ar' ? 'الكل' : 'All'} ({results.length})
                </TabsTrigger>
                <TabsTrigger value="subject" className="flex-1">
                  {language === 'ar' ? 'مواد' : 'Subjects'} ({results.filter(r => r.type === 'subject').length})
                </TabsTrigger>
                <TabsTrigger value="session" className="flex-1">
                  {language === 'ar' ? 'جلسات' : 'Sessions'} ({results.filter(r => r.type === 'session').length})
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex-1">
                  {language === 'ar' ? 'معلمين' : 'Teachers'} ({results.filter(r => r.type === 'teacher').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : query.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{language === 'ar' ? 'اكتب للبحث...' : 'Type to search...'}</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{language === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full p-3 rounded-lg hover:bg-muted flex items-center gap-3 text-start transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{getTypeLabel(result.type)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
