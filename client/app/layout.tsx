import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://botnexa.onrender.com'),
  title: {
    default: 'BotNexa - Multi-Tenant AI Chatbot SaaS Platform',
    template: '%s | BotNexa AI',
  },
  description:
    'Production-grade multi-tenant AI chatbot SaaS platform powered by Google Gemini, PostgreSQL with pgvector, and automated wallet billing. Embed conversational AI into websites and apps in minutes.',
  keywords: [
    'AI Chatbot',
    'SaaS Platform',
    'Google Gemini AI',
    'pgvector',
    'PostgreSQL Vector Search',
    'Multi-Tenant AI',
    'Customer Support Bot',
    'Retrieval-Augmented Generation',
    'RAG Chatbot',
    'Embeddable Chat Widget',
    'AI Assistants',
    'Developer Chat API',
    'Gemini Flash Lite',
  ],
  authors: [{ name: 'BotNexa AI', url: 'https://botnexa.onrender.com' }],
  creator: 'BotNexa Engineering',
  publisher: 'BotNexa SaaS',
  alternates: {
    canonical: 'https://botnexa.onrender.com',
  },
  openGraph: {
    title: 'BotNexa - Multi-Tenant AI Chatbot SaaS Platform',
    description:
      'Deploy enterprise AI assistants powered by Google Gemini and pgvector. Zero-code website embeds, REST APIs, and prepaid wallet accounting.',
    url: 'https://botnexa.onrender.com',
    siteName: 'BotNexa',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/botnexa-hero-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'BotNexa Multi-Tenant AI Chatbot SaaS Dashboard & Architecture',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotNexa - Multi-Tenant AI Chatbot SaaS Platform',
    description:
      'Production-oriented AI chatbot platform with Google Gemini, pgvector retrieval, and instant website embeds.',
    images: ['/botnexa-hero-banner.jpg'],
    creator: '@botnexa',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/botnexa-icon.jpg', type: 'image/jpeg' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/botnexa-icon.jpg',
    apple: '/botnexa-icon.jpg',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'BotNexa',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    description: 'Free trial with ₹50 preloaded credits',
  },
  description:
    'Enterprise multi-tenant AI chatbot SaaS platform powered by Google Gemini, PostgreSQL with pgvector, and automated wallet billing.',
  url: 'https://botnexa.onrender.com',
  image: 'https://botnexa.onrender.com/botnexa-hero-banner.jpg',
  author: {
    '@type': 'Organization',
    name: 'BotNexa',
    url: 'https://botnexa.onrender.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" type="image/jpeg" href="/botnexa-icon.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/botnexa-icon.jpg" />
        <link rel="apple-touch-icon" href="/botnexa-icon.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
