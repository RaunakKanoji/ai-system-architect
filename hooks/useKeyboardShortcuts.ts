"use client";

import { useEffect } from "react";
import type { Edge, Node, ReactFlowInstance } from "@xyflow/react";

const VIEWPORT_ANIMATION_DURATION = 160;

interface UseKeyboardShortcutsOptions<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
> {
  reactFlow: ReactFlowInstance<NodeType, EdgeType>;
  redo: () => void;
  undo: () => void;
}

export function useKeyboardShortcuts<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>({
  reactFlow,
  redo,
  undo,
}: UseKeyboardShortcutsOptions<NodeType, EdgeType>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCommand = event.metaKey || event.ctrlKey;

      if (isCommand && key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (isCommand && key === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (isCommand && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (!isCommand && !event.altKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        void reactFlow.zoomIn({ duration: VIEWPORT_ANIMATION_DURATION });
        return;
      }

      if (!isCommand && !event.altKey && event.key === "-") {
        event.preventDefault();
        void reactFlow.zoomOut({ duration: VIEWPORT_ANIMATION_DURATION });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactFlow, redo, undo]);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
