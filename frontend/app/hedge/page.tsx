'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useContract } from '@/context/contract-context';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HedgePositions } from '@/components/hedge-positions';

const MODULE_ADDRESS = '0x7921f7e9342c39d58dc627c73ae224380d877b9a838d9b7fba82f8fbde135821';

export default function HedgePage() {
  const { account } = useWallet();
  const { contractClient } = useContract();
  const [borrowerId, setBorrowerId] = useState('');
  const [amount, setAmount] = useState('');
  const [hedgeRatio, setHedgeRatio] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createHedgePosition = async () => {
    if (!account) return;

    try {
      setLoading(true);
      await contractClient.createHedgePosition(
        account,
        borrowerId,
        parseInt(amount),
        parseInt(hedgeRatio)
      );
      setStatus('Successfully created hedge position');
      setError('');
      // Reset form
      setBorrowerId('');
      setAmount('');
      setHedgeRatio('');
    } catch (e) {
      setError('Failed to create hedge position: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to use the hedge contract.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Hedge Position</CardTitle>
          <CardDescription>Create a new hedge position for a borrower</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="borrowerId">Borrower ID</Label>
              <Input
                id="borrowerId"
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                placeholder="Enter borrower ID"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="hedgeRatio">Hedge Ratio (0-10000)</Label>
              <Input
                id="hedgeRatio"
                type="number"
                value={hedgeRatio}
                onChange={(e) => setHedgeRatio(e.target.value)}
                placeholder="Enter hedge ratio"
              />
            </div>
            <Button
              onClick={createHedgePosition}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Position'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {status && (
        <Alert className="mt-4">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <HedgePositions />
    </div>
  );
}
