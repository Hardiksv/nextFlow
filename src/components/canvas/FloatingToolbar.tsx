"use client";

import { useState } from "react";
import { Plus, Sparkles, Image } from "lucide-react";
import { useWorkflowStore } from "../../store/useWorkflowStore";

export default function FloatingToolbar() {
  const { addNode } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleSpawnNode = (type: "geminiPro" | "cropImage") => {
    const id = `node-${type}-${Date.now()}`;

    const newNode = {
      id,
      type,
      position: {
        x: 400,
        y: 250,
      },
      data:
        type === "geminiPro"
          ? {
              prompt: "",
              systemPrompt: "",
            }
          : {
              x: 0,
              y: 0,
              w: 100,
              h: 100,
            },
    };

    addNode(newNode);
    setIsOpen(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      {isOpen && (
        <div className="mb-3 flex gap-2 bg-white border rounded-xl p-2 shadow-lg">
          <button
            onClick={() => handleSpawnNode("geminiPro")}
            className="px-3 py-2 text-sm border rounded"
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            Gemini 3.1 Pro
          </button>

          <button
            onClick={() => handleSpawnNode("cropImage")}
            className="px-3 py-2 text-sm border rounded"
          >
            <Image className="w-4 h-4 inline mr-1" />
            Crop Image
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg"
      >
        <Plus />
      </button>
    </div>
  );
}
