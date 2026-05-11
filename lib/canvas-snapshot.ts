import type { CanvasSnapshot } from "@/types/canvas";

export interface CanvasSnapshotResponse {
  canvas: CanvasSnapshot | null;
}

export interface CanvasSaveResponse {
  canvasJSONPath: string;
}

export function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    value.nodes.every(isCanvasNodeSnapshot) &&
    value.edges.every(isCanvasEdgeSnapshot)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanvasNodeSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.id !== "string" || typeof value.type !== "string") {
    return false;
  }

  if (!isRecord(value.position)) {
    return false;
  }

  return (
    typeof value.position.x === "number" &&
    typeof value.position.y === "number" &&
    isRecord(value.data)
  );
}

function isCanvasEdgeSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.target === "string"
  );
}
