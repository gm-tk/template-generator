export const metadata = {
  title: "HTML Template Analyzer",
  description: "Analyze HTML templates for shared structural patterns",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
