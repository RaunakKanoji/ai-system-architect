"use client";

import { ArrowRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import type { CanvasNode, NodeShape } from "@/types/canvas";

const PREVIEW_WIDTH = 300;
const PREVIEW_HEIGHT = 156;
const PREVIEW_PADDING = 18;

interface StarterTemplatesModalProps {
  isOpen: boolean;
  templates: readonly CanvasTemplate[];
  onImport: (template: CanvasTemplate) => void;
  onOpenChange: (isOpen: boolean) => void;
}

interface PreviewBounds {
  minX: number;
  minY: number;
  scale: number;
}

export function StarterTemplatesModal({
  isOpen,
  templates,
  onImport,
  onOpenChange,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(44rem,calc(100vh-2rem))] gap-0 overflow-hidden rounded-3xl border border-surface-border bg-surface p-0 text-copy-primary sm:max-w-4xl">
        <DialogHeader className="border-b border-surface-border px-6 py-5">
          <DialogTitle className="text-base font-medium text-copy-primary">
            Starter templates
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-copy-muted">
            Replace the current canvas with a predefined system diagram.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(min(44rem,100vh-2rem)-6.75rem)]">
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-surface-border bg-elevated"
              >
                <TemplatePreview template={template} />
                <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-surface-border p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-copy-primary">
                      {template.name}
                    </h3>
                    <p className="line-clamp-3 text-sm leading-6 text-copy-muted">
                      {template.description}
                    </p>
                  </div>
                  <div className="mt-auto">
                    <Button
                      className="w-full"
                      type="button"
                      onClick={() => handleImport(template)}
                    >
                      Import
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const bounds = calculatePreviewBounds(template.nodes);

  return (
    <svg
      aria-hidden="true"
      className="h-40 w-full bg-base"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
    >
      <rect
        fill="var(--bg-base)"
        height={PREVIEW_HEIGHT}
        width={PREVIEW_WIDTH}
        x="0"
        y="0"
      />
      {template.edges.map((edge) => {
        const source = template.nodes.find((node) => node.id === edge.source);
        const target = template.nodes.find((node) => node.id === edge.target);

        if (!source || !target) {
          return null;
        }

        const sourceCenter = getPreviewNodeCenter(source, bounds);
        const targetCenter = getPreviewNodeCenter(target, bounds);

        return (
          <line
            key={edge.id}
            stroke="var(--text-muted)"
            strokeLinecap="round"
            strokeOpacity="0.65"
            strokeWidth="1.4"
            x1={sourceCenter.x}
            x2={targetCenter.x}
            y1={sourceCenter.y}
            y2={targetCenter.y}
          />
        );
      })}
      {template.nodes.map((node) => (
        <PreviewNode key={node.id} bounds={bounds} node={node} />
      ))}
    </svg>
  );
}

function PreviewNode({
  bounds,
  node,
}: {
  bounds: PreviewBounds;
  node: CanvasNode;
}) {
  const x = projectPreviewValue(node.position.x, bounds.minX, bounds.scale);
  const y = projectPreviewValue(node.position.y, bounds.minY, bounds.scale);
  const width = getNodeWidth(node) * bounds.scale;
  const height = getNodeHeight(node) * bounds.scale;
  const commonProps = {
    fill: node.data.color.fill,
    stroke: node.data.color.text,
    strokeOpacity: 0.8,
    strokeWidth: 1.2,
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (node.data.shape === "diamond") {
    return (
      <polygon
        {...commonProps}
        points={`${x + width / 2},${y} ${x + width},${y + height / 2} ${
          x + width / 2
        },${y + height} ${x},${y + height / 2}`}
      />
    );
  }

  if (node.data.shape === "hexagon") {
    return (
      <polygon
        {...commonProps}
        points={`${x + width * 0.25},${y} ${x + width * 0.75},${y} ${
          x + width
        },${y + height / 2} ${x + width * 0.75},${y + height} ${
          x + width * 0.25
        },${y + height} ${x},${y + height / 2}`}
      />
    );
  }

  if (node.data.shape === "cylinder") {
    const radiusY = Math.max(3, Math.min(height * 0.18, 8));

    return (
      <g>
        <path
          {...commonProps}
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
        />
        <ellipse
          cx={x + width / 2}
          cy={y + radiusY}
          fill="none"
          rx={width / 2}
          ry={radiusY}
          stroke={node.data.color.text}
          strokeOpacity="0.8"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (node.data.shape === "circle") {
    return (
      <ellipse
        {...commonProps}
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
      />
    );
  }

  return (
    <rect
      {...commonProps}
      height={height}
      rx={getPreviewCornerRadius(node.data.shape, height)}
      ry={getPreviewCornerRadius(node.data.shape, height)}
      width={width}
      x={x}
      y={y}
    />
  );
}

function calculatePreviewBounds(nodes: readonly CanvasNode[]): PreviewBounds {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      scale: 1,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(
    ...nodes.map((node) => node.position.x + getNodeWidth(node)),
  );
  const maxY = Math.max(
    ...nodes.map((node) => node.position.y + getNodeHeight(node)),
  );
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    minX,
    minY,
    scale: Math.min(
      (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / width,
      (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / height,
    ),
  };
}

function getPreviewNodeCenter(node: CanvasNode, bounds: PreviewBounds) {
  return {
    x:
      projectPreviewValue(node.position.x, bounds.minX, bounds.scale) +
      (getNodeWidth(node) * bounds.scale) / 2,
    y:
      projectPreviewValue(node.position.y, bounds.minY, bounds.scale) +
      (getNodeHeight(node) * bounds.scale) / 2,
  };
}

function projectPreviewValue(value: number, min: number, scale: number) {
  return (value - min) * scale + PREVIEW_PADDING;
}

function getNodeWidth(node: CanvasNode) {
  const styleWidth = Number(node.style?.width);
  return node.width ?? (Number.isFinite(styleWidth) ? styleWidth : 160);
}

function getNodeHeight(node: CanvasNode) {
  const styleHeight = Number(node.style?.height);
  return node.height ?? (Number.isFinite(styleHeight) ? styleHeight : 88);
}

function getPreviewCornerRadius(shape: NodeShape, height: number) {
  return shape === "pill" ? height / 2 : 5;
}
