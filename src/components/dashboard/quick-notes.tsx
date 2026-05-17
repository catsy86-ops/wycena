"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, Save, X, Plus } from "lucide-react";

const STORAGE_KEY = "wycenka_quick_notes";

interface QuickNote {
  id: string;
  text: string;
  createdAt: string;
}

export function QuickNotes() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setNotes(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  function saveNotes(updated: QuickNote[]) {
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addNote() {
    if (!newNote.trim()) return;
    const note: QuickNote = {
      id: Date.now().toString(36),
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setNewNote("");
    setIsAdding(false);
  }

  function removeNote(id: string) {
    saveNotes(notes.filter((n) => n.id !== id));
  }

  if (notes.length === 0 && !isAdding) {
    return (
      <Card className="card-modern">
        <CardContent className="pt-3 p-3">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full justify-center py-2"
          >
            <StickyNote className="h-3.5 w-3.5" />
            Dodaj szybką notatkę
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-modern">
      <CardContent className="pt-3 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-primary" />
            Notatki
          </span>
          {!isAdding && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAdding(true)}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Szybka notatka..."
                rows={2}
                className="text-sm resize-none"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsAdding(false); setNewNote(""); }}>
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" className="h-7 text-xs btn-primary" onClick={addNote}>
                  <Save className="h-3 w-3" />Zapisz
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          <AnimatePresence>
            {notes.slice(0, 5).map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-start gap-2 group"
              >
                <div className="flex-1 text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded px-2 py-1.5">
                  {note.text}
                </div>
                <button
                  onClick={() => removeNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
