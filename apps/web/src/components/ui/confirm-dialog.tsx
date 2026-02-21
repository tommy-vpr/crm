"use client";

import {
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/index";

// ─── Types ───────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  /** Require typing this text to enable confirm button */
  typeToConfirm?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}

// ─── Provider ────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [typedText, setTypedText] = useState("");
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setTypedText("");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = () => {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  };

  const handleConfirm = () => {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  };

  const needsTyping = !!options.typeToConfirm;
  const typingValid = !needsTyping || typedText === options.typeToConfirm;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Dialog open={open} onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>{options.title ?? "Confirm"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {typeof options.message === "string" ? (
            <p className="text-sm text-slate-600">{options.message}</p>
          ) : (
            options.message
          )}

          {needsTyping && (
            <div>
              <label className="text-sm font-medium">
                Type{" "}
                <span className="font-mono text-destructive py-1 px-2 bg-red-50 rounded-sm">
                  {options.typeToConfirm}
                </span>{" "}
                to confirm
              </label>
              <Input
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={options.typeToConfirm}
                className="mt-2"
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              {options.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={options.variant ?? "destructive"}
              onClick={handleConfirm}
              disabled={!typingValid}
            >
              {options.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
