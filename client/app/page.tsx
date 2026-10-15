import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Database,
  Layers,
  Lock,
  ArrowRight,
  ExternalLink,
  Code2,
  Coins,
  CheckCircle2,
  FileCode,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { InteractiveSandbox } from '../components/landing/InteractiveSandbox';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-md overflow-hidden border border-zinc-700 shrink-0">
              <Image src="/botnexa-icon.jpg" alt="BotNexa Icon" fill className="object-cover" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-zinc-100">BotNexa</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                SaaS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">
              Architecture
            </a>
            <a href="#interactive-demo" className="hover:text-zinc-200 transition-colors">
              Live Sandbox
            </a>
            <a href="#pricing" className="hover:text-zinc-200 transition-colors">
              Pricing
            </a>
            <a
              href="/botnexa-api/api-docs"
              target="_blank"
              className="hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <span>API Specs</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/auth/login">
              <Button size="xs" variant="ghost">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="xs" variant="primary">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>PRODUCTION-READY MULTI-TENANT AI INFRASTRUCTURE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight leading-tight max-w-3xl mx-auto">
          Ground customer support assistants with your proprietary data.
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          BotNexa pairs Google Gemini with PostgreSQL pgvector dense retrieval, atomic prepaid ledger accounting, and 2-line embeddable chat widgets for web applications.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/auth/register">
            <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Start Free Trial (₹50 Included)
            </Button>
          </Link>
          <a href="/botnexa-api/api-docs" target="_blank">
            <Button size="lg" variant="secondary" icon={<ExternalLink className="w-4 h-4" />} iconPosition="right">
              View Swagger REST API
            </Button>
          </a>
        </div>
      </section>

      {/* Core Architectural Foundations */}
      <section id="architecture" className="py-14 border-t border-zinc-800/80 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Engineered For Technical Rigor
          </h2>
          <h3 className="text-xl font-bold text-zinc-100">
            Built on reliable, standard enterprise foundations.
          </h3>
          <p className="text-xs text-zinc-400">
            Zero proprietary lock-in. Real relational models, dense vector embeddings, and deterministic concurrency control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-blue-400">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-100">PostgreSQL + pgvector</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Knowledge sources are split into overlapping chunks and stored alongside 3072-dim embeddings for sub-50ms cosine distance semantic search.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-100">Prepaid Escrow Metering</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Concurrency-safe two-phase reservations prevent balance overdrafts during streaming completions. Exact token costs settled in minor units.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-400">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-100">Strict Tenant Isolation</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Workspaces operate as completely segregated boundaries. Foreign-key constraints and RBAC guards protect data across organizations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                <Code2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-100">2-Line Website Widget</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Embed a vanilla JS launcher widget (&lt;15KB) with signed short-lived tokens and domain origin restrictions on any website or CMS.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Architecture Sandbox */}
      <section id="interactive-demo" className="py-14 border-t border-zinc-800/80 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-1.5">
          <Badge variant="info" size="xs">
            Interactive Architecture Sandbox
          </Badge>
          <h3 className="text-xl font-bold text-zinc-100">
            Test Grounded Retrieval & Citation Mechanics
          </h3>
          <p className="text-xs text-zinc-400">
            Simulated demonstration showing how BotNexa queries pgvector and provides verifiable attribution sources.
          </p>
        </div>

        <InteractiveSandbox />
      </section>

      {/* Transparent Pricing Section */}
      <section id="pricing" className="py-14 border-t border-zinc-800/80 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-1.5">
          <Badge variant="neutral" size="xs">
            Simple Unit Economics
          </Badge>
          <h3 className="text-xl font-bold text-zinc-100">
            Pay Only For The Tokens You Actually Consume
          </h3>
          <p className="text-xs text-zinc-400">
            No surprise monthly invoices. Prepaid wallet billing with exact minor-unit deductions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Free Trial</span>
                <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">₹0.00</div>
                <p className="text-xs text-zinc-400 mt-1">₹50 preloaded credits on sign-up</p>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>1 AI Assistant</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Up to 100pgvector chunks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Public link and website widget</span>
                </li>
              </ul>
              <Link href="/auth/register" className="block pt-2">
                <Button size="sm" variant="outline" className="w-full">
                  Create Trial Account
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card variant="elevated" className="border-blue-500/50">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Pay As You Go</span>
                  <Badge variant="info" size="xs">Standard</Badge>
                </div>
                <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">Prepaid Ledger</div>
                <p className="text-xs text-zinc-400 mt-1">Top up as little as ₹50.00</p>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited AI Assistants</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Google Gemini 2.5 Flash Lite</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>REST API Keys (120 req/min)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full RAG pgvector retrieval</span>
                </li>
              </ul>
              <Link href="/auth/register" className="block pt-2">
                <Button size="sm" variant="primary" className="w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Enterprise Scale</span>
                <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">Custom</div>
                <p className="text-xs text-zinc-400 mt-1">High-volume dedicated infrastructure</p>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Custom rate limits (1000+ req/min)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Dedicated VPC deployment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Enterprise SLA & 1-hr response</span>
                </li>
              </ul>
              <a href="mailto:support@botnexa.com" className="block pt-2">
                <Button size="sm" variant="secondary" className="w-full">
                  Contact Engineering
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">BotNexa</span>
            <span>•</span>
            <span>Multi-Tenant AI Chatbot SaaS Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/botnexa-api/api-docs" target="_blank" className="hover:text-zinc-300 transition-colors">
              REST API Docs
            </a>
            <Link href="/auth/login" className="hover:text-zinc-300 transition-colors">
              Console Sign In
            </Link>
            <Link href="/auth/register" className="hover:text-zinc-300 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
