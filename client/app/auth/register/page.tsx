'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Lock, Mail, User as UserIcon, Building2, Coins } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent } from '../../../components/ui/Card';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password, workspaceName.trim() || undefined);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Registration failed. Please check your information.');
      } else {
        setError('Registration failed. Please check your information.');
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
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Create workspace</h1>
          <p className="text-xs text-zinc-400">
            Provision a multi-tenant AI operations environment. Includes ₹50.00 preloaded credits for inference.
          </p>
        </div>

        {/* Register Card */}
        <Card>
          <CardContent className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full Name"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                prefixIcon={<UserIcon className="w-3.5 h-3.5" />}
                required
              />

              <Input
                label="Work Email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefixIcon={<Mail className="w-3.5 h-3.5" />}
                required
              />

              <Input
                label="Workspace / Organization"
                placeholder="e.g. Acme Support"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                prefixIcon={<Building2 className="w-3.5 h-3.5" />}
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
                Create Account & Provision Workspace
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
