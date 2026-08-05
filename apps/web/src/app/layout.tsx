import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paydex — Never lose a payment event again',
  description: 'Payment Event Gateway & Audit Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
