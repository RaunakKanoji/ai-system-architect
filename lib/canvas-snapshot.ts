import type { CanvasSnapshot } from "@/types/canvas";
import { NODE_COLORS, NODE_SHAPES } from "@/types/canvas";

export interface CanvasSnapshotResponse {
  canvas: CanvasSnapshot | null;
  canvasUpdatedAt: string;
}

export interface CanvasSaveResponse {
  canvasJSONPath: string;
  canvasUpdatedAt: string;
}

export interface CanvasSaveRequest {
  canvas: CanvasSnapshot;
  expectedCanvasUpdatedAt: string;
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

export function isCanvasSaveRequest(
  value: unknown,
): value is CanvasSaveRequest {
  return (
    isRecord(value) &&
    isCanvasSnapshot(value.canvas) &&
    typeof value.expectedCanvasUpdatedAt === "string" &&
    Number.isFinite(Date.parse(value.expectedCanvasUpdatedAt))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanvasNodeSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.id !== "string" || value.type !== "canvasNode") {
    return false;
  }

  if (!isRecord(value.position) || !isCanvasNodeDataSnapshot(value.data)) {
    return false;
  }

  return (
    isFiniteNumber(value.position.x) &&
    isFiniteNumber(value.position.y) &&
    isOptionalFiniteNumber(value.width) &&
    isOptionalFiniteNumber(value.height)
  );
}

function isCanvasEdgeSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.type === "canvasEdge" &&
    typeof value.source === "string" &&
    typeof value.target === "string" &&
    isOptionalStringOrNull(value.sourceHandle) &&
    isOptionalStringOrNull(value.targetHandle) &&
    isCanvasEdgeDataSnapshot(value.data)
  );
}

function isCanvasNodeDataSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.label === "string" &&
    isNodeShape(value.shape) &&
    isNodeColor(value.color)
  );
}

function isCanvasEdgeDataSnapshot(value: unknown) {
  return isRecord(value) && typeof value.label === "string";
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || isFiniteNumber(value);
}

function isOptionalStringOrNull(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function isNodeShape(value: unknown) {
  return (
    typeof value === "string" &&
    (NODE_SHAPES as readonly string[]).includes(value)
  );
}

function isNodeColor(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return NODE_COLORS.some(
    (color) => value.fill === color.fill && value.text === color.text,
  );
}
