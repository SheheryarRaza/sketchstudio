import type { Metadata } from 'next';
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`dark ${instrumentSans.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="bg-studio-950 text-slate-100 antialiased overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
