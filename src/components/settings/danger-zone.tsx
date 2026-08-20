"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Reset demo data</p>
          <p className="text-xs text-muted-foreground">
            Clear all local changes and restore original seed data.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive"
          onClick={() => setConfirming(true)}
        >
          Reset
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => window.location.reload()}
        title="Reset demo data?"
        description="Every local change you have made in this session will be discarded and the seed data reloaded."
        confirmLabel="Reset"
      />
    </Card>
  );
}
