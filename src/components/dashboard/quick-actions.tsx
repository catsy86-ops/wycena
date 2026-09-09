"use client";

import Link from "next/link";
import { FileText, Users, Droplets, Zap, FileCheck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import { sounds } from "@/lib/audio";

const actions = [
  { label: "Nowa wycena", href: "/wyceny/nowa", icon: FileText, color: "from-blue-600 to-indigo-600", shadow: "shadow-blue-500/25" },
  { label: "Hydraulika", href: "/hydraulika", icon: Droplets, color: "from-cyan-500 to-blue-600", shadow: "shadow-cyan-500/25" },
  { label: "Elektryka", href: "/elektryka", icon: Zap, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25" },
  { label: "Baza klientów", href: "/klienci", icon: Users, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/25" },
  { label: "Faktury", href: "/faktury", icon: FileCheck, color: "from-emerald-500 to-green-600", shadow: "shadow-emerald-500/25" },
  { label: "Próba szczelności", href: "/hydraulika", icon: ShieldCheck, color: "from-teal-500 to-cyan-700", shadow: "shadow-teal-500/25" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <Link key={action.label} href={action.href} onClick={() => sounds.playClick(900)}>
            <motion.div
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <div className="card-wow rounded-2xl p-3 sm:p-4 cursor-pointer group text-center relative overflow-hidden border border-border/80">
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} ${action.shadow} shadow-lg mb-2 sm:mb-2.5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight block">
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
