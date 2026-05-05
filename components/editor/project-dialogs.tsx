"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { useProjectDialogs } from "@/components/editor/use-project-dialogs";

interface ProjectDialogsProps {
  dialogs: ReturnType<typeof useProjectDialogs>;
}

const dialogInputClassName =
  "bg-subtle text-copy-primary caret-brand placeholder:text-copy-muted";
const dialogContentClassName =
  "rounded-3xl border border-surface-border bg-elevated p-7 text-copy-primary sm:max-w-md";
const dialogHeaderClassName = "gap-1";
const dialogTitleClassName =
  "text-xl font-semibold leading-tight text-copy-primary";
const dialogDescriptionClassName =
  "max-w-sm text-sm leading-5 text-copy-secondary";
const dialogFieldClassName = "mt-5 space-y-2";
const dialogLabelClassName = "block text-sm font-medium text-copy-primary";
const dialogFooterClassName =
  "mt-6 flex flex-col-reverse gap-2.5 border-t border-surface-border bg-elevated pt-4 sm:flex-row sm:justify-end";

export function ProjectDialogs({ dialogs }: ProjectDialogsProps) {
  const {
    activeDialog,
    activeProject,
    closeDialog,
    isLoading,
    projectName,
    setProjectName,
    slugPreview,
    submitDialog,
  } = dialogs;

  const canSubmitProjectName = projectName.trim().length > 0;

  return (
    <>
      <Dialog
        open={activeDialog === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className={dialogContentClassName}>
          <form onSubmit={submitDialog}>
            <DialogHeader className={dialogHeaderClassName}>
              <DialogTitle className={dialogTitleClassName}>
                Create project
              </DialogTitle>
              <DialogDescription className={dialogDescriptionClassName}>
                Start a new architecture workspace.
              </DialogDescription>
            </DialogHeader>

            <div className={dialogFieldClassName}>
              <label
                className={dialogLabelClassName}
                htmlFor="create-project-name"
              >
                Project name
              </label>
              <Input
                className={dialogInputClassName}
                id="create-project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="System design workspace"
              />
              <p className="pt-1 text-sm leading-6 text-copy-muted">
                Slug preview:{" "}
                <span className="font-mono text-brand">{slugPreview}</span>
              </p>
            </div>

            <div className={dialogFooterClassName}>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !canSubmitProjectName}
              >
                Create project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "rename"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className={dialogContentClassName}>
          <form onSubmit={submitDialog}>
            <DialogHeader className={dialogHeaderClassName}>
              <DialogTitle className={dialogTitleClassName}>
                Rename project
              </DialogTitle>
              <DialogDescription className={dialogDescriptionClassName}>
                Current project: {activeProject?.name ?? "Untitled project"}
              </DialogDescription>
            </DialogHeader>

            <div className={dialogFieldClassName}>
              <label
                className={dialogLabelClassName}
                htmlFor="rename-project-name"
              >
                Project name
              </label>
              <Input
                autoFocus
                className={dialogInputClassName}
                id="rename-project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>

            <div className={dialogFooterClassName}>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !canSubmitProjectName}
              >
                Rename project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className={dialogContentClassName}>
          <DialogHeader className={dialogHeaderClassName}>
            <DialogTitle className={dialogTitleClassName}>
              Delete project
            </DialogTitle>
            <DialogDescription className={dialogDescriptionClassName}>
              Delete {activeProject?.name ?? "this project"}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className={dialogFooterClassName}>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading || !activeProject}
              onClick={() => submitDialog()}
            >
              Delete project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
