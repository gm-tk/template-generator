'use client';

import { useCallback, useState } from 'react';

interface TemplateCodeProps {
  html: string;
}

export default function TemplateCode({ html }: TemplateCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = html;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [html]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-auto bg-gray-900 max-h-[600px]">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="text-gray-100 font-mono whitespace-pre">{html}</code>
        </pre>
      </div>
    </div>
  );
}
