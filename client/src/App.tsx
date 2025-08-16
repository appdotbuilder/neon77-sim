import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';

// Import components
import { AuthPage } from './components/AuthPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';

type UserSession = {
  user: User;
  isAdmin: boolean;
}

function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback((session: UserSession) => {
    setUserSession(session);
  }, []);

  const handleLogout = useCallback(() => {
    setUserSession(null);
  }, []);

  if (!userSession) {
    return (
      <div className="min-h-screen slot-bg">
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  if (userSession.isAdmin) {
    return (
      <div className="min-h-screen admin-bg">
        <AdminDashboard user={userSession.user} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen slot-bg">
      <UserDashboard user={userSession.user} onLogout={handleLogout} />
    </div>
  );
}

export default App;