import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EditorDialogPatternProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footerActions?: ReactNode;
  className?: string;
}

export function EditorDialogPattern({
  title,
  description,
  children,
  footerActions,
  className,
}: EditorDialogPatternProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-surface-border bg-elevated p-6 text-copy-primary shadow-2xl backdrop-blur",
        className
      )}
    >
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-copy-primary">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-copy-muted">{description}</p>
        ) : null}
      </div>

      {children ? <div className="mt-6">{children}</div> : null}

      {footerActions ? (
        <footer className="mt-6 flex justify-end gap-2 border-t border-surface-border pt-4">
          {footerActions}
        </footer>
      ) : null}
    </section>
  );
}
