// app/dashboard/_components/kpi-cards.tsx
"use client";

import { AlertTriangle, CheckCircle, Clock, AlertCircle, Wrench } from "lucide-react";

interface KpiCardsProps {
  total_assets?: number;
  overdue_count?: number;
  due_soon_count?: number;
  critical_count?: number;
  poor_condition?: number;
}

export function KpiCards({ 
  total_assets = 0,
  overdue_count = 0,
  due_soon_count = 0,
  critical_count = 0,
  poor_condition = 0,
}: KpiCardsProps) {
  const cards = [
    {
      title: "Total Assets",
      value: total_assets.toLocaleString(),
      icon: Wrench,
      color: "text-navy-200",
      bg: "bg-navy-800/50",
    },
    {
      title: "Overdue Maintenance",
      value: overdue_count.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-900/20 border-red-500/30",
      alert: overdue_count > 0,
    },
    {
      title: "Due Soon (30d)",
      value: due_soon_count.toLocaleString(),
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-900/20 border-amber-500/30",
      alert: due_soon_count > 0,
    },
    {
      title: "Critical Assets",
      value: critical_count.toLocaleString(),
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-900/30 border-red-500/50",
      alert: critical_count > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={
              "card p-4 rounded-lg border transition " +
              (card.bg || "bg-navy-800") +
              (card.alert ? " border-l-4 border-l-amber-400" : "")
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span className={"text-sm font-medium " + card.color}>{card.title}</span>
              <Icon className={"w-5 h-5 " + card.color} />
            </div>
            <p className="text-2xl font-bold text-navy-50">{card.value}</p>
            {card.alert && (
              <p className="text-xs text-amber-300 mt-1">Requires attention</p>
            )}
          </div>
        );
      })}
    </div>
  );
}