"use client";

import type { DragEvent, ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  type NodeProps,
  ConnectionMode,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_SIZES,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-ai-shape";

interface ShapeDragPayload {
  shape: NodeShape;
  size: NodeSize;
}

const shapeIcons = {
  rectangle: Square,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
} satisfies Record<NodeShape, typeof Square>;

const nodeTypes = {
  canvasNode: CanvasNodeRenderer,
};

const handleStyle = {
  backgroundColor: "var(--text-primary)",
  borderColor: "var(--bg-base)",
};

interface LiveblocksCanvasProps {
  roomId: string;
}

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

export function LiveblocksCanvas({ roomId }: LiveblocksCanvasProps) {
  return (
    <CanvasErrorBoundary>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, isThinking: false }}
        >
          <ClientSideSuspense fallback={<CanvasLoadingState />}>
            {() => <CollaborativeFlow />}
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  );
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Liveblocks canvas connection failed", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasStateFrame
          title="Canvas unavailable"
          description="The realtime canvas could not connect. Refresh the workspace or try again later."
        />
      );
    }

    return this.props.children;
  }
}

function CollaborativeFlow() {
  return (
    <ReactFlowProvider>
      <CollaborativeFlowContent />
    </ReactFlowProvider>
  );
}

function CollaborativeFlowContent() {
  const { screenToFlowPosition } = useReactFlow<CanvasNode, CanvasEdge>();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_MIME_TYPE)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const payload =
      parseShapeDragPayload(event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)) ??
      parseShapeTextPayload(event.dataTransfer.getData("text/plain"));

    if (!payload) {
      return;
    }

    const cursorPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const nodePosition = {
      x: cursorPosition.x - payload.size.width / 2,
      y: cursorPosition.y - payload.size.height / 2,
    };
    const counter = nodes.filter((node) =>
      node.id.startsWith(`${payload.shape}-`),
    ).length + 1;

    const node: CanvasNode = {
      id: `${payload.shape}-${Date.now()}-${counter}`,
      type: "canvasNode",
      position: nodePosition,
      width: payload.size.width,
      height: payload.size.height,
      style: {
        width: payload.size.width,
        height: payload.size.height,
      },
      data: {
        label: "",
        color: DEFAULT_NODE_COLOR,
        shape: payload.shape,
      },
    };

    onNodesChange([{ type: "add", item: node }]);
  }

  return (
    <div
      className="h-full w-full bg-base"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        className="h-full w-full bg-base"
        connectionMode={ConnectionMode.Loose}
        edges={edges}
        fitView
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onDelete={onDelete}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Background
          color="var(--border-subtle)"
          gap={22}
          size={1.4}
          variant={BackgroundVariant.Dots}
        />
        <MiniMap
          className="overflow-hidden rounded-xl border border-surface-border bg-base"
          maskColor="color-mix(in srgb, var(--bg-base) 72%, transparent)"
          nodeColor="var(--bg-subtle)"
          nodeStrokeColor="var(--border-subtle)"
          pannable
          style={{
            background: "var(--bg-base)",
          }}
          zoomable
        />
        <Cursors />
        <ShapePanel />
      </ReactFlow>
    </div>
  );
}

function ShapePanel() {
  return (
    <div className="nodrag nopan absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur">
      {NODE_SHAPES.map((shape) => {
        const Icon = shapeIcons[shape];

        return (
          <button
            key={shape}
            aria-label={`Drag ${shape} shape to canvas`}
            className="nodrag nopan flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-muted transition hover:bg-accent-dim hover:text-brand active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            draggable
            title={shape}
            type="button"
            onDragStart={(event) => {
              const payload: ShapeDragPayload = {
                shape,
                size: DEFAULT_NODE_SIZES[shape],
              };

              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData(
                SHAPE_DRAG_MIME_TYPE,
                JSON.stringify(payload),
              );
              event.dataTransfer.setData("text/plain", shape);
            }}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  return (
    <div
      className={cn(
        "group relative flex h-full w-full items-center justify-center rounded-xl border px-4 text-center text-sm font-medium shadow-lg",
        selected && "outline outline-2 outline-brand",
      )}
      style={{
        backgroundColor: data.color.fill,
        borderColor: "var(--border-subtle)",
        color: data.color.text,
      }}
    >
      <Handle
        className="opacity-0 transition group-hover:opacity-100"
        position={Position.Top}
        style={handleStyle}
        type="source"
      />
      <Handle
        className="opacity-0 transition group-hover:opacity-100"
        position={Position.Right}
        style={handleStyle}
        type="source"
      />
      <Handle
        className="opacity-0 transition group-hover:opacity-100"
        position={Position.Bottom}
        style={handleStyle}
        type="source"
      />
      <Handle
        className="opacity-0 transition group-hover:opacity-100"
        position={Position.Left}
        style={handleStyle}
        type="source"
      />
      <span className="min-w-0 truncate">{data.label}</span>
    </div>
  );
}

function parseShapeDragPayload(value: string): ShapeDragPayload | null {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(value) as Partial<ShapeDragPayload>;

    if (
      !payload.shape ||
      !NODE_SHAPES.includes(payload.shape) ||
      !payload.size ||
      typeof payload.size.width !== "number" ||
      typeof payload.size.height !== "number"
    ) {
      return null;
    }

    return {
      shape: payload.shape,
      size: payload.size,
    };
  } catch {
    return null;
  }
}

function parseShapeTextPayload(value: string): ShapeDragPayload | null {
  if (!NODE_SHAPES.includes(value as NodeShape)) {
    return null;
  }

  const shape = value as NodeShape;

  return {
    shape,
    size: DEFAULT_NODE_SIZES[shape],
  };
}

function CanvasLoadingState() {
  return (
    <CanvasStateFrame
      title="Connecting canvas"
      description="Preparing the shared workspace."
    />
  );
}

function CanvasStateFrame({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid h-full place-items-center bg-base px-6 text-center">
      <div className="max-w-sm">
        <h2 className="text-sm font-medium text-copy-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-copy-muted">{description}</p>
      </div>
    </div>
  );
}
