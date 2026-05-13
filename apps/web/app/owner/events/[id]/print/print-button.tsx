"use client";

import { Button } from "@/components/wadl";

export default function PrintButton() {
  return (
    <Button
      variant="primary"
      type="button"
      onClick={() => window.print()}
      className="print-hide"
    >
      Print now
    </Button>
  );
}
