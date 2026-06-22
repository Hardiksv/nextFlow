"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

interface WorkflowNodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  status: string;
  outputData: any;
  error: string | null;
  duration: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  duration: number;
  scope: string;
  createdAt: string;
  triggerRunId: string | null;
  nodeRuns?: WorkflowNodeRun[];
}

export default function HistoryPanel() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const res = await fetch("/api/workflows/run");
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    };

    loadRuns();

    const interval = setInterval(loadRuns, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (runId: string) => {
    setExpandedRunId(expandedRunId === runId ? null : runId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETE":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "FAILED":
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "RUNNING":
        return <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "COMPLETE":
        return "bg-green-100 text-green-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "RUNNING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case "requestInputs":
        return "Request Inputs";
      case "cropImage":
        return "Crop Image";
      case "geminiPro":
        return "Gemini Pro";
      case "responseOut":
        return "Response Out";
      default:
        return type;
    }
  };

  return (
    <div className="w-72 h-full border-l bg-white p-4 overflow-y-auto">
      <h2 className="font-bold text-sm mb-4">Workflow History</h2>

      <div className="space-y-2">
        {runs.length === 0 && (
          <p className="text-xs text-slate-400 italic">
            No runs yet. Click Run to execute.
          </p>
        )}
        {runs.map((run) => (
          <div key={run.id} className="border rounded-lg overflow-hidden">
            {}
            <div
              className="p-3 cursor-pointer hover:bg-slate-50 transition"
              onClick={() => toggleExpand(run.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedRunId === run.id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {getStatusIcon(run.status)}
                  <p className="text-sm font-semibold">{run.status}</p>
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                    run.status,
                  )}`}
                >
                  {run.scope}
                </span>
              </div>

              <div className="ml-7 mt-1">
                <p className="text-xs text-slate-500">
                  Duration: {run.duration.toFixed(2)}s
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(run.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {}
            {expandedRunId === run.id &&
              run.nodeRuns &&
              run.nodeRuns.length > 0 && (
                <div className="border-t bg-slate-50 px-3 py-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Node Execution Details
                  </p>
                  {run.nodeRuns.map((nodeRun) => (
                    <div
                      key={nodeRun.id}
                      className="bg-white border rounded p-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(nodeRun.status)}
                          <span className="text-xs font-semibold text-slate-700">
                            {getNodeTypeLabel(nodeRun.nodeType)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(
                            nodeRun.status,
                          )}`}
                        >
                          {nodeRun.status}
                        </span>
                      </div>

                      {nodeRun.duration !== null && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          ⏱ {nodeRun.duration.toFixed(2)}s
                        </p>
                      )}

                      {nodeRun.error && (
                        <p className="text-[10px] text-red-500 mt-1 break-all">
                          ❌ {nodeRun.error}
                        </p>
                      )}

                      {nodeRun.outputData && (
                        <div className="mt-1">
                          <p className="text-[10px] text-slate-400">Output:</p>
                          <p className="text-[10px] text-slate-600 break-all line-clamp-3">
                            {typeof nodeRun.outputData === "string"
                              ? nodeRun.outputData
                              : JSON.stringify(nodeRun.outputData).substring(
                                  0,
                                  200,
                                )}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {}
            {expandedRunId === run.id &&
              (!run.nodeRuns || run.nodeRuns.length === 0) && (
                <div className="border-t bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400 italic">
                    No node-level details available.
                  </p>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
