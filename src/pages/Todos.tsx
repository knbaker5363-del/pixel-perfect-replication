import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Plus, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

export default function Todos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const fetchTodos = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('completed')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (data) {
      setTodos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTodo.trim()) return;

    const { error } = await supabase
      .from('todos')
      .insert({ 
        user_id: user.id, 
        title: newTodo.trim(),
        due_date: newDueDate || null
      });

    if (error) {
      toast.error('حدث خطأ أثناء إضافة المهمة');
    } else {
      toast.success('تمت إضافة المهمة');
      setNewTodo('');
      setNewDueDate('');
      fetchTodos();
    }
  };

  const handleToggle = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id);

    if (error) {
      toast.error('حدث خطأ أثناء تحديث المهمة');
    } else {
      fetchTodos();
    }
  };

  const handleDelete = async (todoId: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);

    if (error) {
      toast.error('حدث خطأ أثناء حذف المهمة');
    } else {
      toast.success('تم حذف المهمة');
      fetchTodos();
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">قائمة المهام</h1>
        <p className="text-muted-foreground mt-1">
          {completedCount} من {todos.length} مكتملة
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="أضف مهمة جديدة..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="flex-1"
            />
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-40"
            />
            <Button type="submit" disabled={!newTodo.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : todos.length > 0 ? (
        <div className="space-y-2">
          {todos.map((todo) => (
            <Card 
              key={todo.id} 
              className={cn(
                "border-border/50 transition-all",
                todo.completed && "opacity-60"
              )}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => handleToggle(todo)}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    todo.completed && "line-through text-muted-foreground"
                  )}>
                    {todo.title}
                  </p>
                  {todo.due_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(todo.due_date), 'dd MMM yyyy', { locale: ar })}
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(todo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">لا توجد مهام</p>
        </div>
      )}
    </div>
  );
}
