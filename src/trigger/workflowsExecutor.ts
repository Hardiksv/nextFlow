import { task, wait } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required");
}
const ai = new GoogleGenerativeAI(apiKey);

export const cropImageTask = task({
  id: "crop-image-task",
  run: async (payload: {
    runId: string;
    imageUrl: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }) => {
    const currentRun = await prisma.workflowRun.findUnique({
      where: { id: payload.runId },
    });
    if (currentRun?.status === "FAILED" || currentRun?.status === "CANCELED") {
      throw new Error("Execution canceled by user.");
    }

    console.log("Starting Image Crop. Enforcing mandatory 30s delay...");

    await wait.for({ seconds: 30 });

    const updatedRun = await prisma.workflowRun.findUnique({
      where: { id: payload.runId },
    });
    if (updatedRun?.status === "FAILED" || updatedRun?.status === "CANCELED") {
      throw new Error("Execution canceled by user during wait.");
    }

    const croppedUrl = `https://cdn.transloadit.com/simulated_crop_${Date.now()}.png`;
    return { outputImage: croppedUrl };
  },
});

import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const geminiTask = task({
  id: "gemini-execution-task",
  queue: {
    concurrencyLimit: 1,
  },
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: {
    runId: string;
    prompt: string;
    systemPrompt?: string;
    images?: string[];
  }) => {
    const currentRun = await prisma.workflowRun.findUnique({
      where: { id: payload.runId },
    });
    if (currentRun?.status === "FAILED" || currentRun?.status === "CANCELED") {
      console.log("Skipping Gemini API call due to manual cancellation.");
      throw new Error("Execution canceled by user.");
    }

    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const parts: any[] = [];

    if (payload.systemPrompt) {
      parts.push({ text: payload.systemPrompt });
    }

    parts.push({ text: payload.prompt });

    if (payload.images && payload.images.length > 0) {
      for (const imageUrl of payload.images) {
        parts.push({
          text: `[Image attached: ${imageUrl}]`,
        });
      }
    }

    let retries = 0;
    while (retries < 3) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts }],
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
        });

        return { response: result.response.text() };
      } catch (error: any) {
        if (
          error.message?.includes("429") ||
          error.message?.includes("Too Many Requests") ||
          error.status === 429
        ) {
          retries++;
          console.log(
            `Hit Gemini 429 rate limit. Waiting 60 seconds (Attempt ${retries}/3)...`,
          );

          const waitRun = await prisma.workflowRun.findUnique({
            where: { id: payload.runId },
          });
          if (waitRun?.status === "FAILED" || waitRun?.status === "CANCELED") {
            throw new Error("Execution canceled by user.");
          }

          await wait.for({ seconds: 60 });
        } else {
          throw error;
        }
      }
    }

    throw new Error("Gemini rate limit exceeded after 3 retries.");
  },
});

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface NodeOutput {
  text?: string;
  imageUrl?: string;
}

export const workflowExecutorTask = task({
  id: "workflow-executor-task",
  maxDuration: 300,
  run: async (payload: {
    runId: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }) => {
    const { runId, nodes, edges } = payload;
    const startTime = Date.now();

    try {
      const children: Map<string, string[]> = new Map();
      const parents: Map<string, string[]> = new Map();
      const inDegree: Map<string, number> = new Map();
      const nodeMap: Map<string, WorkflowNode> = new Map();

      for (const node of nodes) {
        nodeMap.set(node.id, node);
        children.set(node.id, []);
        parents.set(node.id, []);
        inDegree.set(node.id, 0);
      }

      for (const edge of edges) {
        children.get(edge.source)?.push(edge.target);
        parents.get(edge.target)?.push(edge.source);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }

      let processedCount = 0;
      const totalNodes = nodes.length;
      const nodeOutputs: Map<string, NodeOutput> = new Map();

      const readyQueue: string[] = [];
      for (const node of nodes) {
        if (inDegree.get(node.id) === 0) {
          readyQueue.push(node.id);
        }
      }

      let finalResponse = "";

      while (readyQueue.length > 0) {
        // =============================
        // CHECK MANUAL CANCELLATION
        // =============================
        const currentRunState = await prisma.workflowRun.findUnique({
          where: { id: runId },
          select: { status: true },
        });
        if (
          currentRunState?.status === "FAILED" ||
          currentRunState?.status === "CANCELED"
        ) {
          console.log("Run was manually stopped. Aborting executor.");
          throw new Error("Execution canceled by user.");
        }

        const currentWave = [...readyQueue];
        readyQueue.length = 0;

        for (const nodeId of currentWave) {
          const node = nodeMap.get(nodeId);
          if (!node) continue;
          try {
            await prisma.workflowNodeRun.create({
              data: {
                runId,
                nodeId: node.id,
                nodeType: node.type,
                status: "RUNNING",
                startedAt: new Date(),
              },
            });
          } catch (e) {
            console.error("Failed to create node run:", e);
          }
        }

        const waveStartTime = Date.now();

        const nodesByType: Record<string, string[]> = {
          requestInputs: [],
          cropImage: [],
          geminiPro: [],
          responseOut: [],
        };

        for (const nodeId of currentWave) {
          const node = nodeMap.get(nodeId);
          if (node) {
            nodesByType[node.type] = nodesByType[node.type] || [];
            nodesByType[node.type].push(nodeId);
          }
        }

        for (const nodeId of nodesByType.requestInputs) {
          const node = nodeMap.get(nodeId)!;
          const output = {
            text: node.data?.text_field || "",
            imageUrl: node.data?.image_field || undefined,
          };
          nodeOutputs.set(node.id, output);
          processedCount++;

          await prisma.workflowNodeRun.updateMany({
            where: { runId, nodeId: node.id },
            data: {
              status: "COMPLETE",
              outputData: output as any,
              completedAt: new Date(),
              duration: (Date.now() - waveStartTime) / 1000,
            },
          });
        }

        if (nodesByType.cropImage.length > 0) {
          const payloads = nodesByType.cropImage.map((nodeId) => {
            const node = nodeMap.get(nodeId)!;
            const parentIds = parents.get(node.id) || [];
            let imageUrl = "";

            for (const parentId of parentIds) {
              const parentOutput = nodeOutputs.get(parentId);
              if (parentOutput?.imageUrl) {
                imageUrl = parentOutput.imageUrl;
                break;
              }
            }

            return {
              payload: {
                runId,
                imageUrl: imageUrl || "https://placeholder.com/input.png",
                x: node.data?.x || 0,
                y: node.data?.y || 0,
                w: node.data?.w || 100,
                h: node.data?.h || 100,
              },
            };
          });

          const batchResult = await cropImageTask.batchTriggerAndWait(payloads);

          for (let i = 0; i < batchResult.runs.length; i++) {
            const run = batchResult.runs[i];
            const nodeId = nodesByType.cropImage[i];

            if (run.ok) {
              const output = { imageUrl: run.output.outputImage };
              nodeOutputs.set(nodeId, output);
              processedCount++;

              await prisma.workflowNodeRun.updateMany({
                where: { runId, nodeId },
                data: {
                  status: "COMPLETE",
                  outputData: output as any,
                  completedAt: new Date(),
                  duration: (Date.now() - waveStartTime) / 1000,
                },
              });
            } else {
              throw new Error("Crop batch task failed or was canceled");
            }
          }
        }

        if (nodesByType.geminiPro.length > 0) {
          const payloads = nodesByType.geminiPro.map((nodeId) => {
            const node = nodeMap.get(nodeId)!;
            const parentIds = parents.get(node.id) || [];
            const incomingEdges = edges.filter((e) => e.target === node.id);

            let promptParts: string[] = [];
            let imageInputs: string[] = [];

            for (const edge of incomingEdges) {
              const sourceNode = nodeMap.get(edge.source);
              const sourceOutput = nodeOutputs.get(edge.source);

              if (!sourceNode) continue;

              if (
                sourceNode.type === "requestInputs" &&
                edge.sourceHandle === "text_field"
              ) {
                promptParts.push(sourceOutput?.text || "");
              } else if (
                sourceNode.type === "requestInputs" &&
                edge.sourceHandle === "image_field"
              ) {
                if (sourceOutput?.imageUrl)
                  imageInputs.push(sourceOutput.imageUrl);
              } else if (
                sourceNode.type === "geminiPro" &&
                edge.sourceHandle === "response"
              ) {
                promptParts.push(sourceOutput?.text || "");
              } else if (
                sourceNode.type === "cropImage" &&
                edge.sourceHandle === "output_image"
              ) {
                if (sourceOutput?.imageUrl)
                  imageInputs.push(sourceOutput.imageUrl);
              }
            }

            const systemPrompt = node.data?.systemPrompt || "";
            const nodePrompt = node.data?.prompt || "";
            const combinedInput = promptParts.filter(Boolean).join("\n");
            const fullPrompt = [systemPrompt, nodePrompt, combinedInput]
              .filter(Boolean)
              .join("\n\n");

            return {
              payload: {
                runId,
                prompt: fullPrompt || "Hello",
                systemPrompt: systemPrompt || undefined,
                images: imageInputs.length > 0 ? imageInputs : undefined,
              },
            };
          });

          const batchResult = await geminiTask.batchTriggerAndWait(payloads);

          for (let i = 0; i < batchResult.runs.length; i++) {
            const run = batchResult.runs[i];
            const nodeId = nodesByType.geminiPro[i];

            if (run.ok) {
              const output = { text: run.output.response };
              nodeOutputs.set(nodeId, output);
              finalResponse = run.output.response;
              processedCount++;

              await prisma.workflowNodeRun.updateMany({
                where: { runId, nodeId },
                data: {
                  status: "COMPLETE",
                  outputData: output as any,
                  completedAt: new Date(),
                  duration: (Date.now() - waveStartTime) / 1000,
                },
              });
            } else {
              throw new Error("Gemini batch task failed or was canceled");
            }
          }
        }

        for (const nodeId of nodesByType.responseOut) {
          const node = nodeMap.get(nodeId)!;
          const parentIds = parents.get(node.id) || [];
          let resultText = "";

          for (const parentId of parentIds) {
            const parentOutput = nodeOutputs.get(parentId);
            if (parentOutput?.text) {
              resultText += parentOutput.text + "\n";
            }
          }

          const output = { text: resultText.trim() };
          finalResponse = resultText.trim();
          nodeOutputs.set(node.id, output);
          processedCount++;

          await prisma.workflowNodeRun.updateMany({
            where: { runId, nodeId: node.id },
            data: {
              status: "COMPLETE",
              outputData: output as any,
              completedAt: new Date(),
              duration: (Date.now() - waveStartTime) / 1000,
            },
          });
        }

        for (const nodeId of currentWave) {
          const childIds = children.get(nodeId) || [];
          for (const childId of childIds) {
            const newDegree = (inDegree.get(childId) || 1) - 1;
            inDegree.set(childId, newDegree);
            if (newDegree === 0) {
              readyQueue.push(childId);
            }
          }
        }
      }

      if (processedCount < totalNodes) {
        throw new Error(
          "Cycle detected in workflow graph. Not all nodes were executed.",
        );
      }

      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "SUCCESS",
          duration: (Date.now() - startTime) / 1000,
          logs: { result: finalResponse },
        },
      });

      return { success: true, result: finalResponse };
    } catch (error: any) {
      console.error("Workflow execution error:", error);

      const existing = await prisma.workflowRun.findUnique({
        where: { id: runId },
      });
      if (existing?.status !== "FAILED" && existing?.status !== "CANCELED") {
        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: "FAILED",
            duration: (Date.now() - startTime) / 1000,
            logs: { error: error?.message || "Execution failed" },
          },
        });
      }

      return { success: false, error: error?.message };
    }
  },
});
