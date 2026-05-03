import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ToastContainer } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GameForge Studio',
  description: 'Professional browser-based game creation platform',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-bg-base)', color: 'var(--color-text-p)' }}>
        <TRPCProvider>
          {children}
          <ToastContainer />
        </TRPCProvider>
      </body>
    </html>
  );
}
