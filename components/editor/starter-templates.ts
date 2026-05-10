import type { Connection } from "@xyflow/react";

import {
  DEFAULT_NODE_SIZES,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface TemplateNodeInput {
  id: string;
  label: string;
  shape: NodeShape;
  colorIndex: number;
  x: number;
  y: number;
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices-platform",
    name: "Microservices Platform",
    description:
      "Gateway-led service mesh with dedicated services, storage, cache, and event streaming.",
    nodes: [
      createTemplateNode({
        id: "client",
        label: "Client Apps",
        shape: "hexagon",
        colorIndex: 1,
        x: 0,
        y: 90,
      }),
      createTemplateNode({
        id: "gateway",
        label: "API Gateway",
        shape: "pill",
        colorIndex: 7,
        x: 260,
        y: 100,
      }),
      createTemplateNode({
        id: "auth",
        label: "Auth Service",
        shape: "rectangle",
        colorIndex: 2,
        x: 520,
        y: 0,
      }),
      createTemplateNode({
        id: "orders",
        label: "Order Service",
        shape: "rectangle",
        colorIndex: 3,
        x: 520,
        y: 130,
      }),
      createTemplateNode({
        id: "inventory",
        label: "Inventory Service",
        shape: "rectangle",
        colorIndex: 6,
        x: 520,
        y: 260,
      }),
      createTemplateNode({
        id: "postgres",
        label: "PostgreSQL",
        shape: "cylinder",
        colorIndex: 1,
        x: 800,
        y: 40,
      }),
      createTemplateNode({
        id: "redis",
        label: "Redis Cache",
        shape: "cylinder",
        colorIndex: 4,
        x: 800,
        y: 180,
      }),
      createTemplateNode({
        id: "events",
        label: "Event Bus",
        shape: "pill",
        colorIndex: 7,
        x: 800,
        y: 320,
      }),
    ],
    edges: [
      createTemplateEdge("client-gateway", "client", "gateway"),
      createTemplateEdge("gateway-auth", "gateway", "auth"),
      createTemplateEdge("gateway-orders", "gateway", "orders"),
      createTemplateEdge("gateway-inventory", "gateway", "inventory"),
      createTemplateEdge("auth-postgres", "auth", "postgres"),
      createTemplateEdge("orders-postgres", "orders", "postgres"),
      createTemplateEdge("orders-redis", "orders", "redis"),
      createTemplateEdge("orders-events", "orders", "events"),
      createTemplateEdge("inventory-events", "inventory", "events"),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Repository-triggered delivery flow with build, test, security scan, artifact registry, and deploy stages.",
    nodes: [
      createTemplateNode({
        id: "repo",
        label: "Git Repository",
        shape: "hexagon",
        colorIndex: 1,
        x: 0,
        y: 110,
      }),
      createTemplateNode({
        id: "ci",
        label: "CI Runner",
        shape: "pill",
        colorIndex: 7,
        x: 230,
        y: 120,
      }),
      createTemplateNode({
        id: "build",
        label: "Build",
        shape: "rectangle",
        colorIndex: 2,
        x: 470,
        y: 0,
      }),
      createTemplateNode({
        id: "tests",
        label: "Tests",
        shape: "rectangle",
        colorIndex: 6,
        x: 470,
        y: 130,
      }),
      createTemplateNode({
        id: "scan",
        label: "Security Scan",
        shape: "diamond",
        colorIndex: 4,
        x: 480,
        y: 270,
      }),
      createTemplateNode({
        id: "registry",
        label: "Artifact Registry",
        shape: "cylinder",
        colorIndex: 3,
        x: 760,
        y: 80,
      }),
      createTemplateNode({
        id: "staging",
        label: "Staging",
        shape: "rectangle",
        colorIndex: 5,
        x: 1020,
        y: 40,
      }),
      createTemplateNode({
        id: "production",
        label: "Production",
        shape: "rectangle",
        colorIndex: 7,
        x: 1020,
        y: 190,
      }),
    ],
    edges: [
      createTemplateEdge("repo-ci", "repo", "ci"),
      createTemplateEdge("ci-build", "ci", "build"),
      createTemplateEdge("ci-tests", "ci", "tests"),
      createTemplateEdge("ci-scan", "ci", "scan"),
      createTemplateEdge("build-registry", "build", "registry"),
      createTemplateEdge("tests-registry", "tests", "registry"),
      createTemplateEdge("scan-registry", "scan", "registry"),
      createTemplateEdge("registry-staging", "registry", "staging"),
      createTemplateEdge("staging-production", "staging", "production"),
    ],
  },
  {
    id: "event-driven-commerce",
    name: "Event-Driven Commerce",
    description:
      "Order intake, event routing, asynchronous consumers, read models, and customer notifications.",
    nodes: [
      createTemplateNode({
        id: "web",
        label: "Web App",
        shape: "hexagon",
        colorIndex: 1,
        x: 0,
        y: 110,
      }),
      createTemplateNode({
        id: "orders-api",
        label: "Orders API",
        shape: "pill",
        colorIndex: 7,
        x: 250,
        y: 120,
      }),
      createTemplateNode({
        id: "orders-db",
        label: "Orders DB",
        shape: "cylinder",
        colorIndex: 3,
        x: 500,
        y: 20,
      }),
      createTemplateNode({
        id: "broker",
        label: "Message Broker",
        shape: "pill",
        colorIndex: 2,
        x: 500,
        y: 200,
      }),
      createTemplateNode({
        id: "payments",
        label: "Payment Worker",
        shape: "rectangle",
        colorIndex: 6,
        x: 780,
        y: 0,
      }),
      createTemplateNode({
        id: "shipping",
        label: "Shipping Worker",
        shape: "rectangle",
        colorIndex: 5,
        x: 780,
        y: 130,
      }),
      createTemplateNode({
        id: "projection",
        label: "Read Model",
        shape: "cylinder",
        colorIndex: 1,
        x: 780,
        y: 280,
      }),
      createTemplateNode({
        id: "notifications",
        label: "Notifications",
        shape: "circle",
        colorIndex: 4,
        x: 1060,
        y: 155,
      }),
    ],
    edges: [
      createTemplateEdge("web-api", "web", "orders-api"),
      createTemplateEdge("api-db", "orders-api", "orders-db"),
      createTemplateEdge("api-broker", "orders-api", "broker"),
      createTemplateEdge("broker-payments", "broker", "payments"),
      createTemplateEdge("broker-shipping", "broker", "shipping"),
      createTemplateEdge("broker-projection", "broker", "projection"),
      createTemplateEdge("payments-notifications", "payments", "notifications"),
      createTemplateEdge("shipping-notifications", "shipping", "notifications"),
    ],
  },
];

function createTemplateNode(input: TemplateNodeInput): CanvasNode {
  const size = DEFAULT_NODE_SIZES[input.shape];

  return {
    id: input.id,
    type: "canvasNode",
    position: {
      x: input.x,
      y: input.y,
    },
    width: size.width,
    height: size.height,
    style: {
      width: size.width,
      height: size.height,
    },
    data: {
      color: NODE_COLORS[input.colorIndex] ?? NODE_COLORS[0],
      label: input.label,
      shape: input.shape,
    },
  };
}

function createTemplateEdge(
  id: string,
  source: string,
  target: string,
): CanvasEdge {
  return {
    id,
    source,
    target,
    sourceHandle: "right",
    targetHandle: "left",
    data: {
      label: "",
    },
    type: "canvasEdge",
  };
}
