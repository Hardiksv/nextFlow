"use client";

import React from "react";
import { Handle, Position, useEdges } from "reactflow";
import { Image, Sparkles, Sliders, CheckCircle2 } from "lucide-react";
import { useWorkflowStore } from "../../store/useWorkflowStore";

const executingClasses =
  "animate-pulse border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
const idleClasses = "border-slate-200";

export function RequestInputsNode({ id, data }: { id: string; data: any }) {
  const isExecuting = data.isExecuting === true;

  return (
    <div
      className={`bg-white border-2 rounded-xl shadow-md p-4 w-72 transition-all ${isExecuting ? executingClasses : idleClasses}`}
    >
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
        <span className="font-bold text-xs text-slate-700 tracking-wide uppercase">
          Request-Inputs
        </span>
        <Sliders className="w-4 h-4 text-slate-400" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
            text_field
          </label>
          <textarea
            className="w-full text-xs p-2 border border-slate-200 rounded bg-slate-50 text-slate-600 resize-none h-16 focus:outline-none"
            readOnly
            value={data.text_field || ""}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
            image_field
          </label>
          <div className="border border-dashed border-slate-200 rounded p-3 text-center bg-slate-50 text-xs text-slate-400">
            Image Field Attached
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="text_field"
        style={{ top: "35%", backgroundColor: "#a855f7" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image_field"
        style={{ top: "75%", backgroundColor: "#3b82f6" }}
      />
    </div>
  );
}

export function CropImageNode({ id, data }: { id: string; data: any }) {
  const edges = useEdges();
  const isInputConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "input_image",
  );
  const isExecuting = data.isExecuting === true;

  return (
    <div
      className={`bg-white border-2 rounded-xl shadow-md p-4 w-72 transition-all ${isExecuting ? executingClasses : idleClasses}`}
    >
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Image className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
            Crop Image
          </span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="input_image"
        style={{ backgroundColor: "#3b82f6" }}
      />

      <div className="space-y-2">
        <div className="text-center p-2 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-400">
          {isInputConnected
            ? "🔗 Linked to Request Source"
            : "Manual Image Source (Disabled)"}
        </div>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div className="bg-slate-50 p-1 border rounded text-slate-500">
            X: {data.x || 0}%
          </div>
          <div className="bg-slate-50 p-1 border rounded text-slate-500">
            Y: {data.y || 0}%
          </div>
          <div className="bg-slate-50 p-1 border rounded text-slate-500">
            W: {data.w || 100}%
          </div>
          <div className="bg-slate-50 p-1 border rounded text-slate-500">
            H: {data.h || 100}%
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output_image"
        style={{ backgroundColor: "#3b82f6" }}
      />
    </div>
  );
}

export const GeminiNode = ({ id, data }: { id: string; data: any }) => {
  const edges = useEdges();
  const setNodes = useWorkflowStore((state: any) => state.setNodes);
  const nodes = useWorkflowStore((state: any) => state.nodes);
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "prompt",
  );
  const isSystemPromptConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "systemPrompt",
  );
  const isExecuting = data.isExecuting === true;

  const handleInputChange = (field: string, value: string) => {
    const updatedNodes = nodes.map((node: any) => {
      if (node.id === id) {
        return {
          ...node,
          data: { ...node.data, [field]: value },
        };
      }
      return node;
    });
    setNodes(updatedNodes);
  };

  return (
    <div
      className={`bg-white border-2 rounded-xl shadow-lg p-4 w-72 transition-all ${isExecuting ? executingClasses : "border-slate-200 hover:border-purple-400"}`}
    >
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-slate-800">
            Gemini 3.1 Pro
          </span>
        </div>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
          LLM
        </span>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: "30%", backgroundColor: "#a855f7" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="systemPrompt"
        style={{ top: "60%", backgroundColor: "#64748b" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="imageVision"
        style={{ top: "80%", backgroundColor: "#3b82f6" }}
      />

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">
            Prompt*
          </label>
          <textarea
            className="w-full text-xs p-2 border rounded bg-slate-50 disabled:bg-slate-200 disabled:text-slate-400 resize-none h-16 focus:outline-none text-slate-700"
            placeholder={
              isPromptConnected ? "Linked to source..." : "Enter prompt..."
            }
            disabled={isPromptConnected}
            value={data.prompt || ""}
            onChange={(e) => handleInputChange("prompt", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">
            System Prompt
          </label>
          <input
            type="text"
            className="w-full text-xs p-2 border rounded bg-slate-50 disabled:bg-slate-200 disabled:text-slate-400 focus:outline-none text-slate-700"
            placeholder={
              isSystemPromptConnected
                ? "Linked to source..."
                : "System rules..."
            }
            disabled={isSystemPromptConnected}
            value={data.systemPrompt || ""}
            onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="response"
        style={{ backgroundColor: "#a855f7" }}
      />
    </div>
  );
};

export function ResponseNode({ id, data }: { id: string; data: any }) {
  const isExecuting = data.isExecuting === true;

  return (
    <div
      className={`bg-white border-2 rounded-xl shadow-md p-4 w-64 transition-all ${isExecuting ? executingClasses : "border-emerald-200"}`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
          Response Out
        </span>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="result"
        style={{ backgroundColor: "#a855f7" }}
      />
      <div className="bg-slate-50 border border-slate-100 rounded p-2 text-[11px] text-slate-500 italic min-h-[40px]">
        {data.result || "Awaiting final consolidated execution values..."}
      </div>
    </div>
  );
}
