"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PenTool, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignaturePadProps {
  onSign: (dataUrl: string) => void;
  onCancel: () => void;
  existingSignature?: string;
}

/**
 * Podpis elektroniczny klienta — canvas do rysowania podpisu.
 * Zwraca base64 PNG po zatwierdzeniu.
 */
export function SignaturePad({ onSign, onCancel, existingSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup canvas
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load existing signature
    if (existingSignature) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight); };
      img.src = existingSignature;
      setHasContent(true);
    }
  }, [existingSignature]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  }

  function stopDraw() {
    setIsDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl);
  }

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PenTool className="h-4 w-4 text-primary" />
          Podpis klienta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Canvas */}
        <div
          className="relative rounded-lg border-2 border-dashed border-border bg-white dark:bg-slate-950 overflow-hidden"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-32 cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground/50">Podpisz tutaj</span>
            </div>
          )}
        </div>

        {/* Akcje */}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear} disabled={!hasContent}>
            <RotateCcw className="h-3.5 w-3.5" />Wyczyść
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />Anuluj
          </Button>
          <Button size="sm" className="btn-primary h-8 text-xs" onClick={confirm} disabled={!hasContent}>
            <Check className="h-3.5 w-3.5" />Zatwierdź podpis
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground">
          Podpis elektroniczny potwierdza akceptację wyceny przez klienta.
        </p>
      </CardContent>
    </Card>
  );
}
