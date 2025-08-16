import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { PaymentMethod, CreateDepositInput } from '../../../server/src/schema';

interface DepositPageProps {
  userId: number;
}

export function DepositPage({ userId }: DepositPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<string>('');

  const [depositData, setDepositData] = useState<CreateDepositInput>({
    user_id: userId,
    amount: 0,
    payment_method: 'DANA',
    proof_image_url: undefined
  });

  const paymentMethods = [
    { value: 'DANA', label: '💳 DANA', target: '083176891367' },
    { value: 'OVO', label: '🟠 OVO', target: '083194537338' },
    { value: 'GOPAY', label: '🟢 GoPay', target: '083194537338' },
    { value: 'QRIS', label: '📱 QRIS', target: 'Upload QR Code' }
  ] as const;

  const selectedMethod = paymentMethods.find(method => method.value === depositData.payment_method);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const submitData: CreateDepositInput = {
        ...depositData,
        proof_image_url: depositData.payment_method === 'QRIS' && proofImage ? proofImage : undefined
      };

      const result = await trpc.createDeposit.mutate(submitData);
      setSuccess(`Deposit request submitted successfully! Request ID: ${result.id}`);
      
      // Reset form
      setDepositData({
        user_id: userId,
        amount: 0,
        payment_method: 'DANA',
        proof_image_url: undefined
      });
      setProofImage('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create deposit request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">💰 Make a Deposit</h2>
        <p className="text-gray-400">Add funds to your NEON77 account</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-2">
          <Label className="text-gray-300">Payment Method</Label>
          <Select
            value={depositData.payment_method}
            onValueChange={(value: PaymentMethod) =>
              setDepositData((prev: CreateDepositInput) => ({ ...prev, payment_method: value }))
            }
          >
            <SelectTrigger className="bg-gray-800/50 border-purple-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-purple-400/30">
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value} className="text-white hover:bg-purple-500/20">
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Information Card */}
        {selectedMethod && (
          <Card className="bg-gray-800/30 border-purple-400/20">
            <CardHeader>
              <CardTitle className="text-lg text-purple-400 flex items-center">
                {selectedMethod.label} Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Target Number:</span>
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-400/30">
                    {selectedMethod.target}
                  </Badge>
                </div>
                {depositData.payment_method !== 'QRIS' && (
                  <p className="text-sm text-gray-400">
                    Send your payment to the number above, then fill in the amount below.
                  </p>
                )}
                {depositData.payment_method === 'QRIS' && (
                  <p className="text-sm text-gray-400">
                    Upload your QR code payment proof after making the payment.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-gray-300">Amount (IDR)</Label>
          <Input
            id="amount"
            type="number"
            min="10000"
            step="1000"
            value={depositData.amount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDepositData((prev: CreateDepositInput) => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))
            }
            className="bg-gray-800/50 border-purple-400/30 text-white"
            placeholder="Minimum: Rp 10,000"
            required
          />
          <p className="text-xs text-gray-400">Minimum deposit: Rp 10,000</p>
        </div>

        {/* QRIS Proof Upload */}
        {depositData.payment_method === 'QRIS' && (
          <div className="space-y-2">
            <Label htmlFor="proof" className="text-gray-300">Payment Proof (Image URL)</Label>
            <Input
              id="proof"
              type="url"
              value={proofImage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProofImage(e.target.value)}
              className="bg-gray-800/50 border-purple-400/30 text-white"
              placeholder="https://example.com/your-payment-proof.jpg"
              required
            />
            <p className="text-xs text-gray-400">
              Upload your payment screenshot to an image hosting service and paste the URL here
            </p>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading || depositData.amount < 10000}
          className="w-full slot-button text-lg py-3"
        >
          {isLoading ? 'Processing...' : `🚀 Submit Deposit Request`}
        </Button>
      </form>

      {/* Instructions */}
      <Card className="bg-blue-900/20 border-blue-400/20">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center">
            ℹ️ Deposit Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-300">
          <p>1. Select your preferred payment method</p>
          <p>2. Send payment to the provided target number</p>
          <p>3. Enter the exact amount you sent</p>
          <p>4. For QRIS payments, upload your payment proof</p>
          <p>5. Submit your deposit request</p>
          <p>6. Wait for admin approval (usually within 15 minutes)</p>
        </CardContent>
      </Card>
    </div>
  );
}