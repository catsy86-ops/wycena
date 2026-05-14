"use client";

import Link from "next/link";
import { FileText, Users, FileCheck, Calendar, Package, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  { label: "Nowa wycena", href: "/wyceny/nowa", icon: FileText, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/25" },
  { label: "Nowy klient", href: "/klienci", icon: Users, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/25" },
  { label: "Nowa faktura", href: "/faktury", icon: FileCheck, color: "from-emerald-500 to-green-600", shadow: "shadow-emerald-500/25" },
  { label: "Harmonogram", href: "/harmonogram", icon: Calendar, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25" },
  { label: "Materiały", href: "/materialy", icon: Package, color: "from-cyan-500 to-teal-600", shadow: "shadow-cyan-500/25" },
  { label: "Raporty", href: "/raporty", icon: BarChart3, color: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/25" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href}>
            <motion.div
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <div className="card-modern rounded-xl p-3 sm:p-4 cursor-pointer group text-center relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className={`mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} ${action.shadow} shadow-lg mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight block">
                  {action.label}
                </span>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
