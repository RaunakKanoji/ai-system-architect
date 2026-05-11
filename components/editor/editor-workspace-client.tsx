"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  LayoutTemplate,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Share2,
} from "lucide-react";
import Link from "next/link";

import { AiSidebar } from "@/components/editor/ai-sidebar";
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
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
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
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<CanvasSaveStatus | "idle">(
    "idle",
  );
  const [manualSave, setManualSave] = useState<(() => Promise<void>) | null>(
    null,
  );
  const canvasRef = useRef<LiveblocksCanvasHandle>(null);
  const projectActions = useProjectActions();
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const handleSaveStatusChange = useCallback((status: CanvasSaveStatus) => {
    setCanvasSaveStatus(status);
  }, []);
  const handleManualSaveReady = useCallback(
    (saveNow: (() => Promise<void>) | null) => {
      setManualSave(() => saveNow);
    },
    [],
  );

  useEffect(() => {
    if (canvasSaveStatus !== "saved" && canvasSaveStatus !== "error") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCanvasSaveStatus("idle");
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canvasSaveStatus]);

  function handleTemplateImport(template: CanvasTemplate) {
    canvasRef.current?.importTemplate(template);
  }

  function handleSaveClick() {
    if (!manualSave) {
      return;
    }

    setCanvasSaveStatus("saving");
    void manualSave().catch(() => {
      setCanvasSaveStatus("error");
    });
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
            aria-label={`Canvas ${canvasSaveStatus}`}
            className={cn(
              "min-w-24",
              canvasSaveStatus === "saved" && "text-state-success",
              canvasSaveStatus === "error" && "text-state-error",
            )}
            disabled={!manualSave || canvasSaveStatus === "saving"}
            type="button"
            variant="outline"
            onClick={handleSaveClick}
          >
            {canvasSaveStatus === "saving" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {getSaveStatusLabel(canvasSaveStatus)}
          </Button>
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
          <LiveblocksCanvas
            ref={canvasRef}
            isAiSidebarOpen={isAiSidebarOpen}
            onManualSaveReady={handleManualSaveReady}
            onSaveStatusChange={handleSaveStatusChange}
            roomId={roomId}
          />
        </section>

        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setIsAiSidebarOpen(false)}
        />
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

function getSaveStatusLabel(status: CanvasSaveStatus | "idle") {
  if (status === "saving") {
    return "Saving...";
  }

  if (status === "error") {
    return "Error";
  }

  if (status === "saved") {
    return "Saved";
  }

  return "Save";
}
