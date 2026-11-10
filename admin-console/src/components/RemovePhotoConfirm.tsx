import { useState, type ReactNode } from "react";
import { Camera, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  onConfirm: () => void | Promise<void>;
  /** Custom trigger element. Defaults to a subtle "Remove" link. */
  trigger?: ReactNode;
  /** Disable trigger while parent is busy. */
  disabled?: boolean;
};

/**
 * Friendly confirm dialog for removing a profile photo.
 * Profiles with photos receive more requests — gently warn before removal,
 * but never block the user.
 */
export function RemovePhotoConfirm({ onConfirm, trigger, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-navy disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 text-orange">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">Remove your profile photo?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Profiles with a clear photo get more requests and feel more trustworthy to neighbours.
            You can always add a new one later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <AlertDialogCancel className="mt-0">
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Keep my photo
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => { e.preventDefault(); void handleConfirm(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Removing…" : "Yes, remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
