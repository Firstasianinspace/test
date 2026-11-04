import { Button } from '@/presentation/components/ui/button';
import { useSession } from '@/presentation/hooks/useSession';
import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  const { user, signOut } = useSession();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center gap-4 border-b bg-white px-6 py-3">
        <strong>Объекты и задачи</strong>
        {user?.role === 'manager' && <Link to="/objects">Объекты</Link>}
        {user?.role === 'executor' && <Link to="/my-tasks">Мои задачи</Link>}
        {user?.role === 'executor' && <Link to="/objects">Мои объекты</Link>}
        <span className="ml-auto text-sm text-slate-600">
          {user?.fullName} ({user?.role === 'manager' ? 'постановщик' : 'исполнитель'})
        </span>
        <Button variant="outline" onClick={() => void signOut()}>
          Выйти
        </Button>
      </header>
      <main className="mx-auto max-w-4xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
