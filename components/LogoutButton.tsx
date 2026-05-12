// components/LogoutButton.tsx
'use client';

import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export function LogoutButton() {
  const { handleLogout } = useAuth();

  return (
    <button
      onClick={handleLogout}
      className="p-2 rounded-lg text-navy-400 hover:text-red-400 hover:bg-navy-800 transition-colors"
      title="Logout"
      aria-label="Logout"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
}