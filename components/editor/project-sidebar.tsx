"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EditorProject } from "@/lib/project-data";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  activeProjectId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: () => void;
  onDeleteProject: (project: EditorProject) => void;
  onRenameProject: (project: EditorProject) => void;
  ownedProjects: readonly EditorProject[];
  sharedProjects: readonly EditorProject[];
}

function ProjectEmptyState() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface/60 px-6 text-center">
      <p className="text-sm text-copy-muted">No projects yet.</p>
    </div>
  );
}

interface ProjectListProps {
  activeProjectId?: string;
  projects: readonly EditorProject[];
  onDeleteProject: (project: EditorProject) => void;
  onRenameProject: (project: EditorProject) => void;
}

function ProjectList({
  activeProjectId,
  projects,
  onDeleteProject,
  onRenameProject,
}: ProjectListProps) {
  if (projects.length === 0) {
    return <ProjectEmptyState />;
  }

  return (
    <ul className="space-y-2">
      {projects.map((project) => (
        <li
          key={project.id}
          className={cn(
            "rounded-xl border border-surface-border bg-surface/60 p-3",
            project.id === activeProjectId && "border-brand bg-accent-dim",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                className="block truncate text-sm font-medium text-copy-primary hover:text-brand"
                href={`/editor/${project.id}`}
              >
                {project.name}
              </Link>
              <p className="truncate font-mono text-xs text-copy-muted">
                {project.id}
              </p>
            </div>

            {project.ownership === "owned" ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  aria-label={`Rename ${project.name}`}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onRenameProject(project)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  aria-label={`Delete ${project.name}`}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={() => onDeleteProject(project)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProjectSidebar({
  activeProjectId,
  isOpen,
  onClose,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  ownedProjects,
  sharedProjects,
}: ProjectSidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close projects"
        className="fixed inset-0 z-30 bg-base/70 md:hidden"
        type="button"
        onClick={onClose}
      />
      <aside
        aria-hidden={false}
        className={cn(
          "fixed left-4 top-18 z-40 flex h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
          "translate-x-0"
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
            <ProjectList
              activeProjectId={activeProjectId}
              projects={ownedProjects}
              onDeleteProject={onDeleteProject}
              onRenameProject={onRenameProject}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-4 flex-1">
            <ProjectList
              activeProjectId={activeProjectId}
              projects={sharedProjects}
              onDeleteProject={onDeleteProject}
              onRenameProject={onRenameProject}
            />
          </TabsContent>
        </Tabs>

        <Button className="mt-4 w-full" type="button" onClick={onCreateProject}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </aside>
    </>
  );
}
