"use client";

import { MeasurementProtocolForm } from "@/components/electrical/measurement-protocol-form";
import { PageTransition } from "@/components/page-transition";
import { FileText } from "lucide-react";

export default function MeasurementProtocolPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-3xl font-bold">Protokół Pomiarowy</h1>
          </div>
          <p className="text-slate-600">
            Generuj protokoły odbioru instalacji elektrycznej wg PN-HD 60364-6-61
          </p>
        </div>

        <MeasurementProtocolForm />
      </div>
    </PageTransition>
  );
}
