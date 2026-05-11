"use client";

import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  ErrorInfo,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  Component,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useOther,
  useOthersMapped,
  useRedo,
  useUndo,
} from "@liveblocks/react";
import {
  Cursors,
  type CursorsCursorProps,
  useLiveblocksFlow,
} from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  type Connection,
  ConnectionLineType,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  type NodeProps,
  ConnectionMode,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdges,
  useNodes,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Maximize2,
  Pill,
  Redo2,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  type CanvasSaveStatus,
  useCanvasAutosave,
} from "@/hooks/use-canvas-autosave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  type CanvasSnapshotResponse,
  isCanvasSnapshot,
} from "@/lib/canvas-snapshot";
import { cn } from "@/lib/utils";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_SIZES,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColor,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-ai-shape";
const CANVAS_EDGE_STYLE = {
  stroke: "var(--text-secondary)",
  strokeWidth: 1.6,
};
const CANVAS_EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "var(--text-secondary)",
  width: 14,
  height: 14,
};
const DEFAULT_EDGE_OPTIONS = {
  markerEnd: CANVAS_EDGE_MARKER,
  reconnectable: true,
  style: CANVAS_EDGE_STYLE,
  type: "canvasEdge",
} satisfies Partial<CanvasEdge>;
const HANDLE_SIDES = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

interface ShapeDragPayload {
  shape: NodeShape;
  size: NodeSize;
}

interface ShapeDragPreviewState extends ShapeDragPayload {
  cursor: {
    x: number;
    y: number;
  };
}

interface ShapePanelProps {
  onDragCancel: () => void;
  onDragMove: (cursor: { x: number; y: number }) => void;
  onDragStart: (payload: ShapeDragPreviewState) => void;
  onPointerDrop: (
    payload: ShapeDragPayload,
    cursor: { x: number; y: number },
  ) => void;
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
const edgeTypes = {
  canvasEdge: CanvasEdgeRenderer,
  smoothstep: CanvasEdgeRenderer,
};

const handleStyle = {
  backgroundColor: "var(--text-primary)",
  border: "1.5px solid var(--bg-base)",
  height: 8,
  pointerEvents: "auto",
  width: 8,
  zIndex: 20,
} satisfies CSSProperties;
const nodeResizerHandleStyle = {
  backgroundColor: "var(--accent-primary)",
  border: "1px solid var(--bg-base)",
  height: 8,
  width: 8,
};
const nodeResizerLineStyle = {
  borderColor: "var(--accent-primary)",
  opacity: 0.45,
};
const MIN_NODE_HEIGHT = 64;
const MIN_NODE_WIDTH = 96;
const NODE_SURFACE_STROKE_WIDTH = 1.5;
const VIEWPORT_ANIMATION_DURATION = 160;

interface MiniMapNodeShapeProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  selected: boolean;
  onClick?: (event: ReactMouseEvent, id: string) => void;
}

interface ParticipantSummary {
  avatarUrl: string | null;
  connectionId: number;
  cursorColor: string;
  displayName: string;
  userId: string;
}

interface LiveblocksCanvasProps {
  canSaveCanvas: boolean;
  isAiSidebarOpen: boolean;
  onManualSaveReady: (saveNow: (() => Promise<void>) | null) => void;
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
  roomId: string;
}

export interface LiveblocksCanvasHandle {
  importTemplate: (template: CanvasTemplate) => void;
  saveNow: () => Promise<void>;
}

interface TemplateImportRequest {
  id: number;
  template: CanvasTemplate;
}

type LiveblocksAuthResult =
  | {
      token: string;
    }
  | {
      error: "forbidden";
      reason: string;
    };

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

export const LiveblocksCanvas = forwardRef<
  LiveblocksCanvasHandle,
  LiveblocksCanvasProps
>(function LiveblocksCanvas(
  { canSaveCanvas, isAiSidebarOpen, onManualSaveReady, onSaveStatusChange, roomId },
  ref,
) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [templateImportRequest, setTemplateImportRequest] =
    useState<TemplateImportRequest | null>(null);
  const manualSaveRef = useRef<(() => Promise<void>) | null>(null);
  const handleManualSaveReady = useCallback(
    (saveNow: (() => Promise<void>) | null) => {
      manualSaveRef.current = saveNow;
      onManualSaveReady(saveNow);
    },
    [onManualSaveReady],
  );
  const authenticateLiveblocks = useCallback(
    async (room?: string): Promise<LiveblocksAuthResult> => {
      if (!room) {
        return {
          error: "forbidden",
          reason: "A Liveblocks room ID is required.",
        };
      }

      const response = await fetch("/api/liveblocks-auth", {
        body: JSON.stringify({ room }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const reason = await readLiveblocksAuthError(response);

        if (response.status !== 401 && response.status !== 403) {
          throw new Error(reason);
        }

        return {
          error: "forbidden",
          reason,
        };
      }

      const data: unknown = await response.json();

      if (!isLiveblocksTokenResponse(data)) {
        return {
          error: "forbidden",
          reason: "Liveblocks auth returned an invalid token response.",
        };
      }

      return data;
    },
    [],
  );
  useImperativeHandle(
    ref,
    () => ({
      importTemplate(template) {
        setTemplateImportRequest({
          id: Date.now(),
          template,
        });
      },
      saveNow() {
        return manualSaveRef.current?.() ?? Promise.resolve();
      },
    }),
    [],
  );

  if (!isLoaded) {
    return <CanvasLoadingState />;
  }

  if (!isSignedIn) {
    return (
      <CanvasStateFrame
        title="Authentication required"
        description="Sign in again to connect to the shared canvas."
      />
    );
  }

  if (!userId) {
    return <CanvasLoadingState />;
  }

  return (
    <CanvasErrorBoundary>
      <LiveblocksProvider authEndpoint={authenticateLiveblocks}>
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, thinking: false }}
        >
          <ClientSideSuspense fallback={<CanvasLoadingState />}>
            {() => (
              <CollaborativeFlow
                currentUserId={userId}
                canSaveCanvas={canSaveCanvas}
                importRequest={templateImportRequest}
                isAiSidebarOpen={isAiSidebarOpen}
                onManualSaveReady={handleManualSaveReady}
                onSaveStatusChange={onSaveStatusChange}
                roomId={roomId}
              />
            )}
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  );
});

async function readLiveblocksAuthError(response: Response): Promise<string> {
  const fallback = "Liveblocks authentication failed.";

  try {
    const data: unknown = await response.json();

    if (
      isRecord(data) &&
      isRecord(data.error) &&
      typeof data.error.message === "string"
    ) {
      return data.error.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

async function loadSavedCanvas(
  projectId: string,
  signal: AbortSignal,
): Promise<CanvasSnapshotResponse> {
  const response = await fetch(`/api/projects/${projectId}/canvas`, {
    credentials: "include",
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Saved canvas could not be loaded.");
  }

  const data: unknown = await response.json();

  if (!isCanvasSnapshotResponse(data)) {
    throw new Error("Saved canvas returned an invalid response.");
  }

  return data;
}

function isCanvasSnapshotResponse(
  value: unknown,
): value is CanvasSnapshotResponse {
  if (
    !isRecord(value) ||
    !("canvas" in value) ||
    typeof value.canvasUpdatedAt !== "string"
  ) {
    return false;
  }

  return value.canvas === null || isCanvasSnapshot(value.canvas);
}

function isLiveblocksTokenResponse(
  value: unknown,
): value is { token: string } {
  return isRecord(value) && typeof value.token === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}

function formatCssUrl(value: string) {
  return `url(${JSON.stringify(value)})`;
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target.isContentEditable ||
    target.closest("[contenteditable='true'], [contenteditable='']")
  ) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function shouldPreserveFocusedTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest("[data-canvas-select-target='true']")) {
    return false;
  }

  return Boolean(
    target.closest(
      "a, button, input, select, textarea, [contenteditable='true'], [contenteditable=''], [role='button']",
    ),
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

function CollaborativeFlow({
  canSaveCanvas,
  currentUserId,
  importRequest,
  isAiSidebarOpen,
  onManualSaveReady,
  onSaveStatusChange,
  roomId,
}: {
  canSaveCanvas: boolean;
  currentUserId: string;
  importRequest: TemplateImportRequest | null;
  isAiSidebarOpen: boolean;
  onManualSaveReady: (saveNow: (() => Promise<void>) | null) => void;
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
  roomId: string;
}) {
  return (
    <ReactFlowProvider>
      <CollaborativeFlowContent
        canSaveCanvas={canSaveCanvas}
        currentUserId={currentUserId}
        importRequest={importRequest}
        isAiSidebarOpen={isAiSidebarOpen}
        onManualSaveReady={onManualSaveReady}
        onSaveStatusChange={onSaveStatusChange}
        roomId={roomId}
      />
    </ReactFlowProvider>
  );
}

function CollaborativeFlowContent({
  canSaveCanvas,
  currentUserId,
  importRequest,
  isAiSidebarOpen,
  onManualSaveReady,
  onSaveStatusChange,
  roomId,
}: {
  canSaveCanvas: boolean;
  currentUserId: string;
  importRequest: TemplateImportRequest | null;
  isAiSidebarOpen: boolean;
  onManualSaveReady: (saveNow: (() => Promise<void>) | null) => void;
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
  roomId: string;
}) {
  const [dragPreview, setDragPreview] =
    useState<ShapeDragPreviewState | null>(null);
  const [canvasUpdatedAt, setCanvasUpdatedAt] = useState<string | null>(null);
  const [isCanvasLoadReady, setIsCanvasLoadReady] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const handledImportRequestIdRef = useRef<number | null>(null);
  const hasCheckedSavedCanvasRef = useRef(false);
  const isCheckingSavedCanvasRef = useRef(false);
  const isCanvasKeyboardActiveRef = useRef(false);
  const activeCanvasSelectionRef = useRef<{
    edgeId: string | null;
    nodeId: string | null;
  }>({ edgeId: null, nodeId: null });
  const latestEdgesRef = useRef<CanvasEdge[]>([]);
  const latestNodesRef = useRef<CanvasNode[]>([]);
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const selectedNodes = useNodes<CanvasNode>().filter((node) => node.selected);
  const selectedEdges = useEdges<CanvasEdge>().filter((edge) => edge.selected);
  const { screenToFlowPosition } = reactFlow;
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { saveNow, status: saveStatus } = useCanvasAutosave({
    canvasUpdatedAt,
    edges,
    enabled: isCanvasLoadReady && canSaveCanvas,
    nodes,
    projectId: roomId,
  });
  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
    }
  }, [canUndo, undo]);
  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
    }
  }, [canRedo, redo]);
  const handleZoomIn = useCallback(() => {
    void reactFlow.zoomIn({ duration: VIEWPORT_ANIMATION_DURATION });
  }, [reactFlow]);
  const handleZoomOut = useCallback(() => {
    void reactFlow.zoomOut({ duration: VIEWPORT_ANIMATION_DURATION });
  }, [reactFlow]);
  const handleFitView = useCallback(() => {
    void reactFlow.fitView({
      duration: VIEWPORT_ANIMATION_DURATION,
      padding: 0.18,
    });
  }, [reactFlow]);
  const deleteSelectedCanvasElements = useCallback(() => {
    const currentNodes = reactFlow.getNodes();
    const currentEdges = reactFlow.getEdges();
    const selectedNodeIds = new Set<string>(
      [
        activeCanvasSelectionRef.current.nodeId,
        ...selectedNodes.map((node) => node.id),
        ...currentNodes.filter((node) => node.selected).map((node) => node.id),
      ].filter(isString),
    );
    const edgeIdsToRemove = new Set<string>(
      [
        activeCanvasSelectionRef.current.edgeId,
        ...selectedEdges.map((edge) => edge.id),
        ...currentEdges.filter((edge) => edge.selected).map((edge) => edge.id),
      ].filter(isString),
    );

    for (const edge of currentEdges) {
      if (selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)) {
        edgeIdsToRemove.add(edge.id);
      }
    }

    if (selectedNodeIds.size === 0 && edgeIdsToRemove.size === 0) {
      return false;
    }

    const nodesToRemove = currentNodes.filter((node) =>
      selectedNodeIds.has(node.id),
    );
    const edgesToRemove = currentEdges.filter((edge) =>
      edgeIdsToRemove.has(edge.id),
    );

    if (nodesToRemove.length === 0 && edgesToRemove.length === 0) {
      return false;
    }

    onDelete({
      edges: edgesToRemove,
      nodes: nodesToRemove,
    });
    activeCanvasSelectionRef.current = { edgeId: null, nodeId: null };

    return true;
  }, [onDelete, reactFlow, selectedEdges, selectedNodes]);
  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      const removedEdgeChanges = edges.map((edge) => ({
        id: edge.id,
        type: "remove" as const,
      }));
      const removedNodeChanges = nodes.map((node) => ({
        id: node.id,
        type: "remove" as const,
      }));
      const addedNodeChanges = template.nodes.map((node) => ({
        item: cloneTemplateNode(node),
        type: "add" as const,
      }));
      const addedEdgeChanges = template.edges.map((edge) => ({
        item: cloneTemplateEdge(edge),
        type: "add" as const,
      }));

      if (removedEdgeChanges.length) {
        onEdgesChange(removedEdgeChanges);
      }

      if (removedNodeChanges.length) {
        onNodesChange(removedNodeChanges);
      }

      if (addedNodeChanges.length) {
        onNodesChange(addedNodeChanges);
      }

      if (addedEdgeChanges.length) {
        onEdgesChange(addedEdgeChanges);
      }

      window.requestAnimationFrame(() => {
        void reactFlow.fitView({
          duration: VIEWPORT_ANIMATION_DURATION,
          padding: 0.18,
        });
      });
    },
    [edges, nodes, onEdgesChange, onNodesChange, reactFlow],
  );

  useKeyboardShortcuts({
    reactFlow,
    redo: handleRedo,
    undo: handleUndo,
  });

  useEffect(() => {
    latestEdgesRef.current = edges;
    latestNodesRef.current = nodes;
  }, [edges, nodes]);

  useEffect(() => {
    const wrapper = canvasRef.current;

    if (!wrapper) {
      return;
    }

    const canvasWrapper = wrapper;

    function handleDeleteKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return false;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return false;
      }

      if (!deleteSelectedCanvasElements()) {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    function handleCanvasKeyDown(event: globalThis.KeyboardEvent) {
      handleDeleteKeyDown(event);
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as Node | null;
      const activeElement = document.activeElement;

      if (canvasWrapper.contains(target)) {
        return;
      }

      if (
        !isCanvasKeyboardActiveRef.current ||
        !canvasWrapper.contains(activeElement)
      ) {
        return;
      }

      handleDeleteKeyDown(event);
    }

    function handleDocumentPointerDown(event: globalThis.PointerEvent) {
      if (!canvasWrapper.contains(event.target as Node | null)) {
        isCanvasKeyboardActiveRef.current = false;
      }
    }

    canvasWrapper.addEventListener("keydown", handleCanvasKeyDown, true);
    document.addEventListener("keydown", handleDocumentKeyDown, true);
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);

    return () => {
      canvasWrapper.removeEventListener("keydown", handleCanvasKeyDown, true);
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [deleteSelectedCanvasElements]);

  useEffect(() => {
    onSaveStatusChange(saveStatus);
  }, [onSaveStatusChange, saveStatus]);

  useEffect(() => {
    onManualSaveReady(isCanvasLoadReady && canSaveCanvas ? saveNow : null);

    return () => {
      onManualSaveReady(null);
    };
  }, [canSaveCanvas, isCanvasLoadReady, onManualSaveReady, saveNow]);

  useEffect(() => {
    if (
      isCanvasLoadReady ||
      hasCheckedSavedCanvasRef.current ||
      isCheckingSavedCanvasRef.current
    ) {
      return;
    }

    if (nodes.length > 0 || edges.length > 0) {
      const timeoutId = window.setTimeout(() => {
        hasCheckedSavedCanvasRef.current = true;
        setIsCanvasLoadReady(true);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    isCheckingSavedCanvasRef.current = true;
    const abortController = new AbortController();

    void loadSavedCanvas(roomId, abortController.signal)
      .then((response) => {
        if (abortController.signal.aborted) {
          return;
        }

        hasCheckedSavedCanvasRef.current = true;
        setCanvasUpdatedAt(response.canvasUpdatedAt);

        if (!response.canvas) {
          setIsCanvasLoadReady(true);
          return;
        }

        if (
          latestNodesRef.current.length > 0 ||
          latestEdgesRef.current.length > 0
        ) {
          setIsCanvasLoadReady(true);
          return;
        }

        if (response.canvas.nodes.length > 0) {
          onNodesChange(
            response.canvas.nodes.map((node) => ({
              item: node,
              type: "add" as const,
            })),
          );
        }

        if (response.canvas.edges.length > 0) {
          onEdgesChange(
            response.canvas.edges.map((edge) => ({
              item: edge,
              type: "add" as const,
            })),
          );
        }

        window.requestAnimationFrame(() => {
          void reactFlow.fitView({
            duration: VIEWPORT_ANIMATION_DURATION,
            padding: 0.18,
          });
        });
        setIsCanvasLoadReady(true);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        hasCheckedSavedCanvasRef.current = true;
        console.error("Saved canvas load failed", error);
        onSaveStatusChange("error");
        setIsCanvasLoadReady(true);
      })
      .finally(() => {
        isCheckingSavedCanvasRef.current = false;
      });

    return () => {
      abortController.abort();
      isCheckingSavedCanvasRef.current = false;
    };
  }, [
    edges.length,
    isCanvasLoadReady,
    nodes.length,
    onEdgesChange,
    onNodesChange,
    onSaveStatusChange,
    reactFlow,
    roomId,
  ]);

  useEffect(() => {
    if (!importRequest) {
      return;
    }

    if (handledImportRequestIdRef.current === importRequest.id) {
      return;
    }

    handledImportRequestIdRef.current = importRequest.id;
    importTemplate(importRequest.template);
  }, [importRequest, importTemplate]);

  useEffect(() => {
    if (!dragPreview) {
      return;
    }

    function cancelStaleDragPreview() {
      setDragPreview(null);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        cancelStaleDragPreview();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        cancelStaleDragPreview();
      }
    }

    window.addEventListener("dragend", cancelStaleDragPreview);
    window.addEventListener("drop", cancelStaleDragPreview);
    window.addEventListener("blur", cancelStaleDragPreview);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("dragend", cancelStaleDragPreview);
      window.removeEventListener("drop", cancelStaleDragPreview);
      window.removeEventListener("blur", cancelStaleDragPreview);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dragPreview]);

  function handleConnect(connection: Connection) {
    const edge = createCanvasEdge(connection);

    if (!edge) {
      return;
    }

    onEdgesChange([{ type: "add", item: edge }]);
  }

  function handleReconnect(oldEdge: CanvasEdge, connection: Connection) {
    const edge = createCanvasEdge(
      connection,
      oldEdge.id,
      oldEdge.selected,
      oldEdge.data,
    );

    if (!edge) {
      return;
    }

    onEdgesChange([{ type: "replace", id: oldEdge.id, item: edge }]);
  }

  function handleNodeClick(_event: ReactMouseEvent, node: CanvasNode) {
    activeCanvasSelectionRef.current = { edgeId: null, nodeId: node.id };
    isCanvasKeyboardActiveRef.current = true;
    canvasRef.current?.focus({ preventScroll: true });
  }

  function handleEdgeClick(_event: ReactMouseEvent, edge: CanvasEdge) {
    activeCanvasSelectionRef.current = { edgeId: edge.id, nodeId: null };
    isCanvasKeyboardActiveRef.current = true;
    canvasRef.current?.focus({ preventScroll: true });
  }

  function handlePaneClick() {
    activeCanvasSelectionRef.current = { edgeId: null, nodeId: null };
  }

  function addShapeNode(
    payload: ShapeDragPayload,
    cursor: { x: number; y: number },
  ) {
    const bounds = canvasRef.current?.getBoundingClientRect();

    if (
      !bounds ||
      cursor.x < bounds.left ||
      cursor.x > bounds.right ||
      cursor.y < bounds.top ||
      cursor.y > bounds.bottom
    ) {
      setDragPreview(null);
      return;
    }

    const cursorPosition = screenToFlowPosition(cursor);
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
    setDragPreview(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    const transferTypes = Array.from(event.dataTransfer.types);
    const isShapeDrag =
      transferTypes.includes(SHAPE_DRAG_MIME_TYPE) ||
      transferTypes.includes("text/plain");

    if (!isShapeDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDragPreview((current) =>
      current
        ? {
            ...current,
            cursor: {
              x: event.clientX,
              y: event.clientY,
            },
          }
        : current,
    );
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const payload =
      parseShapeDragPayload(event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)) ??
      parseShapeTextPayload(event.dataTransfer.getData("text/plain"));

    if (!payload) {
      setDragPreview(null);
      return;
    }

    addShapeNode(payload, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleCanvasPointerDownCapture(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (shouldPreserveFocusedTarget(event.target)) {
      isCanvasKeyboardActiveRef.current = false;
      return;
    }

    isCanvasKeyboardActiveRef.current = true;
    event.currentTarget.focus({ preventScroll: true });
  }

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      className="h-full w-full bg-base outline-none focus:outline-none focus-visible:outline-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDownCapture={handleCanvasPointerDownCapture}
    >
      <ReactFlow
        className="h-full w-full bg-base"
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={CANVAS_EDGE_STYLE}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={32}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        deleteKeyCode={null}
        edges={edges}
        edgeTypes={edgeTypes}
        edgesReconnectable
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onDelete={onDelete}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEdgeClick={handleEdgeClick}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
        onPaneClick={handlePaneClick}
        onReconnect={handleReconnect}
        reconnectRadius={18}
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
          nodeClassName={(node) => (node as CanvasNode).data.shape}
          nodeColor={(node) => (node as CanvasNode).data.color.fill}
          nodeComponent={MiniMapShapeNode}
          nodeStrokeColor={(node) =>
            node.selected ? "var(--accent-primary)" : "var(--border-subtle)"
          }
          nodeStrokeWidth={1.5}
          pannable
          style={{
            background: "var(--bg-base)",
          }}
          zoomable
        />
        <LiveCursorLayer currentUserId={currentUserId} />
        <ParticipantAvatarGroup
          currentUserId={currentUserId}
          isAiSidebarOpen={isAiSidebarOpen}
        />
        <CanvasControlBar
          canRedo={canRedo}
          canUndo={canUndo}
          onFitView={handleFitView}
          onRedo={handleRedo}
          onUndo={handleUndo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
        <ShapePanel
          onDragCancel={() => setDragPreview(null)}
          onDragMove={(cursor) =>
            setDragPreview((current) =>
              current
                ? {
                    ...current,
                    cursor,
                  }
                : current,
            )
          }
          onDragStart={setDragPreview}
          onPointerDrop={addShapeNode}
        />
        {dragPreview ? <ShapeDragPreview preview={dragPreview} /> : null}
      </ReactFlow>
    </div>
  );
}

function CanvasControlBar({
  canRedo,
  canUndo,
  onFitView,
  onRedo,
  onUndo,
  onZoomIn,
  onZoomOut,
}: {
  canRedo: boolean;
  canUndo: boolean;
  onFitView: () => void;
  onRedo: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="nodrag nopan absolute bottom-5 left-5 z-20 flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-1">
        <CanvasControlButton label="Zoom out" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton label="Fit view" onClick={onFitView}>
          <Maximize2 className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton label="Zoom in" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </CanvasControlButton>
      </div>
      <div className="mx-1 h-6 w-px bg-surface-border-subtle" />
      <div className="flex items-center gap-1">
        <CanvasControlButton
          disabled={!canUndo}
          label="Undo"
          onClick={onUndo}
        >
          <Undo2 className="h-4 w-4" />
        </CanvasControlButton>
        <CanvasControlButton
          disabled={!canRedo}
          label="Redo"
          onClick={onRedo}
        >
          <Redo2 className="h-4 w-4" />
        </CanvasControlButton>
      </div>
    </div>
  );
}

function CanvasControlButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-copy-muted transition hover:bg-accent-dim hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-copy-muted"
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ParticipantAvatarGroup({
  currentUserId,
  isAiSidebarOpen,
}: {
  currentUserId: string;
  isAiSidebarOpen: boolean;
}) {
  const participantEntries = useOthersMapped(
    (other): ParticipantSummary => ({
      avatarUrl: other.info.avatarUrl ?? null,
      connectionId: other.connectionId,
      cursorColor: other.info.cursorColor || "var(--accent-primary)",
      displayName: other.info.displayName || `Collaborator ${other.connectionId}`,
      userId: other.id,
    }),
    areParticipantSummariesEqual,
  );
  const collaborators = participantEntries
    .map(([connectionId, participant]) => ({
      ...participant,
      connectionId,
    }))
    .filter((participant) => participant.userId !== currentUserId);
  const visibleCollaborators = collaborators.slice(0, 5);
  const overflowCount = Math.max(collaborators.length - visibleCollaborators.length, 0);

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Canvas participants"
      className={cn(
        "nodrag nopan absolute right-4 top-4 z-40 flex items-center rounded-full border border-surface-border bg-surface/95 px-1.5 py-1.5 shadow-2xl backdrop-blur",
        isAiSidebarOpen && "lg:right-[calc(22rem+2rem)]",
      )}
    >
      <div className="flex items-center px-1">
        {visibleCollaborators.map((participant, index) => (
          <CollaboratorAvatar
            key={participant.connectionId}
            participant={participant}
            stackIndex={index}
          />
        ))}
        {overflowCount > 0 ? (
          <div
            aria-label={`${overflowCount} more collaborators`}
            className="-ml-2 grid h-9 min-w-9 place-items-center rounded-full border border-surface-border bg-subtle px-2 text-xs font-medium text-copy-secondary ring-2 ring-base"
          >
            +{overflowCount}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CollaboratorAvatar({
  participant,
  stackIndex,
}: {
  participant: ParticipantSummary;
  stackIndex: number;
}) {
  const initials = getInitials(participant.displayName);

  return (
    <div
      aria-label={participant.displayName}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-surface-border bg-subtle text-xs font-semibold text-copy-primary ring-2 ring-base",
        stackIndex > 0 && "-ml-2",
      )}
      style={
        participant.avatarUrl
          ? {
              backgroundImage: formatCssUrl(participant.avatarUrl),
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
      title={participant.displayName}
    >
      {participant.avatarUrl ? (
        <span className="sr-only">{participant.displayName}</span>
      ) : (
        initials
      )}
    </div>
  );
}

function LiveCursorLayer({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const components = useMemo(
    () => ({
      Cursor(cursorProps: CursorsCursorProps) {
        return (
          <LiveCursor currentUserId={currentUserId} cursorProps={cursorProps} />
        );
      },
    }),
    [currentUserId],
  );

  return (
    <Cursors
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      components={components}
    />
  );
}

function LiveCursor({
  currentUserId,
  cursorProps,
}: {
  currentUserId: string;
  cursorProps: CursorsCursorProps;
}) {
  const participant = useOther(cursorProps.connectionId, (other): ParticipantSummary => ({
    avatarUrl: other.info.avatarUrl ?? null,
    connectionId: other.connectionId,
    cursorColor: other.info.cursorColor || "var(--accent-primary)",
    displayName: other.info.displayName || `Collaborator ${other.connectionId}`,
    userId: other.id,
  }));

  if (!participant || participant.userId === currentUserId) {
    return null;
  }

  return (
    <div className="flex items-start">
      <svg
        aria-hidden="true"
        className="drop-shadow-lg"
        fill="none"
        height="18"
        viewBox="0 0 18 18"
        width="18"
      >
        <path
          d="M2 2L15 7.2L9.3 9.3L7.2 15Z"
          fill={participant.cursorColor}
          stroke="var(--bg-base)"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="ml-1 mt-3 max-w-36 truncate rounded-full px-2 py-1 text-xs font-medium text-background shadow-xl"
        style={{ backgroundColor: participant.cursorColor }}
      >
        {participant.displayName}
      </div>
    </div>
  );
}

function areParticipantSummariesEqual(
  previous: ParticipantSummary,
  current: ParticipantSummary,
) {
  return (
    previous.avatarUrl === current.avatarUrl &&
    previous.connectionId === current.connectionId &&
    previous.cursorColor === current.cursorColor &&
    previous.displayName === current.displayName &&
    previous.userId === current.userId
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

function ShapePanel({
  onDragCancel,
  onDragMove,
  onDragStart,
  onPointerDrop,
}: ShapePanelProps) {
  const [pointerDrag, setPointerDrag] = useState<ShapeDragPayload | null>(null);
  const capturedPointerRef = useRef<{
    element: HTMLButtonElement;
    pointerId: number;
  } | null>(null);

  const cancelPointerDrag = useCallback(() => {
    releaseCapturedPointer(capturedPointerRef.current);
    capturedPointerRef.current = null;
    setPointerDrag(null);
    onDragCancel();
  }, [onDragCancel]);

  useEffect(() => {
    if (!pointerDrag) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        cancelPointerDrag();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        cancelPointerDrag();
      }
    }

    window.addEventListener("blur", cancelPointerDrag);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", cancelPointerDrag);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelPointerDrag, pointerDrag]);

  function createShapePayload(shape: NodeShape): ShapeDragPayload {
    return {
      shape,
      size: DEFAULT_NODE_SIZES[shape],
    };
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    shape: NodeShape,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const payload = createShapePayload(shape);

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    capturedPointerRef.current = {
      element: event.currentTarget,
      pointerId: event.pointerId,
    };
    setPointerDrag(payload);
    onDragStart({
      ...payload,
      cursor: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pointerDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onDragMove({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handlePointerDrop(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pointerDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    releaseCapturedPointer(capturedPointerRef.current);
    capturedPointerRef.current = null;
    onPointerDrop(pointerDrag, {
      x: event.clientX,
      y: event.clientY,
    });
    setPointerDrag(null);
  }

  function handlePointerCancel() {
    if (!pointerDrag) {
      return;
    }

    cancelPointerDrag();
  }

  return (
    <div className="nodrag nopan absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur">
      {NODE_SHAPES.map((shape) => {
        const Icon = shapeIcons[shape];

        return (
          <button
            key={shape}
            aria-label={`Drag ${shape} shape to canvas`}
            className="nodrag nopan flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-full text-copy-muted transition hover:bg-accent-dim hover:text-brand active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            draggable={false}
            title={shape}
            type="button"
            onPointerCancel={handlePointerCancel}
            onPointerDown={(event) => handlePointerDown(event, shape)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerDrop}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

function releaseCapturedPointer(
  capturedPointer: {
    element: HTMLButtonElement;
    pointerId: number;
  } | null,
) {
  if (!capturedPointer) {
    return;
  }

  if (!capturedPointer.element.hasPointerCapture(capturedPointer.pointerId)) {
    return;
  }

  capturedPointer.element.releasePointerCapture(capturedPointer.pointerId);
}

function CanvasNodeRenderer({ data, id, selected }: NodeProps<CanvasNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateNodeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const strokeColor = selected ? "var(--accent-primary)" : "var(--border-subtle)";

  function handleLabelChange(value: string) {
    updateNodeData(id, { label: value });
  }

  function handleColorChange(color: NodeColor) {
    updateNodeData(id, { color });
  }

  return (
    <>
      <NodeColorToolbar
        activeColor={data.color}
        isVisible={selected}
        nodeId={id}
        onColorChange={handleColorChange}
      />
      <NodeResizer
        color="var(--accent-primary)"
        handleStyle={nodeResizerHandleStyle}
        isVisible={selected}
        lineStyle={nodeResizerLineStyle}
        minHeight={MIN_NODE_HEIGHT}
        minWidth={MIN_NODE_WIDTH}
        nodeId={id}
      />
      <NodeShapeFrame
        color={data.color.fill}
        isEditing={isEditing}
        label={data.label}
        selected={selected}
        shape={data.shape}
        strokeColor={strokeColor}
        textColor={data.color.text}
        onEditEnd={() => setIsEditing(false)}
        onEditStart={() => setIsEditing(true)}
        onLabelChange={handleLabelChange}
      />
    </>
  );
}

function NodeColorToolbar({
  activeColor,
  isVisible,
  nodeId,
  onColorChange,
}: {
  activeColor: NodeColor;
  isVisible: boolean;
  nodeId: string;
  onColorChange: (color: NodeColor) => void;
}) {
  return (
    <NodeToolbar
      className="nodrag nopan nowheel z-20"
      isVisible={isVisible}
      nodeId={nodeId}
      offset={14}
      position={Position.Top}
    >
      <div
        className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1 shadow-xl backdrop-blur"
        onDoubleClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {NODE_COLORS.map((color) => {
          const isActive =
            activeColor.fill === color.fill && activeColor.text === color.text;

          return (
            <button
              key={`${color.fill}-${color.text}`}
              aria-label={`Use node color ${color.fill}`}
              aria-pressed={isActive}
              className={cn(
                "h-6 w-6 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:ring-2 hover:ring-[var(--swatch-glow)]",
                isActive && "scale-110 ring-2 ring-[var(--swatch-glow)]",
              )}
              style={
                {
                  "--swatch-glow": color.text,
                  backgroundColor: color.fill,
                  borderColor: isActive ? color.text : "var(--border-subtle)",
                } as CSSProperties
              }
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onColorChange(color);
              }}
            />
          );
        })}
      </div>
    </NodeToolbar>
  );
}

function ShapeDragPreview({ preview }: { preview: ShapeDragPreviewState }) {
  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 opacity-70"
      style={{
        height: preview.size.height,
        transform: `translate3d(${preview.cursor.x - preview.size.width / 2}px, ${
          preview.cursor.y - preview.size.height / 2
        }px, 0)`,
        width: preview.size.width,
      }}
    >
      <NodeShapeFrame
        color={DEFAULT_NODE_COLOR.fill}
        label=""
        selected={false}
        shape={preview.shape}
        strokeColor="var(--accent-primary)"
        textColor={DEFAULT_NODE_COLOR.text}
      />
    </div>
  );
}

function NodeShapeFrame({
  color,
  isEditing = false,
  label,
  onEditEnd,
  onEditStart,
  onLabelChange,
  selected,
  shape,
  strokeColor,
  textColor,
}: {
  color: string;
  isEditing?: boolean;
  label: string;
  onEditEnd?: () => void;
  onEditStart?: () => void;
  onLabelChange?: (value: string) => void;
  selected: boolean;
  shape: NodeShape;
  strokeColor: string;
  textColor: string;
}) {
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null);
  const visibleLabel = label.trim() ? label : "label";

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const input = labelInputRef.current;

    if (!input) {
      return;
    }

    window.requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }, [isEditing]);

  function handleLabelChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onLabelChange?.(event.target.value);
  }

	  function handleLabelKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
	    event.stopPropagation();

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
	    event.currentTarget.blur();
	  }

  function handleFrameDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    onEditStart?.();
  }

  function handleLabelClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onEditStart?.();
  }

	  return (
	    <div
	      className={cn(
	        "group relative h-full w-full text-sm font-medium",
	        selected && "drop-shadow-[0_0_16px_var(--accent-primary-dim)]",
	      )}
	      style={{ color: textColor }}
      onDoubleClick={handleFrameDoubleClick}
	    >
      <NodeShapeSurface color={color} shape={shape} strokeColor={strokeColor} />
      {isEditing ? (
        <textarea
          ref={labelInputRef}
          aria-label="Node label"
          className="nodrag nopan nowheel absolute inset-x-3 top-1/2 z-10 max-h-[calc(100%-1rem)] min-h-5 -translate-y-1/2 resize-none overflow-hidden border-0 bg-transparent px-1 text-center text-sm font-medium leading-5 outline-none [field-sizing:content]"
          rows={1}
          spellCheck={false}
          value={label}
          onBlur={onEditEnd}
          onChange={handleLabelChange}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDownCapture={(event) => event.stopPropagation()}
          onKeyDown={handleLabelKeyDown}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center">
          <button
            aria-label="Edit node label"
	            className="nodrag nopan pointer-events-auto min-w-0 cursor-text focus-visible:outline-none"
	            type="button"
            onClick={handleLabelClick}
            onDoubleClick={(event) => event.stopPropagation()}
	          >
            <span
              className={cn(
                "block min-w-0 truncate",
                !label.trim() && "opacity-55",
              )}
            >
              {visibleLabel}
            </span>
          </button>
        </div>
      )}
      <NodeHandles />
    </div>
  );
}

function NodeShapeSurface({
  color,
  shape,
  strokeColor,
}: {
  color: string;
  shape: NodeShape;
  strokeColor: string;
}) {
  if (shape === "diamond") {
    return (
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="50,2 98,50 50,98 2,50"
          stroke={strokeColor}
          strokeWidth={NODE_SURFACE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (shape === "hexagon") {
    return (
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="25,3 75,3 98,50 75,97 25,97 2,50"
          stroke={strokeColor}
          strokeWidth={NODE_SURFACE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (shape === "cylinder") {
    return (
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M0 16C0 7.2 22.4 0 50 0s50 7.2 50 16v68c0 8.8-22.4 16-50 16S0 92.8 0 84Z"
          fill={color}
          stroke={strokeColor}
          strokeWidth={NODE_SURFACE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
        <ellipse
          cx="50"
          cy="16"
          fill="none"
          rx="50"
          ry="16"
          stroke={strokeColor}
          strokeWidth={NODE_SURFACE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 border",
        shape === "circle" && "rounded-full",
        shape === "pill" && "rounded-full",
        shape === "rectangle" && "rounded-xl",
      )}
      style={{
        backgroundColor: color,
        borderColor: strokeColor,
        borderWidth: NODE_SURFACE_STROKE_WIDTH,
      }}
    />
  );
}

function NodeHandles() {
  return (
    <>
      {HANDLE_SIDES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          className="opacity-0 transition group-hover:opacity-100"
          isConnectableEnd
          isConnectableStart
          position={position}
          style={handleStyle}
          type="source"
        />
      ))}
    </>
  );
}

function CanvasEdgeRenderer({
  data,
  id,
  markerEnd,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "");
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const store = useStoreApi<CanvasNode, CanvasEdge>();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 24,
  });
  const label = data?.label ?? "";
  const isActive = selected || isHovered || isEditing;
  const shouldShowEmptyLabel = selected || isEditing;
  const visibleLabel = label.trim();

  function startEditing() {
    setDraftLabel(label);
    setIsEditing(true);
  }

  function saveLabel() {
    const edge = reactFlow.getEdge(id);

    if (!edge) {
      setIsEditing(false);
      return;
    }

    store.getState().triggerEdgeChanges([
      {
        id,
        item: {
          ...edge,
          data: {
            ...(edge.data ?? {}),
            label: draftLabel,
          },
        },
        type: "replace",
      },
    ]);
    setIsEditing(false);
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftLabel(label);
      setIsEditing(false);
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    saveLabel();
  }

  function stopCanvasInteraction(
    event: ReactMouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>,
  ) {
    event.stopPropagation();
  }

  function handleLabelEditClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    startEditing();
  }

  return (
    <>
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={28}
        onDoubleClick={(event) => {
          event.stopPropagation();
          startEditing();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <BaseEdge
        id={id}
        interactionWidth={0}
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          ...style,
          opacity: isActive ? 0.98 : 0.56,
          stroke: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: isActive ? 2 : 1.6,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan nowheel absolute"
          style={{
            pointerEvents: "all",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {isEditing ? (
            <input
              aria-label="Edge label"
              autoFocus
              className="min-h-7 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-center text-xs font-medium text-copy-primary shadow-xl outline-none [field-sizing:content] placeholder:text-copy-faint focus:border-brand"
              size={Math.max(draftLabel.length, 4)}
              spellCheck={false}
              value={draftLabel}
              onBlur={saveLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onDoubleClick={stopCanvasInteraction}
              onKeyDown={handleLabelKeyDown}
              onMouseDown={stopCanvasInteraction}
              onPointerDown={(event) => event.stopPropagation()}
            />
	          ) : visibleLabel ? (
	            <button
	              className="rounded-full border border-surface-border bg-surface/95 px-2.5 py-1 text-xs font-medium text-copy-secondary shadow-lg backdrop-blur transition hover:border-brand hover:text-copy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
	              type="button"
	              onClick={handleLabelEditClick}
	              onDoubleClick={stopCanvasInteraction}
	              onMouseDown={stopCanvasInteraction}
	              onPointerDown={(event) => event.stopPropagation()}
	            >
	              {visibleLabel}
	            </button>
	          ) : shouldShowEmptyLabel ? (
	            <button
	              className="rounded-full border border-surface-border bg-surface/80 px-2.5 py-1 text-xs font-medium text-copy-faint shadow-lg backdrop-blur transition hover:border-brand hover:text-copy-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
	              type="button"
	              onClick={handleLabelEditClick}
	              onDoubleClick={stopCanvasInteraction}
	              onMouseDown={stopCanvasInteraction}
	              onPointerDown={(event) => event.stopPropagation()}
	            >
              label
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function MiniMapShapeNode({
  id,
  x,
  y,
  width,
  height,
  className,
  color = "var(--bg-subtle)",
  strokeColor = "var(--border-subtle)",
  strokeWidth = 1.5,
  onClick,
}: MiniMapNodeShapeProps) {
  const shape = getMiniMapShape(className);
  const clickHandler = onClick
    ? (event: ReactMouseEvent) => onClick(event, id)
    : undefined;
  const style = createMiniMapNodeStyle(color, strokeColor, strokeWidth);

  if (shape === "diamond") {
    return (
      <polygon
        className="react-flow__minimap-node"
        fill={color}
        points={`${x + width / 2},${y} ${x + width},${y + height / 2} ${
          x + width / 2
        },${y + height} ${x},${y + height / 2}`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={style}
        vectorEffect="non-scaling-stroke"
        onClick={clickHandler}
      />
    );
  }

  if (shape === "hexagon") {
    return (
      <polygon
        className="react-flow__minimap-node"
        fill={color}
        points={`${x + width * 0.25},${y} ${x + width * 0.75},${y} ${
          x + width
        },${y + height / 2} ${x + width * 0.75},${y + height} ${
          x + width * 0.25
        },${y + height} ${x},${y + height / 2}`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={style}
        vectorEffect="non-scaling-stroke"
        onClick={clickHandler}
      />
    );
  }

  if (shape === "cylinder") {
    const radiusY = Math.max(4, Math.min(height * 0.18, 12));

    return (
      <g
        className="react-flow__minimap-node"
        style={style}
        onClick={clickHandler}
      >
        <path
          d={`M${x},${y + radiusY}C${x},${y + radiusY / 2} ${
            x + width * 0.25
          },${y} ${x + width / 2},${y}s${width / 2},${radiusY / 2} ${
            width / 2
          },${radiusY}v${height - radiusY * 2}C${x + width},${
            y + height - radiusY / 2
          } ${x + width * 0.75},${y + height} ${x + width / 2},${
            y + height
          }S${x},${y + height - radiusY / 2} ${x},${
            y + height - radiusY
          }Z`}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <ellipse
          cx={x + width / 2}
          cy={y + radiusY}
          fill="none"
          rx={width / 2}
          ry={radiusY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (shape === "circle") {
    return (
      <ellipse
        className="react-flow__minimap-node"
        cx={x + width / 2}
        cy={y + height / 2}
        fill={color}
        rx={width / 2}
        ry={height / 2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={style}
        vectorEffect="non-scaling-stroke"
        onClick={clickHandler}
      />
    );
  }

  return (
    <rect
      className="react-flow__minimap-node"
      fill={color}
      height={height}
      rx={shape === "pill" ? height / 2 : 6}
      ry={shape === "pill" ? height / 2 : 6}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      style={style}
      vectorEffect="non-scaling-stroke"
      width={width}
      x={x}
      y={y}
      onClick={clickHandler}
    />
  );
}

function createMiniMapNodeStyle(
  color: string,
  strokeColor: string,
  strokeWidth: number,
) {
  return {
    "--xy-minimap-node-background-color-props": color,
    "--xy-minimap-node-stroke-color-props": strokeColor,
    "--xy-minimap-node-stroke-width-props": strokeWidth,
  } as CSSProperties;
}

function getMiniMapShape(className: string): NodeShape {
  const shape = NODE_SHAPES.find((nodeShape) =>
    className.split(" ").includes(nodeShape),
  );

  return shape ?? "rectangle";
}

function createCanvasEdge(
  connection: Connection,
  id = createCanvasEdgeId(connection),
  selected = false,
  data = { label: "" },
): CanvasEdge | null {
  if (!connection.source || !connection.target) {
    return null;
  }

  return {
    id,
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
    data,
    selected,
    markerEnd: CANVAS_EDGE_MARKER,
    reconnectable: true,
    style: CANVAS_EDGE_STYLE,
    type: "canvasEdge",
  };
}

function createCanvasEdgeId(connection: Connection): string {
  return `edge-${connection.source}-${connection.sourceHandle ?? "node"}-${
    connection.target
  }-${connection.targetHandle ?? "node"}-${Date.now()}`;
}

function cloneTemplateNode(node: CanvasNode): CanvasNode {
  return {
    ...node,
    data: {
      ...node.data,
      color: {
        ...node.data.color,
      },
    },
    position: {
      ...node.position,
    },
    style: node.style
      ? {
          ...node.style,
        }
      : undefined,
  };
}

function cloneTemplateEdge(edge: CanvasEdge): CanvasEdge {
  return {
    ...edge,
    data: {
      label: edge.data?.label ?? "",
    },
    markerEnd: CANVAS_EDGE_MARKER,
    reconnectable: true,
    selected: false,
    style: CANVAS_EDGE_STYLE,
    type: "canvasEdge",
  };
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
