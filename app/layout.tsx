// app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({ 
  subsets: ["latin"],
  variable: "--font-ibm-sans",
  weight: ["400", "500", "600", "700"]
});

const ibmMono = IBM_Plex_Mono({ 
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "Gharib Gulf Maintenance System",
  description: "Oilfield valve & wellhead maintenance tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // CRITICAL: suppressHydrationWarning for Next.js 16 + Supabase SSR
    <html lang="en" suppressHydrationWarning>
      <body className={ibmSans.variable + " " + ibmMono.variable}>
        {children}
      </body>
    </html>
  );
}