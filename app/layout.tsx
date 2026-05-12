// app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Target, 
  Calendar,
  Settings,
  LogOut,
  Wrench
} from "lucide-react";

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

// Navigation items
const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assets", href: "/assets", icon: Package },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
  { name: "Campaign", href: "/campaign-dashboard", icon: Target },
  { name: "Daily Assignments", href: "/daily-assignments", icon: Calendar },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmSans.variable} ${ibmMono.variable} bg-navy-950 text-navy-50`}>
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                  <span className="text-navy-950 font-bold text-sm">GG</span>
                </div>
                <span className="font-semibold text-navy-50 hidden sm:inline">
                  Gharib Gulf
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-navy-300 hover:text-amber-400 hover:bg-navy-800 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Right side - User / Settings */}
              <div className="hidden md:flex items-center gap-2">
                <button className="p-2 rounded-lg text-navy-400 hover:text-amber-400 hover:bg-navy-800 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg text-navy-400 hover:text-red-400 hover:bg-navy-800 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu - shows Campaign link */}
              <div className="md:hidden">
                <Link 
                  href="/campaign-dashboard"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-navy-950 text-sm font-medium rounded transition"
                >
                  Campaign
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-navy-800 py-4 text-center text-xs text-navy-400">
          <p>Gharib Gulf Maintenance System • © {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}