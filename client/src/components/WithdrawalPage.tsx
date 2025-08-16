import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateWithdrawalInput } from '../../../server/src/schema';

interface WithdrawalPageProps {
  userId: number;
  userBalance: number;
}

export function WithdrawalPage({ userId, userBalance }: WithdrawalPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [withdrawalData, setWithdrawalData] = useState<CreateWithdrawalInput>({
    user_id: userId,
    amount: 0,
    bank_name: '',
    account_number: '',
    account_holder_name: ''
  });

  const popularBanks = [
    'BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 
    'Danamon', 'Permata', 'BTN', 'Bank Mega', 'OCBC NISP'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await trpc.createWithdrawal.mutate(withdrawalData);
      setSuccess(`Withdrawal request submitted successfully! Request ID: ${result.id}`);
      
      // Reset form
      setWithdrawalData({
        user_id: userId,
        amount: 0,
        bank_name: '',
        account_number: '',
        account_holder_name: ''
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create withdrawal request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">💸 Withdraw Funds</h2>
        <p className="text-gray-400">Transfer your NEON77 balance to your bank account</p>
      </div>

      {/* Balance Info */}
      <Card className="bg-green-900/20 border-green-400/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Available Balance:</span>
            <span className="text-2xl font-bold text-green-400">
              Rp {userBalance.toLocaleString('id-ID')}
            </span>
          </div>
        </CardContent>
      </Card>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-gray-300">Withdrawal Amount (IDR)</Label>
          <Input
            id="amount"
            type="number"
            min="50000"
            max={userBalance}
            step="1000"
            value={withdrawalData.amount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWithdrawalData((prev: CreateWithdrawalInput) => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))
            }
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="Minimum: Rp 50,000"
            required
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Minimum withdrawal: Rp 50,000</span>
            <span>Maximum: Rp {userBalance.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Bank Name */}
        <div className="space-y-2">
          <Label htmlFor="bank" className="text-gray-300">Bank Name</Label>
          <Input
            id="bank"
            value={withdrawalData.bank_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWithdrawalData((prev: CreateWithdrawalInput) => ({ 
                ...prev, 
                bank_name: e.target.value 
              }))
            }
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="e.g., BCA, Mandiri, BNI"
            required
          />
          
          {/* Popular banks quick select */}
          <div className="flex flex-wrap gap-2 mt-2">
            {popularBanks.map((bank) => (
              <Button
                key={bank}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setWithdrawalData((prev: CreateWithdrawalInput) => ({ 
                    ...prev, 
                    bank_name: bank 
                  }))
                }
                className="border-purple-400/30 text-purple-400 hover:bg-purple-500/10 text-xs"
              >
                {bank}
              </Button>
            ))}
          </div>
        </div>

        {/* Account Number */}
        <div className="space-y-2">
          <Label htmlFor="account" className="text-gray-300">Account Number</Label>
          <Input
            id="account"
            value={withdrawalData.account_number}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWithdrawalData((prev: CreateWithdrawalInput) => ({ 
                ...prev, 
                account_number: e.target.value 
              }))
            }
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="Enter your bank account number"
            required
          />
        </div>

        {/* Account Holder Name */}
        <div className="space-y-2">
          <Label htmlFor="holder" className="text-gray-300">Account Holder Name</Label>
          <Input
            id="holder"
            value={withdrawalData.account_holder_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWithdrawalData((prev: CreateWithdrawalInput) => ({ 
                ...prev, 
                account_holder_name: e.target.value 
              }))
            }
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="Full name as on bank account"
            required
          />
          <p className="text-xs text-gray-400">
            Must match exactly with your bank account name
          </p>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || withdrawalData.amount < 50000 || withdrawalData.amount > userBalance}
          className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold shadow-lg shadow-red-500/25 text-lg py-3"
        >
          {isLoading ? 'Processing...' : `💸 Submit Withdrawal Request`}
        </Button>
      </form>

      {/* Instructions */}
      <Card className="bg-orange-900/20 border-orange-400/20">
        <CardHeader>
          <CardTitle className="text-orange-400 flex items-center">
            ⚠️ Withdrawal Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-300">
          <p>1. Minimum withdrawal amount is Rp 50,000</p>
          <p>2. Ensure your bank details are correct and complete</p>
          <p>3. Account holder name must match your bank account exactly</p>
          <p>4. Processing time: 1-3 business days</p>
          <p>5. Admin may reject requests with incorrect information</p>
          <p>6. Contact support if you have any questions</p>
        </CardContent>
      </Card>
    </div>
  );
}