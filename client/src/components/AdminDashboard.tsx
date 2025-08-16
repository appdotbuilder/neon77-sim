import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Deposit, Withdrawal } from '../../../server/src/schema';

// Import sub-components
import { DepositManagement } from './DepositManagement';
import { WithdrawalManagement } from './WithdrawalManagement';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        trpc.getAllDeposits.query(),
        trpc.getAllWithdrawals.query()
      ]);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pendingDeposits = deposits.filter(d => d.status === 'PENDING');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-red-400">🔐 NEON77 Admin</h1>
          <Badge className="bg-red-600/20 text-red-400 border-red-400/30">
            Administrator
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-gray-300">Admin Panel</p>
            <p className="text-white font-semibold">{user.username}</p>
          </div>
          <Button 
            onClick={onLogout}
            variant="outline" 
            className="border-red-400/30 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-yellow-900/20 border-yellow-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm">Pending Deposits</p>
                <p className="text-2xl font-bold text-white">{pendingDeposits.length}</p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-900/20 border-orange-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-sm">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-white">{pendingWithdrawals.length}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-900/20 border-green-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm">Total Deposits</p>
                <p className="text-2xl font-bold text-white">{deposits.length}</p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/20 border-blue-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Total Withdrawals</p>
                <p className="text-2xl font-bold text-white">{withdrawals.length}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for pending items */}
      {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-400 mb-6">
          <AlertDescription>
            ⚠️ You have {pendingDeposits.length} pending deposits and {pendingWithdrawals.length} pending withdrawals waiting for review.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Management Tabs */}
      <Card className="bg-gray-900/80 border-gray-600/30">
        <CardContent className="p-0">
          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 rounded-t-lg">
              <TabsTrigger 
                value="deposits" 
                className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                💳 Deposit Management ({pendingDeposits.length} pending)
              </TabsTrigger>
              <TabsTrigger 
                value="withdrawals" 
                className="text-gray-300 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                💸 Withdrawal Management ({pendingWithdrawals.length} pending)
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="deposits" className="m-0">
                <DepositManagement 
                  deposits={deposits} 
                  onUpdate={loadData}
                />
              </TabsContent>

              <TabsContent value="withdrawals" className="m-0">
                <WithdrawalManagement 
                  withdrawals={withdrawals} 
                  onUpdate={loadData}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}