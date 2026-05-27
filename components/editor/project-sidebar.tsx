"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function ProjectEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface/60 px-6 text-center">
      <p className="text-sm text-copy-muted">{label}</p>
    </div>
  );
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: '' } : {})}
      className={cn(
        "fixed left-4 top-18 z-40 flex h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-surface-border pb-4">
        <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
        <Button
          aria-label="Close projects"
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <Tabs
        defaultValue="my-projects"
        className="mt-4 flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="mt-4 flex-1">
          <ProjectEmptyState label="No projects yet." />
        </TabsContent>
        <TabsContent value="shared" className="mt-4 flex-1">
          <ProjectEmptyState label="No shared projects yet." />
        </TabsContent>
      </Tabs>

      <Button className="mt-4 w-full" type="button">
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </aside>
  );
}
