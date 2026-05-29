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
  Menu,
  X,
  LogOut,
  Wrench,
  MapPin,
  Users
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ToastProvider } from "@/hooks/useToast";

// Initialize fonts
const ibmSans = IBM_Plex_Sans({ 
  subsets: ["latin"],
  variable: "--font-ibm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const ibmMono = IBM_Plex_Mono({ 
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
  display: "swap"
});

// Metadata for SEO
export const metadata: Metadata = {
  title: {
    default: "Gharib Gulf Maintenance System",
    template: "%s | Gharib Gulf"
  },
  description: "Oilfield valve & wellhead maintenance tracking for Karama Field operations",
  keywords: ["maintenance", "oilfield", "valves", "wellhead", "karama", "gharib gulf"],
  authors: [{ name: "Gharib Gulf Oil Services" }],
  creator: "Gharib Gulf Oil Services",
  publisher: "Gharib Gulf Oil Services",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Gharib Gulf Maintenance System",
    description: "Track and manage oilfield valve maintenance operations",
    type: "website",
    locale: "en_US",
    siteName: "Gharib Gulf Maintenance",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

// Navigation items configuration
const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor", "crew", "client"] },
  { name: "Assets", href: "/assets", icon: Package, roles: ["admin", "supervisor", "crew", "client"] },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList, roles: ["admin", "supervisor", "crew"] },
  { name: "Campaign", href: "/campaign-dashboard", icon: Target, roles: ["admin", "supervisor"] },
  { name: "Daily Assignments", href: "/daily-assignments", icon: Calendar, roles: ["admin", "supervisor"] },
  { name: "Mobile Tasks", href: "/mobile/tasks", icon: Wrench, roles: ["crew"], mobile: true },
];

// Mobile navigation items (simplified)
const mobileNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assets", href: "/assets", icon: Package },
  { name: "Tasks", href: "/mobile/tasks", icon: Wrench },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Preconnect to Supabase for performance */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        {/* Viewport for mobile optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0a0e17" />
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${ibmSans.variable} ${ibmMono.variable} bg-navy-950 text-navy-50 antialiased min-h-screen flex flex-col`}>
        <ToastProvider>
          {/* Navigation Header */}
          <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur-md border-b border-navy-700/50 shadow-lg shadow-navy-950/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo & Brand */}
                <Link href="/dashboard" className="flex items-center gap-3 group">
                  <div className="relative">
                    <img 
                      src="/logo.png" 
                      alt="Gharib Gulf Oil Services" 
                      className="h-10 w-auto transition-transform group-hover:scale-105"
                      onError={(e) => {
                        // Fallback if logo doesn't load
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231e3a5f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23fbbf24' font-size='10' font-family='monospace'%3EGG%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-navy-900" title="System Online" />
                  </div>
                  <div className="hidden sm:block">
                    <span className="font-bold text-navy-50 block leading-tight">Gharib Gulf</span>
                    <span className="text-xs text-navy-400 block -mt-0.5">Maintenance System</span>
                  </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
                  {navItems.filter(item => !item.mobile).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-navy-300 hover:text-amber-400 hover:bg-navy-800/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        aria-label={item.name}
                      >
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" aria-hidden="true" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                  {/* Settings Button */}
                  <Link 
                    href="/settings" 
                    className="hidden sm:flex p-2 rounded-lg text-navy-400 hover:text-amber-400 hover:bg-navy-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50" 
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings className="w-5 h-5" aria-hidden="true" />
                  </Link>

                  {/* User Menu / Logout */}
                  <div className="hidden sm:block">
                    <LogoutButton />
                  </div>

                  {/* Mobile Menu Button */}
                  <button 
                    className="lg:hidden p-2 rounded-lg text-navy-400 hover:text-amber-400 hover:bg-navy-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    aria-label="Toggle mobile menu"
                    aria-expanded="false"
                    // Note: Add state management for mobile menu toggle in a real implementation
                  >
                    <Menu className="w-6 h-6" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Bar (Bottom) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-navy-900/95 backdrop-blur-md border-t border-navy-700/50 z-50" role="navigation" aria-label="Mobile navigation">
              <div className="grid grid-cols-4 gap-1 px-2 py-2">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium text-navy-400 hover:text-amber-400 hover:bg-navy-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      aria-label={item.name}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span className="hidden xs:inline">{item.name}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/work-orders"
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium text-navy-400 hover:text-amber-400 hover:bg-navy-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  aria-label="Work Orders"
                >
                  <ClipboardList className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden xs:inline">Orders</span>
                </Link>
              </div>
            </nav>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-navy-800/50 py-4 mt-auto bg-navy-900/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Brand & Copyright */}
                <div className="flex items-center gap-3">
                  <img 
                    src="/logo.png" 
                    alt="Gharib Gulf" 
                    className="h-5 w-auto opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-navy-500">
                    © {new Date().getFullYear()} Gharib Gulf Oil Services
                  </span>
                </div>
                
                {/* System Info */}
                <div className="flex items-center gap-4 text-xs text-navy-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></span>
                    System Online
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Karama Field • v1.2.3</span>
                  <Link 
                    href="/help" 
                    className="text-amber-500/80 hover:text-amber-400 transition-colors"
                    aria-label="Help & Support"
                  >
                    Help
                  </Link>
                </div>
              </div>
            </div>
          </footer>

          {/* Skip to Content Link (Accessibility) */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-navy-950 focus:rounded-lg focus:font-medium"
          >
            Skip to main content
          </a>
        </ToastProvider>

        {/* Global Scripts / Analytics (Optional) */}
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
          <script 
            defer 
            src="https://analytics.example.com/script.js" 
            data-domain="maintenance.gharibgulf.com"
          />
        )}
      </body>
    </html>
  );
}

