import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Withdrawal, ProcessWithdrawalInput } from '../../../server/src/schema';

interface WithdrawalManagementProps {
  withdrawals: Withdrawal[];
  onUpdate: () => void;
}

export function WithdrawalManagement({ withdrawals, onUpdate }: WithdrawalManagementProps) {
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
  const processedWithdrawals = withdrawals.filter(w => w.status !== 'PENDING');

  const handleProcessWithdrawal = async (
    withdrawalId: number, 
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string
  ) => {
    setProcessing(withdrawalId);
    setError(null);
    setSuccess(null);

    try {
      const processData: ProcessWithdrawalInput = {
        withdrawal_id: withdrawalId,
        status,
        admin_notes: adminNotes || undefined
      };

      await trpc.processWithdrawal.mutate(processData);
      setSuccess(`Withdrawal ${status.toLowerCase()} successfully!`);
      onUpdate(); // Refresh the data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process withdrawal');
    } finally {
      setProcessing(null);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">💸 Withdrawal Management</h2>
        <p className="text-gray-400">Review and process member withdrawal requests</p>
      </div>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10 text-red-400">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-400">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
          <TabsTrigger 
            value="pending" 
            className="text-gray-300 data-[state=active]:bg-yellow-600 data-[state=active]:text-white"
          >
            ⏳ Pending ({pendingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger 
            value="processed" 
            className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            📋 Processed ({processedWithdrawals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingWithdrawals.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No pending withdrawals</div>
                <p className="text-sm text-gray-500 mt-2">All withdrawals have been processed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingWithdrawals.map((withdrawal: Withdrawal) => (
                <WithdrawalCard 
                  key={withdrawal.id} 
                  withdrawal={withdrawal} 
                  onProcess={handleProcessWithdrawal}
                  isProcessing={processing === withdrawal.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4 mt-4">
          {processedWithdrawals.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No processed withdrawals yet</div>
                <p className="text-sm text-gray-500 mt-2">Processed withdrawals will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {processedWithdrawals.map((withdrawal: Withdrawal) => (
                <Card key={withdrawal.id} className="bg-gray-800/30 border-gray-400/20">
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
                          ID: {withdrawal.id} • User: {withdrawal.user_id} • {withdrawal.created_at.toLocaleDateString('id-ID')}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          Account: {withdrawal.account_number} ({withdrawal.account_holder_name})
                        </div>
                        
                        {withdrawal.admin_notes && (
                          <div className="text-sm text-yellow-400 mt-2">
                            Notes: {withdrawal.admin_notes}
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

interface WithdrawalCardProps {
  withdrawal: Withdrawal;
  onProcess: (withdrawalId: number, status: 'APPROVED' | 'REJECTED', notes?: string) => void;
  isProcessing: boolean;
}

function WithdrawalCard({ withdrawal, onProcess, isProcessing }: WithdrawalCardProps) {
  const [notes, setNotes] = useState('');

  return (
    <Card className="bg-orange-900/20 border-orange-400/20">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="text-orange-400">Withdrawal Request #{withdrawal.id}</span>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-400/30">
            {withdrawal.bank_name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">User ID:</span>
            <span className="text-white ml-2">{withdrawal.user_id}</span>
          </div>
          <div>
            <span className="text-gray-400">Amount:</span>
            <span className="text-white ml-2 font-semibold">Rp {withdrawal.amount.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-gray-400">Date:</span>
            <span className="text-white ml-2">{withdrawal.created_at.toLocaleDateString('id-ID')} {withdrawal.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div>
            <span className="text-gray-400">Bank:</span>
            <span className="text-white ml-2">{withdrawal.bank_name}</span>
          </div>
        </div>

        <div className="space-y-2 p-3 bg-gray-800/30 rounded-lg">
          <h4 className="text-gray-300 font-medium">Bank Account Details:</h4>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">Account Number:</span>
              <span className="text-white ml-2 font-mono">{withdrawal.account_number}</span>
            </div>
            <div>
              <span className="text-gray-400">Account Holder:</span>
              <span className="text-white ml-2">{withdrawal.account_holder_name}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${withdrawal.id}`} className="text-gray-300">Admin Notes (Optional)</Label>
          <Textarea
            id={`notes-${withdrawal.id}`}
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="Add notes for the user (e.g., transaction ID, transfer details)..."
            rows={2}
          />
        </div>

        <div className="flex space-x-3 pt-2">
          <Button
            onClick={() => onProcess(withdrawal.id, 'APPROVED', notes)}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? 'Processing...' : '✅ Approve & Transfer'}
          </Button>
          
          <Button
            onClick={() => onProcess(withdrawal.id, 'REJECTED', notes)}
            disabled={isProcessing}
            variant="destructive"
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : '❌ Reject'}
          </Button>
        </div>

        <div className="text-xs text-gray-400 p-2 bg-yellow-900/10 border border-yellow-400/20 rounded">
          <strong>⚠️ Important:</strong> Verify all bank details before approving. Ensure you have sufficient funds and complete the actual bank transfer after approval.
        </div>
      </CardContent>
    </Card>
  );
}