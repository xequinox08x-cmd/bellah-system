import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBgColor?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, iconBgColor = "bg-[#F9E0E7]" }: KPICardProps) {
  return (
    <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#444444]/60 mb-2">{title}</p>
          <p className="text-[#444444] mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-[#444444]/70">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-[#444444]/50">vs last week</span>
            </div>
          )}
        </div>
        <div className={`${iconBgColor} p-3 rounded-xl`}>
          <Icon className="w-6 h-6 text-[#D4A373]" />
        </div>
      </div>
    </Card>
  );
}
