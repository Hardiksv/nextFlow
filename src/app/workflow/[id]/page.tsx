"use client";

import { UserButton } from "@clerk/nextjs";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import FlowCanvas from "../../../components/canvas/FLowCanvas";
import FloatingToolbar from "../../../components/canvas/FloatingToolbar";
import HistoryPanel from "../../../components/sidebar/HistoryPanel";

import {
  Layers,
  Save,
  Undo2,
  Redo2,
  Play,
  Download,
  Upload,
  Loader2,
  ChevronLeft,
  StopCircle,
} from "lucide-react";

import { useWorkflowStore } from "../../../store/useWorkflowStore";

export default function WorkflowWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { nodes, edges, undo, redo, setNodes, loadWorkflow } =
    useWorkflowStore();

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows/${params.id}`);
        const workflow = await res.json();
        if (workflow) {
          loadWorkflow(workflow.nodes || [], workflow.edges || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetching(false);
      }
    };

    if (params?.id) {
      fetchWorkflow();
    }
  }, [params, loadWorkflow]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = useCallback(
    (runId: string) => {
      const executingNodes = nodes.map((node) => ({
        ...node,
        data: { ...node.data, isExecuting: true },
      }));
      setNodes(executingNodes);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/workflows/run?runId=${runId}`);
          const runData = await res.json();

          if (!runData || !runData.status) return;

          const nodeRuns = runData.nodeRuns || [];
          const updatedNodes = nodes.map((node) => {
            const nodeRun = nodeRuns.find((nr: any) => nr.nodeId === node.id);

            if (nodeRun) {
              const isStillRunning = nodeRun.status === "RUNNING";
              return {
                ...node,
                data: {
                  ...node.data,
                  isExecuting: isStillRunning,
                  executionStatus: nodeRun.status,
                },
              };
            }

            if (runData.status === "RUNNING" && node.type !== "requestInputs") {
              return {
                ...node,
                data: {
                  ...node.data,
                  isExecuting: false,
                  executionStatus: "PENDING",
                },
              };
            }

            return node;
          });

          if (runData.status === "SUCCESS" || runData.status === "FAILED") {
            const finalResult = runData.logs?.result || "";

            const finalNodes = updatedNodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                isExecuting: false,
                executionStatus: undefined,
                ...(node.type === "responseOut" ? { result: finalResult } : {}),
              },
            }));

            setNodes(finalNodes);
            setIsRunning(false);
            setCurrentRunId(null);

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else {
            setNodes(updatedNodes);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000);
    },
    [nodes, setNodes],
  );

  const saveWorkflow = async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Workflow ${Date.now()}`,
          nodes,
          edges,
        }),
      });

      const data = await res.json();
      console.log("Saved:", data);
      alert("Workflow Saved Successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to save workflow");
    }
  };

  const runWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: params.id,
          nodes,
          edges,
        }),
      });

      const data = await res.json();

      if (data.success && data.runId) {
        setCurrentRunId(data.runId);
        startPolling(data.runId);
      } else {
        setIsRunning(false);
        alert(data.error || "Workflow execution failed to start");
      }
    } catch (error) {
      console.error(error);
      setIsRunning(false);
      alert("Workflow execution failed");
    }
  };

  const stopWorkflow = async () => {
    if (!currentRunId) return;

    try {
      const res = await fetch(`/api/workflows/run/${currentRunId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setIsRunning(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        alert("Workflow execution stopped.");
      } else {
        alert(data.error || "Failed to stop workflow");
      }
    } catch (error) {
      console.error(error);
      alert("Error stopping workflow");
    }
  };

  const exportWorkflow = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${params.id || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkflow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.nodes && json.edges) {
          loadWorkflow(json.nodes, json.edges);
          alert("Workflow imported successfully");
        } else {
          alert("Invalid workflow JSON format");
        }
      } catch {
        alert("Failed to parse workflow JSON");
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center group"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-slate-200">
            NextFlow{" "}
            <span className="text-slate-500 font-normal">/ Workspace</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1 mr-2 border border-slate-700/50">
            <button
              onClick={undo}
              className="p-2 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Undo"
            >
              <Undo2 size={16} />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button
              onClick={redo}
              className="p-2 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Redo"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="flex items-center bg-slate-800/50 rounded-lg p-1 mr-2 border border-slate-700/50">
            <button
              onClick={exportWorkflow}
              className="p-2 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Export Workflow JSON"
            >
              <Download size={16} />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 rounded hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Import Workflow JSON"
            >
              <Upload size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importWorkflow}
            className="hidden"
          />

          <button
            onClick={saveWorkflow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
          >
            <Save size={16} />
            Save Draft
          </button>

          {isRunning ? (
            <button
              onClick={stopWorkflow}
              className="group relative flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg shadow-lg transition-all duration-300 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:shadow-red-500/20"
            >
              <StopCircle size={16} />
              Stop Execution
            </button>
          ) : (
            <button
              onClick={runWorkflow}
              className="group relative flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-emerald-500/40 hover:scale-105 border border-emerald-400/20"
            >
              <Play
                size={16}
                className="fill-white transition-transform group-hover:translate-x-0.5"
              />
              Run Workflow
            </button>
          )}

          <div className="ml-4 flex items-center border-l border-slate-800 pl-6">
            <div className="ring-2 ring-slate-800 rounded-full p-0.5">
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { avatarBox: "w-8 h-8" } }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {isFetching ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500 z-50">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
            <p className="text-sm font-medium tracking-wide animate-pulse">
              Loading Workspace...
            </p>
          </div>
        ) : (
          <>
            <main className="flex-1 h-full relative bg-slate-50 text-slate-900">
              <FlowCanvas />
              <FloatingToolbar />
            </main>
            <HistoryPanel />
          </>
        )}
      </div>
    </div>
  );
}
