import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6 text-copy-primary">
      <section className="flex w-full max-w-md flex-col items-center rounded-3xl border border-surface-border bg-elevated p-8 text-center shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-accent-dim text-brand">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-copy-primary">
          Access denied
        </h1>
        <p className="mt-2 text-sm leading-6 text-copy-muted">
          You do not have access to this project. Ask the project owner to share
          it with your account.
        </p>
        <Link className={cn(buttonVariants(), "mt-6")} href="/editor">
          Back to projects
        </Link>
      </section>
    </main>
  );
}
