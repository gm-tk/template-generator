import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HTML Template Analyzer — Te Kura',
  description: 'Analyze Te Kura HTML lesson files and generate canonical templates from structural consensus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
