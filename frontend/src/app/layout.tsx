import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sketch Studio Pro • Real-World Scale & Tonal Drafting Assistant',
  description: 'A web-based visual analysis, real-world physical calibration, and classical atelier drafting studio for portrait and sketching artists.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-studio-950 text-slate-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
