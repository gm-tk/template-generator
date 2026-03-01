'use client';

interface TemplatePreviewProps {
  html: string;
}

export default function TemplatePreview({ html }: TemplatePreviewProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        Preview loads external Te Kura styles. If styles don&apos;t appear, the template is still correct — open the downloaded file on the Te Kura network.
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <iframe
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          title="Template Preview"
          className="w-full"
          style={{ minHeight: '600px' }}
        />
      </div>
    </div>
  );
}
