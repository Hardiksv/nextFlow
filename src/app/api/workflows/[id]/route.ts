import { prisma } from "../../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workflow = await prisma.workflow.findUnique({
    where: {
      id: params.id,
      userId,
    },
  });

  if (!workflow) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(workflow);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();

  const existing = await prisma.workflow.findUnique({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const workflow = await prisma.workflow.update({
    where: {
      id: params.id,
    },
    data: {
      name: body.name,
    },
  });

  return NextResponse.json(workflow);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const existing = await prisma.workflow.findUnique({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return new NextResponse("Not Found", { status: 404 });
  }

  await prisma.workflow.delete({
    where: {
      id: params.id,
    },
  });

  return NextResponse.json({
    success: true,
  });
}
