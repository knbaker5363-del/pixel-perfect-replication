import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, UserPlus, Loader2, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

export default function AdminUsers() {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || []
      })) || [];

      setUsers(usersWithRoles);
      setTeachers(usersWithRoles.filter(u => u.roles.includes('teacher')));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddTeacher = async () => {
    if (!teacherEmail.trim()) return;
    
    setAddingTeacher(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-add-teacher', {
        body: { email: teacherEmail },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        if (response.data.error.includes('not found')) {
          toast.error(t.admin.userNotFound);
        } else if (response.data.error.includes('already')) {
          toast.error(t.admin.alreadyTeacher);
        } else {
          toast.error(response.data.error);
        }
        return;
      }

      toast.success(t.admin.teacherAdded);
      setTeacherEmail('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      toast.error(error.message || t.common.error);
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleRemoveTeacherRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'teacher');

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إزالة صلاحية المعلم' : 'Teacher role removed');
      fetchUsers();
    } catch (error) {
      console.error('Error removing teacher role:', error);
      toast.error(t.common.error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(teacher => 
    teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">{language === 'ar' ? 'مسؤول' : 'Admin'}</Badge>;
      case 'teacher':
        return <Badge variant="secondary">{language === 'ar' ? 'معلم' : 'Teacher'}</Badge>;
      case 'student':
        return <Badge variant="outline">{language === 'ar' ? 'طالب' : 'Student'}</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}</h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إدارة المستخدمين والمعلمين' : 'Manage users and teachers'}
        </p>
      </div>

      {/* Add Teacher by Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t.admin.addTeacherByEmail}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={t.admin.emailPlaceholder}
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              className="flex-1"
              dir="ltr"
            />
            <Button onClick={handleAddTeacher} disabled={addingTeacher || !teacherEmail.trim()}>
              {addingTeacher ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t.admin.addTeacher
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'ar' ? 'البحث عن مستخدم...' : 'Search users...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pe-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {language === 'ar' ? `جميع المستخدمين (${users.length})` : `All Users (${users.length})`}
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {language === 'ar' ? `المعلمون (${teachers.length})` : `Teachers (${teachers.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{user.full_name || (language === 'ar' ? 'بدون اسم' : 'No name')}</p>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <span key={role}>{getRoleBadge(role)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد معلمين' : 'No teachers found'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{teacher.full_name || (language === 'ar' ? 'بدون اسم' : 'No name')}</p>
                        <div className="flex gap-1">
                          {teacher.roles.map((role) => (
                            <span key={role}>{getRoleBadge(role)}</span>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeacherRole(teacher.user_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 me-1" />
                        {language === 'ar' ? 'إزالة المعلم' : 'Remove Teacher'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}