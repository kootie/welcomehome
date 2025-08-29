import React, { useEffect, useState } from 'react';
import Button from '../components/common/Button.tsx';

type UserWallet = { wallet_address: string } | null;

const Wallet: React.FC = () => {
  const [email, setEmail] = useState('');
  const [wallet, setWallet] = useState<UserWallet>(null);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle'|'submitting'|'ok'|'error'>('idle');

  async function fetchWallet() {
    if (!email) return;
    const url = `${process.env.REACT_APP_API_BASE_URL || '/api'}/users/wallet/by-email?email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      setWallet(json?.data?.wallet || null);
    }
  }

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/payments/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token_symbol: 'USDC', amount, network: 'ALKEBULEUM' })
      });
      if (!res.ok) throw new Error('Deposit failed');
      setStatus('ok');
    } catch (e) {
      setStatus('error');
    }
  }

  useEffect(() => { 
    fetchWallet(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-6 rounded-xl bg-white border border-secondary-100 shadow-sm">
        <h1 className="text-headline mb-4">Your Wallet</h1>
        {wallet ? (
          <div className="mb-6">
            <div className="text-sm text-secondary-600">Assigned address</div>
            <div className="font-mono text-secondary-900 break-all">{wallet.wallet_address}</div>
            <Button variant="secondary" className="w-full mt-3" onClick={fetchWallet}>Refresh wallet</Button>
          </div>
        ) : (
          <p className="text-secondary-600 mb-6 text-sm">KYC-approved users receive an assigned wallet automatically.</p>
        )}
        <form onSubmit={deposit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Account email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Deposit amount (USDC)</label>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={status==='submitting'}>
            {status==='submitting' ? 'Submitting...' : 'Record deposit'}
          </Button>
          {status==='ok' && <p className="text-sm text-success-600">Deposit recorded.</p>}
          {status==='error' && <p className="text-sm text-danger-600">Deposit failed.</p>}
        </form>
      </div>
    </div>
  );
};

export default Wallet;


