import { Layout } from '@/presentation/components/Layout';
import { useSession } from '@/presentation/hooks/useSession';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { MyTasksPage } from '@/presentation/pages/MyTasksPage';
import { ObjectDetailPage } from '@/presentation/pages/ObjectDetailPage';
import { ObjectsPage } from '@/presentation/pages/ObjectsPage';
import { TaskDetailPage } from '@/presentation/pages/TaskDetailPage';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

function Home() {
  const { user } = useSession();
  return <Navigate to={user?.role === 'executor' ? '/my-tasks' : '/objects'} replace />;
}

function Guarded() {
  const { user, loading } = useSession();
  if (loading) return <p className="p-6">Загрузка…</p>;
  if (!user) return <LoginPage />;
  return <Layout />;
}

export function App() {
  const { user } = useSession();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Guarded />}>
          <Route index element={<Home />} />
          <Route path="objects" element={<ObjectsPage />} />
          <Route path="objects/:id" element={<ObjectDetailPage />} />
          <Route
            path="my-tasks"
            element={
              user?.role === 'executor' ? <MyTasksPage /> : <Navigate to="/objects" replace />
            }
          />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
