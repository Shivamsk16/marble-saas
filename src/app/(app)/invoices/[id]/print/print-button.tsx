"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="mb-4 print:hidden" onClick={() => window.print()}>
      Print invoice
    </Button>
  );
}
