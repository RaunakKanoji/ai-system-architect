"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type {
  CanvasSaveResponse,
  CanvasSnapshotResponse,
} from "@/lib/canvas-snapshot";
import type { CanvasEdge, CanvasNode, CanvasSnapshot } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface UseCanvasAutosaveOptions {
  canvasUpdatedAt: string | null;
  edges: CanvasEdge[];
  enabled: boolean;
  nodes: CanvasNode[];
  projectId: string;
}

interface CanvasAutosaveState {
  saveNow: () => Promise<void>;
  status: CanvasSaveStatus;
}

interface SaveCurrentCanvasOptions {
  signal?: AbortSignal;
  throwOnError?: boolean;
}

export function useCanvasAutosave({
  canvasUpdatedAt,
  edges,
  enabled,
  nodes,
  projectId,
}: UseCanvasAutosaveOptions): CanvasAutosaveState {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const enabledRef = useRef(enabled);
  const latestSnapshotRef = useRef<CanvasSnapshot>({ nodes, edges });
  const lastSavedPayloadRef = useRef<string | null>(null);
  const canvasUpdatedAtRef = useRef<string | null>(canvasUpdatedAt);
  const projectIdRef = useRef(projectId);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    latestSnapshotRef.current = { nodes, edges };
    projectIdRef.current = projectId;
  }, [edges, enabled, nodes, projectId]);

  useEffect(() => {
    canvasUpdatedAtRef.current = canvasUpdatedAt;
    lastSavedPayloadRef.current = null;
  }, [canvasUpdatedAt, projectId]);

  const saveCurrentCanvas = useCallback(
    async ({ signal, throwOnError = false }: SaveCurrentCanvasOptions = {}) => {
      if (!enabledRef.current) {
        return;
      }

      const snapshot = latestSnapshotRef.current;
      const payload = JSON.stringify(snapshot);

      setStatus("saving");

      try {
        const projectId = projectIdRef.current;
        const expectedCanvasUpdatedAt =
          canvasUpdatedAtRef.current ??
          (await loadCanvasUpdatedAt(projectId, signal));
        const response = await saveCanvas(
          projectId,
          snapshot,
          expectedCanvasUpdatedAt,
          signal,
        );

        canvasUpdatedAtRef.current = response.canvasUpdatedAt;
        lastSavedPayloadRef.current = payload;
        setStatus("saved");
      } catch (error: unknown) {
        if (signal?.aborted) {
          return;
        }

        console.error("Canvas save failed", error);
        setStatus("error");

        if (throwOnError) {
          throw error;
        }
      }
    },
    [],
  );
  const saveNow = useCallback(
    () => saveCurrentCanvas({ throwOnError: true }),
    [saveCurrentCanvas],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const snapshot: CanvasSnapshot = { nodes, edges };
    const payload = JSON.stringify(snapshot);

    if (payload === lastSavedPayloadRef.current) {
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void saveCurrentCanvas({ signal: abortController.signal });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [edges, enabled, nodes, projectId, saveCurrentCanvas]);

  return {
    saveNow,
    status,
  };
}

async function saveCanvas(
  projectId: string,
  canvas: CanvasSnapshot,
  expectedCanvasUpdatedAt: string,
  signal?: AbortSignal,
): Promise<CanvasSaveResponse> {
  const response = await fetch(`/api/projects/${projectId}/canvas`, {
    body: JSON.stringify({ canvas, expectedCanvasUpdatedAt }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
    signal,
  });

  if (!response.ok) {
    throw new Error("Canvas save failed.");
  }

  const data: unknown = await response.json();

  if (!isCanvasSaveResponse(data)) {
    throw new Error("Canvas save returned an invalid response.");
  }

  return data;
}

async function loadCanvasUpdatedAt(
  projectId: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`/api/projects/${projectId}/canvas`, {
    credentials: "include",
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Canvas version could not be loaded.");
  }

  const data: unknown = await response.json();

  if (!isCanvasSnapshotResponse(data)) {
    throw new Error("Canvas version returned an invalid response.");
  }

  return data.canvasUpdatedAt;
}

function isCanvasSaveResponse(value: unknown): value is CanvasSaveResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "canvasJSONPath" in value &&
    typeof value.canvasJSONPath === "string" &&
    "canvasUpdatedAt" in value &&
    typeof value.canvasUpdatedAt === "string"
  );
}

function isCanvasSnapshotResponse(
  value: unknown,
): value is CanvasSnapshotResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "canvasUpdatedAt" in value &&
    typeof value.canvasUpdatedAt === "string"
  );
}
