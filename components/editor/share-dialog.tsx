"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Copy, Trash2, UserRound } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  CollaboratorListResponse,
  CollaboratorResponse,
} from "@/lib/project-collaborators";

interface ShareDialogProps {
  canManageAccess: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  projectName: string;
}

const dialogInputClassName =
  "bg-subtle text-copy-primary caret-brand placeholder:text-copy-muted";

export function ShareDialog({
  canManageAccess,
  isOpen,
  onOpenChange,
  projectId,
  projectName,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectPath = `/editor/${projectId}`;
  const projectLink =
    typeof window === "undefined"
      ? projectPath
      : `${window.location.origin}${projectPath}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCurrent = true;

    async function loadCollaborators() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await readCollaborators(
          await fetch(`/api/projects/${projectId}/collaborators`),
        );

        if (isCurrent) {
          setCollaborators(data.collaborators);
        }
      } catch (err) {
        if (isCurrent) {
          setError(readErrorMessage(err));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadCollaborators();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, projectId]);

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageAccess || !email.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await readCollaborators(
        await fetch(`/api/projects/${projectId}/collaborators`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }),
      );

      setCollaborators(data.collaborators);
      setEmail("");
    } catch (err) {
      setError(readErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function removeCollaborator(collaboratorEmail: string) {
    if (!canManageAccess) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await readCollaborators(
        await fetch(`/api/projects/${projectId}/collaborators`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: collaboratorEmail }),
        }),
      );

      setCollaborators(data.collaborators);
    } catch (err) {
      setError(readErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function copyProjectLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(projectLink);
      } else {
        // Fallback for environments without Clipboard API support.
        const textarea = document.createElement("textarea");
        textarea.value = projectLink;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!successful) {
          throw new Error("Copy command failed");
        }
      }

      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch (err) {
      // Ensure the copied state is false and surface the error for debugging
      setIsCopied(false);
      console.error("Failed to copy project link:", err);
      setError("Failed to copy link to clipboard.");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-surface-border bg-elevated p-7 text-copy-primary sm:max-w-lg">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-xl font-semibold leading-tight text-copy-primary">
            Share project
          </DialogTitle>
          <DialogDescription className="text-sm leading-5 text-copy-secondary">
            Manage access to {projectName}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex gap-2">
          <Input
            className={dialogInputClassName}
            readOnly
            suppressHydrationWarning
            value={projectLink}
          />
          <Button type="button" variant="outline" onClick={copyProjectLink}>
            <Copy className="h-4 w-4" />
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {canManageAccess ? (
          <form className="mt-5 space-y-2" onSubmit={inviteCollaborator}>
            <label
              className="block text-sm font-medium text-copy-primary"
              htmlFor="collaborator-email"
            >
              Invite collaborator
            </label>
            <div className="flex gap-2">
              <Input
                className={dialogInputClassName}
                id="collaborator-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
              />
              <Button type="submit" disabled={isLoading || !email.trim()}>
                Invite
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-5 rounded-2xl border border-surface-border bg-surface/60 px-4 py-3 text-sm leading-6 text-copy-muted">
            You can view collaborators, but only the owner can manage access.
          </p>
        )}

        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="mt-6">
          <h3 className="text-sm font-medium text-copy-primary">
            Collaborators
          </h3>
          <div className="mt-3 space-y-2">
            {collaborators.length > 0 ? (
              collaborators.map((collaborator) => (
                <CollaboratorRow
                  canManageAccess={canManageAccess}
                  collaborator={collaborator}
                  isLoading={isLoading}
                  key={collaborator.email}
                  onRemove={removeCollaborator}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-surface-border bg-surface/50 px-4 py-6 text-center text-sm text-copy-muted">
                {isLoading ? "Loading collaborators..." : "No collaborators yet."}
              </p>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

interface CollaboratorRowProps {
  canManageAccess: boolean;
  collaborator: CollaboratorResponse;
  isLoading: boolean;
  onRemove: (email: string) => void;
}

function CollaboratorRow({
  canManageAccess,
  collaborator,
  isLoading,
  onRemove,
}: CollaboratorRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {collaborator.avatarUrl ? (
          <Image
            alt=""
            className="h-9 w-9 rounded-xl border border-surface-border"
            height={36}
            src={collaborator.avatarUrl}
            unoptimized
            width={36}
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-accent-dim text-brand">
            <UserRound className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-copy-primary">
            {collaborator.displayName}
          </p>
          <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>
        </div>
      </div>

      {canManageAccess ? (
        <Button
          aria-label={`Remove ${collaborator.email}`}
          disabled={isLoading}
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={() => onRemove(collaborator.email)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

async function readCollaborators(
  response: Response,
): Promise<CollaboratorListResponse> {
  if (!response.ok) {
    // Parse the response body as unknown and validate its shape before
    // extracting the error message. This prevents throwing partially-typed
    // objects to callers when the server returns an unexpected payload.
    const body: unknown = await response.json().catch(() => undefined);

    if (!body || typeof body !== "object" || body === null) {
      throw new Error("Collaborator request failed: unable to read error body.");
    }

    // Defensive checks for nested `error.message` string shape.
    const maybeError = (body as Record<string, unknown>).error;

    if (
      maybeError &&
      typeof maybeError === "object" &&
      (maybeError as Record<string, unknown>).message &&
      typeof (maybeError as Record<string, unknown>).message === "string"
    ) {
      throw new Error((maybeError as Record<string, unknown>).message as string);
    }

    throw new Error("Collaborator request failed: unexpected error response shape.");
  }

  // Parse success body and validate runtime shape before returning.
  const parsed: unknown = await response.json().catch(() => undefined);

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  function isCollaboratorResponse(v: unknown): v is CollaboratorResponse {
    if (!isRecord(v)) return false;
    return (
      typeof v.email === "string" &&
      typeof v.displayName === "string" &&
      (typeof v.avatarUrl === "string" || v.avatarUrl === null) &&
      typeof v.createdAt === "string"
    );
  }

  function isCollaboratorListResponse(v: unknown): v is CollaboratorListResponse {
    if (!isRecord(v)) return false;
    const coll = (v as Record<string, unknown>).collaborators;
    if (!Array.isArray(coll)) return false;
    if (typeof (v as Record<string, unknown>).canManageAccess !== "boolean") return false;
    return coll.every(isCollaboratorResponse);
  }

  if (isCollaboratorListResponse(parsed)) {
    return parsed;
  }

  throw new Error("Collaborator request failed: invalid response shape.");
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Collaborator request failed.";
}
