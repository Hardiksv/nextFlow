import { prisma } from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: body.name,
      nodes: body.nodes,
      edges: body.edges,
    },
  });

  return NextResponse.json(workflow);
}
