import { prisma } from "../../../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { runs } from "@trigger.dev/sdk/v3";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { runId } = params;

    const run = await prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflow: {
          userId: userId,
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { success: false, error: "Run not found or unauthorized" },
        { status: 404 },
      );
    }

    if (!run.triggerRunId) {
      return NextResponse.json(
        { success: false, error: "Trigger run ID not found" },
        { status: 400 },
      );
    }

    await runs.cancel(run.triggerRunId);

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        logs: { ...(run.logs as object), error: "Execution canceled by user." },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workflow execution canceled successfully.",
    });
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to cancel workflow." },
      { status: 500 },
    );
  }
}
