"use client";

import React, { useState } from "react";
import FlowCanvas from "../../components/canvas/FLowCanvas";
import { useWorkflowStore } from "../../store/useWorkflowStore";
import { Sparkles, Image, Plus, X } from "lucide-react";

export default function DirectTestPage() {
  const { addNode } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleSpawnNode = (type: "geminiPro" | "cropImage") => {
    const id = `node-${type}-${Date.now()}`;

    const newNode = {
      id,
      type,
      position: { x: 400, y: 200 + Math.random() * 80 },
      data:
        type === "geminiPro"
          ? { prompt: "", systemPrompt: "" }
          : { x: 0, y: 0, w: 100, h: 100 },
    };

    addNode(newNode);
    setIsOpen(false); // Auto-close picker on click
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden relative">
      {}
      <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900 shrink-0">
        <h1 className="text-sm font-bold tracking-wide text-purple-400">
          NextFlow Workflow Engine
        </h1>
      </header>

      {}
      <main
        className="w-full flex-1 relative bg-slate-100"
        style={{ height: "calc(100vh - 56px)" }}
      >
        <FlowCanvas />
      </main>

      {}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center">
        {isOpen && (
          <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl mb-3 flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => handleSpawnNode("geminiPro")}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Add Gemini LLM
            </button>
            <button
              onClick={() => handleSpawnNode("cropImage")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors shadow"
            >
              <Image className="w-3.5 h-3.5" />
              Add Crop Image
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-xl transition-all duration-300 border border-slate-700 text-white ${
            isOpen
              ? "bg-red-600 rotate-45 border-red-500"
              : "bg-purple-600 hover:bg-purple-500 hover:scale-105"
          }`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
