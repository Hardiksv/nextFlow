import { prisma } from "../../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { workflowExecutorTask } from "../../../../trigger/workflowsExecutor";
import { z } from "zod";
import { auth } from "@clerk/nextjs";

const NodeSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough();

const EdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })
  .passthrough();

const RunWorkflowSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
  nodes: z.array(NodeSchema).min(1, "nodes array is required"),
  edges: z.array(EdgeSchema),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");

    if (runId) {
      const run = await prisma.workflowRun.findFirst({
        where: {
          id: runId,
          workflow: {
            userId: userId,
          },
        },
        include: {
          nodeRuns: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!run) {
        return NextResponse.json(
          { success: false, error: "Run not found or unauthorized" },
          { status: 404 },
        );
      }

      return NextResponse.json(run);
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        workflow: {
          userId: userId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        nodeRuns: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Failed to fetch runs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let run: any = null;
  const startTime = Date.now();

  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const validationResult = RunWorkflowSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { workflowId, nodes, edges } = validationResult.data;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: "Workflow not found or unauthorized" },
        { status: 404 },
      );
    }

    const requestNode = nodes.find(
      (node: any) => node.type === "requestInputs",
    );
    if (!requestNode) {
      return NextResponse.json(
        { success: false, error: "Request Input node not found" },
        { status: 400 },
      );
    }

    const responseNode = nodes.find((node: any) => node.type === "responseOut");
    if (!responseNode) {
      return NextResponse.json(
        { success: false, error: "Response node not found" },
        { status: 400 },
      );
    }

    run = await prisma.workflowRun.create({
      data: {
        workflowId,
        status: "RUNNING",
        duration: 0,
        scope: "FULL",
        logs: {},
      },
    });

    const handle = await workflowExecutorTask.trigger({
      runId: run.id,
      nodes,
      edges,
    });

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { triggerRunId: handle.id },
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      triggerRunId: handle.id,
      message: "Workflow execution started in background",
    });
  } catch (error: any) {
    console.error("Workflow dispatch error:", error);

    if (run?.id) {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          duration: (Date.now() - startTime) / 1000,
          logs: { error: error?.message || "Dispatch failed" },
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to start workflow execution",
      },
      { status: 500 },
    );
  }
}
