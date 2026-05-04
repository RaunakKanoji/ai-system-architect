import type { ReactNode } from "react";
import { BrainCircuit, Network, ScrollText } from "lucide-react";

export interface AuthFeature {
  title: string;
  description: string;
}

interface AuthPageShellProps {
  title: string;
  description: string;
  features: readonly AuthFeature[];
  children: ReactNode;
}

const featureIcons = [BrainCircuit, Network, ScrollText];

export function AuthPageShell({
  title,
  description,
  features,
  children,
}: AuthPageShellProps) {
  return (
    <main className="grid min-h-svh bg-base font-sans text-copy-primary lg:h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
      <section className="hidden border-r border-surface-border bg-surface px-8 py-8 lg:flex lg:min-h-0 lg:flex-col lg:justify-between xl:px-14">
        <div className="min-h-0 space-y-12">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground">
              G
            </div>
            <p className="text-base font-semibold text-copy-primary">Ghost AI</p>
          </div>

          <div className="max-w-xl space-y-9">
            <div className="space-y-5">
              <h1 className="max-w-lg text-4xl font-semibold leading-tight text-copy-primary">
                {title}
              </h1>
              <p className="max-w-lg text-base leading-7 text-copy-secondary">
                {description}
              </p>
            </div>

            <ul className="space-y-5">
              {features.map((feature, index) => {
                const Icon = featureIcons[index] ?? BrainCircuit;

                return (
                  <li key={feature.title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-copy-primary">
                        {feature.title}
                      </p>
                      <p className="text-sm leading-6 text-copy-muted">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="text-sm text-copy-faint">
          (c) 2026 Ghost AI. All rights reserved.
        </p>
      </section>

      <section className="flex min-h-svh items-center justify-center overflow-y-auto bg-base px-4 py-6 lg:h-svh lg:min-h-0 lg:overflow-y-auto lg:px-10">
        <div className="w-full max-w-[30rem]">
          {children}
        </div>
      </section>
    </main>
  );
}
