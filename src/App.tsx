import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Auth from "@/pages/Auth";
import AdminAuth from "@/pages/AdminAuth";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
import Sessions from "@/pages/Sessions";
import CreateSession from "@/pages/CreateSession";
import Notes from "@/pages/Notes";
import Todos from "@/pages/Todos";
import Notifications from "@/pages/Notifications";
import SubjectGroup from "@/pages/SubjectGroup";
import AdminUsers from "@/pages/AdminUsers";
import AdminSettings from "@/pages/AdminSettings";
import TeacherPanel from "@/pages/TeacherPanel";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/adminpanel" element={<AdminAuth />} />
              <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
              <Route path="/subjects" element={<DashboardLayout><Subjects /></DashboardLayout>} />
              <Route path="/subjects/:id/group" element={<DashboardLayout><SubjectGroup /></DashboardLayout>} />
              <Route path="/sessions" element={<DashboardLayout><Sessions /></DashboardLayout>} />
              <Route path="/sessions/create" element={<DashboardLayout><CreateSession /></DashboardLayout>} />
              <Route path="/notes" element={<DashboardLayout><Notes /></DashboardLayout>} />
              <Route path="/todos" element={<DashboardLayout><Todos /></DashboardLayout>} />
              <Route path="/notifications" element={<DashboardLayout><Notifications /></DashboardLayout>} />
              <Route path="/admin/users" element={<DashboardLayout><AdminUsers /></DashboardLayout>} />
              <Route path="/admin/settings" element={<DashboardLayout><AdminSettings /></DashboardLayout>} />
              <Route path="/teacher/panel" element={<DashboardLayout><TeacherPanel /></DashboardLayout>} />
              <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;