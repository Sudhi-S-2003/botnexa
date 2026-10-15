'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Lock, Mail, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent } from '../../../components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async () => {
    setEmail('demo@botnexa.ai');
    setPassword('DemoPass123!');
    setError(null);
    setLoading(true);

    try {
      try {
        await login('demo@botnexa.ai', 'DemoPass123!');
      } catch {
        // Auto-provision demo account if DB was freshly initialized
        await register('Demo Admin', 'demo@botnexa.ai', 'DemoPass123!', 'BotNexa Demo Workspace');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Demo authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 antialiased">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2 mb-2 group">
            <div className="relative w-8 h-8 rounded-md overflow-hidden border border-zinc-700">
              <Image src="/botnexa-icon.jpg" alt="BotNexa" fill className="object-cover" />
            </div>
            <span className="font-bold text-base tracking-tight text-zinc-100">BotNexa</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Sign in to console</h1>
          <p className="text-xs text-zinc-400">
            Enter your credentials to access your multi-tenant workspace.
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardContent className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefixIcon={<Mail className="w-3.5 h-3.5" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefixIcon={<Lock className="w-3.5 h-3.5" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                loading={loading}
              >
                Sign In
              </Button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink mx-2 text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                Evaluation
              </span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleDemoFill}
              disabled={loading}
              icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            >
              Quick Sign In (Demo Admin)
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
