'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { api, Wallet, WalletTransaction } from '../../../lib/api';
import {
  Wallet as WalletIcon,
  RefreshCw,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';

const PRESET_TOPUPS = [50, 100, 250, 500, 1000];

export default function WalletPage() {
  const { activeWorkspace } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const [wlt, txs] = await Promise.all([
        api.getWallet(),
        api.getTransactions(),
      ]);
      setWallet(wlt);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleWalletUpdated = () => {
      loadData();
    };

    window.addEventListener('botnexa:wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('botnexa:wallet-updated', handleWalletUpdated);
    };
  }, [activeWorkspace]);

  const handleTopUp = async () => {
    const amountInRupees = customAmount ? parseFloat(customAmount) : selectedPreset;
    if (isNaN(amountInRupees) || amountInRupees < 10) {
      setErrorMessage('Minimum top-up amount is ₹10.00');
      return;
    }
    if (amountInRupees > 50000) {
      setErrorMessage('Maximum single top-up amount is ₹50,000.00');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Minor units: 1 INR = 100 minor units (paise)
      const minorAmount = Math.round(amountInRupees * 100);
      await api.topUpWallet({ amountMinor: minorAmount });

      setSuccessMessage(`Successfully credited ₹${amountInRupees.toFixed(2)} to workspace wallet.`);
      setCustomAmount('');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || 'Top-up failed');
      } else {
        setErrorMessage('Top-up failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const { availableRupees, reservedRupees, lifetimeRupees } = React.useMemo(() => {
    const rawBal = Number(wallet?.balance ?? 0);
    const rawRes = Number(wallet?.reservedAmount ?? 0);
    const rawLft = Number(wallet?.lifetimeSpent ?? 0);

    return {
      availableRupees: isNaN(rawBal - rawRes) ? '₹0.00' : `₹${(Math.max(0, rawBal - rawRes) / 100).toFixed(2)}`,
      reservedRupees: isNaN(rawRes) ? '₹0.00' : `₹${(rawRes / 100).toFixed(2)}`,
      lifetimeRupees: isNaN(rawLft) ? '₹0.00' : `₹${(rawLft / 100).toFixed(2)}`,
    };
  }, [wallet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Wallet & Metering</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Prepaid balance ledger, escrow reservations, and token accounting records for <span className="text-zinc-200 font-medium">{activeWorkspace?.name}</span>.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* 3 Clear Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium uppercase tracking-wider">
              <span>Available Balance</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              {availableRupees}
            </div>
            <p className="text-[11px] text-zinc-400">
              Unreserved funds available for immediate AI completions and pgvector indexing.
            </p>
          </CardContent>
        </Card>

        {/* Reserved in Escrow */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium uppercase tracking-wider">
              <span>Reserved in Escrow</span>
              <Clock className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-200 tracking-tight">
              {reservedRupees}
            </div>
            <p className="text-[11px] text-zinc-400">
              Temporarily locked during streaming requests to prevent negative balances. Unused funds auto-release.
            </p>
          </CardContent>
        </Card>

        {/* Lifetime Spent */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium uppercase tracking-wider">
              <span>Lifetime Consumed</span>
              <ShieldCheck className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-400 tracking-tight">
              {lifetimeRupees}
            </div>
            <p className="text-[11px] text-zinc-400">
              Cumulative token consumption and embedding settlements since workspace provisioning.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top-Up Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Add Prepaid Credits</CardTitle>
            <CardDescription>
              Select an amount in Indian Rupees (INR) to top up your prepaid inference wallet.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">Select Preset Denomination</label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_TOPUPS.map((amount) => {
                const isSelected = selectedPreset === amount && !customAmount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(amount);
                      setCustomAmount('');
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border border-blue-500 shadow-xs'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    ₹{amount}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Input
              label="Or Custom Amount (₹10 – ₹50,000)"
              type="number"
              placeholder="e.g. 750"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              prefixIcon={<span className="text-zinc-500 font-mono text-xs">₹</span>}
            />

            <div>
              <Button
                variant="primary"
                size="md"
                loading={submitting}
                onClick={handleTopUp}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                Top Up ₹{customAmount ? Number(customAmount || 0).toFixed(2) : selectedPreset.toFixed(2)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Ledger */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Financial Transaction Ledger</CardTitle>
            <CardDescription>
              Chronological log of deposits, deductions, and escrow settlements.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No transactions recorded in this workspace.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Opening Bal</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Closing Bal</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'credit' || tx.type === 'refund';
                  const displayOpening = (Number(tx.openingBalance ?? 0) / 100).toFixed(2);
                  const displayAmount = (tx.amount / 100).toFixed(2);
                  const displayClosing = (Number(tx.closingBalance ?? tx.balanceAfter ?? 0) / 100).toFixed(2);

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 truncate max-w-[130px]">
                        {tx.id.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={isCredit ? 'success' : tx.type === 'reservation' ? 'warning' : 'neutral'}
                          size="xs"
                        >
                          {tx.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 truncate max-w-xs">
                        {tx.reason || 'Token Inference Settlement'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">
                        ₹{displayOpening}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-medium ${isCredit ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {isCredit ? `+₹${displayAmount}` : `-₹${displayAmount}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-zinc-200">
                        ₹{displayClosing}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={tx.status === 'succeeded' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                          size="xs"
                          dot
                        >
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
