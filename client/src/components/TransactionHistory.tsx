import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Deposit, Withdrawal } from '../../../server/src/schema';

interface TransactionHistoryProps {
  userId: number;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        trpc.getUserDeposits.query({ user_id: userId }),
        trpc.getUserWithdrawals.query({ user_id: userId })
      ]);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-400/30">⏳ Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-600/20 text-green-400 border-green-400/30">✅ Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600/20 text-red-400 border-red-400/30">❌ Rejected</Badge>;
      default:
        return <Badge className="bg-gray-600/20 text-gray-400 border-gray-400/30">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Loading transaction history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">📊 Transaction History</h2>
        <p className="text-gray-400">View all your deposits and withdrawals</p>
      </div>

      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
          <TabsTrigger 
            value="deposits" 
            className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            💳 Deposits ({deposits.length})
          </TabsTrigger>
          <TabsTrigger 
            value="withdrawals" 
            className="text-gray-300 data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            💸 Withdrawals ({withdrawals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-4 mt-4">
          {deposits.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No deposit history yet</div>
                <p className="text-sm text-gray-500 mt-2">Your deposits will appear here once you make one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit: Deposit) => (
                <Card key={deposit.id} className="bg-gray-800/30 border-purple-400/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">
                            Rp {deposit.amount.toLocaleString('id-ID')}
                          </span>
                          <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/30">
                            {deposit.payment_method}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          ID: {deposit.id} • {deposit.created_at.toLocaleDateString('id-ID')} {deposit.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {deposit.target_number && (
                          <div className="text-sm text-gray-400">
                            Target: {deposit.target_number}
                          </div>
                        )}
                        
                        {deposit.admin_notes && (
                          <div className="text-sm text-yellow-400 mt-2">
                            Admin Notes: {deposit.admin_notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right space-y-2">
                        {getStatusBadge(deposit.status)}
                        
                        {deposit.proof_image_url && (
                          <div>
                            <a 
                              href={deposit.proof_image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              View Proof
                            </a>
                          </div>
                        )}
                        
                        {deposit.admin_response_image_url && (
                          <div>
                            <a 
                              href={deposit.admin_response_image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-green-400 hover:underline"
                            >
                              Admin Response
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4 mt-4">
          {withdrawals.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No withdrawal history yet</div>
                <p className="text-sm text-gray-500 mt-2">Your withdrawals will appear here once you make one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal: Withdrawal) => (
                <Card key={withdrawal.id} className="bg-gray-800/30 border-red-400/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">
                            Rp {withdrawal.amount.toLocaleString('id-ID')}
                          </span>
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-400/30">
                            {withdrawal.bank_name}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          ID: {withdrawal.id} • {withdrawal.created_at.toLocaleDateString('id-ID')} {withdrawal.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          Account: {withdrawal.account_number} ({withdrawal.account_holder_name})
                        </div>
                        
                        {withdrawal.admin_notes && (
                          <div className="text-sm text-yellow-400 mt-2">
                            Admin Notes: {withdrawal.admin_notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}