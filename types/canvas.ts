import type { Edge, Node } from "@xyflow/react";

export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
] as const;

export const DEFAULT_NODE_COLOR = NODE_COLORS[0];

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const;

export type NodeShape = (typeof NODE_SHAPES)[number];
export type NodeColor = (typeof NODE_COLORS)[number];

export interface NodeSize {
  width: number;
  height: number;
}

export const DEFAULT_NODE_SIZES: Record<NodeShape, NodeSize> = {
  rectangle: { width: 180, height: 88 },
  diamond: { width: 156, height: 156 },
  circle: { width: 128, height: 128 },
  pill: { width: 176, height: 76 },
  cylinder: { width: 152, height: 108 },
  hexagon: { width: 168, height: 96 },
};

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: NodeColor;
  shape: NodeShape;
}

export interface CanvasEdgeData extends Record<string, unknown> {
  label: string;
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;
export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">;

export interface CanvasSnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
