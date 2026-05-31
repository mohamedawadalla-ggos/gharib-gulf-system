// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ToastProvider';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gharib Gulf System',
  description: 'Wellhead & Valves Maintenance Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <Navbar />
          <main className="min-h-screen bg-navy-950">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}