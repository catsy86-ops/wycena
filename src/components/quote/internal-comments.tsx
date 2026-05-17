"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export interface InternalComment {
  id: string;
  text: string;
  createdAt: Date;
  author?: string;
}

interface InternalCommentsProps {
  comments: InternalComment[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Komentarze wewnętrzne — notatki przy wycenie widoczne tylko dla zespołu.
 * NIE widoczne na PDF ani dla klienta.
 */
export function InternalComments({ comments, onAdd, onRemove }: InternalCommentsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState("");

  function handleAdd() {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
    setIsAdding(false);
  }

  return (
    <Card className="card-modern border-amber-200/30 dark:border-amber-800/20">
      <CardHeader className="pb-2 p-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-500" />
            Notatki wewnętrzne ({comments.length})
          </span>
          {!isAdding && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Formularz dodawania */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Notatka wewnętrzna (nie widoczna dla klienta)..."
                rows={2}
                className="text-sm resize-none"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsAdding(false); setText(""); }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" className="h-7 text-xs btn-primary" onClick={handleAdd}>
                  <Send className="h-3 w-3" />Dodaj
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista komentarzy */}
        {comments.length === 0 && !isAdding && (
          <p className="text-xs text-muted-foreground text-center py-2">Brak notatek wewnętrznych</p>
        )}
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-start gap-2 group"
            >
              <div className="flex-1 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/20 px-3 py-2">
                <p className="text-xs leading-relaxed">{comment.text}</p>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm", { locale: pl })}
                  {comment.author && ` · ${comment.author}`}
                </div>
              </div>
              <button
                onClick={() => onRemove(comment.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-2"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <p className="text-[9px] text-muted-foreground/60 italic">⚠️ Notatki wewnętrzne — nie widoczne na PDF ani dla klienta</p>
      </CardContent>
    </Card>
  );
}
