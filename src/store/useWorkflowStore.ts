import { create } from "zustand";
import { Connection, Edge, Node, addEdge } from "reactflow";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];

  past: { nodes: Node[]; edges: Edge[] }[];
  future: { nodes: Node[]; edges: Edge[] }[];

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;

  addNode: (node: Node) => void;

  onConnect: (connection: Connection) => void;

  undo: () => void;
  redo: () => void;

  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
}

const hasCycle = (edges: Edge[], connection: Connection): boolean => {
  const adjList: Record<string, string[]> = {};

  [...edges, connection].forEach((e) => {
    if (!e.source || !e.target) return;

    if (!adjList[e.source]) {
      adjList[e.source] = [];
    }

    adjList[e.source].push(e.target);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (node: string): boolean => {
    if (recStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);

    const neighbors = adjList[node] || [];

    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    recStack.delete(node);
    return false;
  };

  return dfs(connection.source);
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],

  past: [],
  future: [],

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    const currentNodes = get().nodes;
    const currentEdges = get().edges;

    set({
      past: [
        ...get().past,
        {
          nodes: currentNodes,
          edges: currentEdges,
        },
      ],
      nodes: [...currentNodes, node],
      future: [],
    });
  },

  onConnect: (connection) => {
    const { edges, nodes } = get();

    if (hasCycle(edges, connection)) {
      console.error("Cycle detected!");
      return;
    }

    const sourceNode = nodes.find((n) => n.id === connection.source);

    const targetNode = nodes.find((n) => n.id === connection.target);

    if (sourceNode && targetNode) {
      const sourceHandleType = connection.sourceHandle;
      const targetHandleType = connection.targetHandle;

      if (
        sourceHandleType?.includes("image") &&
        !targetHandleType?.toLowerCase().includes("image") &&
        !targetHandleType?.toLowerCase().includes("vision")
      ) {
        console.error(
          "Type Mismatch: Image output cannot connect to non-image input",
        );
        return;
      }
    }

    set({
      past: [
        ...get().past,
        {
          nodes: get().nodes,
          edges: get().edges,
        },
      ],

      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: {
            stroke: "#a855f7",
          },
        },
        edges,
      ),

      future: [],
    });
  },

  undo: () => {
    const { past, nodes, edges } = get();

    if (past.length === 0) return;

    const previous = past[past.length - 1];

    set({
      past: past.slice(0, past.length - 1),

      nodes: previous.nodes,
      edges: previous.edges,

      future: [
        {
          nodes,
          edges,
        },
        ...get().future,
      ],
    });
  },

  redo: () => {
    const { future, nodes, edges } = get();

    if (future.length === 0) return;

    const next = future[0];

    set({
      future: future.slice(1),

      nodes: next.nodes,
      edges: next.edges,

      past: [
        ...get().past,
        {
          nodes,
          edges,
        },
      ],
    });
  },

  loadWorkflow: (nodes, edges) => {
    set({
      nodes,
      edges,
    });
  },
}));
