"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold">Coś poszło nie tak</h2>
      <p className="text-muted-foreground max-w-md">
        Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wrócić do pulpitu.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Wróć do pulpitu
        </Button>
        <Button onClick={reset}>Spróbuj ponownie</Button>
      </div>
    </div>
  );
}
