"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AnimatedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AnimatedEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: AnimatedEmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 blur-2xl rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 border border-blue-200/50 dark:border-blue-700/50">
          <Icon className="h-10 w-10 text-blue-500/50 dark:text-blue-400/50" />
        </div>
      </motion.div>
      <motion.h3
        className="text-lg font-semibold text-foreground mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          className="text-sm text-muted-foreground text-center max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
