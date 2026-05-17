"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    }
    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(90deg, oklch(0.55 0.18 30), oklch(0.50 0.20 20))" }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          Tryb offline — dane zapisywane lokalnie
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(90deg, oklch(0.55 0.18 155), oklch(0.50 0.20 165))" }}
        >
          <Wifi className="h-3.5 w-3.5" />
          Połączenie przywrócone
        </motion.div>
      )}
    </AnimatePresence>
  );
}
