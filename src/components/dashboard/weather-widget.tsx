"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CloudSnow, Sun, Cloud, CloudRain, Wind, Thermometer, AlertTriangle } from "lucide-react";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  clear: <Sun className="h-6 w-6 text-amber-400" />,
  clouds: <Cloud className="h-6 w-6 text-slate-400" />,
  rain: <CloudRain className="h-6 w-6 text-blue-400" />,
  snow: <CloudSnow className="h-6 w-6 text-cyan-300" />,
  wind: <Wind className="h-6 w-6 text-slate-300" />,
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Symulacja pogody (bez klucza API — mock realistyczny)
    // W produkcji: fetch(`https://api.openweathermap.org/data/2.5/weather?q=Warszawa&appid=KEY&units=metric&lang=pl`)
    const mockWeather = () => {
      const month = new Date().getMonth();
      const hour = new Date().getHours();
      // Realistyczna temperatura dla Polski
      const baseTemp = [-2, -1, 3, 9, 14, 18, 21, 20, 15, 9, 4, 0][month] ?? 10;
      const variation = (Math.random() - 0.5) * 6;
      const nightDrop = hour < 7 || hour > 20 ? -3 : 0;
      const temp = Math.round(baseTemp + variation + nightDrop);

      const conditions = temp < 0 ? "snow" : temp < 5 ? "clouds" : temp < 15 ? "clouds" : "clear";
      const descriptions: Record<string, string> = {
        snow: "Opady śniegu",
        clouds: "Zachmurzenie",
        clear: "Słonecznie",
        rain: "Deszcz",
      };

      return { temp, description: descriptions[conditions] || "Zachmurzenie", icon: conditions, city: "Polska" };
    };

    setTimeout(() => {
      setWeather(mockWeather());
      setLoading(false);
    }, 500);
  }, []);

  if (loading || !weather) return null;

  const isFreezing = weather.temp <= 0;
  const isVeryHot = weather.temp >= 30;

  return (
    <Card className={`card-modern overflow-hidden ${isFreezing ? "border-cyan-300 dark:border-cyan-700" : ""}`}>
      <CardContent className="pt-3 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isFreezing ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {WEATHER_ICONS[weather.icon] || WEATHER_ICONS.clouds}
            </motion.div>
            <div>
              <div className="text-lg font-black">{weather.temp}°C</div>
              <div className="text-[10px] text-muted-foreground">{weather.description}</div>
            </div>
          </div>

          {/* Alert mrozowy */}
          {isFreezing && (
            <motion.div
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold"
              style={{ background: "oklch(0.62 0.17 195 / 0.15)", color: "oklch(0.62 0.17 195)" }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <AlertTriangle className="h-3 w-3" />
              Ryzyko pękania rur
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
