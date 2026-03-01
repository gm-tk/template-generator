'use client';

import TemplateAnalyzer from '@/components/TemplateAnalyzer';
import { ToastProvider } from '@/components/Toaster';

export default function Home() {
  return (
    <ToastProvider>
      <TemplateAnalyzer />
    </ToastProvider>
  );
}
