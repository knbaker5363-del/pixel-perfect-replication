import { useAuth } from '@/contexts/AuthContext';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function Dashboard() {
  const { hasRole, profile } = useAuth();

  if (hasRole('admin')) {
    return <AdminDashboard />;
  }

  if (hasRole('teacher')) {
    return <TeacherDashboard profile={profile} />;
  }

  return <StudentDashboard profile={profile} />;
}
