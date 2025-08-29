import React, { useState } from 'react';
import Button from '../components/common/Button.tsx';

const KYC: React.FC = () => {
  const [status, setStatus] = useState<'idle'|'submitting'|'pending'|'verified'|'rejected'>('idle');
  const [docType, setDocType] = useState('PASSPORT');
  const [docNumber, setDocNumber] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [wallet, setWallet] = useState('');

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet, document_type: docType, document_number: docNumber, document_url: docUrl }),
      });
      if (!res.ok) throw new Error('KYC submission failed');
      setStatus('pending');
    } catch (err) {
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-6 rounded-xl bg-white border border-secondary-100 shadow-sm">
        <h1 className="text-headline mb-4">KYC Verification</h1>
        <form onSubmit={submitKyc} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Wallet address</label>
            <input value={wallet} onChange={(e) => setWallet(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full border rounded-md px-3 py-2">
              <option>PASSPORT</option>
              <option>DRIVERS_LICENSE</option>
              <option>NATIONAL_ID</option>
              <option>UTILITY_BILL</option>
              <option>BANK_STATEMENT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Document number</label>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Document URL</label>
            <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={status==='submitting'}>
            {status==='submitting' ? 'Submitting...' : 'Submit for verification'}
          </Button>
        </form>
        {status==='pending' && <p className="mt-4 text-secondary-600 text-sm">Submitted. A verifier must approve your KYC. You'll receive a wallet upon approval.</p>}
      </div>
    </div>
  );
};

export default KYC;


