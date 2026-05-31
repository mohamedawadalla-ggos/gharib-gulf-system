// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';

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
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}