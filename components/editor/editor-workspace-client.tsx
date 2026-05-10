"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import {
  LiveblocksCanvas,
  type LiveblocksCanvasHandle,
} from "@/components/editor/liveblocks-canvas";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { EditorProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

interface EditorWorkspaceClientProps {
  canManageAccess: boolean;
  projectName: string;
  roomId: string;
  ownedProjects: readonly EditorProject[];
  sharedProjects: readonly EditorProject[];
}

export function EditorWorkspaceClient({
  canManageAccess,
  projectName,
  roomId,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const canvasRef = useRef<LiveblocksCanvasHandle>(null);
  const projectActions = useProjectActions();
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  function handleTemplateImport(template: CanvasTemplate) {
    canvasRef.current?.importTemplate(template);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <header className="relative z-50 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <Link
            aria-label="Back to editor"
            className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }))}
            href="/editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Button
            aria-label={isSidebarOpen ? "Close projects" : "Open projects"}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <SidebarIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-medium text-copy-primary">
            {projectName}
          </p>
          <p className="truncate font-mono text-xs text-copy-muted">{roomId}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTemplatesModalOpen(true)}
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            className={cn(
              "hidden border border-ai/40 bg-ai/15 text-ai-text shadow-2xl hover:bg-ai/25 hover:text-ai-text lg:flex",
              isAiSidebarOpen && "bg-ai/25",
            )}
            type="button"
            variant="ghost"
            onClick={() => setIsAiSidebarOpen((current) => !current)}
          >
            <Bot className="h-4 w-4" />
            AI
          </Button>
          <UserButton />
        </div>
      </header>

      <ProjectSidebar
        activeProjectId={roomId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={projectActions.openDeleteDialog}
        onRenameProject={projectActions.openRenameDialog}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden bg-base">
        <section className="absolute inset-0 bg-base">
          <LiveblocksCanvas ref={canvasRef} roomId={roomId} />
        </section>

        {isAiSidebarOpen ? (
          <aside className="absolute bottom-4 right-4 top-4 z-30 hidden w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-2xl backdrop-blur lg:flex">
            <div className="flex items-center gap-2 border-b border-surface-border pb-4">
              <Bot className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-medium text-copy-primary">
                AI Assistant
              </h2>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 text-center">
              <p className="text-sm leading-6 text-copy-muted">
                AI chat will be wired into this panel later.
              </p>
            </div>
          </aside>
        ) : null}
      </div>

      <ProjectDialogs dialogs={projectActions} />
      <StarterTemplatesModal
        isOpen={isTemplatesModalOpen}
        templates={CANVAS_TEMPLATES}
        onImport={handleTemplateImport}
        onOpenChange={setIsTemplatesModalOpen}
      />
      <ShareDialog
        canManageAccess={canManageAccess}
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={roomId}
        projectName={projectName}
      />
    </main>
  );
}
