import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, RegisterUserInput, LoginUserInput, AdminLoginInput } from '../../../server/src/schema';

interface AuthPageProps {
  onLogin: (session: { user: User; isAdmin: boolean }) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User registration form
  const [registerData, setRegisterData] = useState<RegisterUserInput>({
    username: '',
    email: '',
    password: ''
  });

  // User login form
  const [loginData, setLoginData] = useState<LoginUserInput>({
    username: '',
    password: ''
  });

  // Admin login form
  const [adminData, setAdminData] = useState<AdminLoginInput>({
    username: '',
    password: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.registerUser.mutate(registerData);
      onLogin({ user, isAdmin: user.is_admin });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.loginUser.mutate(loginData);
      onLogin({ user, isAdmin: user.is_admin });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.adminLogin.mutate(adminData);
      onLogin({ user, isAdmin: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md slot-card relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold neon-text mb-2">
            🎰 NEON77
          </CardTitle>
          <p className="text-gray-400">Premium Gaming Experience</p>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
              <TabsTrigger value="login" className="text-gray-300 data-[state=active]:bg-purple-600">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-gray-300 data-[state=active]:bg-purple-600">Register</TabsTrigger>
              <TabsTrigger value="admin" className="text-gray-300 data-[state=active]:bg-purple-600">Admin</TabsTrigger>
            </TabsList>

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <Input
                    id="username"
                    value={loginData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginUserInput) => ({ ...prev, username: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginUserInput) => ({ ...prev, password: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <Button type="submit" className="w-full slot-button" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : '🎯 Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-gray-300">Username</Label>
                  <Input
                    id="reg-username"
                    value={registerData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: RegisterUserInput) => ({ ...prev, username: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={registerData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-gray-300">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <Button type="submit" className="w-full slot-button" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : '🚀 Join NEON77'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-gray-300">Admin Username</Label>
                  <Input
                    id="admin-username"
                    value={adminData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdminData((prev: AdminLoginInput) => ({ ...prev, username: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-gray-300">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdminData((prev: AdminLoginInput) => ({ ...prev, password: e.target.value }))
                    }
                    className="bg-gray-800/50 border-purple-400/30 text-white"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold shadow-lg shadow-red-500/25" disabled={isLoading}>
                  {isLoading ? 'Authenticating...' : '🔐 Admin Access'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}