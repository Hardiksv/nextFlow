"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "../../store/useWorkflowStore";
import {
  RequestInputsNode,
  CropImageNode,
  GeminiNode,
  ResponseNode,
} from "./CustomNodes";

const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage: CropImageNode,
  geminiPro: GeminiNode,
  responseOut: ResponseNode,
};

const initialNodes = [
  {
    id: "node-request",
    type: "requestInputs",
    position: { x: 50, y: 200 },
    data: {
      text_field:
        "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      image_field: "https://placeholder.com/headphones.jpg",
    },
    deletable: false,
  },
  {
    id: "node-cropA",
    type: "cropImage",
    position: { x: 350, y: 50 },
    data: { x: 10, y: 10, w: 80, h: 80 },
  },
  {
    id: "node-cropB",
    type: "cropImage",
    position: { x: 350, y: 350 },
    data: { x: 0, y: 0, w: 100, h: 100 },
  },
  {
    id: "node-geminiA",
    type: "geminiPro",
    position: { x: 650, y: 30 },
    data: {
      prompt:
        "Analyze this product image and describe the key visual features.",
      systemPrompt: "You are a product analyst.",
    },
  },
  {
    id: "node-geminiB",
    type: "geminiPro",
    position: { x: 650, y: 330 },
    data: {
      prompt: "Describe the product packaging and branding from this image.",
      systemPrompt: "You are a branding expert.",
    },
  },
  {
    id: "node-geminiC",
    type: "geminiPro",
    position: { x: 950, y: 180 },
    data: {
      prompt:
        "Consolidate the two analyses above into a final product marketing brief.",
      systemPrompt: "You are a senior marketing strategist.",
    },
  },
  {
    id: "node-response",
    type: "responseOut",
    position: { x: 1250, y: 210 },
    data: { result: "" },
    deletable: false,
  },
];

const initialEdges = [
  // Request → Crop A (image)
  {
    id: "edge-req-cropA",
    source: "node-request",
    target: "node-cropA",
    sourceHandle: "image_field",
    targetHandle: "input_image",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-req-cropB",
    source: "node-request",
    target: "node-cropB",
    sourceHandle: "image_field",
    targetHandle: "input_image",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-req-gemA",
    source: "node-request",
    target: "node-geminiA",
    sourceHandle: "text_field",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-req-gemB",
    source: "node-request",
    target: "node-geminiB",
    sourceHandle: "text_field",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-cropA-gemA",
    source: "node-cropA",
    target: "node-geminiA",
    sourceHandle: "output_image",
    targetHandle: "imageVision",
    animated: true,
    style: { stroke: "#3b82f6" },
  },

  {
    id: "edge-cropB-gemB",
    source: "node-cropB",
    target: "node-geminiB",
    sourceHandle: "output_image",
    targetHandle: "imageVision",
    animated: true,
    style: { stroke: "#3b82f6" },
  },

  {
    id: "edge-gemA-gemC",
    source: "node-geminiA",
    target: "node-geminiC",
    sourceHandle: "response",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-gemB-gemC",
    source: "node-geminiB",
    target: "node-geminiC",
    sourceHandle: "response",
    targetHandle: "systemPrompt",
    animated: true,
    style: { stroke: "#a855f7" },
  },

  {
    id: "edge-gemC-resp",
    source: "node-geminiC",
    target: "node-response",
    sourceHandle: "response",
    targetHandle: "result",
    animated: true,
    style: { stroke: "#a855f7" },
  },
];

export default function FlowCanvas() {
  const { nodes, edges, setNodes, setEdges, onConnect } = useWorkflowStore();
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [nodes.length, setNodes, setEdges]);

  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(edges);
  }, [edges, setRfEdges]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        minHeight: "500px",
        backgroundColor: "#f8fafc",
      }}
    >
      {}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .react-flow__renderer { background-color: #f8fafc !important; }
        .react-flow__node { cursor: grab; }
        .react-flow__controls { display: flex; flex-direction: column; gap: 4px; position: absolute; bottom: 16px; left: 16px; z-index: 4; }
        .react-flow__controls-button { width: 24px; height: 24px; background: white; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .react-flow__minimap { background: white; border: 1px solid #cbd5e1; position: absolute; bottom: 16px; right: 16px; z-index: 4; }
      `,
        }}
      />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { stroke: "#a855f7", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" },
        }}
      >
        <Background gap={16} size={1} color="#cbd5e1" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
