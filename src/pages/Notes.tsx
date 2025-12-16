import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StickyNote, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const fetchNotes = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) {
      setNotes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    if (editingNote) {
      const { error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', editingNote.id);

      if (error) {
        toast.error('حدث خطأ أثناء تحديث الملاحظة');
      } else {
        toast.success('تم تحديث الملاحظة');
        fetchNotes();
      }
    } else {
      const { error } = await supabase
        .from('notes')
        .insert({ user_id: user.id, title, content });

      if (error) {
        toast.error('حدث خطأ أثناء إنشاء الملاحظة');
      } else {
        toast.success('تم إنشاء الملاحظة');
        fetchNotes();
      }
    }

    setIsOpen(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setIsOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error('حدث خطأ أثناء حذف الملاحظة');
    } else {
      toast.success('تم حذف الملاحظة');
      fetchNotes();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الملاحظات</h1>
          <p className="text-muted-foreground mt-1">
            دوّن ملاحظاتك وأفكارك
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingNote(null);
            setTitle('');
            setContent('');
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              ملاحظة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="العنوان"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                placeholder="المحتوى..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              <Button type="submit" className="w-full">
                {editingNote ? 'تحديث' : 'إنشاء'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="border-border/50 group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{note.title}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(note)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {note.content || 'لا يوجد محتوى'}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {format(new Date(note.updated_at), 'dd MMM yyyy', { locale: ar })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">لا توجد ملاحظات</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            أنشئ ملاحظتك الأولى
          </Button>
        </div>
      )}
    </div>
  );
}
