import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Deposit, ProcessDepositInput } from '../../../server/src/schema';

interface DepositManagementProps {
  deposits: Deposit[];
  onUpdate: () => void;
}

export function DepositManagement({ deposits, onUpdate }: DepositManagementProps) {
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingDeposits = deposits.filter(d => d.status === 'PENDING');
  const processedDeposits = deposits.filter(d => d.status !== 'PENDING');

  const handleProcessDeposit = async (
    depositId: number, 
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
    adminResponseImageUrl?: string
  ) => {
    setProcessing(depositId);
    setError(null);
    setSuccess(null);

    try {
      const processData: ProcessDepositInput = {
        deposit_id: depositId,
        status,
        admin_notes: adminNotes || undefined,
        admin_response_image_url: adminResponseImageUrl || undefined
      };

      await trpc.processDeposit.mutate(processData);
      setSuccess(`Deposit ${status.toLowerCase()} successfully!`);
      onUpdate(); // Refresh the data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process deposit');
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
        <h2 className="text-2xl font-bold text-white mb-2">💳 Deposit Management</h2>
        <p className="text-gray-400">Review and process member deposit requests</p>
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
            ⏳ Pending ({pendingDeposits.length})
          </TabsTrigger>
          <TabsTrigger 
            value="processed" 
            className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            📋 Processed ({processedDeposits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingDeposits.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No pending deposits</div>
                <p className="text-sm text-gray-500 mt-2">All deposits have been processed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingDeposits.map((deposit: Deposit) => (
                <DepositCard 
                  key={deposit.id} 
                  deposit={deposit} 
                  onProcess={handleProcessDeposit}
                  isProcessing={processing === deposit.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4 mt-4">
          {processedDeposits.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-600/30">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">No processed deposits yet</div>
                <p className="text-sm text-gray-500 mt-2">Processed deposits will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {processedDeposits.map((deposit: Deposit) => (
                <Card key={deposit.id} className="bg-gray-800/30 border-gray-400/20">
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
                          ID: {deposit.id} • User: {deposit.user_id} • {deposit.created_at.toLocaleDateString('id-ID')}
                        </div>
                        
                        {deposit.admin_notes && (
                          <div className="text-sm text-yellow-400 mt-2">
                            Notes: {deposit.admin_notes}
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
                              className="text-xs text-blue-400 hover:underline block"
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
                              className="text-xs text-green-400 hover:underline block"
                            >
                              Response Image
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
      </Tabs>
    </div>
  );
}

interface DepositCardProps {
  deposit: Deposit;
  onProcess: (depositId: number, status: 'APPROVED' | 'REJECTED', notes?: string, responseImageUrl?: string) => void;
  isProcessing: boolean;
}

function DepositCard({ deposit, onProcess, isProcessing }: DepositCardProps) {
  const [notes, setNotes] = useState('');
  const [responseImageUrl, setResponseImageUrl] = useState('');

  return (
    <Card className="bg-yellow-900/20 border-yellow-400/20">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="text-yellow-400">Deposit Request #{deposit.id}</span>
          <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/30">
            {deposit.payment_method}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">User ID:</span>
            <span className="text-white ml-2">{deposit.user_id}</span>
          </div>
          <div>
            <span className="text-gray-400">Amount:</span>
            <span className="text-white ml-2 font-semibold">Rp {deposit.amount.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-gray-400">Date:</span>
            <span className="text-white ml-2">{deposit.created_at.toLocaleDateString('id-ID')} {deposit.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {deposit.target_number && (
            <div>
              <span className="text-gray-400">Target:</span>
              <span className="text-white ml-2">{deposit.target_number}</span>
            </div>
          )}
        </div>

        {deposit.proof_image_url && (
          <div className="space-y-2">
            <Label className="text-gray-300">Payment Proof:</Label>
            <div className="flex items-center space-x-2">
              <a 
                href={deposit.proof_image_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                View Uploaded Proof Image
              </a>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-400/30">QRIS</Badge>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`notes-${deposit.id}`} className="text-gray-300">Admin Notes (Optional)</Label>
            <Textarea
              id={`notes-${deposit.id}`}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              className="bg-gray-800/50 border-purple-400/30 text-white"
              placeholder="Add notes for the user..."
              rows={2}
            />
          </div>

          {deposit.payment_method === 'QRIS' && (
            <div className="space-y-2">
              <Label htmlFor={`response-${deposit.id}`} className="text-gray-300">Response Image URL (For QRIS)</Label>
              <Input
                id={`response-${deposit.id}`}
                type="url"
                value={responseImageUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponseImageUrl(e.target.value)}
                className="bg-gray-800/50 border-purple-400/30 text-white"
                placeholder="https://example.com/confirmation-image.jpg"
              />
              <p className="text-xs text-gray-400">
                Upload confirmation/receipt image for QRIS deposits
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-2">
          <Button
            onClick={() => onProcess(deposit.id, 'APPROVED', notes, responseImageUrl)}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? 'Processing...' : '✅ Approve'}
          </Button>
          
          <Button
            onClick={() => onProcess(deposit.id, 'REJECTED', notes)}
            disabled={isProcessing}
            variant="destructive"
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : '❌ Reject'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}