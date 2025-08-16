import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { User } from '../../../server/src/schema';

// Import sub-components
import { DepositPage } from './DepositPage';
import { WithdrawalPage } from './WithdrawalPage';
import { TransactionHistory } from './TransactionHistory';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

export function UserDashboard({ user, onLogout }: UserDashboardProps) {
  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold neon-text">🎰 NEON77</h1>
          <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/30">
            Member Portal
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-gray-300">Welcome back,</p>
            <p className="text-white font-semibold">{user.username}</p>
          </div>
          <Button 
            onClick={onLogout}
            variant="outline" 
            className="border-purple-400/30 text-purple-400 hover:bg-purple-500/10"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="slot-card mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Account Balance</p>
              <p className="text-3xl font-bold text-green-400">
                💰 Rp {user.balance.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-6xl opacity-20">💎</div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Card className="slot-card">
        <CardContent className="p-0">
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 rounded-t-lg">
              <TabsTrigger 
                value="deposit" 
                className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                💳 Deposit
              </TabsTrigger>
              <TabsTrigger 
                value="withdrawal" 
                className="text-gray-300 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                💸 Withdrawal
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                📊 History
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="deposit" className="m-0">
                <DepositPage userId={user.id} />
              </TabsContent>

              <TabsContent value="withdrawal" className="m-0">
                <WithdrawalPage userId={user.id} userBalance={user.balance} />
              </TabsContent>

              <TabsContent value="history" className="m-0">
                <TransactionHistory userId={user.id} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}