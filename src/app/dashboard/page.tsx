"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  Layers,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Workflow ${Date.now()}`,
          nodes: [],
          edges: [],
        }),
      });

      const workflow = await res.json();
      router.push(`/workflow/${workflow.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  const renameWorkflow = async (id: string, currentName: string) => {
    const newName = window.prompt("Enter new workflow name", currentName);
    if (!newName || newName.trim() === "") return;

    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      await loadWorkflows();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteWorkflow = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this workflow?",
    );
    if (!confirmed) return;

    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      await loadWorkflows();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-6xl mx-auto">
        {}
        <header className="flex items-center justify-between mb-12 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              My Workflows
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="ring-2 ring-slate-800 rounded-full p-0.5">
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { avatarBox: "w-9 h-9" } }}
              />
            </div>

            <button
              onClick={createWorkflow}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span>Create Workflow</span>
            </button>
          </div>
        </header>

        {}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mb-4" />
            <p>Loading your workflows...</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50 backdrop-blur-sm">
            <div className="p-6 bg-slate-800/50 rounded-full mb-6 ring-8 ring-slate-900">
              <FolderOpen className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Workflows Yet</h2>
            <p className="text-slate-400 max-w-md mb-8">
              You haven't created any workflows. Start building your first
              directed acyclic graph (DAG) by creating a new canvas.
            </p>
            <button
              onClick={createWorkflow}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-white hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Build First Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="group relative border border-slate-800 rounded-2xl p-6 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10"
              >
                {}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-1">
                    {workflow.name}
                  </h3>
                  <div className="p-2 bg-slate-800/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(workflow.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => router.push(`/workflow/${workflow.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>

                  <button
                    onClick={() => renameWorkflow(workflow.id, workflow.name)}
                    className="p-2 text-slate-400 bg-slate-800/50 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                    title="Rename Workflow"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteWorkflow(workflow.id)}
                    className="p-2 text-slate-400 bg-slate-800/50 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
