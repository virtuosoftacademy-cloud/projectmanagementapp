import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

/** Cancel + submit pair, shared by the form dialogs. */
export function DialogActions({
  onCancel,
  submitLabel,
  disabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={disabled}>
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}
